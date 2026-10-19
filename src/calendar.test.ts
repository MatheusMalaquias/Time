import { describe, expect, it } from 'vitest'
import { itemsOn, monthGrid, starterItems } from './calendar'

const base = { doneOn: [], skip: [] }

describe('itemsOn', () => {
  it('item de um dia aparece só nesse dia', () => {
    const items = [{ id: '1', title: 'Dentista', date: '2026-10-20', ...base }]
    expect(itemsOn(items, '2026-10-20')).toHaveLength(1)
    expect(itemsOn(items, '2026-10-21')).toHaveLength(0)
  })

  it('item repetido aparece nos dias da semana escolhidos, a partir de "from"', () => {
    const items = [{ id: '1', title: 'Aula', days: [1, 3], from: '2026-10-19', ...base }]
    expect(itemsOn(items, '2026-10-19')).toHaveLength(1) // segunda
    expect(itemsOn(items, '2026-10-20')).toHaveLength(0) // terça
    expect(itemsOn(items, '2026-10-21')).toHaveLength(1) // quarta
    expect(itemsOn(items, '2026-10-12')).toHaveLength(0) // antes do início
  })

  it('remover só um dia não afeta os outros', () => {
    const items = [{ id: '1', title: 'Aula', days: [1], from: '2026-10-05', doneOn: [], skip: ['2026-10-19'] }]
    expect(itemsOn(items, '2026-10-19')).toHaveLength(0)
    expect(itemsOn(items, '2026-10-26')).toHaveLength(1)
  })

  it('mover um dia de item repetido não muda os outros dias', () => {
    const items = [{ id: '1', title: 'Aula', days: [1], from: '2026-10-05', start: 600, end: 660, moved: { '2026-10-19': { start: 840, end: 900 } }, doneOn: [], skip: [] }]
    expect(itemsOn(items, '2026-10-19')[0].start).toBe(840)
    expect(itemsOn(items, '2026-10-26')[0].start).toBe(600)
  })

  it('ordena por horário e deixa os sem horário no fim', () => {
    const items = [
      { id: 'a', title: 'Sem hora', date: '2026-10-19', ...base },
      { id: 'b', title: 'Tarde', date: '2026-10-19', start: 900, ...base },
      { id: 'c', title: 'Manhã', date: '2026-10-19', start: 420, ...base },
    ]
    expect(itemsOn(items, '2026-10-19').map((i) => i.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('monthGrid', () => {
  it('outubro de 2026 começa na quinta e tem 31 dias', () => {
    const g = monthGrid(2026, 9)
    expect(g.length % 7).toBe(0)
    expect(g.indexOf('2026-10-01')).toBe(4)
    expect(g.filter(Boolean)).toHaveLength(31)
  })
})

describe('starterItems', () => {
  it('traz a rotina inicial', () => {
    expect(starterItems('2026-10-19').map((i) => i.title)).toContain('Academia')
  })
})

import { layoutDay } from './calendar'

describe('layoutDay', () => {
  const t = (id: string, start: number, end?: number) => ({ id, title: id, date: 'd', start, end, doneOn: [], skip: [] })

  it('itens sem sobreposição ocupam a largura toda', () => {
    const p = layoutDay([t('a', 60, 120), t('b', 120, 180)])
    expect(p.map((x) => [x.col, x.cols])).toEqual([[0, 1], [0, 1]])
  })

  it('itens sobrepostos ficam em colunas lado a lado', () => {
    const p = layoutDay([t('a', 60, 180), t('b', 90, 120)])
    expect(p.map((x) => [x.col, x.cols])).toEqual([[0, 2], [1, 2]])
  })

  it('sem horário de fim usa 30 minutos e itens sem início ficam de fora', () => {
    const p = layoutDay([t('a', 60), { id: 'x', title: 'x', date: 'd', doneOn: [], skip: [] }])
    expect(p).toHaveLength(1)
    expect(p[0].end).toBe(90)
  })
})
