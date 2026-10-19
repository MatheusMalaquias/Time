import { addDays, colorFor, isoDate, itemsOn, monthGrid, parseDate, type Item } from './calendar'

export interface Count {
  done: number
  total: number
}

export const pct = (c: Count) => (c.total ? Math.round((c.done / c.total) * 100) : 0)

export function dayCount(items: Item[], date: string): Count {
  const list = itemsOn(items, date)
  return { total: list.length, done: list.filter((i) => i.doneOn.includes(date)).length }
}

/** Soma os dias já passados (e hoje); dias futuros não contam como "não feitos". */
export function rangeCount(items: Item[], dates: (string | null)[], today: string): Count {
  const sum: Count = { done: 0, total: 0 }
  for (const d of dates) {
    if (!d || d > today) continue
    const c = dayCount(items, d)
    sum.done += c.done
    sum.total += c.total
  }
  return sum
}

/** Segunda a domingo da semana da data. */
export function weekDates(date: string): string[] {
  const d = parseDate(date)
  const monday = addDays(d, -((d.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => isoDate(addDays(monday, i)))
}

export function monthDates(date: string): (string | null)[] {
  const d = parseDate(date)
  return monthGrid(d.getFullYear(), d.getMonth())
}

export interface ActivityStat {
  title: string
  color: string
  done: number
  total: number
  streak: number
}

/** Desempenho por atividade (mesmo nome) nos últimos `days` dias, com sequência de dias seguidos. */
export function activityStats(items: Item[], today: string, days = 30): ActivityStat[] {
  const map = new Map<string, ActivityStat>()
  const t = parseDate(today)
  const streakOpen = new Set<string>()

  for (let i = 0; i < days; i++) {
    const date = isoDate(addDays(t, -i))
    const byTitle = new Map<string, Item[]>()
    for (const it of itemsOn(items, date)) byTitle.set(it.title, [...(byTitle.get(it.title) ?? []), it])

    for (const [title, group] of byTitle) {
      const done = group.every((g) => g.doneOn.includes(date))
      if (!map.has(title)) {
        map.set(title, { title, color: colorFor(group[0]), done: 0, total: 0, streak: 0 })
        streakOpen.add(title)
      }
      const st = map.get(title)!
      // hoje ainda pode ser feito: só entra na conta se já estiver feito
      if (!(i === 0 && !done)) {
        st.total++
        if (done) st.done++
      }
      if (streakOpen.has(title)) {
        if (done) st.streak++
        else if (i !== 0) streakOpen.delete(title)
      }
    }
  }
  return [...map.values()].filter((s) => s.total > 0).sort((a, b) => a.title.localeCompare(b.title))
}
