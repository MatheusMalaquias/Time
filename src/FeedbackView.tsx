import { useCallback, useEffect, useState } from 'react'
import { supabase } from './cloud'
import {
  countUnread, formatFeedbackDate, listFeedback, MAX_FEEDBACK, removeFeedback, sendErrorText, sendFeedback,
  setRead, sortNewestFirst, validateMessage, type FeedbackRow,
} from './feedback'

interface Props {
  isAdmin: boolean
  onChanged: () => void
}

const card = 'space-y-3 rounded-xl bg-slate-800 p-4'

export default function FeedbackView({ isAdmin, onChanged }: Props) {
  const [tab, setTab] = useState<'enviar' | 'recebidos'>('enviar')
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-1">
        <h1 className="text-2xl font-bold">Feedback</h1>
      </header>
      {isAdmin && (
        <div className="flex gap-2" role="tablist" aria-label="Feedback">
          {([['enviar', 'Enviar'], ['recebidos', 'Recebidos']] as const).map(([v, label]) => (
            <button
              key={v}
              role="tab"
              aria-selected={tab === v}
              onClick={() => setTab(v)}
              className={`flex-1 rounded-lg py-3 text-sm ${tab === v ? 'bg-sky-500 font-medium text-slate-900' : 'bg-slate-800 text-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {isAdmin && tab === 'recebidos' ? <Inbox onChanged={onChanged} /> : <SendForm />}
    </div>
  )
}

function SendForm() {
  const [text, setText] = useState('')
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'ok' | 'error'; text?: string }>({ kind: 'idle' })
  const v = validateMessage(text)
  const sending = state.kind === 'sending'

  const submit = async () => {
    if (!supabase || !v.ok) return
    setState({ kind: 'sending' })
    try {
      await sendFeedback(supabase, v.text)
      setText('')
      setState({ kind: 'ok', text: 'Enviado! Obrigado pela sugestão.' })
    } catch (e) {
      setState({ kind: 'error', text: sendErrorText(e instanceof Error ? e.message : '') })
    }
  }

  return (
    <section className={card}>
      <h2 className="font-semibold">Enviar sugestão</h2>
      <p className="text-sm text-slate-400">
        Achou algo ruim ou tem uma ideia? Enviar é opcional. A mensagem vai sem o seu nome e sem o seu e-mail, só o texto. Se quiser uma resposta, escreva um contato (e-mail ou telefone) no próprio texto.
      </p>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); if (state.kind !== 'sending') setState({ kind: 'idle' }) }}
        rows={6}
        maxLength={MAX_FEEDBACK + 200}
        placeholder="Escreva aqui…"
        aria-label="Sua sugestão"
        className="w-full resize-none rounded-lg bg-slate-700 px-3 py-3 text-sm"
      />
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs ${text.trim().length > MAX_FEEDBACK ? 'text-amber-300' : 'text-slate-400'}`}>{text.trim().length}/{MAX_FEEDBACK}</span>
        <button onClick={submit} disabled={sending || !v.ok} className="rounded-lg bg-sky-500 px-5 py-3 text-sm font-medium text-slate-900 disabled:opacity-40">
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
      {!v.ok && text.trim().length > MAX_FEEDBACK && <p className="text-sm text-amber-300">{v.error}</p>}
      {state.kind === 'ok' && <p role="status" className="text-sm text-emerald-300">{state.text}</p>}
      {state.kind === 'error' && <p role="alert" className="text-sm text-amber-300">{state.text}</p>}
    </section>
  )
}

function Inbox({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<FeedbackRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    try {
      setRows(sortNewestFirst(await listFeedback(supabase)))
      setError(null)
    } catch {
      setError('Não foi possível carregar as mensagens.')
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const act = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id)
    try {
      await fn()
      await load()
      onChanged()
    } catch {
      setError('A ação não funcionou. Tente de novo.')
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  if (error && !rows) return <p className="text-sm text-amber-300">{error}</p>
  if (!rows) return <p className="text-sm text-slate-400">Carregando…</p>
  const unread = countUnread(rows)

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">{rows.length === 0 ? 'Nenhuma mensagem ainda.' : `${rows.length} mensagens · ${unread} não lidas`}</p>
      {error && <p className="text-sm text-amber-300">{error}</p>}
      {rows.map((r) => (
        <article key={r.id} className={`space-y-2 rounded-xl p-4 ${r.read_at ? 'bg-slate-800/60' : 'bg-slate-800 ring-2 ring-sky-400/70'}`}>
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span>{formatFeedbackDate(r.created_at)}</span>
            {!r.read_at && <span className="rounded-full bg-sky-500 px-2 py-0.5 font-medium text-slate-900">Nova</span>}
          </div>
          <p className="whitespace-pre-wrap break-words text-sm text-slate-100">{r.message}</p>
          <div className="flex gap-2">
            <button disabled={busyId === r.id} onClick={() => act(r.id, () => setRead(supabase!, r.id, !r.read_at))} className="rounded-lg bg-slate-700 px-3 py-2.5 text-sm disabled:opacity-40">
              {r.read_at ? 'Marcar como não lida' : 'Marcar como lida'}
            </button>
            {confirmId === r.id ? (
              <>
                <button disabled={busyId === r.id} onClick={() => act(r.id, () => removeFeedback(supabase!, r.id))} className="rounded-lg bg-red-500 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-40">Apagar</button>
                <button onClick={() => setConfirmId(null)} className="rounded-lg bg-slate-700 px-3 py-2.5 text-sm">Cancelar</button>
              </>
            ) : (
              <button onClick={() => setConfirmId(r.id)} className="rounded-lg bg-slate-700 px-3 py-2.5 text-sm text-red-300">Apagar…</button>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
