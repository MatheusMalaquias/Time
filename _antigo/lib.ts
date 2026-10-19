import type { Completions, Habit } from './types'

export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const DAY_NAMES_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export const fmt = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export const parseTime = (v: string) => {
  const [hh, mm] = v.split(':').map(Number)
  return (hh || 0) * 60 + (mm || 0)
}

export const isoDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const addDays = (d: Date, n: number) => {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

export const minutesNow = (d = new Date()) => d.getHours() * 60 + d.getMinutes()

/** Dias seguidos com o hábito feito. Hoje só quebra a sequência quando o dia terminar. */
export function streak(habit: Habit, done: Completions, today: Date): number {
  let count = 0
  for (let i = 0; i < 366; i++) {
    const d = addDays(today, -i)
    if (!habit.days.includes(d.getDay())) continue
    const ok = !!done[isoDate(d)]?.[habit.id]
    if (ok) count++
    else if (i === 0) continue
    else break
  }
  return count
}
