import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, CalendarDays, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react'

type VaccineStatus = 'aktuell' | 'auffrischung' | 'lebenslang'

interface Dose {
  date: string
  product: string
  manufacturer: string
  lot: string
  by?: string
}

interface VaccineGroup {
  id: string
  name: string
  status: VaccineStatus
  doses: Dose[]
  nextDue?: string
  note?: string
}

const vaccines: VaccineGroup[] = [
  {
    id: 'covid',
    name: 'COVID-19',
    status: 'aktuell',
    doses: [
      { date: '12.04.2021', product: 'Comirnaty', manufacturer: 'BioNTech/Pfizer', lot: 'EW0182', by: 'Dr. Müller' },
      { date: '03.07.2021', product: 'Comirnaty', manufacturer: 'BioNTech/Pfizer', lot: 'FD1244', by: 'Dr. Müller' },
      { date: '18.12.2021', product: 'Comirnaty', manufacturer: 'BioNTech/Pfizer', lot: 'GH5678', by: 'Praxis Schneider' },
      { date: '04.10.2022', product: 'Comirnaty Bivalent', manufacturer: 'BioNTech/Pfizer', lot: 'JK9012', by: 'Dr. Müller' },
    ],
    nextDue: 'Herbst 2024',
  },
  {
    id: 'tetanus',
    name: 'Tetanus & Diphtherie',
    status: 'aktuell',
    doses: [
      { date: '22.06.2019', product: 'Boostrix', manufacturer: 'GSK', lot: 'A7B4C2', by: 'Dr. Müller' },
    ],
    nextDue: 'Jun 2029',
  },
  {
    id: 'fsme',
    name: 'FSME',
    status: 'auffrischung',
    doses: [
      { date: '15.03.2021', product: 'FSME-Immun 0,5 ml', manufacturer: 'Pfizer/Baxter', lot: 'K1L2M3', by: 'Dr. Müller' },
      { date: '14.04.2021', product: 'FSME-Immun 0,5 ml', manufacturer: 'Pfizer/Baxter', lot: 'N4O5P6', by: 'Dr. Müller' },
      { date: '20.04.2022', product: 'FSME-Immun 0,5 ml', manufacturer: 'Pfizer/Baxter', lot: 'Q7R8S9', by: 'Dr. Müller' },
    ],
    nextDue: 'Jul 2026',
    note: 'Auffrischung empfohlen',
  },
  {
    id: 'influenza',
    name: 'Influenza',
    status: 'aktuell',
    doses: [
      { date: '22.10.2023', product: 'Vaxigrip Tetra', manufacturer: 'Sanofi', lot: 'T1U2V3', by: 'Praxis Schneider' },
    ],
    nextDue: 'Herbst 2024',
  },
  {
    id: 'mmr',
    name: 'Masern, Mumps, Röteln',
    status: 'lebenslang',
    doses: [
      { date: '08.02.1998', product: 'Priorix', manufacturer: 'GSK', lot: 'W4X5Y6', by: 'Kinderarztpraxis Bauer' },
      { date: '15.03.1998', product: 'Priorix', manufacturer: 'GSK', lot: 'Z7A8B9', by: 'Kinderarztpraxis Bauer' },
    ],
    note: 'Lebenslanger Schutz nachgewiesen',
  },
  {
    id: 'hepatitis',
    name: 'Hepatitis B',
    status: 'lebenslang',
    doses: [
      { date: '05.03.2018', product: 'Engerix-B', manufacturer: 'GSK', lot: 'C1D2E3', by: 'Dr. Müller' },
      { date: '05.04.2018', product: 'Engerix-B', manufacturer: 'GSK', lot: 'F4G5H6', by: 'Dr. Müller' },
      { date: '05.09.2018', product: 'Engerix-B', manufacturer: 'GSK', lot: 'I7J8K9', by: 'Dr. Müller' },
    ],
    note: 'Immunität bestätigt (Anti-HBs > 100 IE/L)',
  },
]

const statusConfig: Record<VaccineStatus, { label: string; dot: string; badge: string; text: string; icon: typeof ShieldCheck }> = {
  aktuell:      { label: 'Aktuell',      dot: 'bg-emerald-500', badge: 'bg-emerald-50 border-emerald-200',  text: 'text-emerald-700', icon: ShieldCheck },
  auffrischung: { label: 'Auffrischung', dot: 'bg-amber-500',   badge: 'bg-amber-50 border-amber-200',      text: 'text-amber-700',   icon: AlertTriangle },
  lebenslang:   { label: 'Lebenslang',   dot: 'bg-blue-500',    badge: 'bg-blue-50 border-blue-200',         text: 'text-blue-700',    icon: ShieldCheck },
}

