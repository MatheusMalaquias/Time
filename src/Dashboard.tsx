import { Logo } from './Logo'
import { DAY_NAMES, fmt, itemsOn, MONTHS, parseDate, colorFor, type Item } from './calendar'
import { activityStats, dayCount, monthDates, pct, rangeCount, weekDates, type Count } from './stats'

const BLUE = '#3987e5' // única cor de progresso (sequencial, um tom)
const BAR_H = 80

interface Props {
  items: Item[]
  today: string
  onOpenDay: (date: string) => void
}

export default function Dashboard({ items, today, onOpenDay }: Props) {
  const todayC = dayCount(items, today)
  const week = weekDates(today)
  const weekC = rangeCount(items, week, today)
  const month = monthDates(today)
  const monthC = rangeCount(items, month, today)
  const acts = activityStats(items, today, 30)

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const next = itemsOn(items, today).find(
    (i) => i.start !== undefined && !i.doneOn.includes(today) && (i.end ?? i.start + 30) > nowMin
  )
  const t = parseDate(today)

  if (items.length === 0)
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-slate-600 p-4 text-sm text-slate-300">
        <p>Sua agenda está vazia. Quando você adicionar atividades, o seu progresso do dia, da semana e do mês aparece aqui.</p>
        <button onClick={() => onOpenDay(today)} className="rounded-lg bg-sky-500 px-4 py-3 font-medium text-slate-900">
          Montar minha rotina
        </button>
      </div>
    )

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Logo size={44} />
        <h1 className="text-2xl font-bold tracking-tight">Time</h1>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Tile label="Hoje" c={todayC} />
        <Tile label="Semana" c={weekC} />
        <Tile label={MONTHS[t.getMonth()]} c={monthC} />
      </div>

      {next && (
        <button
          onClick={() => onOpenDay(today)}
          className="flex w-full items-center gap-3 rounded-lg bg-slate-800 px-4 py-3 text-left"
        >
          <span className="h-8 w-1.5 rounded-full" style={{ background: colorFor(next) }} />
          <span className="flex-1">
            <span className="block text-xs text-slate-400">Próximo</span>
            <span className="block">{next.title}</span>
          </span>
          <span className="text-sm tabular-nums text-slate-300">{fmt(next.start as number)}</span>
        </button>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Semana: % concluído por dia</h2>
        <div className="flex items-end gap-2 rounded-xl bg-slate-800/40 p-3 pb-2">
          {week.map((d) => {
            const c = dayCount(items, d)
            const future = d > today
            const p = pct(c)
            return (
              <button
                key={d}
                onClick={() => onOpenDay(d)}
                title={`${d.split('-').reverse().join('/')}: ${c.done} de ${c.total} (${p}%)`}
                className="group flex flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="text-xs tabular-nums text-slate-300">{future || !c.total ? '' : `${p}%`}</span>
                <span
                  className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-80"
                  style={{
                    height: future || !c.total ? 2 : Math.max(3, (p / 100) * BAR_H),
                    background: future || !c.total ? '#475569' : BLUE,
                  }}
                />
                <span className={`text-xs ${d === today ? 'font-semibold text-sky-400' : 'text-slate-400'}`}>
                  {DAY_NAMES[parseDate(d).getDay()]}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">
          {MONTHS[t.getMonth()]}: dias mais completos
        </h2>
        <div className="rounded-xl bg-slate-800/40 p-3">
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
            {DAY_NAMES.map((n) => (
              <div key={n}>{n[0]}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {month.map((d, i) => {
              if (!d) return <div key={i} />
              const c = dayCount(items, d)
              const future = d > today
              const p = c.total ? c.done / c.total : 0
              return (
                <button
                  key={d}
                  onClick={() => onOpenDay(d)}
                  title={`${d.split('-').reverse().join('/')}: ${c.done} de ${c.total}`}
                  className={`flex h-9 items-center justify-center rounded-md text-xs ${
                    future || !c.total ? 'border border-dashed border-slate-700 text-slate-500' : p > 0.55 ? 'text-slate-900' : 'text-slate-200'
                  }`}
                  style={future || !c.total ? undefined : { background: `${BLUE}${alpha(0.15 + 0.85 * p)}` }}
                >
                  {Number(d.slice(8))}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-xs text-slate-400">
            0%
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <span key={p} className="h-3 w-5 rounded-sm" style={{ background: `${BLUE}${alpha(0.15 + 0.85 * p)}` }} />
            ))}
            100%
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Por atividade: últimos 30 dias</h2>
        {acts.length === 0 ? (
          <p className="text-sm text-slate-400">Marque atividades como feitas para ver o desempenho.</p>
        ) : (
          <ul className="space-y-2">
            {acts.map((a) => {
              const p = Math.round((a.done / a.total) * 100)
              return (
                <li key={a.title} className="rounded-lg bg-slate-800 px-4 py-3">
                  <div className="mb-1.5 flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                    <span className="flex-1">{a.title}</span>
                    {a.streak > 1 && <span className="text-xs text-slate-400">🔥 {a.streak} dias seguidos</span>}
                    <span className="w-24 text-right text-xs tabular-nums text-slate-300">
                      {a.done}/{a.total} · {p}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, background: a.color }} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

const alpha = (a: number) => Math.round(Math.min(1, a) * 255).toString(16).padStart(2, '0')

function Tile({ label, c }: { label: string; c: Count }) {
  const p = pct(c)
  return (
    <div className="rounded-xl bg-slate-800 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{c.total ? `${p}%` : '–'}</div>
      <div className="text-xs tabular-nums text-slate-400">
        {c.done} de {c.total}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
        <div className="h-full rounded-full" style={{ width: `${p}%`, background: BLUE }} />
      </div>
    </div>
  )
}
