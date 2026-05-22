import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Lock,
  Plus,
  QrCode,
  Clock,
  CheckCircle2,
  Building2,
  Eye,
  Trash2,
} from 'lucide-react'

interface Practice {
  id: string
  name: string
  specialty: string
  city: string
  connectedSince: string
  lastAccess: string
  enabled: boolean
}

interface AccessLog {
  practice: string
  action: string
  time: string
}

const initialPractices: Practice[] = [
  {
    id: 'p1',
    name: 'Dr. med. Klaus Müller',
    specialty: 'Allgemeinmedizin',
    city: 'München-Maxvorstadt',
    connectedSince: '12.01.2024',
    lastAccess: 'Heute, 09:14 Uhr',
    enabled: true,
  },
  {
    id: 'p2',
    name: 'Praxis Schneider & Bauer',
    specialty: 'Innere Medizin',
    city: 'München-Schwabing',
    connectedSince: '03.03.2023',
    lastAccess: '14.05.2024',
    enabled: true,
  },
  {
    id: 'p3',
    name: 'MVZ Mariahilf',
    specialty: 'Hausarztpraxis',
    city: 'München-Neuhausen',
    connectedSince: '22.11.2022',
    lastAccess: 'Kein Zugriff',
    enabled: false,
  },
]

const accessLog: AccessLog[] = [
  { practice: 'Dr. med. Klaus Müller', action: 'Impfdaten abgerufen', time: 'Heute, 09:14' },
  { practice: 'Praxis Schneider & Bauer', action: 'Impfdaten abgerufen', time: '14.05.2024, 11:30' },
  { practice: 'Dr. med. Klaus Müller', action: 'Neue Freigabe aktiviert', time: '12.01.2024, 08:00' },
  { practice: 'Praxis Schneider & Bauer', action: 'Impfdaten abgerufen', time: '01.04.2024, 14:22' },
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`
        relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0 cursor-pointer overflow-hidden
        ${on ? 'bg-blue-600' : 'bg-slate-200'}
      `}
    >
      <span
        className={`
          absolute top-[4px] w-5 h-5 bg-white rounded-full shadow transition-all duration-200
          ${on ? 'left-[24px]' : 'left-[4px]'}
        `}
      />
    </button>
  )
}

