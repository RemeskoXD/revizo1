import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { orderConfirmationEmail } from "@/lib/email-templates";
import crypto from "crypto";
import { readJsonBody, PayloadTooLargeError } from "@/lib/json-body";
import { rateLimit } from "@/lib/rate-limit";
import { getPricingDatabase } from "@/lib/pricing-db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Neautorizováno" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = session.user.role;
    const userId = session.user.id;

    // 1-day rule: Mark orders as public if assigned more than 24h ago and still PENDING
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.order.updateMany({
      where: {
        status: "PENDING",
        isPublic: false,
        assignedAt: {
          lt: oneDayAgo
        }
      },
      data: {
        isPublic: true,
        technicianId: null,
        companyId: null
      }
    });

    let orders;

    if (role === "ADMIN") {
      orders = await prisma.order.findMany({
        include: {
          customer: { select: { name: true, email: true } },
          technician: { select: { name: true, email: true } },
          company: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
      });
    } else if (role === "COMPANY_ADMIN") {
      orders = await prisma.order.findMany({
        where: { companyId: userId },
        include: {
          customer: { select: { name: true, email: true } },
          technician: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
      });
    } else if (role === "TECHNICIAN") {
      orders = await prisma.order.findMany({
        where: { technicianId: userId },
        include: {
          customer: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
      });
    } else {
      orders = await prisma.order.findMany({
        where: { customerId: userId },
        include: {
          technician: { select: { name: true, email: true } },
          company: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
      });
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ message: "Chyba při načítání objednávek" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Neautorizováno" }, { status: 401 });
    }

    const rl = rateLimit(`order-create:${session.user.id}`, 40, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: "Příliš mnoho nových objednávek za hodinu. Zkuste to později." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{
      serviceType?: string;
      /** Interní kód typu služby (např. elektro_byt) – pro výpočet ceny */
      serviceTypeId?: string | null;
      propertyType?: string;
      address?: string;
      notes?: string | null;
      reportFile?: string | null;
      preferredDate?: string | null;
      revisionCategoryId?: string | null;
      /** Urgentní termín = příplatek nad základní cenu */
      isUrgent?: boolean;
    }>(req, 96_384);

    let {
      serviceType,
      serviceTypeId,
      propertyType,
      address,
      notes,
      reportFile,
      preferredDate,
      revisionCategoryId,
    } = body;

    if (!serviceType || !propertyType || !address) {
      return NextResponse.json({ message: "Chybí povinné údaje" }, { status: 400 });
    }

    serviceType = String(serviceType).slice(0, 120);
    propertyType = String(propertyType).slice(0, 120);
    address = String(address).slice(0, 500);
    notes = notes != null ? String(notes).slice(0, 4000) : undefined;
    reportFile = reportFile != null ? String(reportFile).slice(0, 500) : undefined;
    revisionCategoryId = revisionCategoryId != null ? String(revisionCategoryId).slice(0, 80) : undefined;
    const serviceTypeIdNorm =
      serviceTypeId != null && String(serviceTypeId).trim() !== ""
        ? String(serviceTypeId).slice(0, 120)
        : null;

    const isVlastni = serviceTypeIdNorm === "vlastni_revize";

    const idSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const readableId = `ORD-${new Date().getFullYear()}-${idSuffix}`;

    const isUrgent = body.isUrgent === true;
    const priceKey = serviceTypeIdNorm ?? "";
    const pricingDb = await getPricingDatabase();
    
    let basePriceValue = 1500;
    const foundService = pricingDb.services.find(s => s.id === (priceKey || 'unknown'));
    if (foundService) {
      basePriceValue = foundService.priceValue;
    }

    let price = basePriceValue;
    if (!isVlastni && isUrgent) {
      price += pricingDb.urgentSurcharge;
    }
    if (isVlastni) {
      price = 0;
    }

    const cancelToken = crypto.randomBytes(24).toString('hex');

    const orderData: any = {
      readableId,
      customerId: session.user.id,
      serviceType,
      propertyType,
      address,
      notes,
      price,
      isUrgent: !isVlastni && isUrgent,
      status: isVlastni ? "COMPLETED" : "PENDING",
      reportFile: reportFile || null,
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      revisionCategoryId: revisionCategoryId || null,
      cancelToken,
    };

    if (!isVlastni) {
      // Find the highest priority technician or company
      const highestPriorityUser = await prisma.user.findFirst({
        where: {
          role: { in: ['TECHNICIAN', 'COMPANY_ADMIN'] },
          // Could add logic here to check if they are available or in the same region
        },
        orderBy: {
          priority: 'desc',
        },
      });

      if (highestPriorityUser) {
        if (highestPriorityUser.role === 'TECHNICIAN') {
          orderData.technicianId = highestPriorityUser.id;
          if (highestPriorityUser.companyId) {
            orderData.companyId = highestPriorityUser.companyId;
          }
        } else if (highestPriorityUser.role === 'COMPANY_ADMIN') {
          orderData.companyId = highestPriorityUser.id;
        }
        orderData.assignedAt = new Date();
      } else {
        orderData.isPublic = true;
      }
    }

    const order = await prisma.order.create({
      data: orderData
    });

    if (!isVlastni) {
      const customer = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, emailNotifications: true },
      });
      if (customer?.email && customer.emailNotifications) {
        const emailData = orderConfirmationEmail({
          readableId: order.readableId,
          serviceType: order.serviceType,
          address: order.address,
          price: order.price,
          preferredDate: order.preferredDate?.toISOString() || null,
          isUrgent: order.isUrgent,
          cancelToken,
        });
        sendMail({ to: customer.email, ...emailData }).catch(console.error);
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: "Požadavek je příliš velký" }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: "Neplatný formát dat" }, { status: 400 });
    }
    console.error("Error creating order:", error);
    return NextResponse.json({ message: "Chyba při vytváření objednávky" }, { status: 500 });
  }
}
