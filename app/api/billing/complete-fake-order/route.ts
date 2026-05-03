import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { paymentSuccessEmail } from "@/lib/email-templates";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Neautorizováno" }, { status: 401 });
    }

    const body = await req.json();
    const orderId = body.orderId;

    if (!orderId) {
      return NextResponse.json({ message: "Chybí orderId" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { readableId: orderId },
      include: { customer: true }
    });

    if (!order) {
      return NextResponse.json({ message: "Objednávka nenalezena" }, { status: 404 });
    }

    if (!order.isPaid) {
      await prisma.order.update({
        where: { id: order.id },
        data: { isPaid: true }
      });
      
      if (order.customer && order.customer.email && order.customer.emailNotifications) {
        const emailData = paymentSuccessEmail({
          userName: order.customer.name,
          serviceType: order.serviceType,
          price: order.price || 0,
          readableId: order.readableId,
        });
        sendMail({ to: order.customer.email, ...emailData }).catch(console.error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
