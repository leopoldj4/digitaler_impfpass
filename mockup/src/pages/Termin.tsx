import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, CheckCircle2, CalendarDays, Clock, ChevronRight, Home } from 'lucide-react'

const practices = [
  { id: 'p1', name: 'Dr. med. Klaus Müller', specialty: 'Allgemeinmedizin', city: 'München-Maxvorstadt', connected: true },
  { id: 'p2', name: 'Praxis Schneider & Bauer', specialty: 'Innere Medizin', city: 'München-Schwabing', connected: true },
  { id: 'p3', name: 'Dr. med. Lena Fischer', specialty: 'Allgemeinmedizin', city: 'München-Bogenhausen', connected: false },
]

const dates = [
  { label: 'Mo', date: '02.06.', available: true },
  { label: 'Di', date: '03.06.', available: true },
  { label: 'Mi', date: '04.06.', available: false },
  { label: 'Do', date: '05.06.', available: true },
  { label: 'Fr', date: '06.06.', available: true },
]

const times = ['08:30', '09:15', '10:00', '11:30', '14:00', '15:45', '16:30']

type Step = 'select' | 'confirm' | 'done'

export default function Termin() {
  const navigate = useNavigate()
  const [practice, setPractice] = useState<string | null>('p1')
  const [selectedDate, setSelectedDate] = useState<string | null>('Di')
  const [selectedTime, setSelectedTime] = useState<string | null>('09:15')
  const [step, setStep] = useState<Step>('select')

  const selectedPractice = practices.find(p => p.id === practice)

  if (step === 'done') {
    return (
      <div className="page pt-2 bg-slate-50 items-center justify-center">
        <div className="flex flex-col items-center gap-5 text-center px-4 mt-20">
          <div className="w-24 h-24 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" aria-hidden />
          </div>
          <div>
            <h2 className="text-slate-900 font-bold text-2xl">Termin bestätigt!</h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Ihre FSME-Auffrischung wurde erfolgreich angefragt.
            </p>
          </div>

          <div className="card rounded-2xl p-4 w-full text-left flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
              <span className="text-slate-800 text-sm">{selectedPractice?.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
              <span className="text-slate-800 text-sm">Di, 03.06.2026</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
              <span className="text-slate-800 text-sm">{selectedTime} Uhr · FSME-Auffrischung</span>
            </div>
          </div>

          <p className="text-slate-400 text-xs">
            Eine Bestätigung wird per SMS an Ihre hinterlegte Nummer gesendet.
          </p>

          <button
            onClick={() => navigate('/')}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
          >
            <Home className="w-4 h-4" aria-hidden />
            Zur Startseite
          </button>
        </div>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="page pt-2 bg-slate-50">
        <div className="flex items-center gap-3 py-4">
          <button
            onClick={() => setStep('select')}
            className="w-10 h-10 card rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" aria-hidden />
          </button>
          <div>
            <h1 className="text-slate-900 font-bold text-lg leading-tight">Termin bestätigen</h1>
            <p className="text-slate-500 text-xs">Bitte prüfen Sie Ihre Angaben</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-2">
          <div className="card rounded-2xl p-4 flex flex-col gap-4">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium">Terminübersicht</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-slate-900 text-sm font-medium">{selectedPractice?.name}</p>
                  <p className="text-slate-500 text-xs">{selectedPractice?.specialty} · {selectedPractice?.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
                <p className="text-slate-900 text-sm">Di, 03.06.2026</p>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
                <p className="text-slate-900 text-sm">{selectedTime} Uhr</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-slate-500 text-xs">Grund</p>
              <p className="text-slate-900 text-sm mt-1 font-medium">FSME-Auffrischung (fällig Jul 2026)</p>
            </div>
          </div>

          <div className="card rounded-2xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-2">Anmerkung (optional)</p>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-slate-400 text-sm">z. B. Allergie, Vorerkrankung …</p>
            </div>
          </div>

          <button onClick={() => setStep('done')} className="btn-primary flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" aria-hidden />
            Jetzt verbindlich anfragen
          </button>

          <p className="text-slate-400 text-xs text-center">
            Ihre Impfdaten werden automatisch mit der Praxis geteilt.
          </p>
        </div>
      </div>
    )
  }

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
          <h1 className="text-slate-900 font-bold text-lg leading-tight">Termin vereinbaren</h1>
          <p className="text-slate-500 text-xs">FSME-Auffrischung · fällig Jul 2026</p>
        </div>
      </div>

      {/* Urgency */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 mb-3">
        <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
        <p className="text-amber-800 text-xs">Ihr Schutz läuft in <span className="font-semibold">6 Wochen</span> aus</p>
      </div>

      {/* Step 1: Practice */}
      <section className="mb-3" aria-labelledby="practice-heading">
        <h2 id="practice-heading" className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-2 px-1">
          1 · Praxis wählen
        </h2>
        <div className="flex flex-col gap-1.5">
          {practices.map(p => (
            <button
              key={p.id}
              onClick={() => setPractice(p.id)}
              className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer active:scale-[0.98]
                ${practice === p.id
                  ? 'bg-blue-50 border border-blue-300 shadow-sm'
                  : 'card'
                }`}
              aria-pressed={practice === p.id}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border
                ${practice === p.id ? 'bg-blue-100 border-blue-200' : 'bg-slate-100 border-slate-200'}`}
              >
                <Building2 className={`w-4 h-4 ${practice === p.id ? 'text-blue-600' : 'text-slate-500'}`} aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 font-medium text-sm truncate">{p.name}</p>
                  {p.connected && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5 flex-shrink-0">
                      Verbunden
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-xs mt-0.5">{p.specialty} · {p.city}</p>
              </div>
              {practice === p.id && (
                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: Date */}
      <section className="mb-3" aria-labelledby="date-heading">
        <h2 id="date-heading" className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-2 px-1">
          2 · Datum wählen <span className="normal-case">(Jun 2026)</span>
        </h2>
        <div className="flex gap-2">
          {dates.map(d => (
            <button
              key={d.label}
              onClick={() => d.available && setSelectedDate(d.label)}
              disabled={!d.available}
              aria-pressed={selectedDate === d.label}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all
                ${!d.available ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                ${selectedDate === d.label
                  ? 'bg-blue-600 shadow-sm'
                  : 'bg-white border border-slate-200 shadow-sm'
                }`}
            >
              <span className={`text-[10px] font-medium ${selectedDate === d.label ? 'text-blue-100' : 'text-slate-500'}`}>
                {d.label}
              </span>
              <span className={`text-sm font-bold ${selectedDate === d.label ? 'text-white' : 'text-slate-900'}`}>
                {d.date.slice(0, 2)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Step 3: Time */}
      <section className="mb-4" aria-labelledby="time-heading">
        <h2 id="time-heading" className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-2 px-1">
          3 · Uhrzeit wählen
        </h2>
        <div className="grid grid-cols-4 gap-1.5">
          {times.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTime(t)}
              aria-pressed={selectedTime === t}
              className={`py-2 rounded-xl text-sm font-medium transition-all cursor-pointer active:scale-95
                ${selectedTime === t
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* CTA */}
      <button
        onClick={() => setStep('confirm')}
        disabled={!practice || !selectedDate || !selectedTime}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Weiter zur Bestätigung
        <ChevronRight className="w-4 h-4" aria-hidden />
      </button>
    </div>
  )
}
