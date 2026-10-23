import { describe, expect, it } from 'vitest'
import { swipeLock, swipeResult } from './swipe'

describe('swipeLock', () => {
  it('ainda indefinido para movimento pequeno', () => {
    expect(swipeLock(4, 3)).toBeNull()
  })
  it('gesto mais horizontal que vertical é de lado', () => {
    expect(swipeLock(40, 10)).toBe('h')
  })
  it('gesto diagonal ou vertical é rolagem', () => {
    expect(swipeLock(30, 28)).toBe('v')
    expect(swipeLock(5, 60)).toBe('v')
  })
})

describe('swipeResult', () => {
  it('esquerda avança e direita volta, a partir da distância mínima', () => {
    expect(swipeResult(-90, 'h')).toBe('next')
    expect(swipeResult(90, 'h')).toBe('prev')
  })
  it('gesto curto não troca', () => {
    expect(swipeResult(-40, 'h')).toBeNull()
    expect(swipeResult(40, 'h')).toBeNull()
  })
  it('rolagem vertical nunca troca, por maior que seja o deslocamento lateral', () => {
    expect(swipeResult(-200, 'v')).toBeNull()
    expect(swipeResult(-200, null)).toBeNull()
  })
})
