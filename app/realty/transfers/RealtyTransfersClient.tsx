'use client';

import { useState } from 'react';
import { Send, FileText, CheckCircle2, Clock, XCircle, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

export default function RealtyTransfersClient({ transfers, availableDocuments }: { transfers: any[], availableDocuments: any[] }) {
  const [receiverEmail, setReceiverEmail] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverEmail || !documentId) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/realty/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverEmail, documentId }),
      });

      if (res.ok) {
        alert('Žádost o převod byla úspěšně odeslána.');
        setReceiverEmail('');
        setDocumentId('');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.message || 'Došlo k chybě při odesílání žádosti.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při odesílání žádosti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Převody dokumentů</h1>
        <p className="text-gray-400">Převeďte vlastnictví revizních zpráv na nové majitele.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-brand-yellow" /> Nový převod
            </h3>
            
            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">E-mail příjemce</label>
                <input 
                  type="email" 
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  placeholder="např. novy.majitel@email.cz"
                  className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-white focus:border-brand-yellow outline-none"
                  required
                />
                <p className="text-xs text-gray-500">Příjemce musí mít vytvořený účet v Revizone.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Vyberte dokument</label>
                <select 
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-white focus:border-brand-yellow outline-none"
                  required
                >
                  <option value="">Vyberte...</option>
                  {availableDocuments.map(doc => (
                    <option key={doc.id} value={doc.readableId}>
                      {doc.serviceType} - {doc.address} ({doc.readableId})
                    </option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !receiverEmail || !documentId}
                className="w-full py-2.5 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors disabled:opacity-50 mt-4"
              >
                {isSubmitting ? 'Odesílám...' : 'Odeslat ke schválení'}
              </button>
            </form>
          </div>
        </div>

        {/* History */}
        <div className="lg:col-span-2">
          <div className="bg-[#111] border border-white/5 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Historie převodů</h3>
            
            <div className="space-y-4">
              {transfers.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                  <p className="text-gray-500">Zatím nemáte žádné převody.</p>
                </div>
              ) : (
                transfers.map((transfer, index) => (
                  <motion.div 
                    key={transfer.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg border border-white/5"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        transfer.status === 'ACCEPTED' ? 'bg-green-500/10' :
                        transfer.status === 'REJECTED' ? 'bg-red-500/10' :
                        'bg-yellow-500/10'
                      }`}>
                        <FileText className={`w-5 h-5 ${
                          transfer.status === 'ACCEPTED' ? 'text-green-500' :
                          transfer.status === 'REJECTED' ? 'text-red-500' :
                          'text-yellow-500'
                        }`} />
                      </div>
                      <div>
                        <p className="text-white font-medium">Dokument #{transfer.documentId}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                          <User className="w-3 h-3" /> {transfer.receiver.email}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Odesláno: {new Date(transfer.createdAt).toLocaleDateString('cs-CZ')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        transfer.status === 'ACCEPTED' ? 'bg-green-500/10 text-green-500' :
                        transfer.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {transfer.status === 'ACCEPTED' && <CheckCircle2 className="w-3 h-3" />}
                        {transfer.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {transfer.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        
                        {transfer.status === 'ACCEPTED' ? 'Přijato' :
                         transfer.status === 'REJECTED' ? 'Zamítnuto' : 'Čeká na přijetí'}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
