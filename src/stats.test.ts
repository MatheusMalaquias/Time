import { describe, expect, it } from 'vitest'
import { activityStats, dayCount, pct, rangeCount, weekDates } from './stats'
import type { Item } from './calendar'

const daily = (title: string, doneOn: string[] = []): Item => ({
  id: title,
  title,
  days: [0, 1, 2, 3, 4, 5, 6],
  from: '2026-10-01',
  doneOn,
  skip: [],
})

describe('stats', () => {
  it('conta feitos do dia', () => {
    const items = [daily('A', ['2026-10-19']), daily('B')]
    expect(dayCount(items, '2026-10-19')).toEqual({ done: 1, total: 2 })
    expect(pct(dayCount(items, '2026-10-19'))).toBe(50)
  })

  it('semana vai de segunda a domingo', () => {
    const w = weekDates('2026-10-21') // quarta
    expect(w[0]).toBe('2026-10-19')
    expect(w[6]).toBe('2026-10-25')
  })

  it('dias futuros não entram na conta do período', () => {
    const items = [daily('A', ['2026-10-19'])]
    expect(rangeCount(items, weekDates('2026-10-19'), '2026-10-20')).toEqual({ done: 1, total: 2 })
  })

  it('sequência: dias seguidos e hoje pendente não quebra', () => {
    const items = [daily('A', ['2026-10-18', '2026-10-17']), daily('B', ['2026-10-17'])]
    const stats = activityStats(items, '2026-10-19', 5)
    expect(stats.find((s) => s.title === 'A')!.streak).toBe(2)
    expect(stats.find((s) => s.title === 'B')!.streak).toBe(0)
  })
})
