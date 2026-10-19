import { describe, expect, it } from 'vitest'
import { countUnread, formatFeedbackDate, MAX_FEEDBACK, sendErrorText, sortNewestFirst, validateMessage } from './feedback'

describe('validateMessage', () => {
  it('tira espaços das pontas', () => expect(validateMessage('  oi  \n')).toEqual({ ok: true, text: 'oi' }))
  it('recusa vazio ou só espaços', () => {
    expect(validateMessage('').ok).toBe(false)
    expect(validateMessage('   \n ').ok).toBe(false)
  })
  it('aceita exatamente o limite e recusa acima', () => {
    expect(validateMessage('a'.repeat(MAX_FEEDBACK)).ok).toBe(true)
    expect(validateMessage('a'.repeat(MAX_FEEDBACK + 1)).ok).toBe(false)
  })
  it('o limite vale depois do trim', () => expect(validateMessage(' ' + 'a'.repeat(MAX_FEEDBACK) + ' ').ok).toBe(true))
})

describe('formatFeedbackDate', () => {
  it('formata dia, mês, ano e hora com zeros', () => {
    expect(formatFeedbackDate(new Date(2026, 0, 5, 9, 7).toISOString())).toBe('05/01/2026 às 09:07')
    expect(formatFeedbackDate(new Date(2026, 9, 19, 14, 30).toISOString())).toBe('19/10/2026 às 14:30')
  })
  it('data inválida vira vazio', () => expect(formatFeedbackDate('xx')).toBe(''))
})

describe('countUnread / sortNewestFirst', () => {
  it('conta só as sem read_at', () => {
    expect(countUnread([{ read_at: null }, { read_at: '2026-01-01T00:00:00Z' }, { read_at: null }])).toBe(2)
    expect(countUnread([])).toBe(0)
  })
  it('ordena das mais novas para as mais antigas sem alterar a lista original', () => {
    const rows = [{ created_at: '2026-01-01T10:00:00Z' }, { created_at: '2026-01-03T10:00:00Z' }, { created_at: '2026-01-02T10:00:00Z' }]
    expect(sortNewestFirst(rows).map((r) => r.created_at.slice(8, 10))).toEqual(['03', '02', '01'])
    expect(rows[0].created_at.slice(8, 10)).toBe('01')
  })
})

describe('sendErrorText', () => {
  it('reconhece o limite por hora', () => expect(sendErrorText('Muitas sugestões em pouco tempo.')).toMatch(/várias sugestões/))
  it('erro genérico mantém o texto', () => expect(sendErrorText('boom')).toMatch(/Seu texto continua aqui/))
})
