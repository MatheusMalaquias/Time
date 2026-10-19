import type { Settings } from './types'

const h = (hh: number, mm = 0) => hh * 60 + mm
const WEEKDAYS = [1, 2, 3, 4, 5]
const ALL = [0, 1, 2, 3, 4, 5, 6]

export const defaultSettings: Settings = {
  home: 'R. Sophia Fortini Costa, 64 - Nova Era, Juiz de Fora - MG, 36087-355',
  gymAddress: 'Av. Presidente Juscelino Kubitschek, 5101 - Nova Era, Juiz de Fora - MG, 36087-000',
  dayStart: h(6, 30),
  dayEnd: h(22, 30),
  fixed: [
    { id: 'treino', title: 'Treinamento', kind: 'work', days: WEEKDAYS, start: h(9), end: h(18) },
    { id: 'ingles-semana', title: 'Aula de inglês', kind: 'class', days: [1, 3], start: h(19), end: h(20) },
    { id: 'ingles-dom', title: 'Aula de inglês', kind: 'class', days: [0], start: h(15), end: h(17) },
    { id: 'esposa-seg-qua', title: 'Tempo com minha esposa', kind: 'family', days: [1, 3], start: h(20, 15), end: h(21, 30) },
    { id: 'esposa-ter-qui-sex', title: 'Tempo com minha esposa', kind: 'family', days: [2, 4, 5], start: h(19, 30), end: h(21, 30) },
    { id: 'esposa-sab', title: 'Tempo com minha esposa', kind: 'family', days: [6], start: h(14), end: h(22, 30) },
    { id: 'esposa-dom', title: 'Tempo com minha esposa', kind: 'family', days: [0], start: h(19), end: h(21) },
    { id: 'igreja-dom', title: 'Reunião da Igreja (pode ir até 14:30)', kind: 'church', days: [0], start: h(7), end: h(14, 30) },
    { id: 'reuniao-dom-noite', title: 'Reunião da noite', kind: 'church', days: [0], start: h(21), end: h(22) },
  ],
  habits: [
    {
      id: 'academia',
      title: 'Academia',
      emoji: '🏋️',
      minutes: 60,
      travelMinutes: 10,
      days: ALL,
      prefer: [
        { days: WEEKDAYS, start: h(6, 30), end: h(9) },
        { days: [6], start: h(8), end: h(13) },
        { days: [0], start: h(17), end: h(19) },
      ],
    },
    {
      id: 'idioma',
      title: 'Novo idioma',
      emoji: '🗣️',
      minutes: 60,
      minutesByDay: { 0: 30 },
      days: ALL,
      prefer: [
        { days: WEEKDAYS, start: h(6, 30), end: h(9) },
        { days: [6], start: h(8), end: h(13) },
        { days: [0], start: h(18), end: h(19) },
      ],
    },
    {
      id: 'estudo',
      title: 'Estudo pessoal',
      emoji: '📚',
      minutes: 60,
      minutesByDay: { 0: 30 },
      days: ALL,
      prefer: [
        { days: WEEKDAYS, start: h(18), end: h(19, 30) },
        { days: [6], start: h(8), end: h(13) },
        { days: [0], start: h(14, 30), end: h(15) },
      ],
    },
    {
      id: 'leitura',
      title: 'Leitura',
      emoji: '📖',
      minutes: 60,
      minutesByDay: { 0: 30 },
      days: ALL,
      prefer: [
        { days: WEEKDAYS, start: h(21, 30), end: h(22, 30) },
        { days: [6], start: h(8), end: h(13) },
        { days: [0], start: h(22), end: h(22, 30) },
      ],
    },
  ],
}