export default function Share() {
  const navigate = useNavigate()
  const [practices, setPractices] = useState(initialPractices)
  const [qrVisible, setQrVisible] = useState(false)
  const [qrTimer, setQrTimer] = useState(300)

  function togglePractice(id: string, val: boolean) {
    setPractices(ps => ps.map(p => p.id === id ? { ...p, enabled: val } : p))
  }

  function handleQr() {
    setQrVisible(true)
    let t = 300
    const iv = setInterval(() => {
      t -= 1
      setQrTimer(t)
      if (t <= 0) {
        clearInterval(iv)
        setQrVisible(false)
        setQrTimer(300)
      }
    }, 1000)
  }

  const activeCount = practices.filter(p => p.enabled).length

  return (
    <div className="page pt-2 bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-3 py-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 card rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer"
          aria-label="Zurück"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" aria-hidden />
        </button>
        <div>
          <h1 className="text-slate-900 font-bold text-lg leading-tight">Freigabe verwalten</h1>
          <p className="text-slate-500 text-xs">{activeCount} aktive Freigabe{activeCount !== 1 ? 'n' : ''}</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-violet-50 border border-violet-200 mb-5">
        <Lock className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" aria-hidden />
        <p className="text-slate-600 text-xs leading-relaxed">
          Teilen Sie Ihre Impfdaten sicher mit Ihren Praxen. Sie können den Zugriff jederzeit
          widerrufen. Praxen sehen nur Ihre Impfhistorie, keine weiteren Daten.
        </p>
      </div>

      {/* Connected practices */}
      <section className="mb-5" aria-labelledby="practices-heading">
        <h2 id="practices-heading" className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3 px-1">
          Verbundene Praxen
        </h2>
        <div className="flex flex-col gap-3">
          {practices.map(p => (
            <div key={p.id} className="card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-violet-100">
                  <Building2 className="w-5 h-5 text-violet-600" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-semibold text-sm leading-tight truncate">{p.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{p.specialty} · {p.city}</p>
                </div>
                <Toggle on={p.enabled} onChange={v => togglePractice(p.id, v)} />
              </div>

              {p.enabled && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" aria-hidden />
                    <span className="text-slate-500 text-[11px]">Zuletzt: {p.lastAccess}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" aria-hidden />
                    <span className="text-slate-500 text-[11px]">Seit {p.connectedSince}</span>
                  </div>
                </div>
              )}

              {!p.enabled && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-slate-400 text-[11px]">Zugriff deaktiviert</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          className="w-full mt-3 flex items-center justify-center gap-2 p-4 rounded-2xl
                     border border-dashed border-slate-300 text-slate-500
                     active:scale-[0.97] transition-all cursor-pointer hover:border-slate-400 hover:text-slate-700"
          aria-label="Neue Praxis hinzufügen"
        >
          <Plus className="w-4 h-4" aria-hidden />
          <span className="text-sm">Neue Praxis hinzufügen</span>
        </button>
      </section>

      {/* Temporary QR access */}
      <section className="mb-5" aria-labelledby="qr-heading">
        <h2 id="qr-heading" className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3 px-1">
          Temporärer Zugang
        </h2>
        <div className="card rounded-2xl p-4">
          {!qrVisible ? (
            <>
              <div className="flex items-start gap-3 mb-4">
                <QrCode className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-slate-900 font-semibold text-sm">QR-Code generieren</p>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                    Erstellt einen einmaligen Zugangscode für 5 Minuten — ideal für spontane
                    Arzttermine ohne bestehende Freigabe.
                  </p>
                </div>
              </div>
              <button
                onClick={handleQr}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-3"
              >
                <QrCode className="w-4 h-4" aria-hidden />
                QR-Code erstellen
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {/* QR code mockup */}
              <div className="relative w-40 h-40 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                <div className="w-full h-full grid grid-cols-7 gap-0.5">
                  {Array.from({ length: 49 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-[1px]"
                      style={{ background: Math.random() > 0.45 ? '#1e293b' : 'transparent' }}
                    />
                  ))}
                </div>
                <div className="absolute top-3 left-3 w-8 h-8 border-[3px] border-slate-800 rounded-sm" />
                <div className="absolute top-3 right-3 w-8 h-8 border-[3px] border-slate-800 rounded-sm" />
                <div className="absolute bottom-3 left-3 w-8 h-8 border-[3px] border-slate-800 rounded-sm" />
                <div className="absolute top-5 left-5 w-4 h-4 bg-slate-800 rounded-[1px]" />
                <div className="absolute top-5 right-5 w-4 h-4 bg-slate-800 rounded-[1px]" />
                <div className="absolute bottom-5 left-5 w-4 h-4 bg-slate-800 rounded-[1px]" />
              </div>

              <div className="text-center">
                <p className="text-slate-700 font-semibold text-sm">Code gültig für</p>
                <p className="text-blue-600 text-2xl font-bold font-mono mt-1">
                  {Math.floor(qrTimer / 60).toString().padStart(2, '0')}:
                  {(qrTimer % 60).toString().padStart(2, '0')}
                </p>
                <p className="text-slate-500 text-xs mt-1">Nur 1× verwendbar · Nur Impfhistorie</p>
              </div>

              <button
                onClick={() => { setQrVisible(false); setQrTimer(300) }}
                className="text-slate-500 text-sm cursor-pointer active:opacity-70"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Access log */}
      <section aria-labelledby="log-heading">
        <h2 id="log-heading" className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3 px-1">
          Zugriffsprotokoll
        </h2>
        <div className="card rounded-2xl overflow-hidden">
          {accessLog.map((entry, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 ${i < accessLog.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Eye className="w-4 h-4 text-slate-500" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 text-xs font-medium leading-tight truncate">{entry.practice}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">{entry.action}</p>
              </div>
              <span className="text-slate-400 text-[11px] flex-shrink-0 text-right leading-tight">{entry.time}</span>
            </div>
          ))}
        </div>

        <button
          className="w-full mt-3 flex items-center justify-center gap-2 p-3 rounded-2xl
                     text-red-500 text-sm active:opacity-70 transition-all cursor-pointer"
          aria-label="Alle Freigaben widerrufen"
        >
          <Trash2 className="w-4 h-4" aria-hidden />
          Alle Freigaben widerrufen
        </button>
      </section>

      <div className="h-4" />
    </div>
  )
}
