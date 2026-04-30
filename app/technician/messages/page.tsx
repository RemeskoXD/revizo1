import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import MessagesClient from './MessagesClient';

export default async function TechnicianMessagesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'TECHNICIAN') {
    redirect('/login');
  }

  // Fetch orders assigned to this technician that have messages
  const ordersWithMessages = await prisma.order.findMany({
    where: {
      technicianId: session.user.id,
      messages: {
        some: {} // Only orders that have at least one message
      }
    },
    include: {
      customer: {
        select: { name: true, email: true }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: {
            select: { name: true, role: true }
          }
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return <MessagesClient orders={ordersWithMessages} currentUserId={session.user.id} />;
}
