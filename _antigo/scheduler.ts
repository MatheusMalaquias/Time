import type { DayOverride, DayPlan, Habit, PlannedBlock, Settings } from './types'

interface Gap {
  start: number
  end: number
}

/** Retorna os intervalos livres de [from, to] depois de remover os ocupados. */
export function freeGaps(from: number, to: number, busy: Gap[]): Gap[] {
  const sorted = [...busy].sort((a, b) => a.start - b.start)
  const gaps: Gap[] = []
  let cursor = from
  for (const b of sorted) {
    if (b.start > cursor) gaps.push({ start: cursor, end: Math.min(b.start, to) })
    cursor = Math.max(cursor, b.end)
    if (cursor >= to) break
  }
  if (cursor < to) gaps.push({ start: cursor, end: to })
  return gaps.filter((g) => g.end > g.start)
}

function findSlot(gaps: Gap[], minutes: number, window?: Gap): number | null {
  for (const g of gaps) {
    const start = Math.max(g.start, window?.start ?? g.start)
    const end = Math.min(g.end, window?.end ?? g.end)
    if (end - start >= minutes) return start
  }
  return null
}

export const minutesFor = (h: Habit, day: number) => h.minutesByDay?.[day] ?? h.minutes

const travelBlocks = (id: string, title: string, start: number, end: number, t: number): PlannedBlock[] =>
  t > 0
    ? [
        { id: `travel-in-${id}`, title: `Ida · ${title}`, start: start - t, end: start, type: 'travel', kind: 'travel' },
        { id: `travel-out-${id}`, title: `Volta · ${title}`, start: end, end: end + t, type: 'travel', kind: 'travel' },
      ]
    : []

/** Monta o plano do dia: blocos fixos + hábitos encaixados nos horários livres, com deslocamento. */
export function planDay(day: number, s: Settings, ov?: DayOverride): DayPlan {
  const skip = new Set(ov?.skip ?? [])
  const moved = ov?.move ?? {}
  const busy: Gap[] = []
  const out: PlannedBlock[] = []
  const unplaced: Habit[] = []

  const add = (b: PlannedBlock, travel = 0) => {
    const trips = travelBlocks(b.id, b.title, b.start, b.end, travel)
    out.push(b, ...trips)
    busy.push({ start: b.start - travel, end: b.end + travel })
  }

  for (const f of s.fixed) {
    if (!f.days.includes(day) || skip.has(f.id)) continue
    add(
      { id: f.id, title: f.title, start: moved[f.id]?.start ?? f.start, end: moved[f.id]?.end ?? f.end, type: 'fixed', kind: f.kind },
      f.travelMinutes ?? 0
    )
  }

  for (const e of ov?.extra ?? []) {
    if (skip.has(e.id)) continue
    add({
      id: e.id,
      title: e.title,
      start: moved[e.id]?.start ?? e.start,
      end: moved[e.id]?.end ?? e.end,
      type: 'habit',
      habitId: e.id,
      emoji: '📌',
    })
  }

  const todays = s.habits.filter((x) => x.days.includes(day) && !skip.has(`habit-${x.id}`))

  // hábitos movidos à mão entram primeiro; o resto se ajusta em volta
  for (const habit of todays) {
    const m = moved[`habit-${habit.id}`]
    if (m) add(habitBlock(habit, m.start, m.end), habit.travelMinutes ?? 0)
  }

  for (const habit of todays.filter((x) => !moved[`habit-${x.id}`])) {
    const minutes = minutesFor(habit, day)
    const t = habit.travelMinutes ?? 0
    const span = minutes + 2 * t
    const gaps = freeGaps(s.dayStart, s.dayEnd, busy)
    let start: number | null = null
    for (const p of habit.prefer.filter((p) => p.days.includes(day))) {
      start = findSlot(gaps, span, p)
      if (start !== null) break
    }
    if (start === null) start = findSlot(gaps, span)
    if (start === null) {
      unplaced.push(habit)
      continue
    }
    add(habitBlock(habit, start + t, start + t + minutes), t)
  }

  return { blocks: out.sort((a, b) => a.start - b.start), unplaced }
}

function habitBlock(habit: Habit, start: number, end: number): PlannedBlock {
  return { id: `habit-${habit.id}`, title: habit.title, start, end, type: 'habit', habitId: habit.id, emoji: habit.emoji }
}
