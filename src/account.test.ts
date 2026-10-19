import { describe, expect, it } from 'vitest'
import { canDelete, feedbackHref, isRecoveryUrl, ownerAction } from './account'
import { TEMPLATES, templateItems } from './templates'
import { itemsOn } from './calendar'

describe('ownerAction', () => {
  it('aparelho sem dono guarda os dados e passa a ser da pessoa', () => expect(ownerAction(null, 'a')).toBe('claim'))
  it('mesma pessoa mantém', () => expect(ownerAction('a', 'a')).toBe('keep'))
  it('outra pessoa descarta os dados locais', () => expect(ownerAction('a', 'b')).toBe('reset'))
})

describe('isRecoveryUrl', () => {
  it('reconhece o link de recuperação', () => {
    expect(isRecoveryUrl('#access_token=x&refresh_token=y&type=recovery', '')).toBe(true)
    expect(isRecoveryUrl('', '?type=recovery')).toBe(true)
  })
  it('ignora outros links', () => {
    expect(isRecoveryUrl('#access_token=x&type=signup', '')).toBe(false)
    expect(isRecoveryUrl('', '')).toBe(false)
  })
})

describe('feedbackHref', () => {
  it('sem destino não mostra o botão', () => {
    expect(feedbackHref(undefined)).toBeNull()
    expect(feedbackHref('  ')).toBeNull()
  })
  it('aceita https e e-mail, recusa o resto', () => {
    expect(feedbackHref('https://exemplo.com/form')).toBe('https://exemplo.com/form')
    expect(feedbackHref('oi@exemplo.com')).toMatch(/^mailto:oi@exemplo\.com\?subject=/)
    expect(feedbackHref('javascript:alert(1)')).toBeNull()
    expect(feedbackHref('http://inseguro.com')).toBeNull()
  })
})

describe('canDelete', () => {
  it('exige a palavra EXCLUIR', () => {
    expect(canDelete('excluir')).toBe(true)
    expect(canDelete(' EXCLUIR ')).toBe(true)
    expect(canDelete('')).toBe(false)
    expect(canDelete('sim')).toBe(false)
  })
})

describe('modelos', () => {
  it('cada modelo gera atividades editáveis e neutras, a partir de hoje', () => {
    for (const t of TEMPLATES) {
      const list = templateItems(t.id, '2026-10-19')
      expect(list.length).toBeGreaterThan(3)
      expect(new Set(list.map((i) => i.id)).size).toBe(list.length)
      expect(list.every((i) => i.from === '2026-10-19' && i.days?.length && i.start !== undefined)).toBe(true)
      expect(itemsOn(list, '2026-10-19').length).toBeGreaterThan(0) // segunda-feira
    }
  })
  it('modelo desconhecido não gera nada', () => expect(templateItems('x', '2026-10-19')).toEqual([]))
})
