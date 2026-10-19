import type { Item } from './calendar'

/** Versão conhecida de cada atividade: conteúdo, momento da última mudança e se foi apagada. */
export interface Meta {
  json: string
  updatedAt: number
  deleted?: boolean
}
export type MetaMap = Record<string, Meta>

export interface Remote {
  id: string
  data: Item | null
  deleted: boolean
  updated_ms: number
}

/** Carimba com `now` o que mudou desde a última vez e marca como apagado o que sumiu da lista. */
export function reconcileMeta(items: Item[], meta: MetaMap, now: number): MetaMap {
  const next: MetaMap = {}
  const present = new Set<string>()
  for (const it of items) {
    present.add(it.id)
    const json = JSON.stringify(it)
    const m = meta[it.id]
    next[it.id] = m && !m.deleted && m.json === json ? m : { json, updatedAt: now }
  }
  for (const [id, m] of Object.entries(meta)) {
    if (present.has(id)) continue
    next[id] = m.deleted ? m : { json: '', updatedAt: now, deleted: true }
  }
  return next
}

export interface MergeResult {
  items: Item[]
  meta: MetaMap
  push: Remote[]
}

/** Junta local e remoto: vence, por atividade, a mudança mais recente. */
export function mergeRemote(items: Item[], meta: MetaMap, remote: Remote[]): MergeResult {
  const byId = new Map(items.map((i) => [i.id, i]))
  const remoteById = new Map(remote.map((r) => [r.id, r]))
  const outMeta: MetaMap = { ...meta }
  const push: Remote[] = []

  for (const id of new Set([...Object.keys(meta), ...remoteById.keys()])) {
    const m = meta[id]
    const r = remoteById.get(id)

    if (r && (!m || r.updated_ms > m.updatedAt)) {
      if (r.deleted || !r.data) {
        byId.delete(id)
        outMeta[id] = { json: '', updatedAt: r.updated_ms, deleted: true }
      } else {
        byId.set(id, r.data)
        outMeta[id] = { json: JSON.stringify(r.data), updatedAt: r.updated_ms }
      }
    } else if (m && (!r || m.updatedAt > r.updated_ms)) {
      push.push({ id, data: m.deleted ? null : (byId.get(id) ?? null), deleted: !!m.deleted, updated_ms: m.updatedAt })
    }
  }

  // mantém a ordem local e põe as novidades no fim
  const order = items.map((i) => i.id).filter((id) => byId.has(id))
  const added = [...byId.keys()].filter((id) => !order.includes(id))
  return { items: [...order, ...added].map((id) => byId.get(id) as Item), meta: outMeta, push }
}
