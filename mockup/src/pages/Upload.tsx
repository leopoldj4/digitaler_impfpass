import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  ImageUp,
  CheckCircle2,
  ScanLine,
  AlertCircle,
  ChevronRight,
  X,
  Circle,
} from 'lucide-react'

type Step = 'idle' | 'camera' | 'scanning' | 'done'

const extractedData = {
  name: 'Max Mustermann',
  birthdate: '12.03.1990',
  vaccine: 'Comirnaty (COVID-19)',
  manufacturer: 'BioNTech/Pfizer',
  lot: 'GH5678',
  date: '04.10.2022',
  dose: '4. Dosis',
  vaccinatedBy: 'Dr. med. Klaus Müller',
  nextDue: 'Herbst 2024',
}

const fieldLabels: Record<string, string> = {
  name: 'Name',
  birthdate: 'Geburtsdatum',
  vaccine: 'Impfstoff',
  manufacturer: 'Hersteller',
  lot: 'Chargennummer',
  date: 'Impfdatum',
  dose: 'Dosis',
  vaccinatedBy: 'Geimpft von',
  nextDue: 'Nächste Empfehlung',
}

export default function Upload() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('idle')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Stop stream whenever leaving camera step
  useEffect(() => {
    if (step !== 'camera') {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [step])

  // Cleanup on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

  async function openCamera() {
    setCameraError(null)
    setStep('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      try {
        // Fallback: any available camera (e.g. PC webcam)
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      } catch {
        setCameraError('Kamera konnte nicht geöffnet werden. Bitte Berechtigung im Browser prüfen.')
        setStep('idle')
      }
    }
  }

  function capturePhoto() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    startScan()
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return
    e.target.value = ''
    startScan()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files[0]) startScan()
  }

  function startScan() {
    setStep('scanning')
    setTimeout(() => setStep('done'), 2400)
  }

  // ── Camera view ──────────────────────────────────────────────────────────────
  if (step === 'camera') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 z-10">
          <button
            onClick={() => setStep('idle')}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
            aria-label="Kamera schließen"
          >
            <X className="w-5 h-5 text-white" aria-hidden />
          </button>
          <p className="text-white text-sm font-medium">Impfpass fotografieren</p>
          <div className="w-10" />
        </div>

        {/* Video stream */}
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Scan frame overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-72 h-52">
              {/* Dimmed areas outside frame */}
              <div className="absolute inset-0 rounded-2xl border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
              {/* Corner brackets */}
              {[
                'top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl',
                'top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl',
                'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl',
                'bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl',
              ].map((cls, i) => (
                <div key={i} className={`absolute w-8 h-8 border-white ${cls}`} />
              ))}
              <p className="absolute -bottom-8 left-0 right-0 text-center text-white/80 text-xs">
                Impfpassseite in den Rahmen halten
              </p>
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-center gap-8 px-8 py-8">
          <button
            onClick={() => setStep('idle')}
            className="text-white/70 text-sm cursor-pointer active:opacity-70"
          >
            Abbrechen
          </button>
          <button
            onClick={capturePhoto}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center
                       active:scale-90 transition-all cursor-pointer shadow-xl"
            aria-label="Foto aufnehmen"
          >
            <Circle className="w-12 h-12 text-slate-800 fill-slate-800" aria-hidden />
          </button>
          <div className="w-16" />
        </div>
      </div>
    )
  }

  // ── Scanning ─────────────────────────────────────────────────────────────────
  if (step === 'scanning') {
    return (
      <div className="page pt-2 bg-slate-50">
        <div className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 card rounded-xl flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-slate-400" aria-hidden />
          </div>
          <div>
            <h1 className="text-slate-900 font-bold text-lg leading-tight">Impfpass hochladen</h1>
            <p className="text-slate-500 text-xs">Foto scannen &amp; digitalisieren</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-6">
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative bg-slate-200 border border-slate-300">
            <div className="absolute inset-4 border border-slate-300 rounded-lg" />
            <div className="absolute inset-0 flex flex-col gap-2 p-6 pt-8">
              {[60, 40, 70, 50, 45, 55].map((w, i) => (
                <div key={i} className="h-2 bg-slate-300 rounded-full" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div
              className="absolute left-0 right-0 h-[2px] bg-blue-500"
              style={{ animation: 'scanLine 1.8s ease-in-out infinite', top: '40%' }}
            />
            <style>{`
              @keyframes scanLine {
                0%   { top: 10%; opacity: 0; }
                10%  { opacity: 1; }
                90%  { opacity: 1; }
                100% { top: 90%; opacity: 0; }
              }
            `}</style>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <div className="flex items-center gap-2 bg-white/90 rounded-full px-3 py-1.5 shadow-sm">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-slate-700 text-xs font-medium">KI analysiert…</span>
              </div>
            </div>
          </div>
          <p className="text-slate-500 text-sm text-center">Ihren Impfpass wird verarbeitet…</p>
        </div>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="page pt-2 bg-slate-50">
        <div className="flex items-center gap-3 py-4">
          <button
            onClick={() => setStep('idle')}
            className="w-10 h-10 card rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" aria-hidden />
          </button>
          <div>
            <h1 className="text-slate-900 font-bold text-lg leading-tight">Impfpass hochladen</h1>
            <p className="text-slate-500 text-xs">Foto scannen &amp; digitalisieren</p>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" aria-hidden />
            <div>
              <p className="text-emerald-800 font-semibold text-sm">Erfolgreich erkannt</p>
              <p className="text-emerald-700 text-xs mt-0.5">Bitte Daten überprüfen &amp; bestätigen</p>
            </div>
          </div>

          <div className="card rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-1">
              Erkannte Impfdaten
            </p>
            {Object.entries(extractedData).map(([key, value]) => (
              <div key={key} className="flex justify-between items-start gap-4">
                <span className="text-slate-500 text-sm flex-shrink-0">{fieldLabels[key]}</span>
                <span className="text-slate-900 text-sm font-medium text-right">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 px-1">
            <span className="text-slate-500 text-xs">KI-Konfidenz</span>
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full w-[94%] bg-emerald-500 rounded-full" />
            </div>
            <span className="text-emerald-600 text-xs font-medium">94 %</span>
          </div>

          <button
            onClick={() => navigate('/overview')}
            className="btn-primary flex items-center justify-center gap-2 mt-2"
          >
            <CheckCircle2 className="w-5 h-5" aria-hidden />
            Daten übernehmen
            <ChevronRight className="w-4 h-4 ml-auto" aria-hidden />
          </button>

          <button
            onClick={() => setStep('idle')}
            className="text-center text-slate-500 text-sm py-2 cursor-pointer active:opacity-70"
          >
            Erneut scannen
          </button>
        </div>
      </div>
    )
  }

  // ── Idle ─────────────────────────────────────────────────────────────────────
  return (
    <div className="page pt-2 bg-slate-50">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,application/pdf"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden
      />

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
          <h1 className="text-slate-900 font-bold text-lg leading-tight">Impfpass hochladen</h1>
          <p className="text-slate-500 text-xs">Foto scannen &amp; digitalisieren</p>
        </div>
      </div>

      {/* Camera error */}
      {cameraError && (
        <div className="mb-4 flex gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-red-700 text-xs leading-relaxed">{cameraError}</p>
        </div>
      )}

      {/* Drag & Drop zone */}
      <button
        onClick={openFilePicker}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        className={`w-full aspect-[4/3] bg-white rounded-2xl flex flex-col items-center justify-center gap-4
                   border-2 border-dashed transition-all duration-200 cursor-pointer shadow-sm
                   ${isDragOver ? 'border-blue-500 bg-blue-50 scale-[0.99]' : 'border-blue-300 hover:border-blue-400'}`}
        aria-label="Datei auswählen oder hier ablegen"
      >
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100">
          <ScanLine className="w-8 h-8 text-blue-600" aria-hidden />
        </div>
        <div className="text-center">
          <p className="text-slate-900 font-semibold">
            {isDragOver ? 'Datei loslassen' : 'Hier klicken oder Datei ablegen'}
          </p>
          <p className="text-slate-500 text-sm mt-1">PNG, JPEG oder PDF</p>
        </div>
        <div className="flex gap-2">
          {['JPG', 'PNG', 'PDF'].map(f => (
            <span key={f} className="text-[11px] text-slate-500 bg-slate-100 rounded-lg px-2 py-1">{f}</span>
          ))}
        </div>
      </button>

      {/* Action buttons */}
      <div className="flex gap-3 mt-4">
        {/* Camera — opens webcam */}
        <button
          onClick={openCamera}
          className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl bg-blue-600
                     active:scale-[0.97] transition-all cursor-pointer shadow-sm"
          aria-label="Kamera öffnen"
        >
          <Camera className="w-5 h-5 text-white" aria-hidden />
          <span className="text-white font-medium text-sm">Kamera</span>
        </button>

        {/* File picker — PNG / JPEG / PDF */}
        <button
          onClick={openFilePicker}
          className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl card
                     active:scale-[0.97] transition-all cursor-pointer"
          aria-label="Datei aus Galerie oder Dateien wählen"
        >
          <ImageUp className="w-5 h-5 text-slate-600" aria-hidden />
          <span className="text-slate-700 font-medium text-sm">Hochladen</span>
        </button>
      </div>

      {/* Info */}
      <div className="mt-4 flex gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden />
        <p className="text-slate-600 text-xs leading-relaxed">
          Ihr Foto wird lokal verarbeitet und nicht an Dritte weitergegeben. Die
          KI-Erkennung läuft vollständig auf Ihrem Gerät.
        </p>
      </div>
    </div>
  )
}
