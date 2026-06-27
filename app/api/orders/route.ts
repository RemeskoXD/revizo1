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
import { getStripe } from "@/lib/stripe-client";
import { getAppBaseUrl, isFakePaymentGatewayEnabled } from "@/lib/stripe-config";
import { getLicenseStatus } from "@/lib/access-control";

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

    // License/Order check: Customer has 1 free revision, next ones require addon
    const userForLimit = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, objectLimitExtraPaid: true }
    });

    const body = await readJsonBody<any>(req, 96_384);

    let {
      serviceTypeIds,
      propertyType,
      address,
      notes,
      reportFile,
      preferredDate,
      revisionCategoryId,
    } = body;

    if (!serviceTypeIds || !Array.isArray(serviceTypeIds) || serviceTypeIds.length === 0 || !address) {
      return NextResponse.json({ message: "Chybí povinné údaje" }, { status: 400 });
    }

    if (userForLimit && userForLimit.role === 'CUSTOMER') {
      const uniqueAddresses = await prisma.order.groupBy({
        by: ['address'],
        where: { customerId: session.user.id, isDeleted: false }
      });
      
      const existingAddresses = uniqueAddresses.map(u => u.address);
      const isNewAddress = !existingAddresses.includes(String(address).slice(0, 500));
      
      const customerObjectsCount = existingAddresses.length;
      const extraPaid = userForLimit.objectLimitExtraPaid || 0;
      const allowedObjects = 1 + extraPaid;
      const requestedNewObjects = isNewAddress ? 1 : 0;

      if (customerObjectsCount + requestedNewObjects > allowedObjects) {
        return NextResponse.json(
          {
            message: "Další objekt (budova) je za příplatek 100 Kč / rok.",
            code: "LICENSE_REQUIRED",
            checkoutPath: "/api/stripe/checkout/addon?kind=CUSTOMER_EXTRA_OBJECT",
            state: "EXPIRED"
          },
          { status: 402 }
        );
      }
    }

    propertyType = propertyType ? String(propertyType).slice(0, 120) : "Nespecifikováno";
    address = String(address).slice(0, 500);
    notes = notes != null ? String(notes).slice(0, 4000) : undefined;
    reportFile = reportFile != null ? String(reportFile).slice(0, 500) : undefined;
    revisionCategoryId = revisionCategoryId != null ? String(revisionCategoryId).slice(0, 80) : undefined;

    const customer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, referredByRealtorId: true, emailNotifications: true }
    });

    const createdOrders = [];

    for (const stId of serviceTypeIds) {
      const isVlastni = stId === "vlastni_revize";
      const idSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
      const readableId = `ORD-${new Date().getFullYear()}-${idSuffix}`;
      const isUrgent = body.isUrgent === true;
      const cancelToken = crypto.randomBytes(24).toString('hex');
      
      let servicePackageId: string | null = null;
      let serviceTypeLabel = stId;
      
      if (!isVlastni && stId) {
        const pkg = await prisma.servicePackage.findUnique({
          where: { id: stId }
        });
        if (pkg) {
          servicePackageId = pkg.id;
          serviceTypeLabel = pkg.name;
        }
      } else if (isVlastni) {
        serviceTypeLabel = "Vlastní revize";
      }

      const orderData: any = {
        readableId,
        customerId: session.user.id,
        serviceType: serviceTypeLabel,
        servicePackageId,
        propertyType,
        address,
        notes,
        price: isVlastni ? 0 : null,
        isUrgent: !isVlastni && isUrgent,
        status: isVlastni ? "COMPLETED" : "PENDING",
        reportFile: reportFile || null,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        revisionCategoryId: revisionCategoryId || null,
        cancelToken,
      };

      if (!isVlastni) {
        let priorityUser = null;
        
        if (customer?.referredByRealtorId) {
          const referrer = await prisma.user.findUnique({
            where: { id: customer.referredByRealtorId }
          });
          if (referrer && (referrer.role === 'TECHNICIAN' || referrer.role === 'COMPANY_ADMIN')) {
            priorityUser = referrer;
          }
        }
        
        if (!priorityUser && servicePackageId) {
          priorityUser = await prisma.user.findFirst({
            where: {
              role: { in: ['TECHNICIAN', 'COMPANY_ADMIN'] },
            },
            orderBy: {
              priority: 'desc',
            },
          });
        }

        if (priorityUser) {
          if (priorityUser.role === 'TECHNICIAN') {
            orderData.technicianId = priorityUser.id;
            if (priorityUser.companyId) {
              orderData.companyId = priorityUser.companyId;
            }
          } else if (priorityUser.role === 'COMPANY_ADMIN') {
            orderData.companyId = priorityUser.id;
          }
          orderData.assignedAt = new Date();
        } else {
          orderData.isPublic = true;
        }
      }

      const order = await prisma.order.create({
        data: orderData
      });
      createdOrders.push(order);

      if (!isVlastni && customer?.email && customer.emailNotifications) {
        const emailData = orderConfirmationEmail({
          readableId: order.readableId,
          serviceType: order.serviceType,
          address: order.address,
          price: null,
          preferredDate: order.preferredDate?.toISOString() || null,
          isUrgent: order.isUrgent,
          cancelToken,
          paymentUrl: undefined,
        });
        sendMail({ to: customer.email, ...emailData }).catch(console.error);
      }
    }

    return NextResponse.json({ orders: createdOrders }, { status: 201 });
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
