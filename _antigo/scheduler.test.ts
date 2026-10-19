import { describe, expect, it } from 'vitest'
import { defaultSettings } from './defaults'
import { freeGaps, planDay } from './scheduler'
import { streak, isoDate } from './lib'

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end

describe('freeGaps', () => {
  it('remove os intervalos ocupados', () => {
    expect(freeGaps(0, 100, [{ start: 20, end: 30 }, { start: 50, end: 60 }])).toEqual([
      { start: 0, end: 20 },
      { start: 30, end: 50 },
      { start: 60, end: 100 },
    ])
  })
})

describe('planDay', () => {
  for (let day = 0; day < 7; day++) {
    it(`dia ${day}: encaixa todos os hábitos sem sobreposição`, () => {
      const plan = planDay(day, defaultSettings)
      expect(plan.unplaced).toHaveLength(0)
      const expected = defaultSettings.habits.filter((h) => h.days.includes(day)).length
      expect(plan.blocks.filter((b) => b.type === 'habit')).toHaveLength(expected)
      for (let i = 0; i < plan.blocks.length; i++)
        for (let j = i + 1; j < plan.blocks.length; j++)
          expect(overlaps(plan.blocks[i], plan.blocks[j])).toBe(false)
    })
  }

  it('segunda: nada colide com treinamento (9h-18h) nem com a aula (19h-20h)', () => {
    const habits = planDay(1, defaultSettings).blocks.filter((b) => b.type === 'habit')
    for (const h of habits) {
      expect(overlaps(h, { start: 540, end: 1080 })).toBe(false)
      expect(overlaps(h, { start: 1140, end: 1200 })).toBe(false)
    }
  })

  it('domingo: respeita a aula de 15h às 17h', () => {
    const habits = planDay(0, defaultSettings).blocks.filter((b) => b.type === 'habit')
    for (const h of habits) expect(overlaps(h, { start: 900, end: 1020 })).toBe(false)
  })

  it('domingo: nada durante a reunião da Igreja (7h-14:30) nem às 21h', () => {
    const habits = planDay(0, defaultSettings).blocks.filter((b) => b.type === 'habit')
    for (const h of habits) {
      expect(overlaps(h, { start: 420, end: 870 })).toBe(false)
      expect(overlaps(h, { start: 1260, end: 1320 })).toBe(false)
    }
  })

  it('academia, idioma, estudo e leitura acontecem todos os dias', () => {
    for (let d = 0; d < 7; d++) {
      const ids = planDay(d, defaultSettings).blocks.map((b) => b.habitId)
      for (const id of ['academia', 'idioma', 'estudo', 'leitura']) expect(ids).toContain(id)
    }
  })

  it('atividade recorrente só aparece nos dias escolhidos', () => {
    const s = {
      ...defaultSettings,
      habits: [...defaultSettings.habits, { id: 'proj', title: 'Projeto', emoji: '🎯', minutes: 30, days: [2, 4], prefer: [] }],
    }
    for (let d = 0; d < 7; d++)
      expect(planDay(d, s).blocks.some((b) => b.habitId === 'proj')).toBe([2, 4].includes(d))
  })

  it('override: pular, mover e atividade avulsa', () => {
    const base = planDay(2, defaultSettings)
    const ov = {
      skip: ['habit-leitura'],
      move: { 'habit-academia': { start: 18 * 60 + 15, end: 19 * 60 + 15 } },
      extra: [{ id: 'x', title: 'Dentista', start: 6 * 60 + 30, end: 7 * 60 + 30 }],
    }
    const plan = planDay(2, defaultSettings, ov)
    expect(plan.blocks.some((b) => b.habitId === 'leitura')).toBe(false)
    expect(plan.blocks.find((b) => b.habitId === 'academia')?.start).toBe(18 * 60 + 15)
    expect(plan.blocks.find((b) => b.id === 'x')).toBeTruthy()
    expect(base.blocks.length).toBeGreaterThan(0)
    for (let i = 0; i < plan.blocks.length; i++)
      for (let j = i + 1; j < plan.blocks.length; j++)
        expect(overlaps(plan.blocks[i], plan.blocks[j])).toBe(false)
  })

  it('override: estender a reunião da Igreja empurra os hábitos', () => {
    const plan = planDay(0, defaultSettings, { skip: [], move: { 'igreja-dom': { start: 420, end: 15 * 60 } }, extra: [] })
    const igreja = plan.blocks.find((b) => b.id === 'igreja-dom')!
    for (const b of plan.blocks.filter((x) => x.type === 'habit')) expect(overlaps(b, igreja)).toBe(false)
  })

  it('academia tem 10 min de ida e 10 de volta', () => {
    const blocks = planDay(2, defaultSettings).blocks
    const gym = blocks.find((b) => b.habitId === 'academia')!
    const ida = blocks.find((b) => b.id === 'travel-in-habit-academia')!
    const volta = blocks.find((b) => b.id === 'travel-out-habit-academia')!
    expect(ida.end).toBe(gym.start)
    expect(ida.end - ida.start).toBe(10)
    expect(volta.start).toBe(gym.end)
    expect(volta.end - volta.start).toBe(10)
  })

  it('deslocamento de compromisso fixo também ocupa agenda', () => {
    const s = { ...defaultSettings, fixed: defaultSettings.fixed.map((f) => (f.id === 'igreja-dom' ? { ...f, travelMinutes: 20 } : f)) }
    const blocks = planDay(0, s).blocks
    const volta = blocks.find((b) => b.id === 'travel-out-igreja-dom')!
    expect(volta.end).toBe(14 * 60 + 50)
    for (const b of blocks.filter((x) => x.type === 'habit')) expect(overlaps(b, volta)).toBe(false)
  })

  it('devolve hábito sem espaço em unplaced', () => {
    const s = { ...defaultSettings, dayStart: 540, dayEnd: 600 }
    expect(planDay(2, s).unplaced.length).toBeGreaterThan(0)
  })
})

describe('streak', () => {
  const habit = defaultSettings.habits.find((h) => h.id === 'idioma')!
  const today = new Date(2026, 9, 19)
  it('conta dias seguidos e ignora hoje se ainda não feito', () => {
    const done = { '2026-10-18': { idioma: true }, '2026-10-17': { idioma: true } }
    expect(streak(habit, done, today)).toBe(2)
    expect(streak(habit, { ...done, [isoDate(today)]: { idioma: true } }, today)).toBe(3)
  })
  it('quebra no primeiro dia sem registro', () => {
    expect(streak(habit, { '2026-10-17': { idioma: true } }, today)).toBe(0)
  })
})
