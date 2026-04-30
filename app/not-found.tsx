import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#111111] text-white">
      <h2 className="text-4xl font-bold mb-4">404 - Stránka nenalezena</h2>
      <p className="text-gray-400 mb-8">Omlouváme se, ale požadovaná stránka neexistuje.</p>
      <Link href="/dashboard" className="px-6 py-3 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors">
        Zpět na Dashboard
      </Link>
    </div>
  )
}
