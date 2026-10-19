import { useEffect, useMemo, useState } from 'react'
import { defaultSettings } from './defaults'
import { addDays, DAY_NAMES, DAY_NAMES_LONG, fmt, isoDate, minutesNow, streak } from './lib'
import { planDay } from './scheduler'
import { useStored } from './storage'
import type { Completions, Overrides, PlannedBlock, Settings } from './types'
import SettingsView from './SettingsView'
import EditSheet from './EditSheet'

type Tab = 'hoje' | 'semana' | 'ajustes'

const kindStyle: Record<string, string> = {
  work: 'border-slate-500 bg-slate-800 text-slate-300',
  class: 'border-amber-500 bg-amber-950/40 text-amber-200',
  church: 'border-violet-400 bg-violet-950/40 text-violet-200',
  travel: 'border-dashed border-slate-600 bg-transparent text-slate-400',
  family: 'border-rose-400 bg-rose-950/40 text-rose-200',
  other: 'border-slate-500 bg-slate-800 text-slate-300',
}

export default function App() {
  const [tab, setTab] = useState<Tab>('hoje')
  const [settings, setSettings] = useStored<Settings>('tm.settings.v4', defaultSettings)
  const [done, setDone] = useStored<Completions>('tm.done', {})
  const [overrides, setOverrides] = useStored<Overrides>('tm.overrides', {})
  const [edit, setEdit] = useState<{ date: string; block: PlannedBlock | null } | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const toggle = (date: string, habitId: string) =>
    setDone((d) => ({ ...d, [date]: { ...d[date], [habitId]: !d[date]?.[habitId] } }))

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-24 pt-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold">TimeMind</h1>
        <p className="text-sm text-slate-400">
          {DAY_NAMES_LONG[now.getDay()]}, {now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
        </p>
      </header>

      {tab === 'hoje' && <Today settings={settings} done={done} toggle={toggle} now={now} overrides={overrides} onEdit={(date, block) => setEdit({ date, block })} />}
      {tab === 'semana' && <Week settings={settings} done={done} now={now} overrides={overrides} onEdit={(date, block) => setEdit({ date, block })} />}
      {tab === 'ajustes' && <SettingsView settings={settings} setSettings={setSettings} />}

      {edit && (
        <EditSheet
          key={edit.date + (edit.block?.id ?? 'new')}
          date={edit.date}
          block={edit.block}
          overrides={overrides}
          setOverrides={setOverrides}
          onClose={() => setEdit(null)}
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl">
          {(['hoje', 'semana', 'ajustes'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-4 text-sm font-medium capitalize ${
                tab === t ? 'text-sky-400' : 'text-slate-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function Today({
  settings,
  done,
  toggle,
  now,
  overrides,
  onEdit,
}: {
  settings: Settings
  done: Completions
  toggle: (date: string, habitId: string) => void
  now: Date
  overrides: Overrides
  onEdit: (date: string, block: PlannedBlock | null) => void
}) {
  const date = isoDate(now)
  const plan = useMemo(() => planDay(now.getDay(), settings, overrides[date]), [now.getDay(), settings, overrides, date])
  const nowMin = minutesNow(now)
  const habits = settings.habits.filter((h) => h.days.includes(now.getDay()))
  const doneCount = habits.filter((h) => done[date]?.[h.id]).length

  return (
    <section>
      <div className="mb-5 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-slate-400">Metas de hoje</span>
          <span className="text-lg font-semibold">
            {doneCount}/{habits.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full bg-sky-400 transition-all"
            style={{ width: `${habits.length ? (doneCount / habits.length) * 100 : 0}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {habits.map((h) => (
            <span key={h.id} className="rounded-full bg-slate-700 px-3 py-1 text-xs">
              {h.emoji} {streak(h, done, now)} {streak(h, done, now) === 1 ? 'dia' : 'dias'}
            </span>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {plan.blocks.map((b) => (
          <BlockRow
            key={b.id}
            block={b}
            nowMin={nowMin}
            checked={!!(b.habitId && done[date]?.[b.habitId])}
            onToggle={() => b.habitId && toggle(date, b.habitId)}
            onEdit={() => onEdit(date, b)}
          />
        ))}
      </ul>

      <button onClick={() => onEdit(date, null)} className="mt-3 w-full rounded-lg border border-dashed border-slate-600 py-3 text-sm text-slate-300">
        + Atividade neste dia
      </button>

      {plan.unplaced.length > 0 && (
        <p className="mt-4 rounded-lg border border-amber-500/50 bg-amber-950/30 p-3 text-sm text-amber-200">
          Sem espaço hoje para: {plan.unplaced.map((h) => h.title).join(', ')}. Ajuste os horários em Ajustes.
        </p>
      )}
    </section>
  )
}

function BlockRow({
  block,
  nowMin,
  checked,
  onToggle,
  onEdit,
}: {
  block: PlannedBlock
  nowMin: number
  checked: boolean
  onToggle: () => void
  onEdit: () => void
}) {
  const active = nowMin >= block.start && nowMin < block.end
  const past = nowMin >= block.end
  const base =
    block.type === 'habit'
      ? 'border-sky-500 bg-sky-950/40 text-sky-100'
      : kindStyle[block.kind ?? 'other']

  return (
    <li
      className={`flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 ${base} ${
        past && !active ? 'opacity-60' : ''
      } ${active ? 'ring-2 ring-white/40' : ''}`}
    >
      <div className="w-24 shrink-0 text-sm tabular-nums text-slate-300">
        {fmt(block.start)}–{fmt(block.end)}
      </div>
      <div className={`flex-1 ${checked ? 'line-through opacity-60' : ''}`}>
        {block.type === 'travel' && <span className="mr-1">🚗</span>}
        {block.emoji && <span className="mr-1">{block.emoji}</span>}
        {block.title}
        {active && <span className="ml-2 text-xs font-semibold text-white">agora</span>}
      </div>
      {block.type !== 'travel' && (
        <button onClick={onEdit} aria-label="Editar" className="px-1 text-slate-400">
          ⋯
        </button>
      )}
      {block.type === 'habit' && (
        <button
          onClick={onToggle}
          aria-label={checked ? 'Desmarcar' : 'Marcar como feito'}
          className={`h-8 w-8 rounded-full border-2 text-lg leading-none ${
            checked ? 'border-sky-400 bg-sky-400 text-slate-900' : 'border-slate-500'
          }`}
        >
          {checked ? '✓' : ''}
        </button>
      )}
    </li>
  )
}

function Week({
  settings,
  done,
  now,
  overrides,
  onEdit,
}: {
  settings: Settings
  done: Completions
  now: Date
  overrides: Overrides
  onEdit: (date: string, block: PlannedBlock | null) => void
}) {
  // semana começando na segunda
  const monday = addDays(now, -((now.getDay() + 6) % 7))
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  let planned = 0
  let completed = 0
  for (const d of days) {
    if (d > now) continue
    for (const h of settings.habits.filter((x) => x.days.includes(d.getDay()))) {
      planned++
      if (done[isoDate(d)]?.[h.id]) completed++
    }
  }
  const pct = planned ? Math.round((completed / planned) * 100) : 0

  return (
    <section>
      <div className="mb-5 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
        <span className="text-sm text-slate-400">Cumprimento da semana até hoje</span>
        <div className="text-3xl font-semibold">{pct}%</div>
        <span className="text-xs text-slate-400">
          {completed} de {planned} blocos de estudo
        </span>
      </div>

      <div className="space-y-4">
        {days.map((d) => {
          const plan = planDay(d.getDay(), settings, overrides[isoDate(d)])
          const isToday = isoDate(d) === isoDate(now)
          return (
            <div key={isoDate(d)}>
              <h3 className={`mb-1 text-sm font-semibold ${isToday ? 'text-sky-400' : 'text-slate-300'}`}>
                {DAY_NAMES[d.getDay()]} {d.getDate()}
                {isToday && ' · hoje'}
                <button onClick={() => onEdit(isoDate(d), null)} className="ml-3 text-xs font-normal text-slate-400">
                  + atividade
                </button>
              </h3>
              <ul className="space-y-1">
                {plan.blocks.map((b) => {
                  const ok = !!(b.habitId && done[isoDate(d)]?.[b.habitId])
                  const style =
                    b.type === 'habit' ? 'border-sky-500 bg-sky-950/40' : kindStyle[b.kind ?? 'other']
                  return (
                    <li
                      key={b.id}
                      onClick={() => b.type !== 'travel' && onEdit(isoDate(d), b)}
                      className={`flex ${b.type === 'travel' ? '' : 'cursor-pointer'} items-center gap-3 rounded border-l-4 px-3 py-1.5 text-sm ${style}`}
                    >
                      <span className="w-24 shrink-0 tabular-nums text-slate-400">
                        {fmt(b.start)}–{fmt(b.end)}
                      </span>
                      <span className={ok ? 'line-through opacity-60' : ''}>
                        {b.type === 'travel' && '🚗 '}{b.emoji} {b.title}
                      </span>
                      {ok && <span className="ml-auto text-sky-400">✓</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
