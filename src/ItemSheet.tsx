import { useState } from 'react'
import { colorFor, DAY_NAMES, fmt, PALETTE, parseDate, parseTime, uid, type Item } from './calendar'

interface Props {
  date: string
  item: Item | null // null = novo
  presetStart?: number // horário clicado na grade
  onSave: (item: Item) => void
  onRemove: (item: Item, scope: 'day' | 'all') => void
  onClose: () => void
}

const field = 'rounded-lg bg-slate-700 px-3 py-2.5 text-sm'

export default function ItemSheet({ date, item, presetStart, onSave, onRemove, onClose }: Props) {
  const [title, setTitle] = useState(item?.title ?? '')
  // horário efetivo neste dia (item repetido pode ter sido arrastado só para esta data)
  const eff = item?.moved?.[date]
  const initStart = eff ? eff.start : item?.start ?? presetStart
  const initEnd = eff ? eff.end : item ? item.end : presetStart === undefined ? undefined : presetStart + 60
  const [start, setStart] = useState(initStart)
  const [end, setEnd] = useState(initEnd)
  const [color, setColor] = useState<string | undefined>(item?.color)
  const [days, setDays] = useState<number[]>(item?.days ?? [])

  const recurring = !!item?.days?.length
  const valid = title.trim().length > 0 && (start === undefined || end === undefined || end > start)

  const save = () => {
    const base = item ?? { id: uid(), doneOn: [], skip: [] }
    // se o horário não foi mexido no formulário, preserva o horário padrão e os ajustes de cada dia
    const timeChanged = start !== initStart || end !== initEnd
    const moved = { ...item?.moved }
    if (timeChanged) delete moved[date]
    const next: Item = {
      ...base,
      title: title.trim(),
      color,
      moved: Object.keys(moved).length ? moved : undefined,
      start: item && !timeChanged ? item.start : start,
      end: item && !timeChanged ? item.end : start === undefined ? undefined : end,
      days: days.length ? days : undefined,
      date: days.length ? undefined : item?.date ?? date,
      from: days.length ? item?.from ?? date : undefined,
    }
    onSave(next)
  }

  return (
    <div className="fade-in fixed inset-0 z-30 flex items-end bg-black/60 sm:items-center" onClick={onClose}>
      <form
        className="sheet-in mx-auto max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-slate-800 p-5 sm:rounded-2xl"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) save()
        }}
      >
        <div className="mx-auto -mt-2 h-1.5 w-10 rounded-full bg-slate-600 sm:hidden" />
        <h2 className="font-semibold">{item ? 'Editar' : 'Novo'} · {parseDate(date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>

        <input
          autoFocus
          placeholder="O que você vai fazer?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${field} w-full`}
        />

        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <input type="time" value={start === undefined ? '' : fmt(start)} onChange={(e) => setStart(parseTime(e.target.value))} className={field} />
          <span>até</span>
          <input type="time" value={end === undefined ? '' : fmt(end)} onChange={(e) => setEnd(parseTime(e.target.value))} className={field} />
          {(start !== undefined || end !== undefined) && (
            <button type="button" onClick={() => { setStart(undefined); setEnd(undefined) }} className="text-xs text-slate-400 underline">
              sem horário
            </button>
          )}
        </div>

        <div>
          <div className="mb-1 text-xs text-slate-400">Cor</div>
          <div className="flex flex-wrap items-center gap-2">
            {PALETTE.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Cor ${c}`}
                className={`h-8 w-8 rounded-full ${(color ?? colorFor({ title })) === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''}`}
                style={{ background: c }}
              />
            ))}
            {color && (
              <button type="button" onClick={() => setColor(undefined)} className="ml-1 text-xs text-slate-400 underline">
                automática
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs text-slate-400">
            Repetir toda semana em (deixe vazio para ser só neste dia)
          </div>
          <div className="flex gap-1">
            {DAY_NAMES.map((n, i) => (
              <button
                type="button"
                key={n}
                onClick={() => setDays(days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort())}
                className={`flex-1 rounded py-2.5 text-xs ${days.includes(i) ? 'bg-sky-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}
              >
                {n}
              </button>
            ))}
          </div>
          {recurring && <p className="mt-1 text-xs text-slate-400">Mudanças em itens repetidos valem para todos os dias.</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={!valid} className="rounded-lg bg-sky-500 px-5 py-3 text-sm font-medium text-slate-900 disabled:opacity-40">
            Salvar
          </button>
          {item && recurring && (
            <button type="button" onClick={() => onRemove(item, 'day')} className="rounded-lg bg-rose-500/20 px-3 py-3 text-sm text-rose-300">
              Remover só hoje
            </button>
          )}
          {item && (
            <button type="button" onClick={() => onRemove(item, 'all')} className="rounded-lg bg-rose-500/20 px-3 py-3 text-sm text-rose-300">
              {recurring ? 'Remover de todos os dias' : 'Remover'}
            </button>
          )}
          <button type="button" onClick={onClose} className="ml-auto px-3 py-2 text-sm text-slate-400">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
