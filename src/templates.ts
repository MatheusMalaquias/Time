import { PALETTE, uid, type Item } from './calendar'

export interface Template {
  id: string
  name: string
  description: string
}

export const TEMPLATES: Template[] = [
  { id: 'simples', name: 'Rotina simples', description: 'Acordar, refeições, exercício e descanso.' },
  { id: 'trabalho', name: 'Trabalho e estudo', description: 'Expediente, almoço, estudo e leitura.' },
  { id: 'estudante', name: 'Estudante', description: 'Aulas, estudo em casa, exercício e lazer.' },
]

const h = (hh: number, mm = 0) => hh * 60 + mm
const WEEK = [1, 2, 3, 4, 5]
const ALL = [0, 1, 2, 3, 4, 5, 6]
const WEEKEND = [0, 6]

type Row = [title: string, days: number[], start: number, end: number, color: number]

const ROWS: Record<string, Row[]> = {
  simples: [
    ['Acordar e se arrumar', ALL, h(7), h(7, 30), 3],
    ['Café da manhã', ALL, h(7, 30), h(8), 3],
    ['Almoço', ALL, h(12), h(13), 2],
    ['Exercício', [1, 3, 5], h(18), h(19), 1],
    ['Jantar', ALL, h(19, 30), h(20, 30), 2],
    ['Leitura', ALL, h(21), h(21, 30), 6],
  ],
  trabalho: [
    ['Trabalho', WEEK, h(9), h(12), 0],
    ['Almoço', WEEK, h(12), h(13), 3],
    ['Trabalho', WEEK, h(13), h(18), 0],
    ['Exercício', [1, 3, 5], h(6, 30), h(7, 30), 1],
    ['Estudo', [2, 4], h(19), h(20), 6],
    ['Leitura', ALL, h(21, 30), h(22, 30), 7],
  ],
  estudante: [
    ['Aulas', WEEK, h(8), h(12), 0],
    ['Almoço', WEEK, h(12), h(13), 3],
    ['Estudo em casa', WEEK, h(14), h(16), 6],
    ['Exercício', [1, 3, 5], h(17), h(18), 1],
    ['Lazer', WEEKEND, h(15), h(18), 4],
    ['Revisão da semana', [0], h(19), h(20), 2],
  ],
}

/** Atividades de um modelo, repetindo toda semana a partir de `today`. Tudo pode ser editado depois. */
export function templateItems(id: string, today: string): Item[] {
  return (ROWS[id] ?? []).map(([title, days, start, end, color]) => ({
    id: uid(),
    title,
    days,
    start,
    end,
    from: today,
    color: PALETTE[color],
    doneOn: [],
    skip: [],
  }))
}
