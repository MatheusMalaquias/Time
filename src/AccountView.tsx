import type { Session } from '@supabase/supabase-js'
import { useState } from 'react'
import { cloudConfigured, supabase, type SyncStatus } from './cloud'
import { fmt } from './calendar'
import type { NavPref } from './App'

interface Props {
  session: Session | null
  ready: boolean
  recovery: boolean
  clearRecovery: () => void
  status: SyncStatus
  sync: () => void
  itemCount: number
  navPref?: NavPref
  setNavPref?: (p: NavPref) => void
}

const field = 'w-full rounded-lg bg-slate-700 px-3 py-3 text-sm'
const card = 'space-y-3 rounded-xl bg-slate-800 p-4'

export default function AccountView({ session, ready, recovery, clearRecovery, status, sync, itemCount, navPref, setNavPref }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  if (!cloudConfigured || !supabase) return <Setup />
  if (!ready) return <p className="text-sm text-slate-400">Carregando…</p>

  const client = supabase
  const run = async (fn: () => Promise<{ ok: boolean; text: string } | void>) => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fn()
      if (r) setMsg(r)
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Algo deu errado.' })
    } finally {
      setBusy(false)
    }
  }

  const signIn = () =>
    run(async () => {
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) return { ok: false, text: error.message }
    })

  const signUp = () =>
    run(async () => {
      if (password.length < 8) return { ok: false, text: 'Use uma senha com pelo menos 8 caracteres.' }
      const { data, error } = await client.auth.signUp({ email, password })
      if (error) return { ok: false, text: error.message }
      if (!data.session) return { ok: true, text: 'Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.' }
    })

  const reset = () =>
    run(async () => {
      if (!email) return { ok: false, text: 'Digite o e-mail acima primeiro.' }
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })
      if (error) return { ok: false, text: error.message }
      return { ok: true, text: 'Enviamos um link para redefinir a senha.' }
    })

  const newPassword = () =>
    run(async () => {
      if (password.length < 8) return { ok: false, text: 'Use uma senha com pelo menos 8 caracteres.' }
      const { error } = await client.auth.updateUser({ password })
      if (error) return { ok: false, text: error.message }
      setPassword('')
      clearRecovery()
      return { ok: true, text: 'Senha atualizada.' }
    })

  if (recovery && session)
    return (
      <section className={card}>
        <h2 className="font-semibold">Nova senha</h2>
        <input type="password" autoComplete="new-password" placeholder="Nova senha (mínimo 8 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
        <button onClick={newPassword} disabled={busy} className="rounded-lg bg-sky-500 px-5 py-3 text-sm font-medium text-slate-900 disabled:opacity-40">
          Salvar senha
        </button>
        <Message msg={msg} />
      </section>
    )

  if (session)
    return (
      <div className="space-y-5">
        <section className={card}>
          <h2 className="font-semibold">Conta</h2>
          <p className="text-sm text-slate-300">{session.user.email}</p>
          <p className="text-sm text-slate-400">
            {status.state === 'syncing' && 'Sincronizando…'}
            {status.state === 'ok' && status.at && `Sincronizado às ${fmt(new Date(status.at).getHours() * 60 + new Date(status.at).getMinutes())} · ${itemCount} atividades`}
            {status.state === 'idle' && 'Aguardando sincronização…'}
            {status.state === 'error' && <span className="text-amber-300">Não sincronizou: {status.error}. Seus dados continuam salvos neste aparelho.</span>}
          </p>
          <div className="flex gap-3">
            <button onClick={sync} className="rounded-lg bg-sky-500 px-4 py-3 text-sm font-medium text-slate-900">Sincronizar agora</button>
            <button onClick={() => run(async () => void (await client.auth.signOut()))} disabled={busy} className="rounded-lg bg-slate-700 px-4 py-3 text-sm">
              Sair
            </button>
          </div>
          <Message msg={msg} />
        </section>
        {navPref && setNavPref && (
          <section className={card}>
            <h2 className="font-semibold">Barra de abas</h2>
            <p className="text-sm text-slate-400">Escolha onde ficam as abas: embaixo (padrão) ou no topo.</p>
            <div className="flex gap-2" role="radiogroup" aria-label="Posição da barra de abas">
              {([['bottom', 'Embaixo'], ['top', 'Topo']] as const).map(([v, label]) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={navPref === v}
                  onClick={() => setNavPref(v)}
                  className={`flex-1 rounded-lg py-3 text-sm ${navPref === v ? 'bg-sky-500 font-medium text-slate-900' : 'bg-slate-700 text-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        )}
        <p className="text-xs text-slate-500">
          O app guarda uma cópia neste aparelho e sincroniza em segundo plano, então funciona sem internet. Se a mesma atividade for mudada em dois aparelhos ao mesmo tempo, vale a última mudança.
        </p>
        <p className="rounded bg-slate-800 p-3 text-xs text-slate-400">
          Entrando em um segundo aparelho que já tem atividades, elas serão somadas às da conta. Se carregou a "rotina inicial" nos dois, apague as repetidas.
        </p>
      </div>
    )

  return (
    <section className={card}>
      <h2 className="font-semibold">Entrar ou criar conta</h2>
      <p className="text-sm text-slate-400">Com uma conta, a sua agenda fica salva online e aparece no celular e no computador.</p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void signIn()
        }}
      >
        <input type="email" autoComplete="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className={field} required />
        <input type="password" autoComplete="current-password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className={field} required />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="rounded-lg bg-sky-500 px-5 py-3 text-sm font-medium text-slate-900 disabled:opacity-40">
            Entrar
          </button>
          <button type="button" onClick={signUp} disabled={busy} className="rounded-lg bg-slate-700 px-5 py-3 text-sm disabled:opacity-40">
            Criar conta
          </button>
          <button type="button" onClick={reset} disabled={busy} className="py-2 text-sm text-slate-400 underline">
            Esqueci a senha
          </button>
        </div>
      </form>
      <Message msg={msg} />
    </section>
  )
}

function Message({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return <p className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-amber-300'}`}>{msg.text}</p>
}

function Setup() {
  return (
    <section className="space-y-3 rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
      <h2 className="font-semibold text-slate-100">Sincronização ainda não configurada</h2>
      <p>O app está funcionando só neste aparelho. Para salvar online e ver no celular e no computador:</p>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Crie um projeto gratuito em supabase.com.</li>
        <li>No SQL Editor, rode o conteúdo de <code className="rounded bg-slate-700 px-1">supabase/schema.sql</code>.</li>
        <li>Em Project Settings, API, copie a "Project URL" e a chave "anon / publishable".</li>
        <li>Copie <code className="rounded bg-slate-700 px-1">.env.example</code> para <code className="rounded bg-slate-700 px-1">.env</code>, cole os dois valores e reinicie o <code className="rounded bg-slate-700 px-1">npm run dev</code>.</li>
      </ol>
      <p className="text-slate-400">Detalhes e a publicação no GitHub estão em SUPABASE.md.</p>
    </section>
  )
}
