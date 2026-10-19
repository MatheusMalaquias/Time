import { createClient, type Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Item } from './calendar'
import { isRecoveryUrl, ownerAction } from './account'
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
  // o link do e-mail traz type=recovery; guardamos isso já na carga, caso o evento chegue antes da escuta
  const [recovery, setRecovery] = useState(() => isRecoveryUrl(location.hash, location.search))

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') setRecovery(false)
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
const OWNER_KEY = 'tm.owner'
export const ITEMS_KEY = 'tm.cal.v1'

/** Apaga tudo o que o app guarda neste aparelho sobre a agenda (usado ao excluir a conta). */
export function clearLocalData() {
  try {
    for (const k of [ITEMS_KEY, META_KEY, OWNER_KEY]) localStorage.removeItem(k)
  } catch {
    /* sem armazenamento */
  }
}

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
export function useSync(items: Item[], setItems: (items: Item[]) => void, loginId?: string) {
  const [claimed, setClaimed] = useState<string>()
  // só sincroniza depois de conferir de quem são os dados deste aparelho
  const userId = loginId && claimed === loginId ? loginId : undefined
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' })
  const itemsRef = useRef(items)
  itemsRef.current = items
  const metaRef = useRef<MetaMap>(loadMeta())
  const running = useRef(false)
  const again = useRef(false)

  // outra pessoa entrou neste aparelho: descarta os dados locais da anterior, para não irem para a conta dela
  useEffect(() => {
    if (!loginId) return
    let stored: string | null = null
    try {
      stored = localStorage.getItem(OWNER_KEY)
    } catch {
      /* sem armazenamento */
    }
    if (ownerAction(stored, loginId) === 'reset') {
      metaRef.current = {}
      itemsRef.current = []
      setItems([])
      try {
        localStorage.removeItem(META_KEY)
      } catch {
        /* sem armazenamento */
      }
    }
    try {
      localStorage.setItem(OWNER_KEY, loginId)
    } catch {
      /* sem armazenamento */
    }
    setClaimed(loginId)
  }, [loginId, setItems])

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
    if (loginId && !userId) return // ainda conferindo o dono dos dados
    metaRef.current = reconcileMeta(items, metaRef.current, Date.now())
    saveMeta()
    if (!userId) return
    const t = setTimeout(() => void sync(), 1500)
    return () => clearTimeout(t)
  }, [items, loginId, userId, sync])

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
