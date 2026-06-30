import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import InvoiceClient from "./InvoiceClient";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  
  const order = await prisma.order.findFirst({
    where: { OR: [{ id }, { readableId: id }] },
    include: {
      customer: true,
      technician: true,
      company: true,
    }
  });

  if (!order) notFound();

  // Pouze technik, company nebo zakaznik muzou videt
  const isAuthorized = 
    order.technicianId === session.user.id || 
    order.companyId === session.user.id || 
    order.customerId === session.user.id ||
    session.user.role === 'ADMIN';

  if (!isAuthorized) {
    redirect('/dashboard');
  }

  // Přiorita faktury od technika: Pokud ji nahrál, přesměrujeme rovnou na její stažení/zobrazení
  if (order.invoiceFile) {
    redirect(`/api/orders/${order.readableId}/download?type=invoice`);
  }

  const biller = order.technician || order.company;

  return (
    <div className="min-h-screen bg-white">
      <InvoiceClient 
        order={order} 
        biller={biller} 
        customer={order.customer} 
      />
    </div>
  );
}
