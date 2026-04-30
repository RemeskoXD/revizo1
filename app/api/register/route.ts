import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { readJsonBody, PayloadTooLargeError } from "@/lib/json-body";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { trialEndFromRegistration } from "@/lib/subscription-pricing";
import {
  buildPlatbaTestOnboardingUrl,
  isFakePaymentGatewayEnabled,
  isStripePaymentsConfigured,
} from "@/lib/stripe-config";
import { createUserWithSubscriptionColumnFallback } from "@/lib/prisma-subscription-column";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LICENSE_B64 = 5_500_000; // ~4 MB binary

function parseLicenseInput(raw: string): { base64: string; mime: string } | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (m) {
    const b64 = m[2].replace(/\s/g, "");
    if (b64.length > MAX_LICENSE_B64) return null;
    return { mime: m[1].slice(0, 120), base64: b64 };
  }
  const b64 = t.replace(/\s/g, "");
  if (b64.length > MAX_LICENSE_B64) return null;
  return { mime: "application/pdf", base64: b64 };
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimit(`register:${ip}`, 12, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { message: "Příliš mnoho pokusů o registraci z této sítě. Zkuste to později." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  try {
    const body = await readJsonBody<{
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      companyId?: string;
      inviteCode?: string;
      phone?: string;
      address?: string;
      ico?: string;
      companyInviteCode?: string;
      licenseDocument?: string;
      expectedTechnicians?: number | null;
      /** registertest – stará registrace bez souboru oprávnění */
      registrationFlow?: string;
    }>(req, 6_600_000);

    const {
      name,
      email,
      password,
      role: rawRole,
      companyId,
      inviteCode,
      phone: rawPhone,
      address: rawAddress,
      ico: rawIco,
      companyInviteCode: rawCompanyCode,
      licenseDocument: rawLicense,
      expectedTechnicians,
      registrationFlow,
    } = body;

    const legacyFlow = registrationFlow === "legacy";

    const role = rawRole || "CUSTOMER";

    if (!email || !password) {
      return NextResponse.json({ message: "Chybí povinné údaje" }, { status: 400 });
    }

    const emailNorm = String(email).trim().toLowerCase().slice(0, 254);
    if (!EMAIL_RE.test(emailNorm)) {
      return NextResponse.json({ message: "Neplatný formát e-mailu" }, { status: 400 });
    }
    if (password.length < 10 || password.length > 200) {
      return NextResponse.json(
        { message: "Heslo musí mít alespoň 10 znaků (max. 200)" },
        { status: 400 }
      );
    }

    const phone = rawPhone != null ? String(rawPhone).trim().slice(0, 40) : "";
    const address = rawAddress != null ? String(rawAddress).trim().slice(0, 500) : "";
    const ico = rawIco != null ? String(rawIco).trim().slice(0, 20) : "";
    const companyInviteCode =
      rawCompanyCode != null ? String(rawCompanyCode).trim().slice(0, 80) : "";

    const existingUser = await prisma.user.findUnique({
      where: { email: emailNorm },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ message: "Uživatel s tímto e-mailem již existuje" }, { status: 400 });
    }

    if (role === "PENDING_SUPPORT" || role === "PENDING_CONTRACTOR") {
      if (!inviteCode) {
        return NextResponse.json({ message: "Chybí zvací kód" }, { status: 400 });
      }

      const adminWithCode = await prisma.user.findFirst({
        where: { inviteCode, role: "ADMIN" },
        select: { id: true },
      });

      if (!adminWithCode) {
        return NextResponse.json({ message: "Neplatný zvací kód" }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    if (role === "CUSTOMER") {
      const nameTrim = name != null ? String(name).trim().slice(0, 120) : "";
      if (nameTrim.length < 2) {
        return NextResponse.json({ message: "Zadejte celé jméno" }, { status: 400 });
      }
      if (!phone || phone.length < 5) {
        return NextResponse.json({ message: "Zadejte platný telefon" }, { status: 400 });
      }
      if (!address || address.length < 3) {
        return NextResponse.json({ message: "Zadejte adresu" }, { status: 400 });
      }

      const trialUntil = trialEndFromRegistration(new Date());
      const user = await createUserWithSubscriptionColumnFallback({
        data: {
          name: nameTrim,
          email: emailNorm,
          password: hashedPassword,
          role: "CUSTOMER",
          accountStatus: "ACTIVE",
          phone: phone || null,
          address: address || null,
          licenseValidUntil: trialUntil,
          requiresSubscriptionCheckout: false,
        },
        select: { id: true, email: true, role: true },
      });

      let postRegisterRedirect: string | null = null;
      if (isFakePaymentGatewayEnabled()) {
        postRegisterRedirect = "/dashboard/settings?tab=billing";
      } else if (isStripePaymentsConfigured()) {
        postRegisterRedirect = "/dashboard";
      }

      return NextResponse.json(
        {
          message: "Účet byl vytvořen.",
          user: { id: user.id, email: user.email, role: user.role },
          postRegisterRedirect,
        },
        { status: 201 }
      );
    }

    const licTech = rawLicense != null ? parseLicenseInput(String(rawLicense)) : null;
    const hasTechCompanyLicense = Boolean(licTech && licTech.base64.length >= 50);

    if (role === "TECHNICIAN" && !hasTechCompanyLicense && !legacyFlow) {
      return NextResponse.json(
        { message: "Nahrajte oprávnění k provádění revizí (PDF nebo obrázek)" },
        { status: 400 }
      );
    }
    if (role === "COMPANY_ADMIN" && !hasTechCompanyLicense && !legacyFlow) {
      return NextResponse.json(
        { message: "Nahrajte oprávnění (PDF nebo obrázek)" },
        { status: 400 }
      );
    }

    if (role === "TECHNICIAN" && hasTechCompanyLicense) {
      const nameTrim =
        name != null && String(name).trim().length >= 2
          ? String(name).trim().slice(0, 120)
          : emailNorm.split("@")[0] || "Technik";
      if (!phone || phone.length < 5) {
        return NextResponse.json({ message: "Zadejte platný telefon" }, { status: 400 });
      }
      if (!address || address.length < 3) {
        return NextResponse.json({ message: "Zadejte adresu" }, { status: 400 });
      }

      const trialUntil = trialEndFromRegistration(new Date());
      const user = await createUserWithSubscriptionColumnFallback({
        data: {
          name: nameTrim,
          email: emailNorm,
          password: hashedPassword,
          role: "TECHNICIAN",
          accountStatus: "PENDING_APPROVAL",
          phone: phone || null,
          address: address || null,
          ico: ico || null,
          licenseDocument: licTech!.base64,
          licenseMimeType: licTech!.mime,
          pendingCompanyInviteCode: companyInviteCode || null,
          licenseValidUntil: trialUntil,
          requiresSubscriptionCheckout: false,
        },
        select: { id: true, email: true, role: true },
      });

      if (companyId) {
        await prisma.companyJoinRequest.create({
          data: {
            technicianId: user.id,
            companyId: companyId,
            status: "PENDING",
          },
        });
      }

      return NextResponse.json(
        {
          message:
            "Registrace přijata. Po schválení oprávnění administrátorem vám přijde e-mail a poté se budete moci přihlásit.",
          user: { id: user.id, email: user.email, role: user.role, pendingApproval: true },
        },
        { status: 201 }
      );
    }

    if (role === "COMPANY_ADMIN" && hasTechCompanyLicense) {
      const nameTrim =
        name != null && String(name).trim().length >= 2
          ? String(name).trim().slice(0, 120)
          : emailNorm.split("@")[0] || "Firma";
      if (!phone || phone.length < 5) {
        return NextResponse.json({ message: "Zadejte platný telefon" }, { status: 400 });
      }
      if (!address || address.length < 3) {
        return NextResponse.json({ message: "Zadejte adresu" }, { status: 400 });
      }

      let exp: number | null = null;
      if (expectedTechnicians != null && Number.isFinite(Number(expectedTechnicians))) {
        exp = Math.max(0, Math.min(5000, Math.floor(Number(expectedTechnicians))));
      }

      const trialUntil = trialEndFromRegistration(new Date());
      const user = await createUserWithSubscriptionColumnFallback({
        data: {
          name: nameTrim,
          email: emailNorm,
          password: hashedPassword,
          role: "COMPANY_ADMIN",
          accountStatus: "PENDING_APPROVAL",
          phone: phone || null,
          address: address || null,
          ico: ico || null,
          licenseDocument: licTech!.base64,
          licenseMimeType: licTech!.mime,
          pendingCompanyInviteCode: companyInviteCode || null,
          expectedTechnicians: exp,
          licenseValidUntil: trialUntil,
          requiresSubscriptionCheckout: false,
        },
        select: { id: true, email: true, role: true },
      });

      return NextResponse.json(
        {
          message:
            "Registrace přijata. Po schválení administrátorem vám přijde e-mail a poté se budete moci přihlásit.",
          user: { id: user.id, email: user.email, role: user.role, pendingApproval: true },
        },
        { status: 201 }
      );
    }

    // Legacy / ostatní role (registertest, technik/firma bez souboru)
    const nameTrim = name != null ? String(name).trim().slice(0, 120) : "";
    if (nameTrim.length < 2) {
      return NextResponse.json({ message: "Chybí jméno" }, { status: 400 });
    }

    const inviteForCompany =
      role === "COMPANY_ADMIN" ? randomBytes(5).toString("hex").slice(0, 10).toUpperCase() : null;

    const user = await prisma.user.create({
      data: {
        name: nameTrim,
        email: emailNorm,
        password: hashedPassword,
        role: role || "CUSTOMER",
        inviteCode: inviteForCompany,
        accountStatus: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (role === "TECHNICIAN" && companyId) {
      await prisma.companyJoinRequest.create({
        data: {
          technicianId: user.id,
          companyId: companyId,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json(
      { message: "Uživatel byl úspěšně zaregistrován", user: { id: user.id, email: user.email, role: user.role } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: "Soubor oprávnění je příliš velký" }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: "Neplatný formát dat" }, { status: 400 });
    }
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Chyba při registraci" }, { status: 500 });
  }
}
