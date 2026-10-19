import { createClient, type Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Item } from './calendar'
import { mergeRemote, reconcileMeta, type MetaMap } from './sync'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Sem as variáveis de ambiente o app funciona só neste aparelho, como antes. */
// storageKey próprio: outros apps em matheusmalaquias.github.io que usem o mesmo projeto do Supabase
// guardam o login no mesmo domínio e, sem isso, o TimeMind herdaria a sessão deles.
export const supabase = url && key ? createClient(url, key, { auth: { storageKey: 'timemind-auth' } }) : null
export const cloudConfigured = supabase !== null

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return { session, ready, recovery, clearRecovery: () => setRecovery(false) }
}

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'ok' | 'error'
  at?: number
  error?: string
}

const META_KEY = 'tm.sync.meta'
const loadMeta = (): MetaMap => {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/**
 * Local primeiro: o app sempre lê e grava no aparelho (funciona offline) e sincroniza com o
 * Supabase em segundo plano. Por atividade, vence a mudança mais recente.
 */
export function useSync(items: Item[], setItems: (items: Item[]) => void, userId?: string) {
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' })
  const itemsRef = useRef(items)
  itemsRef.current = items
  const metaRef = useRef<MetaMap>(loadMeta())
  const running = useRef(false)
  const again = useRef(false)

  const saveMeta = () => {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(metaRef.current))
    } catch {
      /* sem armazenamento */
    }
  }

  const sync = useCallback(async () => {
    if (!supabase || !userId) return
    if (running.current) {
      again.current = true
      return
    }
    running.current = true
    setStatus((s) => ({ ...s, state: 'syncing' }))
    try {
      const { data, error } = await supabase.from('items').select('id,data,deleted,updated_ms')
      if (error) throw error
      const remote = (data ?? []).map((r) => ({
        id: r.id as string,
        data: r.data as Item | null,
        deleted: r.deleted as boolean,
        updated_ms: Number(r.updated_ms),
      }))

      // tudo abaixo até setItems é síncrono: usa o estado mais recente, sem corrida com edições
      const current = itemsRef.current
      const meta = reconcileMeta(current, metaRef.current, Date.now())
      const merged = mergeRemote(current, meta, remote)
      metaRef.current = merged.meta
      saveMeta()
      if (JSON.stringify(merged.items) !== JSON.stringify(current)) setItems(merged.items)

      if (merged.push.length) {
        const rows = merged.push.map((p) => ({ user_id: userId, id: p.id, data: p.data, deleted: p.deleted, updated_ms: p.updated_ms }))
        const { error: upError } = await supabase.from('items').upsert(rows, { onConflict: 'user_id,id' })
        if (upError) throw upError
      }
      setStatus({ state: 'ok', at: Date.now() })
    } catch (e) {
      setStatus({ state: 'error', error: e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Erro desconhecido' })
    } finally {
      running.current = false
      if (again.current) {
        again.current = false
        void sync()
      }
    }
  }, [userId, setItems])

  // registra o que mudou e, logado, sincroniza pouco depois da última edição
  useEffect(() => {
    metaRef.current = reconcileMeta(items, metaRef.current, Date.now())
    saveMeta()
    if (!userId) return
    const t = setTimeout(() => void sync(), 1500)
    return () => clearTimeout(t)
  }, [items, userId, sync])

  // ao entrar, ao voltar para o app, ao reconectar e a cada minuto
  useEffect(() => {
    if (!userId) return
    void sync()
    const onFocus = () => document.visibilityState !== 'hidden' && void sync()
    const timer = setInterval(() => void sync(), 60_000)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [userId, sync])

  return { status, sync }
}
