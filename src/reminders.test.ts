import { describe, expect, it } from 'vitest'
import { buildIcs, fold } from './ics'
import { dueItems } from './reminders'
import type { Item } from './calendar'

const base = { doneOn: [], skip: [] }
const aula: Item = { id: 'a', title: 'Aula, de inglês', days: [1, 3], from: '2026-10-19', start: 19 * 60, end: 20 * 60, ...base }

describe('dueItems', () => {
  const at = (h: number, m: number) => new Date(2026, 9, 19, h, m) // segunda 19/10

  it('avisa na janela de 10 min antes do início', () => {
    expect(dueItems([aula], at(18, 50), 10)).toHaveLength(1)
    expect(dueItems([aula], at(18, 54), 10)).toHaveLength(1)
  })
  it('não avisa cedo demais nem tarde demais', () => {
    expect(dueItems([aula], at(18, 40), 10)).toHaveLength(0)
    expect(dueItems([aula], at(19, 30), 10)).toHaveLength(0)
  })
  it('não avisa item já feito nem item sem horário', () => {
    expect(dueItems([{ ...aula, doneOn: ['2026-10-19'] }], at(18, 50), 10)).toHaveLength(0)
    expect(dueItems([{ ...aula, start: undefined, end: undefined }], at(18, 50), 10)).toHaveLength(0)
  })
})

describe('buildIcs', () => {
  const now = new Date(Date.UTC(2026, 9, 19, 12, 0, 0))
  const ics = (items: Item[]) => buildIcs(items, { lead: 10, today: '2026-10-19', now })

  it('repete toda semana com alarme de 10 minutos', () => {
    const t = ics([aula])
    expect(t).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE')
    expect(t).toContain('DTSTART:20261019T190000')
    expect(t).toContain('TRIGGER:-PT10M')
    expect(t).toContain('SUMMARY:Aula\\, de inglês')
    expect(t.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('começa na primeira data que cai em um dia escolhido', () => {
    expect(ics([{ ...aula, from: '2026-10-20' }])).toContain('DTSTART:20261021T190000') // terça -> quarta
  })

  it('dia pulado ou movido vira EXDATE; movido ganha evento próprio', () => {
    const t = ics([{ ...aula, skip: ['2026-10-26'], moved: { '2026-10-21': { start: 20 * 60, end: 21 * 60 } } }])
    expect(t).toContain('EXDATE:20261026T190000,20261021T190000')
    expect(t).toContain('DTSTART:20261021T200000')
  })

  it('item de um dia só não repete; item sem horário é dia inteiro sem alarme', () => {
    const t = ics([
      { id: 'x', title: 'Dentista', date: '2026-10-22', start: 600, ...base },
      { id: 'y', title: 'Almoço', days: [1], from: '2026-10-19', ...base },
    ])
    expect(t.match(/RRULE/g)).toHaveLength(1)
    expect(t).toContain('DTSTART;VALUE=DATE:20261019')
    expect(t.match(/BEGIN:VALARM/g)).toHaveLength(1)
  })

  it('dobra linhas longas em 75 bytes', () => {
    const lines = fold('SUMMARY:' + 'á'.repeat(100)).split('\r\n')
    expect(lines.length).toBeGreaterThan(1)
    for (const l of lines) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
  })
})