function VaccineCard({ group }: { group: VaccineGroup }) {
  const [open, setOpen] = useState(false)
  const cfg = statusConfig[group.status]
  const Icon = cfg.icon

  return (
    <div className="card rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors"
        aria-expanded={open}
      >
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 font-semibold text-sm leading-tight truncate">{group.name}</p>
          <p className="text-slate-500 text-xs mt-0.5">{group.doses.length} Dosis{group.doses.length !== 1 ? 'en' : ''}</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 border ${cfg.badge}`}>
          <Icon className={`w-3 h-3 ${cfg.text}`} aria-hidden />
          <span className={`text-[11px] font-medium ${cfg.text}`}>{cfg.label}</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
        }
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 flex flex-col gap-3">
          {group.doses.map((dose, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <span className="text-blue-600 text-[10px] font-bold">{i + 1}</span>
                </div>
                {i < group.doses.length - 1 && (
                  <div className="w-px flex-1 bg-slate-200 min-h-[12px]" />
                )}
              </div>
              <div className="flex-1 pb-1">
                <p className="text-slate-900 text-sm font-medium">{dose.product}</p>
                <p className="text-slate-500 text-xs mt-0.5">{dose.manufacturer}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-slate-400" aria-hidden />
                    <span className="text-slate-500 text-xs">{dose.date}</span>
                  </div>
                  <span className="text-slate-400 text-xs">Lot: {dose.lot}</span>
                </div>
                {dose.by && <p className="text-slate-400 text-xs mt-0.5">{dose.by}</p>}
              </div>
            </div>
          ))}

          {(group.nextDue || group.note) && (
            <div className={`rounded-xl p-3 border ${cfg.badge} mt-1`}>
              {group.nextDue && (
                <p className={`text-xs font-medium ${cfg.text}`}>
                  Nächste Empfehlung: {group.nextDue}
                </p>
              )}
              {group.note && (
                <p className={`text-xs ${cfg.text} ${group.nextDue ? 'mt-0.5 opacity-80' : ''}`}>
                  {group.note}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Overview() {
  const navigate = useNavigate()
  const upToDate = vaccines.filter(v => v.status === 'aktuell').length
  const needsBooster = vaccines.filter(v => v.status === 'auffrischung').length

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
          <h1 className="text-slate-900 font-bold text-lg leading-tight">Meine Impfungen</h1>
          <p className="text-slate-500 text-xs">Alle dokumentierten Impfungen</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="card rounded-2xl p-3 flex flex-col items-center gap-1">
          <span className="text-2xl font-bold text-slate-900">12</span>
          <span className="text-slate-500 text-[10px] text-center">gesamt</span>
        </div>
        <div className="card rounded-2xl p-3 flex flex-col items-center gap-1">
          <span className="text-2xl font-bold text-emerald-600">{upToDate}</span>
          <span className="text-slate-500 text-[10px] text-center">Aktuell</span>
        </div>
        <div className="card rounded-2xl p-3 flex flex-col items-center gap-1">
          <span className="text-2xl font-bold text-amber-600">{needsBooster}</span>
          <span className="text-slate-500 text-[10px] text-center">Auffrischung</span>
        </div>
      </div>

      {/* FSME warning with Termin link */}
      {needsBooster > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 mb-4 overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-amber-800 font-semibold text-sm">FSME-Auffrischung empfohlen</p>
              <p className="text-amber-700 text-xs mt-0.5">
                Ihr FSME-Schutz läuft im Juli 2026 aus. Jetzt Termin vereinbaren.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/termin')}
            className="w-full flex items-center justify-between px-4 py-3 bg-amber-100 border-t border-amber-200 active:bg-amber-200 transition-colors cursor-pointer"
            aria-label="Termin vereinbaren"
          >
            <span className="text-amber-800 font-semibold text-sm">Termin vereinbaren</span>
            <ArrowRight className="w-4 h-4 text-amber-700" aria-hidden />
          </button>
        </div>
      )}

      {/* Vaccine list */}
      <div className="flex flex-col gap-3">
        {vaccines.map(v => (
          <VaccineCard key={v.id} group={v} />
        ))}
      </div>

      <p className="text-slate-400 text-xs text-center mt-6">
        Letzte Aktualisierung: 04.10.2023
      </p>
    </div>
  )
}
