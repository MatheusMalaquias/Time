import { useState } from 'react'
import { fmt, parseTime } from './lib'
import type { DayOverride, Overrides, PlannedBlock } from './types'

interface Props {
  date: string
  block: PlannedBlock | null // null = nova atividade avulsa
  overrides: Overrides
  setOverrides: (o: Overrides) => void
  onClose: () => void
}

const empty = (): DayOverride => ({ skip: [], move: {}, extra: [] })
const input = 'rounded bg-slate-700 px-2 py-1.5 text-sm'
const btn = 'rounded px-3 py-2 text-sm font-medium'

export default function EditSheet({ date, block, overrides, setOverrides, onClose }: Props) {
  const ov = overrides[date] ?? empty()
  const extra = block ? ov.extra.find((e) => e.id === block.id) : undefined
  const [title, setTitle] = useState('')
  const [start, setStart] = useState(block?.start ?? 18 * 60)
  const [end, setEnd] = useState(block?.end ?? 19 * 60)

  const save = (next: DayOverride) => {
    setOverrides({ ...overrides, [date]: next })
    onClose()
  }

  const addExtra = () =>
    save({ ...ov, extra: [...ov.extra, { id: crypto.randomUUID(), title: title.trim(), start, end }] })

  const saveTime = () => {
    if (!block) return
    if (extra)
      return save({ ...ov, extra: ov.extra.map((e) => (e.id === extra.id ? { ...e, start, end } : e)) })
    save({ ...ov, move: { ...ov.move, [block.id]: { start, end } } })
  }

  const skipBlock = () => {
    if (!block) return
    if (extra) return save({ ...ov, extra: ov.extra.filter((e) => e.id !== extra.id) })
    save({ ...ov, skip: [...ov.skip, block.id] })
  }

  const resetBlock = () => {
    if (!block) return
    const move = { ...ov.move }
    delete move[block.id]
    save({ ...ov, move })
  }

  const valid = end > start && (block !== null || title.trim().length > 0)

  return (
    <div className="fixed inset-0 z-10 flex items-end bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-md space-y-4 rounded-t-2xl bg-slate-800 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold">
          {block ? `${block.emoji ?? ''} ${block.title}` : 'Nova atividade neste dia'}
        </h2>
        <p className="text-xs text-slate-400">
          A mudança vale só para {date.split('-').reverse().join('/')}. Os outros dias não são alterados.
        </p>

        {!block && (
          <input
            autoFocus
            placeholder="O que vai acontecer?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${input} w-full`}
          />
        )}

        <div className="flex items-center gap-3">
          <input type="time" value={fmt(start)} onChange={(e) => setStart(parseTime(e.target.value))} className={input} />
          <span className="text-slate-400">até</span>
          <input type="time" value={fmt(end)} onChange={(e) => setEnd(parseTime(e.target.value))} className={input} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            disabled={!valid}
            onClick={block ? saveTime : addExtra}
            className={`${btn} bg-sky-500 text-slate-900 disabled:opacity-40`}
          >
            {block ? 'Salvar horário' : 'Adicionar'}
          </button>
          {block && (
            <button onClick={skipBlock} className={`${btn} bg-rose-500/20 text-rose-300`}>
              {extra ? 'Remover' : 'Pular neste dia'}
            </button>
          )}
          {block && ov.move[block.id] && (
            <button onClick={resetBlock} className={`${btn} bg-slate-700`}>
              Voltar ao padrão
            </button>
          )}
          <button onClick={onClose} className={`${btn} ml-auto text-slate-400`}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
