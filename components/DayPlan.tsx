'use client'

import { useState } from 'react'
import { Day, Trip } from '@/types'

interface Props {
  days: Day[]
  activeDayNumber: number
  onSelectDay: (dayNumber: number) => void
  tripName: string
  tripMeta: string
  trip?: Trip
  onUpdateTrip?: (trip: Trip) => void
}

export default function DayPlan({
  days,
  activeDayNumber,
  onSelectDay,
  tripName,
  tripMeta,
  trip,
  onUpdateTrip,
}: Props) {
  const [loadingTransitBetween, setLoadingTransitBetween] = useState<string | null>(null)

  const handleAddTransitDay = async (dayA: Day, dayB: Day) => {
    if (!trip || !onUpdateTrip) return
    const key = `${dayA.dayNumber}-${dayB.dayNumber}`
    setLoadingTransitBetween(key)

    try {
      const res = await fetch('/api/generate-transit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCity: dayA.city,
          toCity: dayB.city,
          date: dayB.date,
          travelStyle: trip.preferences.travelStyle,
        }),
      })

      const stops = res.ok ? await res.json() : []

      // Build new transit day
      const newDay: Day = {
        dayNumber: dayA.dayNumber + 1,
        date: dayB.date,
        label: `${dayA.city} → ${dayB.city}`,
        status: 'full',
        city: `${dayA.city} / ${dayB.city}`,
        stops,
      }

      // Insert new day and renumber subsequent days
      const existingDays = trip.days.map((d) => {
        if (d.dayNumber > dayA.dayNumber) {
          return { ...d, dayNumber: d.dayNumber + 1 }
        }
        return d
      })

      const insertIndex = existingDays.findIndex((d) => d.dayNumber === dayA.dayNumber) + 1
      const newDays = [
        ...existingDays.slice(0, insertIndex),
        newDay,
        ...existingDays.slice(insertIndex),
      ]

      onUpdateTrip({ ...trip, days: newDays })
    } catch (err) {
      console.error('Failed to generate transit day', err)
    } finally {
      setLoadingTransitBetween(null)
    }
  }

  return (
    <div className="w-[180px] bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto no-print">
      <div className="px-3.5 py-3 border-b border-gray-200">
        <div className="text-sm font-semibold text-gray-800 truncate">{tripName}</div>
        <div className="text-[11px] text-gray-400 mt-0.5 truncate">{tripMeta}</div>
      </div>

      <div className="px-2 py-1 border-b border-gray-100">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2 py-1.5">
          Day Plan
        </div>
      </div>

      <div className="flex flex-col py-1 overflow-y-auto flex-1">
        {days.map((day, idx) => {
          const isActive = day.dayNumber === activeDayNumber

          // Check if we should show a transit banner between this day and the next
          const nextDay = days[idx + 1]
          const showTransitBanner =
            nextDay &&
            day.city !== nextDay.city &&
            !day.stops.some((s) => s.type === 'transit') &&
            !nextDay.stops.some((s) => s.type === 'transit')
          const transitKey = nextDay ? `${day.dayNumber}-${nextDay.dayNumber}` : ''
          const isLoadingTransit = loadingTransitBetween === transitKey

          return (
            <div key={day.dayNumber}>
              <button
                onClick={() => onSelectDay(day.dayNumber)}
                className={`w-full text-left px-3.5 py-2.5 border-l-[3px] transition-all hover:bg-gray-50 ${
                  isActive
                    ? 'border-l-[#003B95] bg-[#EBF3FF]'
                    : 'border-l-transparent'
                }`}
              >
                <div className="text-[10px] text-gray-400 font-medium">
                  Day {day.dayNumber} · {formatDate(day.date)}
                </div>
                <div
                  className={`text-xs font-semibold mt-0.5 ${
                    isActive ? 'text-[#003B95]' : 'text-gray-800'
                  }`}
                >
                  {day.label}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      day.status === 'full'
                        ? 'bg-green-500'
                        : day.status === 'partial'
                        ? 'bg-amber-400'
                        : 'bg-gray-300'
                    }`}
                  />
                  <span className="text-[10px] text-gray-400">
                    {day.status === 'full'
                      ? 'Fully planned'
                      : day.status === 'partial'
                      ? 'Partial plan'
                      : 'Not planned'}
                  </span>
                </div>
              </button>

              {/* Transit banner between city changes */}
              {showTransitBanner && nextDay && (
                <div className="mx-2 my-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-2">
                  <p className="text-[10px] text-blue-700 font-medium leading-snug mb-1.5">
                    ✈️ {day.city} → {nextDay.city}
                  </p>
                  <button
                    onClick={() => handleAddTransitDay(day, nextDay)}
                    disabled={isLoadingTransit}
                    className="w-full text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md py-1 transition-colors disabled:opacity-60"
                  >
                    {isLoadingTransit ? 'Adding…' : 'Add travel day?'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}
