'use client';

import { useState } from 'react';
import { MessageSquare, User, ArrowRight, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function MessagesClient({ orders, currentUserId }: { orders: any[], currentUserId: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-white">Zprávy</h1>
        <p className="text-gray-400 mt-1">Komunikace se zákazníky u vašich zakázek.</p>
      </div>

      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white">Žádné zprávy</h3>
            <p className="text-gray-400 mt-1">Zatím nemáte žádné zprávy u vašich zakázek.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {orders.map((order) => {
              const lastMessage = order.messages[0];
              const isMe = lastMessage?.senderId === currentUserId;
              
              return (
                <Link 
                  key={order.id} 
                  href={`/technician/job/${order.readableId}`}
                  className="block p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-brand-yellow/10 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-brand-yellow" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-medium truncate">
                          {order.customer.name || order.customer.email}
                        </h3>
                        <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {lastMessage ? new Date(lastMessage.createdAt).toLocaleDateString('cs-CZ') : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 bg-white/10 text-gray-300 rounded">
                          {order.serviceType}
                        </span>
                        <span className="text-xs text-brand-yellow">
                          #{order.readableId}
                        </span>
                      </div>
                      {lastMessage && (
                        <p className={cn(
                          "text-sm truncate",
                          !isMe ? "text-white font-medium" : "text-gray-400"
                        )}>
                          {isMe ? 'Vy: ' : `${lastMessage.sender?.name || 'Zákazník'}: `}
                          {lastMessage.content}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-center h-12">
                      <ArrowRight className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
