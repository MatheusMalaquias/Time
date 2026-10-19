export interface Item {
  id: string
  title: string
  start?: number // minutos desde 00:00; vazio = sem horário
  end?: number
  date?: string // AAAA-MM-DD: item de um dia só
  days?: number[] // 0 = domingo ... 6 = sábado: repete toda semana
  from?: string // repetição vale a partir desta data
  moved?: Record<string, { start: number; end?: number }> // horário diferente só em uma data
  color?: string // vazio = cor automática pelo nome
  doneOn: string[] // datas em que foi marcado como feito
  skip: string[] // datas em que o item repetido foi removido
}

export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const parseDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (d: Date, n: number) => {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

export const fmt = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export const parseTime = (v: string): number | undefined => {
  if (!v) return undefined
  const [h, m] = v.split(':').map(Number)
  return h * 60 + m
}

/** Itens que aparecem em uma data, ordenados: primeiro os com horário, depois os sem. */
export function itemsOn(items: Item[], date: string): Item[] {
  const weekday = parseDate(date).getDay()
  return items
    .filter((it) => {
      if (it.date) return it.date === date
      if (!it.days?.includes(weekday)) return false
      if (it.skip.includes(date)) return false
      return !it.from || date >= it.from
    })
    .map((it) => {
      const m = it.moved?.[date]
      return m ? { ...it, start: m.start, end: m.end } : it
    })
    .sort((a, b) => (a.start ?? 24 * 60 + 1) - (b.start ?? 24 * 60 + 1))
}

/** Dias do mês em grade de semanas (null = célula vazia). */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1).getDay()
  const total = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array(first).fill(null)
  for (let d = 1; d <= total; d++) cells.push(isoDate(new Date(year, month, d)))
  while (cells.length % 7) cells.push(null)
  return cells
}

/** Rotina inicial baseada no que você descreveu; tudo editável depois. */
export function starterItems(today: string): Item[] {
  const colorOf: Record<string, string> = {
    Academia: PALETTE[1],
    'Estudo de idioma': PALETTE[6],
    Treinamento: PALETTE[0],
    Almoço: PALETTE[3],
    'Estudo pessoal': PALETTE[2],
    'Aula de inglês': PALETTE[4],
    'Reunião da Igreja': PALETTE[5],
    'Reunião da noite': PALETTE[5],
    Leitura: PALETTE[7],
  }
  const mk = (title: string, days: number[], start?: number, end?: number, color = colorOf[title]): Item => ({
    id: uid(),
    title,
    days,
    start,
    end,
    from: today,
    color,
    doneOn: [],
    skip: [],
  })
  const h = (hh: number, mm = 0) => hh * 60 + mm
  const week = [1, 2, 3, 4, 5]
  return [
    mk('Academia', [1, 2, 3, 4, 5, 6], h(6, 30), h(7, 30)),
    mk('Academia', [0], h(17), h(18)),
    mk('Estudo de idioma', week, h(7, 30), h(8, 30)),
    mk('Estudo de idioma', [6], h(9), h(10)),
    mk('Estudo de idioma', [0], h(18), h(18, 30)),
    mk('Treinamento', week, h(9), h(18)),
    mk('Almoço', week, h(12), h(13)),
    mk('Estudo pessoal', week, h(18), h(19)),
    mk('Estudo pessoal', [6], h(10), h(11)),
    mk('Estudo pessoal', [0], h(14, 30), h(15)),
    mk('Aula de inglês', [1, 3], h(19), h(20)),
    mk('Aula de inglês', [0], h(15), h(17)),
    mk('Reunião da Igreja', [0], h(7), h(12)),
    mk('Reunião da noite', [0], h(21), h(22)),
    mk('Leitura', week, h(21, 30), h(22, 30)),
    mk('Leitura', [6], h(11), h(12)),
    mk('Leitura', [0], h(22), h(22, 30)),
  ]
}

/** Paleta categórica (versão para fundo escuro), na ordem fixa. */
export const PALETTE = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']

const hash = (t: string) => [...t.trim().toLowerCase()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

/** Cor escolhida ou, se não houver, uma cor estável derivada do nome (mesmo nome = mesma cor). */
export const colorFor = (item: Pick<Item, 'title' | 'color'>) =>
  item.color ?? PALETTE[hash(item.title) % PALETTE.length]

export const DEFAULT_MINUTES = 30

export interface Placed {
  item: Item
  start: number
  end: number
  col: number
  cols: number
}

/** Posiciona itens com horário lado a lado quando se sobrepõem (estilo Google Agenda). */
export function layoutDay(list: Item[]): Placed[] {
  const timed = list
    .filter((i) => i.start !== undefined)
    .map((item) => {
      const start = item.start as number
      const end = item.end !== undefined && item.end > start ? item.end : start + DEFAULT_MINUTES
      return { item, start, end, col: 0, cols: 1 }
    })
    .sort((a, b) => a.start - b.start || a.end - b.end)

  let cluster: Placed[] = []
  let clusterEnd = -1
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((p) => p.col + 1))
    for (const p of cluster) p.cols = cols
    cluster = []
  }

  for (const p of timed) {
    if (cluster.length && p.start >= clusterEnd) flush()
    const taken = new Set(cluster.filter((c) => c.end > p.start).map((c) => c.col))
    while (taken.has(p.col)) p.col++
    cluster.push(p)
    clusterEnd = Math.max(clusterEnd, p.end)
  }
  flush()
  return timed
}
