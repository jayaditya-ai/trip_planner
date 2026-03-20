'use client'

import { useState } from 'react'
import { Stop, AlternativeOption } from '@/types'

interface Props {
  stop: Stop
  onSwapAlternative: (alt: AlternativeOption) => void
}

const hotelGradient = 'bg-gradient-to-br from-blue-800 to-indigo-900'

export default function HotelCard({ stop, onSwapAlternative }: Props) {
  const isUserChoice = stop.source === 'user'
  const [imgError, setImgError] = useState(false)

  return (
    <div className="mb-3">
      <div
        className={`rounded-xl border overflow-hidden transition-all ${
          isUserChoice
            ? 'border-blue-400 border-l-[4px]'
            : 'border-teal-300 border-l-[4px]'
        }`}
      >
        {/* Hero image */}
        <div className="relative w-full h-40 overflow-hidden">
          {stop.imageUrl && !imgError ? (
            <img
              src={stop.imageUrl}
              alt={stop.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={`w-full h-full ${hotelGradient}`} />
          )}
          {/* Source badge */}
          <div className="absolute top-2 right-2">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${
                isUserChoice
                  ? 'bg-blue-600/90 text-white'
                  : 'bg-teal-600/90 text-white'
              }`}
            >
              {isUserChoice ? 'Your choice' : 'AI pick'}
            </span>
          </div>
          {/* Price badge */}
          {stop.price !== undefined && stop.price !== null && (
            <div className="absolute bottom-2 right-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
                ฿{stop.price.toLocaleString()}/night
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`px-3 py-3 ${isUserChoice ? 'bg-blue-50/40' : 'bg-teal-50/30'}`}>
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 leading-tight">{stop.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stop.subtitle}</div>
            </div>
          </div>

          {stop.whyChosen && (
            <div
              className={`border-l-[3px] rounded-r-md px-2 py-1.5 mt-1 ${
                isUserChoice
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-teal-50 border-teal-500'
              }`}
            >
              <div
                className={`text-[9px] font-bold uppercase tracking-wide mb-0.5 ${
                  isUserChoice ? 'text-blue-700' : 'text-teal-700'
                }`}
              >
                Why we picked this
              </div>
              <p
                className={`text-[11px] leading-snug ${
                  isUserChoice ? 'text-blue-900' : 'text-teal-900'
                }`}
              >
                {stop.whyChosen}
              </p>
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

      {/* Alternatives strip */}
      {stop.alternatives && stop.alternatives.length > 0 && (
        <div className="mt-2 bg-gray-50 border border-dashed border-gray-200 rounded-xl px-3 py-2">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Alternatives from Agoda
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {stop.alternatives.map((alt) => (
              <AltCard key={alt.id} alt={alt} onSwap={() => onSwapAlternative(alt)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AltCard({ alt, onSwap }: { alt: AlternativeOption; onSwap: () => void }) {
  const [imgError, setImgError] = useState(false)

  return (
    <button
      onClick={onSwap}
      className="min-w-[150px] bg-white border border-gray-200 rounded-lg overflow-hidden text-left shrink-0 hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="w-full h-20 overflow-hidden">
        {alt.imageUrl && !imgError ? (
          <img
            src={alt.imageUrl}
            alt={alt.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
        )}
      </div>
      <div className="px-2.5 py-2">
        <div className="text-xs font-semibold text-gray-800 leading-tight">{alt.name}</div>
        <div className="text-xs font-semibold text-orange-600 mt-0.5">
          ฿{alt.price.toLocaleString()}/night
        </div>
        <div className="text-[10px] text-gray-400 mt-1 leading-snug">{alt.reason}</div>
      </div>
    </button>
  )
}
