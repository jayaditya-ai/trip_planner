'use client'

import { Day, HardConflict, SoftConflict } from '@/types'

interface Props {
  day: Day
  hardConflicts: HardConflict[]
  softConflicts: SoftConflict[]
}

function calcDaySpend(day: Day): number {
  return day.stops.reduce((sum, s) => sum + (s.price || 0), 0)
}

function calcFreeTime(day: Day): string {
  const scheduled = day.stops.filter(s => s.time && s.type !== 'local-tip')
  if (scheduled.length === 0) return 'All day'
  const totalMinutes = scheduled.reduce((sum, s) => sum + (s.duration || 0), 0)
  const freeMin = Math.max(0, 16 * 60 - totalMinutes)
  if (freeMin < 60) return `${freeMin} min`
  return `${(freeMin / 60).toFixed(1)} hrs`
}

function getPace(day: Day): string {
  const activities = day.stops.filter(s => s.type === 'activity').length
  if (activities >= 4) return 'Intense'
  if (activities >= 2) return 'Moderate'
  return 'Light'
}

const getWeatherForCity = (city: string) => {
  if (city.toLowerCase().includes('samui') || city.toLowerCase().includes('koh')) {
    return { temp: '32°C', humidity: '72%', note: 'Plan beach time before 11am and after 16:00.' }
  }
  return { temp: '34°C', humidity: '78%', note: 'Plan indoor breaks 13–16h.' }
}

const getCrowdNote = (day: Day) => {
  const label = day.label.toLowerCase()
  if (label.includes('songkran')) return { level: 'Very High', note: 'Songkran festival — street closures near Silom & Khao San.' }
  if (day.city.toLowerCase().includes('bangkok')) return { level: 'High', note: 'BTS rush hour 17–19h. Add 20 min buffer.' }
  return { level: 'Moderate', note: 'Weekend crowds at popular spots.' }
}

const getTransitNote = (day: Day) => {
  const hasTransit = day.stops.some(s => s.type === 'transit')
  if (!hasTransit) return null
  if (day.city.toLowerCase().includes('bangkok')) return 'BTS runs every 3-5 min. Grab app recommended for longer journeys.'
  if (day.city.toLowerCase().includes('samui') || day.city.toLowerCase().includes('koh')) return 'Motorbike rental ฿200/day recommended. Fixed-rate taxis from villa.'
  return 'Check transit stops for transport details.'
}

export default function IntelPanel({ day, hardConflicts, softConflicts }: Props) {
  const daySpend = calcDaySpend(day)
  const freeTime = calcFreeTime(day)
  const pace = getPace(day)
  const weather = getWeatherForCity(day.city)
  const crowd = getCrowdNote(day)
  const transit = getTransitNote(day)
  const totalConflicts = hardConflicts.length + softConflicts.length

  return (
    <div className="w-[200px] bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-y-auto">
      {/* Day summary */}
      <div className="px-3.5 py-3 border-b border-gray-100">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
          Day Summary
        </div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] text-gray-500">Planned spend</span>
          <span className="text-[11px] font-semibold text-gray-800">
            ฿{daySpend.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] text-gray-500">Free time</span>
          <span className="text-[11px] font-semibold text-gray-800">{freeTime}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-gray-500">Pace</span>
          <span
            className={`text-[11px] font-semibold ${
              pace === 'Intense'
                ? 'text-red-600'
                : pace === 'Moderate'
                ? 'text-amber-600'
                : 'text-green-600'
            }`}
          >
            {pace}
          </span>
        </div>
      </div>

      {/* On-ground intel */}
      <div className="px-3.5 py-3 border-b border-gray-100">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
          Day&apos;s Tips
        </div>

        <div className="flex gap-2 mb-2 items-start">
          <div className="w-5 h-5 rounded bg-blue-50 text-blue-700 flex items-center justify-center text-[11px] shrink-0">
            ☀
          </div>
          <p className="text-[11px] text-gray-500 leading-snug">
            <span className="font-semibold text-gray-800">{weather.temp}</span>, humidity {weather.humidity}. {weather.note}
          </p>
        </div>

        <div className="flex gap-2 mb-2 items-start">
          <div className="w-5 h-5 rounded bg-amber-50 text-amber-700 flex items-center justify-center text-[11px] shrink-0">
            !
          </div>
          <p className="text-[11px] text-gray-500 leading-snug">
            <span className="font-semibold text-gray-800">Crowds: {crowd.level}</span> — {crowd.note}
          </p>
        </div>

        {transit && (
          <div className="flex gap-2 mb-2 items-start">
            <div className="w-5 h-5 rounded bg-gray-100 text-gray-600 flex items-center justify-center text-[11px] shrink-0">
              ↔
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">{transit}</p>
          </div>
        )}

        <div className="flex gap-2 items-start">
          <div className="w-5 h-5 rounded bg-red-50 text-red-600 flex items-center justify-center text-[11px] shrink-0">
            $
          </div>
          <p className="text-[11px] text-gray-500 leading-snug">
            Tuk-tuks near tourist zones are{' '}
            <span className="font-semibold text-gray-800">3–4x Grab price</span> this week.
          </p>
        </div>
      </div>

      {/* Conflicts summary */}
      {totalConflicts > 0 && (
        <div className="mx-3 my-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
          <div className="text-[11px] font-semibold text-amber-700 mb-0.5">
            {totalConflicts} {totalConflicts === 1 ? 'conflict' : 'conflicts'} flagged
          </div>
          <div className="text-[10px] text-amber-600 leading-snug">
            {hardConflicts.length > 0 && `${hardConflicts.length} scheduling error${hardConflicts.length > 1 ? 's' : ''}. `}
            {softConflicts.length > 0 && `${softConflicts.length} timing note${softConflicts.length > 1 ? 's' : ''}.`}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className="px-3.5 py-3">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
          Add to this day
        </div>
        {getSuggestions(day).map((s, i) => (
          <button
            key={i}
            className="block w-full text-left text-[11px] px-2 py-1.5 mb-1.5 border border-gray-200 rounded-md bg-white text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function getSuggestions(day: Day): string[] {
  const city = day.city.toLowerCase()
  const label = day.label.toLowerCase()

  if (label.includes('arrival') || label.includes('check-in')) {
    return ['+ Night market nearby', '+ Rooftop bar', '+ Street food walk']
  }
  if (label.includes('temple') || label.includes('culture')) {
    return ['+ Tuk-tuk tour', '+ Thai cooking class', '+ Museum visit']
  }
  if (city.includes('samui') || city.includes('koh')) {
    return ['+ Snorkelling trip', '+ Muay Thai show', '+ Coconut farm tour']
  }
  if (label.includes('songkran') || label.includes('festival')) {
    return ['+ Songkran after-party', '+ Temple blessing ceremony', '+ Water gun shop nearby']
  }
  if (label.includes('departure') || label.includes('fly')) {
    return ['+ Airport lounge access', '+ Last Thai breakfast', '+ Duty-free shortlist']
  }
  return ['+ Muay Thai show nearby', '+ Rooftop bar (฿400–800)', '+ Move dinner earlier']
}
