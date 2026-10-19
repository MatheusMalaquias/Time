import { DEFAULT_MINUTES, parseDate, type Item } from './calendar'

const pad = (n: number) => String(n).padStart(2, '0')
const d8 = (date: string) => date.replace(/-/g, '')
const dt = (date: string, min: number) => `${d8(date)}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`
const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

/** Quebra linhas longas a cada 75 bytes (RFC 5545). */
export function fold(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const parts: string[] = []
  let cur = ''
  let bytes = 0
  let limit = 75
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (bytes + n > limit) {
      parts.push(cur)
      cur = ''
      bytes = 0
      limit = 74 // o espaço inicial das linhas seguintes conta
    }
    cur += ch
    bytes += n
  }
  parts.push(cur)
  return parts.join('\r\n ')
}

const nextDay = (date: string) => {
  const d = parseDate(date)
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Primeira data a partir de `from` que cai em um dos dias da semana do item. */
function firstOccurrence(from: string, days: number[]): string {
  const d = parseDate(from)
  for (let i = 0; i < 7 && !days.includes(d.getDay()); i++) d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function alarm(title: string, lead: number): string[] {
  return ['BEGIN:VALARM', `TRIGGER:${lead > 0 ? `-PT${lead}M` : 'PT0S'}`, 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'END:VALARM']
}

/** Gera um .ics com repetição semanal e alarme (aviso) antes de cada atividade com horário. */
export function buildIcs(items: Item[], opts: { lead: number; today: string; now?: Date }): string {
  const now = opts.now ?? new Date()
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  const out: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TimeMind//PT-BR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:TimeMind']

  const event = (uid: string, title: string, lines: string[], timed: boolean) => {
    out.push('BEGIN:VEVENT', `UID:${uid}@timemind`, `DTSTAMP:${stamp}`, `SUMMARY:${esc(title)}`, ...lines)
    if (timed) out.push(...alarm(title, opts.lead))
    out.push('END:VEVENT')
  }
  const cap = (start: number, end?: number) => Math.min(24 * 60 - 1, end !== undefined && end > start ? end : start + DEFAULT_MINUTES)

  for (const it of items) {
    const recurring = !!it.days?.length
    const first = recurring ? firstOccurrence(it.from ?? opts.today, it.days as number[]) : (it.date as string)
    if (!first) continue

    if (it.start === undefined) {
      // sem horário: evento de dia inteiro, sem alarme
      const lines = [`DTSTART;VALUE=DATE:${d8(first)}`, `DTEND;VALUE=DATE:${d8(nextDay(first))}`]
      if (recurring) lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${(it.days as number[]).map((d) => BYDAY[d]).join(',')}`)
      event(it.id, it.title, lines, false)
      continue
    }

    const end = cap(it.start, it.end)
    const lines = [`DTSTART:${dt(first, it.start)}`, `DTEND:${dt(first, end)}`]
    if (recurring) {
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${(it.days as number[]).map((d) => BYDAY[d]).join(',')}`)
      const except = [...it.skip, ...Object.keys(it.moved ?? {})]
      if (except.length) lines.push(`EXDATE:${except.map((d) => dt(d, it.start as number)).join(',')}`)
    }
    event(it.id, it.title, lines, true)

    // dias com horário diferente viram eventos avulsos
    for (const [date, m] of Object.entries(it.moved ?? {})) {
      if (it.skip.includes(date)) continue
      event(`${it.id}-${date}`, it.title, [`DTSTART:${dt(date, m.start)}`, `DTEND:${dt(date, cap(m.start, m.end))}`], true)
    }
  }

  out.push('END:VCALENDAR')
  return out.map(fold).join('\r\n') + '\r\n'
}

export function downloadIcs(text: string, filename = 'timemind.ics') {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
