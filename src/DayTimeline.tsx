import { useEffect, useRef, useState } from 'react'
import { colorFor, DEFAULT_MINUTES, fmt, layoutDay, type Item } from './calendar'

const HOUR_H = 56
const GUTTER = 48
const SNAP = 15 // minutos
const HOLD_MS = 250 // segurar no toque antes de arrastar (para ainda poder rolar a página)
const MOVE_PX = 5

interface Props {
  date: string
  items: Item[]
  isToday: boolean
  onToggle: (id: string) => void
  onEdit: (item: Item) => void
  onAdd: (startMinutes: number) => void
  onMove: (item: Item, newStart: number) => void
}

interface Drag {
  id: string
  start: number
}

export default function DayTimeline({ date, items, isToday, onToggle, onEdit, onAdd, onMove }: Props) {
  const [now, setNow] = useState(() => new Date())
  const [drag, setDrag] = useState<Drag | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  // enquanto arrasta, mostra o item na posição nova e reorganiza as colunas ao vivo
  const live = drag
    ? items.map((i) =>
        i.id === drag.id
          ? { ...i, start: drag.start, end: i.end !== undefined && i.start !== undefined ? drag.start + (i.end - i.start) : undefined }
          : i
      )
    : items
  const placed = layoutDay(live)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // ao abrir um dia, rola até o primeiro item (ou até agora, se for hoje) com uma hora de folga
  useEffect(() => {
    const focus = isToday ? now.getHours() * 60 + now.getMinutes() : placed[0]?.start ?? 7 * 60
    scroller.current?.scrollTo({ top: Math.max(0, (focus / 60 - 1) * HOUR_H) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const nowMin = now.getHours() * 60 + now.getMinutes()

  /** Pressionar e arrastar: mouse arrasta ao mover; toque arrasta depois de segurar um instante. */
  const startPress = (e: React.PointerEvent<HTMLDivElement>, item: Item) => {
    if ((e.target as HTMLElement).closest('button')) return
    const el = e.currentTarget
    const pointerId = e.pointerId
    const startY = e.clientY
    const origStart = item.start as number
    const maxStart = 24 * 60 - (item.end !== undefined ? item.end - origStart : DEFAULT_MINUTES)
    const touch = e.pointerType === 'touch'
    let dragging = false
    let latest = origStart
    let timer: ReturnType<typeof setTimeout> | undefined

    const block = (ev: TouchEvent) => ev.preventDefault() // impede a página de rolar durante o arrasto
    const begin = () => {
      dragging = true
      el.setPointerCapture?.(pointerId)
      window.addEventListener('touchmove', block, { passive: false })
      setDrag({ id: item.id, start: origStart })
    }
    const cleanup = () => {
      clearTimeout(timer)
      window.removeEventListener('touchmove', block)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', cancel)
    }
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - startY
      if (!dragging) {
        if (Math.abs(dy) < MOVE_PX) return
        if (touch) return cleanup() // moveu antes de segurar: é rolagem, não arrasto
        begin()
      }
      const raw = origStart + (dy / HOUR_H) * 60
      latest = Math.max(0, Math.min(maxStart, Math.round(raw / SNAP) * SNAP))
      setDrag({ id: item.id, start: latest })
    }
    const up = () => {
      cleanup()
      if (!dragging) return onEdit(item) // toque/clique simples abre a edição
      setDrag(null)
      if (latest !== origStart) onMove(item, latest)
    }
    const cancel = () => {
      cleanup()
      setDrag(null)
    }

    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', cancel)
    if (touch) timer = setTimeout(begin, HOLD_MS)
  }

  return (
    <div ref={scroller} className="max-h-[calc(100dvh-16rem)] min-h-80 overflow-y-auto overscroll-contain rounded-xl bg-slate-800/40">
      <div
        className="relative cursor-pointer select-none"
        style={{ height: 24 * HOUR_H }}
        onClick={(e) => {
          const y = e.clientY - e.currentTarget.getBoundingClientRect().top
          onAdd(Math.min(23 * 60, Math.floor(y / HOUR_H) * 60))
        }}
      >
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="absolute inset-x-0 border-t border-slate-700/70" style={{ top: h * HOUR_H }}>
            <span className="absolute -top-2.5 left-2 bg-transparent text-xs tabular-nums text-slate-500">
              {h === 0 ? '' : fmt(h * 60)}
            </span>
          </div>
        ))}

        {placed.map(({ item, start, end, col, cols }) => {
          const done = item.doneOn.includes(date)
          const height = Math.max(26, ((end - start) / 60) * HOUR_H - 2)
          const width = `calc((100% - ${GUTTER + 8}px) / ${cols})`
          const dragging = drag?.id === item.id
          const original = items.find((i) => i.id === item.id) as Item
          return (
            <div
              key={item.id}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => startPress(e, original)}
              className={`absolute flex gap-2 overflow-hidden rounded-md border-l-4 px-2 py-1 text-sm ${
                dragging ? 'z-10 cursor-grabbing shadow-lg ring-2 ring-white/50' : 'cursor-grab'
              } ${done ? 'text-slate-400' : 'text-slate-50'}`}
              style={{
                borderColor: colorFor(item),
                background: `${colorFor(item)}${done ? '26' : '66'}`,
                top: (start / 60) * HOUR_H + 1,
                height,
                left: `calc(${GUTTER}px + ${col} * ${width})`,
                width: `calc(${width} - 4px)`,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle(item.id)
                }}
                aria-label={done ? 'Desmarcar' : 'Marcar como feito'}
                className="relative mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 text-[10px] leading-none text-slate-900 before:absolute before:-inset-3 before:content-['']"
                style={{ borderColor: colorFor(item), background: done ? colorFor(item) : 'transparent' }}
              >
                {done ? '✓' : ''}
              </button>
              <div className={`min-w-0 leading-tight ${done ? 'line-through' : ''}`}>
                <div className="truncate font-medium">{item.title}</div>
                {(height > 40 || dragging) && (
                  <div className="text-xs opacity-80">
                    {fmt(start)}–{fmt(end)}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {isToday && (
          <div className="pointer-events-none absolute inset-x-0 z-[1] flex items-center" style={{ top: (nowMin / 60) * HOUR_H }}>
            <span className="ml-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-red-500" />
            <span className="h-px flex-1 bg-red-500" />
          </div>
        )}
      </div>
    </div>
  )
}
