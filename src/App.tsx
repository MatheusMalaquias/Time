import { useRef, useState } from 'react'
import { colorFor, DAY_NAMES, fmt, isoDate, itemsOn, MONTHS, monthGrid, parseDate, starterItems, type Item } from './calendar'
import Dashboard from './Dashboard'
import DayTimeline from './DayTimeline'
import ItemSheet from './ItemSheet'
import AccountView from './AccountView'
import { IconBell, IconDay, IconMonth, IconPanel, IconUser } from './Icons'
import { Brand } from './Logo'
import { cloudConfigured, useSession, useSync } from './cloud'
import RemindersView from './RemindersView'
import { defaultRemind, useReminders, type RemindCfg } from './reminders'
import { useStored } from './storage'

export type NavPref = 'top' | 'bottom'

export default function App() {
  const today = isoDate(new Date())
  const [items, setItems] = useStored<Item[]>('tm.cal.v1', [])
  const [selected, setSelected] = useState(today)
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [navPref, setNavPref] = useStored<NavPref>('tm.navpos.v2', 'bottom')
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true)
  const [remind, setRemind] = useStored<RemindCfg>('tm.remind', defaultRemind)
  useReminders(items, remind)
  const auth = useSession()
  const cloud = useSync(items, setItems, auth.session?.user.id)
  const [view, setView] = useState<'painel' | 'dia' | 'mes' | 'avisos' | 'conta'>('painel')
  const [sheet, setSheet] = useState<{ item: Item | null; start?: number } | null>(null)

  const move = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  const showDate = (iso: string) => {
    const d = parseDate(iso)
    setSelected(iso)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  const goToday = () => showDate(today)

  const shiftDay = (delta: number) => {
    const d = parseDate(selected)
    d.setDate(d.getDate() + delta)
    showDate(isoDate(d))
  }

  const toggleDone = (id: string) => {
    navigator.vibrate?.(8)
    setItems((list) =>
      list.map((it) =>
        it.id === id
          ? { ...it, doneOn: it.doneOn.includes(selected) ? it.doneOn.filter((d) => d !== selected) : [...it.doneOn, selected] }
          : it
      )
    )
  }

  const save = (item: Item) => {
    setItems((list) => (list.some((i) => i.id === item.id) ? list.map((i) => (i.id === item.id ? item : i)) : [...list, item]))
    setSheet(null)
  }

  const moveItem = (eff: Item, newStart: number) =>
    setItems((list) =>
      list.map((i) => {
        if (i.id !== eff.id) return i
        const dur = eff.end !== undefined && eff.start !== undefined ? eff.end - eff.start : undefined
        const times = { start: newStart, end: dur !== undefined ? newStart + dur : undefined }
        // item repetido: muda só este dia; item de um dia só: muda direto
        return i.days?.length ? { ...i, moved: { ...i.moved, [selected]: times } } : { ...i, ...times }
      })
    )

  const remove = (item: Item, scope: 'day' | 'all') => {
    setItems((list) =>
      scope === 'all'
        ? list.filter((i) => i.id !== item.id)
        : list.map((i) => (i.id === item.id ? { ...i, skip: [...i.skip, selected] } : i))
    )
    setSheet(null)
  }

  const dayItems = itemsOn(items, selected)
  const doneCount = dayItems.filter((i) => i.doneOn.includes(selected)).length
  const untimed = dayItems.filter((i) => i.start === undefined)

  // deslizar para o lado troca de dia (ignora gestos que começam em uma atividade)
  const swipe = useRef<{ x: number; y: number; ok: boolean } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    swipe.current = { x: t.clientX, y: t.clientY, ok: !(e.target as HTMLElement).closest('[data-event]') }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s0 = swipe.current
    swipe.current = null
    if (!s0?.ok) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s0.x
    const dy = t.clientY - s0.y
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) shiftDay(dx < 0 ? 1 : -1)
  }
  const suggestStart = () => {
    const n = new Date()
    return selected === today ? Math.min(23 * 60, Math.ceil((n.getHours() * 60 + n.getMinutes() + 1) / 30) * 30) : 9 * 60
  }
  const navBtn = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl text-slate-300 hover:bg-slate-800'
  const pill = 'rounded-lg bg-slate-800 px-4 py-2.5 text-sm text-sky-400'

  // com o Supabase configurado, é preciso entrar para usar o app
  if (cloudConfigured && (!auth.ready || !auth.session || auth.recovery)) {
    return (
      <div className="mx-auto min-h-dvh max-w-md px-4 pb-10" style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}>
        <div className="mb-8">
          <Brand size={72} center />
        </div>
        <AccountView
          session={auth.session}
          ready={auth.ready}
          recovery={auth.recovery}
          clearRecovery={auth.clearRecovery}
          status={cloud.status}
          sync={cloud.sync}
          itemCount={items.length}
        />
      </div>
    )
  }

  // padrão: abas embaixo (a aba Conta permite trocar para o topo)
  const navTop = navPref === 'top'
  // no Safari do iPhone aberto como site (não instalado), a barra flutuante do navegador cobre o pé da tela
  const iosBrowserBar = !standalone && /iPhone|iPad|iPod/.test(navigator.userAgent)
  const navEl = (
    <nav
      className={`shrink-0 bg-slate-900/95 backdrop-blur ${navTop ? 'border-b border-slate-800' : 'safe-bottom border-t border-slate-800'}`}
      style={navTop ? { paddingTop: 'env(safe-area-inset-top)' } : iosBrowserBar ? { paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))' } : undefined}
    >
      <div className="mx-auto flex max-w-2xl">
        {([
          ['painel', 'Painel', IconPanel],
          ['dia', 'Dia', IconDay],
          ['mes', 'Mês', IconMonth],
          ['avisos', 'Avisos', IconBell],
          ['conta', 'Conta', IconUser],
        ] as const).map(([v, label, Icon]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-current={view === v ? 'page' : undefined}
            className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
              view === v ? 'text-sky-400' : 'text-slate-400'
            }`}
          >
            {view === v && <span className={`absolute h-0.5 w-8 rounded-full bg-sky-400 ${navTop ? 'bottom-0' : 'top-0'}`} />}
            <Icon />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
  const browserBarSpace = navTop && iosBrowserBar

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-2xl flex-col overflow-x-hidden">
      {navTop && navEl}

      <main
        key={view}
        className={`fade-in min-h-0 min-w-0 flex-1 px-4 ${view === 'dia' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overscroll-contain pb-6'}`}
        style={{
          paddingTop: navTop ? '0.75rem' : 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: browserBarSpace ? 'calc(4.5rem + env(safe-area-inset-bottom))' : undefined,
        }}
      >
      {(view === 'avisos' || view === 'conta') && <h1 className="mb-4 text-2xl font-bold">{view === 'avisos' ? 'Avisos' : 'Conta'}</h1>}
      {view === 'painel' ? (
        <Dashboard
          items={items}
          today={today}
          onOpenDay={(d) => {
            showDate(d)
            setView('dia')
          }}
        />
      ) : view === 'conta' ? (
        <AccountView
          navPref={navPref}
          setNavPref={setNavPref}
          session={auth.session}
          ready={auth.ready}
          recovery={auth.recovery}
          clearRecovery={auth.clearRecovery}
          status={cloud.status}
          sync={cloud.sync}
          itemCount={items.length}
        />
      ) : view === 'avisos' ? (
        <RemindersView items={items} today={today} cfg={remind} setCfg={setRemind} />
      ) : view === 'mes' ? (
        <>
          <header className="mb-4 flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <button onClick={() => move(-1)} aria-label="Mês anterior" className={navBtn}>‹</button>
              <h1 className="min-w-0 flex-1 truncate text-center text-xl font-semibold">
                {MONTHS[cursor.m]} {cursor.y}
              </h1>
              <button onClick={() => move(1)} aria-label="Próximo mês" className={navBtn}>›</button>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={goToday} className={pill}>Hoje</button>
            </div>
          </header>

          <div className="mb-1 grid grid-cols-7 text-center text-xs text-slate-400">
            {DAY_NAMES.map((n) => (
              <div key={n} className="py-1">{n}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid(cursor.y, cursor.m).map((date, i) => {
              if (!date) return <div key={i} />
              const list = itemsOn(items, date)
              return (
                <button
                  key={date}
                  onClick={() => {
                    showDate(date)
                    setView('dia')
                  }}
                  className={`flex aspect-square flex-col items-center justify-between rounded-lg p-1.5 text-sm ${
                    date === selected ? 'bg-sky-500/25 ring-2 ring-sky-400' : 'bg-slate-800/60 hover:bg-slate-800'
                  }`}
                >
                  <span className={date === today ? 'rounded-full bg-sky-400 px-1.5 font-semibold text-slate-900' : ''}>
                    {Number(date.slice(8))}
                  </span>
                  <span className="flex flex-wrap justify-center gap-0.5">
                    {list.slice(0, 4).map((it) => (
                      <span key={it.id} className="h-1.5 w-1.5 rounded-full" style={{ background: colorFor(it), opacity: it.doneOn.includes(date) ? 0.35 : 1 }} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">Toque em um dia para abrir.</p>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <header className="mb-3 flex shrink-0 items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center">
              <button onClick={() => shiftDay(-1)} aria-label="Dia anterior" className={navBtn}>‹</button>
              <div className="min-w-0 flex-1 text-center">
                <h1 className="text-xl font-semibold first-letter:uppercase">
                  {parseDate(selected).toLocaleDateString('pt-BR', { weekday: 'long' })}
                </h1>
                <p className="text-sm text-slate-400">
                  {parseDate(selected).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => shiftDay(1)} aria-label="Próximo dia" className={navBtn}>›</button>
            </div>
            <div className="flex shrink-0 gap-2">
              {selected !== today && <button onClick={goToday} className={pill}>Hoje</button>}
            </div>
          </header>

          <section className="flex min-h-0 flex-1 flex-col">
            {dayItems.length > 0 && (
              <div className="mb-2 shrink-0 text-sm text-slate-400">{doneCount}/{dayItems.length} feitos</div>
            )}

            {items.length === 0 && (
              <div className="mb-3 rounded-lg border border-dashed border-slate-600 p-4 text-sm text-slate-300">
                Seu calendário está vazio.{' '}
                <button onClick={() => setItems(starterItems(today))} className="text-sky-400 underline">
                  Começar com a minha rotina
                </button>{' '}
                (treinamento, aulas, academia, estudos...) e editar depois.
              </div>
            )}

            {items.length > 0 && dayItems.length === 0 && (
              <p className="mb-3 text-sm text-slate-400">Nada marcado para este dia.</p>
            )}

            {untimed.length > 0 && (
              <div className="-mx-4 mb-2 flex shrink-0 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                {untimed.map((it) => {
                  const done = it.doneOn.includes(selected)
                  const c = colorFor(it)
                  return (
                    <div
                      key={it.id}
                      className="flex shrink-0 items-center gap-2 rounded-full bg-slate-800 py-1 pl-1.5 pr-3 text-sm"
                      style={{ boxShadow: `inset 0 0 0 1.5px ${c}88` }}
                    >
                      <button
                        onClick={() => toggleDone(it.id)}
                        aria-label={done ? 'Desmarcar' : 'Marcar como feito'}
                        className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs leading-none text-slate-900 before:absolute before:-inset-2 before:content-['']"
                        style={{ borderColor: c, background: done ? c : 'transparent' }}
                      >
                        {done ? '✓' : ''}
                      </button>
                      <button onClick={() => setSheet({ item: it })} className={`py-1.5 ${done ? 'line-through opacity-50' : ''}`}>
                        {it.title}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="min-h-0 flex-1 pb-3">
              <DayTimeline
                date={selected}
                items={dayItems}
                isToday={selected === today}
                onToggle={toggleDone}
                onEdit={(item) => setSheet({ item: items.find((i) => i.id === item.id) ?? item })}
                onMove={moveItem}
                onAdd={(start) => setSheet({ item: null, start })}
              />
            </div>
          </section>
        </div>
      )}
      </main>

      {view === 'dia' && !sheet && (
        <button
          onClick={() => setSheet({ item: null, start: suggestStart() })}
          aria-label="Adicionar atividade"
          className="absolute right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-3xl leading-none text-slate-900 shadow-lg shadow-black/40 active:scale-95"
          style={{ bottom: navTop ? (browserBarSpace ? 'calc(5.5rem + env(safe-area-inset-bottom))' : 'calc(1.25rem + env(safe-area-inset-bottom))') : iosBrowserBar ? 'calc(7.75rem + env(safe-area-inset-bottom))' : 'calc(4.25rem + env(safe-area-inset-bottom))' }}
        >
          +
        </button>
      )}

      {sheet && (
        <ItemSheet
          key={sheet.item?.id ?? 'new'}
          date={selected}
          item={sheet.item}
          presetStart={sheet.start}
          onSave={save}
          onRemove={remove}
          onClose={() => setSheet(null)}
        />
      )}

      {!navTop && navEl}
    </div>
  )
}
