import type { Item } from './calendar'
import { TEMPLATES, templateItems } from './templates'

interface Props {
  today: string
  onPick: (items: Item[]) => void
  onAdd: () => void
}

const tips = [
  'Toque num horário da grade (ou no +) para adicionar uma atividade.',
  'Escolha os dias da semana para repetir toda semana.',
  'Escolha uma cor para cada tipo de atividade.',
  'Arraste uma atividade para mudar o horário.',
]

/** Tela de boas-vindas da agenda vazia: dicas curtas e modelos neutros, todos editáveis. */
export default function Welcome({ today, onPick, onAdd }: Props) {
  return (
    <div className="mb-3 space-y-3 rounded-lg border border-dashed border-slate-600 p-4 text-sm text-slate-300">
      <h2 className="text-base font-semibold text-slate-100">Bem-vindo! Sua agenda está vazia.</h2>
      <ul className="list-disc space-y-1 pl-5">
        {tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <button onClick={onAdd} className="rounded-lg bg-sky-500 px-4 py-3 font-medium text-slate-900">
        Adicionar a primeira atividade
      </button>
      <div>
        <p className="mb-2 text-slate-400">Ou comece por um modelo e ajuste do seu jeito:</p>
        <div className="flex flex-col gap-2">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => onPick(templateItems(t.id, today))} className="rounded-lg bg-slate-800 px-3 py-2.5 text-left">
              <span className="block font-medium text-slate-100">{t.name}</span>
              <span className="block text-xs text-slate-400">{t.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
