import { describe, expect, it } from 'vitest'
import { mergeRemote, reconcileMeta, type Remote } from './sync'
import type { Item } from './calendar'

const item = (id: string, title = id): Item => ({ id, title, date: '2026-10-19', doneOn: [], skip: [] })
const remote = (it: Item, ms: number, deleted = false): Remote => ({ id: it.id, data: deleted ? null : it, deleted, updated_ms: ms })

describe('reconcileMeta', () => {
  it('carimba itens novos e alterados, mantém os inalterados', () => {
    const a = item('a')
    const m1 = reconcileMeta([a], {}, 100)
    expect(m1.a.updatedAt).toBe(100)
    expect(reconcileMeta([a], m1, 200).a.updatedAt).toBe(100)
    expect(reconcileMeta([{ ...a, title: 'novo' }], m1, 300).a.updatedAt).toBe(300)
  })

  it('item que sumiu vira exclusão e ela não é recarimbada', () => {
    const m1 = reconcileMeta([item('a')], {}, 100)
    const m2 = reconcileMeta([], m1, 200)
    expect(m2.a).toMatchObject({ deleted: true, updatedAt: 200 })
    expect(reconcileMeta([], m2, 300).a.updatedAt).toBe(200)
  })

  it('item apagado e recriado com o mesmo id volta a existir', () => {
    const tomb = reconcileMeta([], reconcileMeta([item('a')], {}, 100), 200)
    expect(reconcileMeta([item('a')], tomb, 300).a).toMatchObject({ updatedAt: 300 })
    expect(reconcileMeta([item('a')], tomb, 300).a.deleted).toBeUndefined()
  })
})

describe('mergeRemote', () => {
  it('traz do servidor o que não existe localmente', () => {
    const r = mergeRemote([], {}, [remote(item('a'), 50)])
    expect(r.items.map((i) => i.id)).toEqual(['a'])
    expect(r.push).toHaveLength(0)
  })

  it('envia ao servidor o que só existe localmente', () => {
    const a = item('a')
    const r = mergeRemote([a], reconcileMeta([a], {}, 100), [])
    expect(r.push).toEqual([{ id: 'a', data: a, deleted: false, updated_ms: 100 }])
  })

  it('vence a mudança mais recente', () => {
    const local = item('a', 'local')
    const meta = reconcileMeta([local], {}, 200)
    const newerRemote = mergeRemote([local], meta, [remote(item('a', 'remoto'), 300)])
    expect(newerRemote.items[0].title).toBe('remoto')
    expect(newerRemote.push).toHaveLength(0)

    const olderRemote = mergeRemote([local], meta, [remote(item('a', 'remoto'), 100)])
    expect(olderRemote.items[0].title).toBe('local')
    expect(olderRemote.push).toHaveLength(1)
  })

  it('exclusão local mais nova é enviada; exclusão remota mais nova remove localmente', () => {
    const a = item('a')
    const tomb = reconcileMeta([], reconcileMeta([a], {}, 100), 200)
    expect(mergeRemote([], tomb, [remote(a, 100)]).push[0]).toMatchObject({ id: 'a', deleted: true })

    const meta = reconcileMeta([a], {}, 100)
    const r = mergeRemote([a], meta, [remote(a, 250, true)])
    expect(r.items).toHaveLength(0)
    expect(r.meta.a.deleted).toBe(true)
  })

  it('segunda rodada sem mudanças não envia nada (sem loop)', () => {
    const a = item('a')
    const first = mergeRemote([a], reconcileMeta([a], {}, 100), [])
    const again = mergeRemote(first.items, first.meta, [{ id: 'a', data: a, deleted: false, updated_ms: 100 }])
    expect(again.push).toHaveLength(0)
  })
})
