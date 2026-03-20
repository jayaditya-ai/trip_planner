'use client'

import { HardConflict, SoftConflict } from '@/types'

interface Props {
  hardConflicts: HardConflict[]
  softConflicts: SoftConflict[]
}

function scrollToStop(stopId: string) {
  const el = document.getElementById(stopId)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export default function ConflictBanner({ hardConflicts, softConflicts }: Props) {
  if (hardConflicts.length === 0 && softConflicts.length === 0) return null

  return (
    <div className="flex flex-col gap-2 mb-3">
      {hardConflicts.map((c, i) => (
        <div key={i} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xs">⚠</span>
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                {c.type === 'overlap' ? 'Schedule Overlap' : c.type === 'closing-time' ? 'Closing Time' : 'Transit Gap'}
              </span>
            </div>
            {c.stopIds?.[0] && (
              <button
                onClick={() => scrollToStop(c.stopIds[0])}
                className="text-[10px] font-semibold text-red-600 bg-red-100 hover:bg-red-200 px-2 py-0.5 rounded-full transition-colors shrink-0"
              >
                Show me →
              </button>
            )}
          </div>
          <p className="text-xs text-red-700 leading-snug">{c.message}</p>
        </div>
      ))}

      {softConflicts.map((c, i) => (
        <div key={i} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-xs">✦</span>
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                {c.type === 'crowd' ? 'Crowd Warning' : c.type === 'seasonal' ? 'Seasonal Note' : c.type === 'logical-flow' ? 'Routing Note' : 'Timing Note'}
              </span>
            </div>
            {c.stopIds?.[0] && (
              <button
                onClick={() => scrollToStop(c.stopIds[0])}
                className="text-[10px] font-semibold text-amber-600 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-full transition-colors shrink-0"
              >
                Show me →
              </button>
            )}
          </div>
          <p className="text-xs text-amber-700 leading-snug">{c.message}</p>
        </div>
      ))}
    </div>
  )
}
