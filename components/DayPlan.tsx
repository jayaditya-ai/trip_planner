'use client'

import { Day } from '@/types'

interface Props {
  days: Day[]
  activeDayNumber: number
  onSelectDay: (dayNumber: number) => void
  tripName: string
  tripMeta: string
}

export default function DayPlan({ days, activeDayNumber, onSelectDay, tripName, tripMeta }: Props) {
  return (
    <div className="w-[180px] bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
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
        {days.map((day) => {
          const isActive = day.dayNumber === activeDayNumber
          return (
            <button
              key={day.dayNumber}
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
