import { useState } from 'react'
import { defaultSettings } from './defaults'
import { DAY_NAMES, fmt, parseTime } from './lib'
import type { FixedBlock, Habit, Kind, PreferWindow, Settings } from './types'

interface Props {
  settings: Settings
  setSettings: (s: Settings) => void
}

const kinds: { value: Kind; label: string }[] = [
  { value: 'work', label: 'Trabalho' },
  { value: 'class', label: 'Aula' },
  { value: 'church', label: 'Igreja' },
  { value: 'family', label: 'Família (protegido)' },
  { value: 'other', label: 'Outro' },
]

const input = 'rounded bg-slate-700 px-2 py-1.5 text-sm'
const card = 'rounded-lg bg-slate-800 p-3'
const toggleDay = (days: number[], d: number) =>
  days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort()

const mapsUrl = (from: string, to: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=driving`

export default function SettingsView({ settings, setSettings }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  const patchHabit = (id: string, p: Partial<Habit>) =>
    setSettings({ ...settings, habits: settings.habits.map((h) => (h.id === id ? { ...h, ...p } : h)) })
  const patchFixed = (id: string, p: Partial<FixedBlock>) =>
    setSettings({ ...settings, fixed: settings.fixed.map((f) => (f.id === id ? { ...f, ...p } : f)) })

  const addHabit = () => {
    const id = crypto.randomUUID()
    setSettings({
      ...settings,
      habits: [...settings.habits, { id, title: 'Nova atividade', emoji: '🎯', minutes: 60, days: [], prefer: [] }],
    })
    setOpen(id)
  }
  const addFixed = () => {
    const id = crypto.randomUUID()
    setSettings({
      ...settings,
      fixed: [...settings.fixed, { id, title: 'Novo compromisso', kind: 'other', days: [], start: 18 * 60, end: 19 * 60 }],
    })
    setOpen(id)
  }

  return (
    <section className="space-y-8">
      <div className={`${card} space-y-3`}>
        <h2 className="font-semibold">Locais</h2>
        <label className="block text-xs text-slate-400">
          Casa
          <input
            value={settings.home}
            onChange={(e) => setSettings({ ...settings, home: e.target.value })}
            className={`${input} mt-1 w-full`}
          />
        </label>
        <label className="block text-xs text-slate-400">
          Academia
          <input
            value={settings.gymAddress}
            onChange={(e) => setSettings({ ...settings, gymAddress: e.target.value })}
            className={`${input} mt-1 w-full`}
          />
        </label>
        <a
          href={mapsUrl(settings.home, settings.gymAddress)}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-sky-400 underline"
        >
          Ver rota casa → academia no Google Maps
        </a>
        <p className="text-xs text-slate-400">
          O app não calcula a rota sozinho: confira o tempo no Maps e ajuste o deslocamento de cada atividade abaixo.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Hábitos e atividades</h2>
          <button onClick={addHabit} className="text-sm text-sky-400">
            + nova
          </button>
        </div>
        <ul className="space-y-2">
          {settings.habits.map((h) => (
            <li key={h.id} className={card}>
              <Header
                title={`${h.emoji} ${h.title}`}
                sub={`${h.days.length === 7 ? 'todo dia' : h.days.map((d) => DAY_NAMES[d]).join(', ') || 'sem dias'} · ${h.minutes} min${
                  h.travelMinutes ? ` · 🚗 ${h.travelMinutes} min cada trecho` : ''
                }`}
                isOpen={open === h.id}
                onToggle={() => setOpen(open === h.id ? null : h.id)}
              />
              {open === h.id && <HabitEditor h={h} patch={(p) => patchHabit(h.id, p)} remove={() => {
                setSettings({ ...settings, habits: settings.habits.filter((x) => x.id !== h.id) })
                setOpen(null)
              }} />}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Compromissos fixos</h2>
          <button onClick={addFixed} className="text-sm text-sky-400">
            + novo
          </button>
        </div>
        <ul className="space-y-2">
          {settings.fixed.map((f) => (
            <li key={f.id} className={card}>
              <Header
                title={f.title}
                sub={`${f.days.map((d) => DAY_NAMES[d]).join(', ') || 'sem dias'} · ${fmt(f.start)}–${fmt(f.end)}${
                  f.travelMinutes ? ` · 🚗 ${f.travelMinutes} min` : ''
                }`}
                isOpen={open === f.id}
                onToggle={() => setOpen(open === f.id ? null : f.id)}
              />
              {open === f.id && <FixedEditor f={f} patch={(p) => patchFixed(f.id, p)} remove={() => {
                setSettings({ ...settings, fixed: settings.fixed.filter((x) => x.id !== f.id) })
                setOpen(null)
              }} />}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => confirm('Restaurar a agenda padrão? Suas edições serão perdidas.') && setSettings(defaultSettings)}
        className="text-sm text-slate-400 underline"
      >
        Restaurar padrão
      </button>
    </section>
  )
}

function Header({ title, sub, isOpen, onToggle }: { title: string; sub: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex w-full items-center justify-between text-left">
      <span>
        <span className="block">{title}</span>
        <span className="block text-xs text-slate-400">{sub}</span>
      </span>
      <span className="text-sm text-sky-400">{isOpen ? 'fechar' : 'editar'}</span>
    </button>
  )
}

const num = (v: string, fallback: number, min = 0) => Math.max(min, Number(v) || fallback)

function HabitEditor({ h, patch, remove }: { h: Habit; patch: (p: Partial<Habit>) => void; remove: () => void }) {
  const setWindow = (i: number, p: Partial<PreferWindow>) =>
    patch({ prefer: h.prefer.map((w, k) => (k === i ? { ...w, ...p } : w)) })

  return (
    <div className="mt-3 space-y-3 border-t border-slate-700 pt-3">
      <div className="flex gap-2">
        <input value={h.emoji} onChange={(e) => patch({ emoji: e.target.value })} className={`${input} w-14 text-center`} />
        <input value={h.title} onChange={(e) => patch({ title: e.target.value })} className={`${input} flex-1`} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-slate-300">
        <label className="flex items-center gap-2">
          Duração (min)
          <input type="number" min={15} step={5} value={h.minutes} onChange={(e) => patch({ minutes: num(e.target.value, 60, 5) })} className={`${input} w-20`} />
        </label>
        <label className="flex items-center gap-2">
          Domingo (min)
          <input
            type="number"
            min={0}
            step={5}
            placeholder="igual"
            value={h.minutesByDay?.[0] ?? ''}
            onChange={(e) => {
              const rest = { ...h.minutesByDay }
              if (e.target.value === '') delete rest[0]
              else rest[0] = num(e.target.value, h.minutes, 5)
              patch({ minutesByDay: rest })
            }}
            className={`${input} w-20`}
          />
        </label>
        <label className="flex items-center gap-2">
          🚗 Deslocamento (min, ida)
          <input type="number" min={0} step={1} value={h.travelMinutes ?? 0} onChange={(e) => patch({ travelMinutes: num(e.target.value, 0) })} className={`${input} w-20`} />
        </label>
      </div>
      <DayPicker days={h.days} onChange={(d) => patch({ days: toggleDay(h.days, d) })} />

      <div className="space-y-2">
        <div className="text-xs text-slate-400">Horários preferidos (o app tenta nessa ordem; se não couber, usa qualquer vaga)</div>
        {h.prefer.map((w, i) => (
          <div key={i} className="space-y-1 rounded bg-slate-900/50 p-2">
            <DayPicker days={w.days} onChange={(d) => setWindow(i, { days: toggleDay(w.days, d) })} />
            <div className="flex items-center gap-2">
              <input type="time" value={fmt(w.start)} onChange={(e) => setWindow(i, { start: parseTime(e.target.value) })} className={input} />
              <span className="text-slate-400">até</span>
              <input type="time" value={fmt(w.end)} onChange={(e) => setWindow(i, { end: parseTime(e.target.value) })} className={input} />
              <button onClick={() => patch({ prefer: h.prefer.filter((_, k) => k !== i) })} className="ml-auto text-xs text-rose-400">
                remover
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => patch({ prefer: [...h.prefer, { days: h.days, start: 18 * 60, end: 22 * 60 }] })}
          className="text-sm text-sky-400"
        >
          + horário preferido
        </button>
      </div>

      <button onClick={() => confirm(`Remover "${h.title}"?`) && remove()} className="text-sm text-rose-400">
        Remover atividade
      </button>
    </div>
  )
}

function FixedEditor({ f, patch, remove }: { f: FixedBlock; patch: (p: Partial<FixedBlock>) => void; remove: () => void }) {
  return (
    <div className="mt-3 space-y-3 border-t border-slate-700 pt-3">
      <input value={f.title} onChange={(e) => patch({ title: e.target.value })} className={`${input} w-full`} />
      <select value={f.kind} onChange={(e) => patch({ kind: e.target.value as Kind })} className={`${input} w-full`}>
        {kinds.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      <DayPicker days={f.days} onChange={(d) => patch({ days: toggleDay(f.days, d) })} />
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <input type="time" value={fmt(f.start)} onChange={(e) => patch({ start: parseTime(e.target.value) })} className={input} />
        <span>até</span>
        <input type="time" value={fmt(f.end)} onChange={(e) => patch({ end: parseTime(e.target.value) })} className={input} />
        <label className="flex items-center gap-2">
          🚗 min (ida)
          <input type="number" min={0} value={f.travelMinutes ?? 0} onChange={(e) => patch({ travelMinutes: num(e.target.value, 0) })} className={`${input} w-20`} />
        </label>
      </div>
      <button onClick={() => confirm(`Remover "${f.title}"?`) && remove()} className="text-sm text-rose-400">
        Remover compromisso
      </button>
    </div>
  )
}

function DayPicker({ days, onChange }: { days: number[]; onChange: (d: number) => void }) {
  return (
    <div className="flex gap-1">
      {DAY_NAMES.map((n, i) => (
        <button
          key={n}
          onClick={() => onChange(i)}
          className={`flex-1 rounded py-1 text-xs ${days.includes(i) ? 'bg-sky-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
