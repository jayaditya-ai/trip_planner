'use client'

import { useState } from 'react'
import { Stop } from '@/types'
import StopImagePlaceholder from './StopImagePlaceholder'

interface Props {
  stop: Stop
  onDelete?: () => void
}

const typeConfig = {
  activity: {
    gradient: 'bg-gradient-to-br from-amber-600 to-orange-700',
    label: 'Activity',
  },
  food: {
    gradient: 'bg-gradient-to-br from-green-600 to-emerald-800',
    label: 'Food',
  },
  transit: {
    gradient: 'bg-gradient-to-br from-gray-400 to-gray-600',
    label: 'Transit',
  },
  'local-tip': {
    gradient: 'bg-gradient-to-br from-orange-400 to-amber-600',
    label: 'Local Tip',
  },
  hotel: {
    gradient: 'bg-gradient-to-br from-blue-700 to-blue-900',
    label: 'Hotel',
  },
}

export default function ActivityCard({ stop, onDelete }: Props) {
  const [imgError, setImgError] = useState(false)
  const config = typeConfig[stop.type] || typeConfig.activity

  const handleDelete = () => {
    if (window.confirm('Remove this stop?')) {
      onDelete?.()
    }
  }

  if (stop.type === 'local-tip') {
    return (
      <div className="relative group rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 mb-2">
        {onDelete && (
          <button
            onClick={handleDelete}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove stop"
          >
            ✕
          </button>
        )}
        <div className="text-[9px] font-semibold text-orange-700 uppercase tracking-wide mb-1">
          Local Intel
        </div>
        <p className="text-xs text-orange-900 leading-relaxed">{stop.localIntel || stop.subtitle}</p>
      </div>
    )
  }

  if (stop.type === 'transit') {
    return (
      <div className="relative group bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-2 flex items-start gap-2">
        {onDelete && (
          <button
            onClick={handleDelete}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove stop"
          >
            ✕
          </button>
        )}
        <div className="mt-0.5 w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
          <span className="text-[9px] text-gray-600">→</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-700">{stop.title}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{stop.subtitle}</div>
          {stop.localIntel && (
            <p className="text-[10px] text-orange-700 mt-1 leading-snug">{stop.localIntel}</p>
          )}
        </div>
        {stop.price !== undefined && stop.price !== null && stop.price > 0 && (
          <span className="text-[10px] font-semibold text-gray-500 shrink-0">฿{stop.price}</span>
        )}
      </div>
    )
  }

  return (
    <div className="relative group bg-white border border-gray-200 rounded-xl overflow-hidden mb-2 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
      {/* Hero image */}
      {stop.imageUrl || true ? (
        <div className="relative w-full h-32 overflow-hidden">
          {stop.imageUrl && !imgError ? (
            <img
              src={stop.imageUrl}
              alt={stop.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <StopImagePlaceholder type={stop.type} className="w-full h-full" />
          )}
          {/* Delete button */}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="absolute top-2 left-2 w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center text-[11px] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-10"
              title="Remove stop"
            >
              ✕
            </button>
          )}
          {/* Type label */}
          <div className="absolute top-2 right-2">
            <span className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
              {config.label}
            </span>
          </div>
          {/* Price */}
          {stop.price !== undefined && stop.price !== null && (
            <div className="absolute bottom-2 right-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
                {stop.price === 0 ? 'Free' : `฿${stop.price.toLocaleString()}`}
              </span>
            </div>
          )}
        </div>
      ) : null}

      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 leading-tight">{stop.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stop.subtitle}</div>
          </div>
        </div>

        {stop.whyChosen && (
          <div className="bg-blue-50 border-l-[3px] border-blue-700 rounded-r-md px-2 py-1.5 mt-2">
            <div className="text-[9px] font-bold text-blue-800 uppercase tracking-wide mb-0.5">Why here</div>
            <p className="text-[11px] text-blue-900 leading-snug">{stop.whyChosen}</p>
          </div>
        )}

        {stop.localIntel && (
          <div className="bg-orange-50 border-l-[3px] border-orange-500 rounded-r-md px-2 py-1.5 mt-2">
            <div className="text-[9px] font-bold text-orange-700 uppercase tracking-wide mb-0.5">Local intel</div>
            <p className="text-[11px] text-orange-900 leading-snug">{stop.localIntel}</p>
          </div>
        )}

        {stop.tags && stop.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {stop.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
