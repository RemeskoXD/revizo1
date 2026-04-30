import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#0A1128] text-white font-sans flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden text-center p-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-[#0A1128] mb-4">Rezervace úspěšná!</h1>
        <p className="text-gray-600 mb-8">
          Děkujeme za váš zájem. Vaše žádost o bezplatnou kontrolu oken byla přijata. Náš technik vás bude brzy kontaktovat pro potvrzení termínu.
        </p>
        
        <Link 
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-4 bg-[#D4AF37] hover:bg-[#C5A028] text-[#0A1128] font-bold text-lg rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]"
        >
          Zpět na hlavní stránku <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
