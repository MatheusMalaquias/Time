import type { SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './cloud'

export const MAX_FEEDBACK = 2000

export interface FeedbackRow {
  id: string
  message: string
  created_at: string
  read_at: string | null
}

export type Validation = { ok: true; text: string } | { ok: false; error: string }

/** Tira espaços das pontas e confere o tamanho (1 a 2000 caracteres), igual ao banco. */
export function validateMessage(raw: string): Validation {
  const text = raw.trim()
  if (!text) return { ok: false, error: 'Escreva alguma coisa antes de enviar.' }
  if (text.length > MAX_FEEDBACK) return { ok: false, error: `A mensagem passou de ${MAX_FEEDBACK} caracteres.` }
  return { ok: true, text }
}

/** "19/10/2026 às 14:05", no horário do aparelho. */
export function formatFeedbackDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} às ${p(d.getHours())}:${p(d.getMinutes())}`
}

export const countUnread = (rows: { read_at: string | null }[]) => rows.filter((r) => !r.read_at).length

/** Mais recentes primeiro. */
export const sortNewestFirst = <T extends { created_at: string }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))

/** Mensagem em português para erros do envio (inclui o limite por hora do banco). */
export function sendErrorText(message: string): string {
  return /muitas sugest/i.test(message) ? 'Você já enviou várias sugestões agora há pouco. Tente de novo mais tarde.' : 'Não foi possível enviar agora. Seu texto continua aqui; tente de novo.'
}

export const APP_VERSION = '0.1.0'

export async function sendFeedback(client: SupabaseClient, text: string) {
  const { error } = await client.from('feedback').insert({ message: text, app_version: APP_VERSION })
  if (error) throw new Error(error.message)
}

export async function listFeedback(client: SupabaseClient): Promise<FeedbackRow[]> {
  const { data, error } = await client.from('feedback').select('id, message, created_at, read_at').order('created_at', { ascending: false }).limit(200)
  if (error) throw new Error(error.message)
  return data as FeedbackRow[]
}

export async function setRead(client: SupabaseClient, id: string, read: boolean) {
  const { error } = await client.from('feedback').update({ read_at: read ? new Date().toISOString() : null }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function removeFeedback(client: SupabaseClient, id: string) {
  const { error } = await client.from('feedback').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Descobre se a conta é admin (a linha na app_admins só é visível para a própria pessoa) e conta as não lidas. */
export function useFeedbackAdmin(userId: string | undefined) {
  const [state, setState] = useState({ isAdmin: false, unread: 0 })

  const refresh = useCallback(async () => {
    if (!supabase || !userId) return setState({ isAdmin: false, unread: 0 })
    const adm = await supabase.from('app_admins').select('user_id').maybeSingle()
    if (adm.error || !adm.data) return setState({ isAdmin: false, unread: 0 })
    const { count } = await supabase.from('feedback').select('id', { count: 'exact', head: true }).is('read_at', null)
    setState({ isAdmin: true, unread: count ?? 0 })
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...state, refresh }
}
