import { useRef, useState } from 'react'

/** Distância mínima (px) para o gesto de lado trocar o dia ou o mês. */
export const SWIPE_DISTANCE = 70
const SLOP = 10 // movimento mínimo antes de decidir se o gesto é de lado ou de rolagem

/** Avisa o gesto de lado que uma atividade está sendo arrastada (ou acabou de ser), para ele não competir. */
export const dragState = { active: false, endedAt: 0 }

export type SwipeLock = 'h' | 'v' | null
export type Direction = 'next' | 'prev'

/** O gesto é de lado ('h'), de rolagem ('v') ou ainda indefinido (null)? */
export function swipeLock(dx: number, dy: number): SwipeLock {
  if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return null
  return Math.abs(dx) > Math.abs(dy) * 1.5 ? 'h' : 'v'
}

/** Arrastar para a esquerda avança; para a direita volta. */
export function swipeResult(dx: number, lock: SwipeLock, minDistance = SWIPE_DISTANCE): Direction | null {
  if (lock !== 'h') return null
  if (dx <= -minDistance) return 'next'
  if (dx >= minDistance) return 'prev'
  return null
}

/**
 * Arrastar de lado: o conteúdo acompanha o dedo; ao soltar além da distância mínima troca
 * (dia ou mês) com uma animação de entrada, senão volta ao lugar.
 */
export function useSwipe(onNext: () => void, onPrev: () => void) {
  const start = useRef<{ x: number; y: number; lock: SwipeLock } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const [dx, setDx] = useState(0)
  const [tracking, setTracking] = useState(false)
  const [enter, setEnter] = useState<'from-right' | 'from-left' | null>(null)

  const reset = () => {
    start.current = null
    setTracking(false)
    setDx(0)
  }

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return reset()
      const t = e.touches[0]
      start.current = { x: t.clientX, y: t.clientY, lock: null }
    },
    onTouchMove: (e: React.TouchEvent) => {
      const s = start.current
      if (!s) return
      if (dragState.active) return reset() // uma atividade está sendo movida: não trocar de dia
      const t = e.touches[0]
      const mx = t.clientX - s.x
      if (!s.lock) s.lock = swipeLock(mx, t.clientY - s.y)
      if (s.lock === 'h') {
        setTracking(true)
        setDx(mx * 0.85)
      }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current
      reset()
      if (!s) return
      const mx = (e.changedTouches[0]?.clientX ?? s.x) - s.x
      const justDragged = dragState.active || Date.now() - dragState.endedAt < 150
      const result = justDragged ? null : swipeResult(mx, s.lock)
      if (!result) return
      setEnter(result === 'next' ? 'from-right' : 'from-left')
      if (result === 'next') onNext()
      else onPrev()
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setEnter(null), 320)
    },
    onTouchCancel: reset,
  }

  return {
    handlers,
    style: { transform: dx ? `translateX(${dx}px)` : undefined, transition: tracking ? 'none' : 'transform 180ms ease-out' },
    enterClass: enter ? `slide-${enter}` : '',
  }
}
