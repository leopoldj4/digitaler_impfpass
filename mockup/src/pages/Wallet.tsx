import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react'

type State = 'preview' | 'loading' | 'success'

// Deterministic QR-like grid — same pattern every render
const QR_PATTERN = [
  [1,1,1,1,1,1,1,0,1,0,1,1,0,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,1,0,1,1,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,1,1,0,0,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,1,0,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,1,1,0,1,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,0,0,1,1,0,1,0,1,0,0,0,0,0,0,0],
  [1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1,0],
  [0,1,1,0,1,0,0,1,1,0,0,1,0,0,0,1,1,0,1,0,1],
  [1,1,0,1,0,1,1,0,1,1,0,0,1,1,1,0,0,1,1,1,0],
  [0,0,1,0,1,1,0,1,0,1,1,0,0,1,0,1,0,0,1,0,1],
  [1,0,1,0,0,0,1,0,1,0,0,1,1,0,1,0,1,1,0,1,1],
  [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,1,0,0,1,0,1],
  [1,1,1,1,1,1,1,0,0,1,1,0,1,1,1,0,1,1,0,1,0],
  [1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,0,1,1,0,1],
  [1,0,1,1,1,0,1,0,0,1,1,0,1,0,0,1,1,0,0,1,1],
  [1,0,1,1,1,0,1,0,1,0,0,1,0,1,1,0,0,1,0,0,1],
  [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,1,0,1,1,0,0],
  [1,0,0,0,0,0,1,0,1,0,0,1,1,0,0,1,1,0,1,1,0],
  [1,1,1,1,1,1,1,0,0,1,0,0,1,1,1,0,0,1,0,1,1],
]

function QRCode({ size = 72 }: { size?: number }) {
  const cols = QR_PATTERN[0].length
  const rows = QR_PATTERN.length
  const cell = size / cols
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
      {QR_PATTERN.map((row, r) =>
        row.map((val, c) =>
          val ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell}
              y={r * cell}
              width={cell}
              height={cell}
              fill="#1e293b"
            />
          ) : null
        )
      )}
    </svg>
  )
}

function WalletCard() {
  return (
    <div
      className="w-full rounded-3xl overflow-hidden shadow-xl"
      style={{ background: 'linear-gradient(160deg, #0f3460 0%, #16213e 55%, #0d1b2a 100%)', aspectRatio: '0.72' }}
    >
      <div className="flex flex-col justify-between h-full px-5 py-5">

        {/* Top: logo + title */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="26" height="26" viewBox="0 0 100 100" fill="none">
                <path
                  d="M50 6 C50 6 14 18 14 18 L14 52 C14 72 30 87 50 94 C70 87 86 72 86 52 L86 18 Z"
                  fill="none" stroke="#2DD4BF" strokeWidth="8" strokeLinejoin="round"
                />
                <path d="M28 48 L43 63 L72 34" stroke="#2DD4BF" strokeWidth="10"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <span className="text-white font-bold text-base tracking-tight">VaxCheck</span>
            </div>
            <span className="text-white/40 text-[10px] uppercase tracking-wider font-medium">Impfpass</span>
          </div>
        </div>

        {/* Middle: name + status */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-white/40 text-[9px] uppercase tracking-widest font-medium mb-1">Inhaber</p>
            <p className="text-white font-bold text-xl leading-tight">Max Mustermann</p>
          </div>

          <div className="flex items-center gap-1.5 self-start bg-emerald-400/20 border border-emerald-400/40 rounded-full px-3 py-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300 text-[10px] font-semibold uppercase tracking-wide">Vollständig geimpft</span>
          </div>

          <div className="flex gap-8">
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest font-medium mb-1">Impfungen</p>
              <p className="text-white font-bold text-2xl leading-none">12</p>
            </div>
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest font-medium mb-1">Kategorien</p>
              <p className="text-white font-bold text-2xl leading-none">6</p>
            </div>
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest font-medium mb-1">Letzte Impfung</p>
              <p className="text-white font-bold text-sm leading-tight">12. Mär.<br />2025</p>
            </div>
          </div>
        </div>

        {/* Bottom: QR code centered + card ID */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-white rounded-2xl p-2.5 shadow-lg">
            <QRCode size={90} />
          </div>
          <p className="text-white/25 text-[9px] font-mono tracking-widest">VC-2025-MM-001847</p>
        </div>
      </div>
    </div>
  )
}

function GoogleWalletButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl
                 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none shadow-md"
      style={{ background: '#1a1a1a' }}
      aria-label="Zu Google Wallet hinzufügen"
    >
      {/* Google G icon */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span className="text-white font-semibold text-[15px]">Zu Google Wallet hinzufügen</span>
    </button>
  )
}

export default function Wallet() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>('preview')

  function handleAdd() {
    setState('loading')
    setTimeout(() => setState('success'), 1600)
  }

  return (
    <div className="page pt-2 bg-slate-50">
      {/* Header */}
      {state !== 'success' && (
        <div className="flex items-center gap-3 py-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 card rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-slate-900 font-bold text-lg leading-tight">Google Wallet</h1>
            <p className="text-slate-500 text-xs">Impfpass als digitale Karte speichern</p>
          </div>
        </div>
      )}

      {/* Preview State */}
      {state === 'preview' && (
        <>
          <p className="text-slate-500 text-sm mb-5 leading-relaxed">
            Füge deinen Impfpass als Karte zu Google Wallet hinzu — immer griffbereit, auch offline.
          </p>

          <div className="mb-6">
            <h2 className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3 px-1">
              Vorschau deiner Karte
            </h2>
            <WalletCard />
          </div>

          <div className="card rounded-2xl p-4 mb-6">
            <p className="text-slate-500 text-xs leading-relaxed">
              <span className="text-slate-700 font-semibold">Was wird gespeichert?</span>{' '}
              Name, Impfanzahl und letztes Impfdatum. Keine Gesundheitsdetails, kein Cloud-Upload —
              die Karte liegt ausschließlich lokal auf deinem Gerät.
            </p>
          </div>

          <GoogleWalletButton onClick={handleAdd} />
        </>
      )}

      {/* Loading State */}
      {state === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 py-20">
          <div
            className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"
          />
          <p className="text-slate-600 font-medium text-base">Pass wird hinzugefügt…</p>
        </div>
      )}

      {/* Success State */}
      {state === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-16">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>

          <div className="text-center px-4">
            <h2 className="text-slate-900 font-bold text-2xl mb-2">Erfolgreich hinzugefügt!</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Dein Impfpass ist jetzt in Google Wallet verfügbar — auch ohne Internetverbindung.
            </p>
          </div>

          <div className="w-full px-2">
            <WalletCard />
          </div>

          <button
            onClick={() => navigate('/')}
            className="btn-primary w-full flex items-center justify-center text-sm py-3 mt-2"
          >
            Zur Startseite
          </button>
        </div>
      )}

      <div className="h-4" />
    </div>
  )
}
