export type StopType = 'hotel' | 'activity' | 'food' | 'transit' | 'local-tip'
export type StopSource = 'system' | 'user'

export interface Stop {
  id: string
  type: StopType
  time: string // "14:00"
  duration: number // minutes
  title: string
  subtitle: string
  price?: number // in THB
  currency?: string
  location?: string
  tags?: string[]
  whyChosen?: string
  localIntel?: string
  source: StopSource
  alternatives?: AlternativeOption[]
  closingTime?: string // "21:00" for venues
  imageUrl?: string
}

export interface AlternativeOption {
  id: string
  name: string
  price: number
  reason: string
  imageUrl?: string
}

export interface Day {
  dayNumber: number
  date: string
  label: string
  status: 'full' | 'partial' | 'empty'
  stops: Stop[]
  city: string
}

export interface HardConflict {
  type: 'overlap' | 'closing-time' | 'transit-gap'
  stopIds: string[]
  message: string
  severity: 'error'
}

export interface SoftConflict {
  type: 'crowd' | 'seasonal' | 'logical-flow' | 'timing'
  stopIds: string[]
  message: string
  severity: 'warning'
}

export interface TripPreferences {
  destinations: string[]
  startDate: string
  endDate: string
  days: number
  travelStyle: string
  budget: string
  activities: string[]
  travellerType: string
}

export interface Trip {
  id: string
  name: string
  preferences: TripPreferences
  days: Day[]
  estimatedTotal: number
  currency: string
  seasonalNote?: string
}

export interface ChatMessage {
  id: string
  role: 'bot' | 'user'
  content: string
  mcqOptions?: MCQOption[]
  mcqGroupId?: string
}

export interface MCQOption {
  label: string
  value: string
}
