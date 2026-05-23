import { useNavigate } from 'react-router-dom'
import { Camera, ClipboardList, Lock, ChevronRight, ShieldCheck, Server } from 'lucide-react'
import Logo from '../components/Logo'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="page pt-4 bg-slate-50">
      {/* Header / Hero */}
      <div className="flex flex-col items-center pt-6 pb-6">
        <div className="mb-4">
          <Logo size={96} />
        </div>

        <h1 className="text-[28px] font-bold text-slate-900 tracking-tight mb-1 text-center">
          Mein Impfschutz
        </h1>
        <p className="text-slate-500 text-sm text-center font-light">
          Ihr sicherer digitaler Impfausweis
        </p>

        {/* Status badge */}
        <div className="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          <span className="text-emerald-700 text-xs font-medium">Impfschutz aktuell</span>
        </div>
      </div>

      {/* Stat strip */}
      <div className="card rounded-2xl p-4 mb-4 flex divide-x divide-slate-100">
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="text-2xl font-bold text-slate-900">12</span>
          <span className="text-slate-500 text-[11px]">Impfungen</span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="text-2xl font-bold text-slate-900">6</span>
          <span className="text-slate-500 text-[11px]">Kategorien</span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="text-2xl font-bold text-blue-600">2</span>
          <span className="text-slate-500 text-[11px]">Freigaben</span>
        </div>
      </div>

      {/* Main action buttons */}
      <div className="flex flex-col gap-3">
        {/* Upload – primary CTA */}
        <button
          onClick={() => navigate('/upload')}
          className="flex items-center gap-4 p-4 rounded-2xl bg-blue-600
                     shadow-sm active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
          aria-label="Impfpassfoto hochladen"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Camera className="w-6 h-6 text-white" aria-hidden />
          </div>
          <div className="text-left flex-1">
            <p className="text-white font-semibold text-base leading-tight">Impfpassfoto hochladen</p>
            <p className="text-blue-100 text-xs mt-0.5">Foto scannen &amp; digitalisieren</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/70 flex-shrink-0" aria-hidden />
        </button>

        {/* Overview */}
        <button
          onClick={() => navigate('/overview')}
          className="flex items-center gap-4 p-4 rounded-2xl card
                     active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
          aria-label="Übersicht Impfdaten anzeigen"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100">
            <ClipboardList className="w-6 h-6 text-blue-600" aria-hidden />
          </div>
          <div className="text-left flex-1">
            <p className="text-slate-900 font-semibold text-base leading-tight">Übersicht Impfdaten</p>
            <p className="text-slate-500 text-xs mt-0.5">12 Impfungen dokumentiert</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" aria-hidden />
        </button>

        {/* Share / Freigabe */}
        <button
          onClick={() => navigate('/share')}
          className="flex items-center gap-4 p-4 rounded-2xl card
                     active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
          aria-label="Freigaben verwalten"
        >
          <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-violet-100">
            <Lock className="w-6 h-6 text-violet-600" aria-hidden />
          </div>
          <div className="text-left flex-1">
            <p className="text-slate-900 font-semibold text-base leading-tight">Freigabe verwalten</p>
            <p className="text-slate-500 text-xs mt-0.5">2 Praxen haben Zugriff</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" aria-hidden />
        </button>
      </div>

      {/* Google Wallet */}
      <button
        onClick={() => navigate('/wallet')}
        className="w-full mt-3 flex items-center justify-center gap-3 py-4 rounded-2xl
                   active:scale-[0.97] transition-all duration-150 cursor-pointer select-none shadow-md"
        style={{ background: '#1a1a1a' }}
        aria-label="Zu Google Wallet hinzufügen"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span className="text-white font-semibold text-[15px]">Zu Google Wallet hinzufügen</span>
      </button>

      {/* Trust badges — direkt unter den Buttons */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" aria-hidden />
          <span className="text-slate-500 text-[11px]">Ende-zu-Ende verschlüsselt</span>
        </div>
        <div className="w-1 h-1 bg-slate-300 rounded-full" />
        <div className="flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-slate-400" aria-hidden />
          <span className="text-slate-500 text-[11px]">Server in Deutschland</span>
        </div>
      </div>
    </div>
  )
}
