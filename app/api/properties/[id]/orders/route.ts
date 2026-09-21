import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';
import { getLicenseStatus } from '@/lib/access-control';
import { sendMail } from "@/lib/mail";
import { orderConfirmationEmail } from "@/lib/email-templates";
import { getPricingDatabase } from "@/lib/pricing-db";
import { getStripe } from "@/lib/stripe-client";
import { getAppBaseUrl, isFakePaymentGatewayEnabled } from "@/lib/stripe-config";
import { BASE_BY_SERVICE_ID } from "@/lib/order-pricing";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['REALTY', 'SVJ', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: propertyId } = await params;

    const rl = rateLimit(`prop-ord:${session.user.id}`, 40, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho objednávek. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    // License check
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, licenseValidUntil: true, requiresSubscriptionCheckout: true },
    });
    if (me) {
      const licenseStatus = getLicenseStatus({
        role: me.role,
        licenseValidUntil: me.licenseValidUntil,
        requiresSubscriptionCheckout: me.requiresSubscriptionCheckout,
      });
      if (!licenseStatus.active) {
        return NextResponse.json(
          {
            message: licenseStatus.message,
            code: 'LICENSE_REQUIRED',
            state: licenseStatus.state,
            checkoutPath: '/dashboard/settings?tab=billing',
          },
          { status: 402 },
        );
      }
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ message: 'Property not found or unauthorized' }, { status: 404 });
    }

    const body = await readJsonBody<{
      serviceType?: string;
      serviceTypeId?: string | null;
      propertyType?: string;
      notes?: string | null;
      reportFile?: string | null;
      preferredDate?: string | null;
      revisionCategoryId?: string | null;
      isUrgent?: boolean;
      address?: string | null;
      customServiceName?: string | null;
      serviceTypeLabel?: string | null;
    }>(req, 20_000_000);

    let {
      serviceType,
      serviceTypeId,
      propertyType,
      notes,
      reportFile,
      preferredDate,
      revisionCategoryId,
      isUrgent,
      address,
    } = body;

    if (!serviceType) {
      return NextResponse.json({ message: 'Chybí typ služby' }, { status: 400 });
    }

    serviceType = String(serviceType).slice(0, 120);
    propertyType = propertyType != null ? String(propertyType).slice(0, 120) : 'Bytový dům';
    notes = notes != null ? String(notes).slice(0, 4000) : undefined;
    address = address != null ? String(address).trim().slice(0, 500) : property.address || property.name;
    reportFile = reportFile != null && typeof reportFile === 'string' ? reportFile : undefined;
    revisionCategoryId = revisionCategoryId != null ? String(revisionCategoryId).slice(0, 80) : undefined;
    const serviceTypeIdNorm =
      serviceTypeId != null && String(serviceTypeId).trim() !== ""
        ? String(serviceTypeId).slice(0, 120)
        : null;

    const isVlastni = serviceTypeIdNorm === "vlastni_revize";

    const idSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const readableId = `ORD-${new Date().getFullYear()}-${idSuffix}`;
    const cancelToken = crypto.randomBytes(24).toString('hex');

    let servicePackageId: string | null = null;
    let serviceTypeLabel = serviceType;
    let basePriceValue = 1500;

    if (isVlastni) {
      serviceTypeLabel = body.customServiceName
        ? `Vlastní revize: ${body.customServiceName}`
        : (body.serviceTypeLabel || "Vlastní revize");
      basePriceValue = 0;
    } else if (serviceTypeIdNorm) {
      // 1. Check database ServicePackage first
      const pkg = await prisma.servicePackage.findUnique({
        where: { id: serviceTypeIdNorm }
      });
      if (pkg) {
        servicePackageId = pkg.id;
        serviceTypeLabel = pkg.name;
        basePriceValue = pkg.approximatePrice || 1500;
      } else if (BASE_BY_SERVICE_ID[serviceTypeIdNorm]) {
        basePriceValue = BASE_BY_SERVICE_ID[serviceTypeIdNorm];
      } else {
        const pricingDb = await getPricingDatabase();
        const found = pricingDb.services.find(s => s.id === serviceTypeIdNorm);
        if (found) {
          basePriceValue = found.priceValue;
        }
      }
    }

    let price = isVlastni ? 0 : basePriceValue;
    if (!isVlastni && isUrgent === true) {
      const pricingDb = await getPricingDatabase();
      price += pricingDb.urgentSurcharge;
    }

    const orderData: any = {
      readableId,
      customerId: session.user.id,
      propertyId: property.id,
      serviceType: serviceTypeLabel,
      servicePackageId,
      propertyType,
      address,
      notes,
      price,
      isUrgent: !isVlastni && isUrgent === true,
      status: isVlastni ? "COMPLETED" : "PENDING",
      completedAt: isVlastni ? new Date() : null,
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
      data: orderData,
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
      return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    console.error('Error creating order:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
