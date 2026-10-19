export type Kind = 'work' | 'class' | 'family' | 'church' | 'travel' | 'other'

export interface FixedBlock {
  id: string
  title: string
  kind: Kind
  days: number[] // 0 = domingo ... 6 = sábado
  start: number // minutos desde 00:00
  end: number
  travelMinutes?: number // deslocamento de ida (e igual na volta)
}

export interface PreferWindow {
  days: number[]
  start: number
  end: number
}

export interface Habit {
  id: string
  title: string
  emoji: string
  minutes: number
  minutesByDay?: Record<number, number> // duração diferente em dias específicos
  travelMinutes?: number // deslocamento de ida (e igual na volta)
  days: number[]
  prefer: PreferWindow[]
}

export interface Settings {
  home: string
  gymAddress: string
  dayStart: number
  dayEnd: number
  fixed: FixedBlock[]
  habits: Habit[]
}

export interface PlannedBlock {
  id: string
  title: string
  start: number
  end: number
  type: 'fixed' | 'habit' | 'travel'
  kind?: Kind
  habitId?: string
  emoji?: string
}

export interface DayPlan {
  blocks: PlannedBlock[]
  unplaced: Habit[]
}

// { '2026-10-19': { idioma: true } }
export type Completions = Record<string, Record<string, boolean>>

/** Mudanças só para uma data: pular, mover e atividades avulsas. */
export interface DayOverride {
  skip: string[] // ids de bloco (fixo ou `habit-<id>`)
  move: Record<string, { start: number; end: number }>
  extra: { id: string; title: string; start: number; end: number }[]
}

export type Overrides = Record<string, DayOverride>
