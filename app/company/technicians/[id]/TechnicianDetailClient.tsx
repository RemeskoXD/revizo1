'use client';

import { ArrowLeft, Mail, Phone, Calendar, CheckCircle2, AlertTriangle, Briefcase, MapPin, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { AnimatedItem } from '@/components/AnimatedItem';

export default function TechnicianDetailClient({ technician }: { technician: any }) {
  const completedOrders = technician.assignedOrders.filter((o: any) => o.status === 'COMPLETED');
  const activeOrders = technician.assignedOrders.filter((o: any) => o.status === 'IN_PROGRESS' || o.status === 'PENDING');
  
  const totalEarnings = completedOrders.reduce((sum: number, o: any) => sum + (o.price || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/company/technicians" className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
            <h1 className="text-2xl font-bold text-white">{technician.name || 'Neznámý technik'}</h1>
            <p className="text-gray-400 text-sm mt-1">Detail technika a přehled zakázek</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Profile */}
        <div className="space-y-6">
          <AnimatedItem delay={0.1} className="bg-[#111] border border-white/5 rounded-xl p-6">
            <div className="w-20 h-20 rounded-full bg-brand-yellow/10 flex items-center justify-center mb-6 mx-auto">
              <span className="text-2xl font-bold text-brand-yellow">
                {technician.name ? technician.name.charAt(0).toUpperCase() : 'T'}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="w-5 h-5 text-gray-500" />
                <span className="truncate">{technician.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Phone className="w-5 h-5 text-gray-500" />
                <span>{technician.phone || 'Nenastaveno'}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span>Připojen {new Date(technician.createdAt).toLocaleDateString('cs-CZ')}</span>
              </div>
            </div>
          </AnimatedItem>

          <AnimatedItem delay={0.2} className="bg-[#111] border border-white/5 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Statistiky</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Aktivní zakázky</span>
                <span className="text-white font-bold">{activeOrders.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Dokončeno</span>
                <span className="text-white font-bold">{completedOrders.length}</span>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-gray-400">Celkový výdělek</span>
                <span className="text-brand-yellow font-bold">{totalEarnings.toLocaleString('cs-CZ')} Kč</span>
              </div>
            </div>
          </AnimatedItem>
        </div>

        {/* Right Column - Orders */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Přiřazené zakázky</h3>
          
          {technician.assignedOrders.length === 0 ? (
            <div className="text-center py-12 bg-[#1A1A1A] border border-white/5 rounded-xl">
              <p className="text-gray-500">Tento technik zatím nemá žádné zakázky.</p>
            </div>
          ) : (
            technician.assignedOrders.map((order: any, index: number) => (
              <AnimatedItem key={order.id} delay={0.1 * index}>
                <Link href={`/company/orders/${order.readableId}`} className="block group">
                  <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 hover:border-brand-yellow/50 transition-all hover:shadow-lg hover:shadow-brand-yellow/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">#{order.readableId}</span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' :
                              order.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500' :
                              order.status === 'NEEDS_REVISION' ? 'bg-orange-500/10 text-orange-500' :
                              order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
                              'bg-yellow-500/10 text-yellow-500'
                          }`}>
                              {order.status === 'COMPLETED' ? 'Dokončeno' :
                               order.status === 'IN_PROGRESS' ? 'Probíhá' :
                               order.status === 'NEEDS_REVISION' ? 'K přepracování' :
                               order.status === 'CANCELLED' ? 'Zrušeno' : 'Nová'}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-brand-yellow transition-colors">{order.serviceType}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" /> {order.address}
                          </div>
                          {order.price && (
                            <div className="flex items-center gap-1 text-brand-yellow">
                                <DollarSign className="w-4 h-4" /> {order.price.toLocaleString('cs-CZ')} Kč
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-white font-medium justify-end">
                            <Calendar className="w-4 h-4 text-brand-yellow" /> {new Date(order.createdAt).toLocaleDateString('cs-CZ')}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </AnimatedItem>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
