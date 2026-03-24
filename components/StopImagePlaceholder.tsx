'use client'

import { StopType } from '@/types'

interface Props {
  type: StopType | 'hotel' | 'activity' | 'food' | 'transit' | 'local-tip'
  className?: string
}

const typeConfig: Record<string, { gradient: string; emoji: string; label: string }> = {
  hotel: {
    gradient: 'bg-gradient-to-br from-blue-600 to-blue-900',
    emoji: '🏨',
    label: 'Hotel',
  },
  activity: {
    gradient: 'bg-gradient-to-br from-teal-500 to-teal-800',
    emoji: '🎯',
    label: 'Activity',
  },
  food: {
    gradient: 'bg-gradient-to-br from-orange-400 to-orange-700',
    emoji: '🍜',
    label: 'Food',
  },
  transit: {
    gradient: 'bg-gradient-to-br from-slate-400 to-slate-700',
    emoji: '✈️',
    label: 'Transit',
  },
  'local-tip': {
    gradient: 'bg-gradient-to-br from-amber-400 to-amber-700',
    emoji: '💡',
    label: 'Local Tip',
  },
}

export default function StopImagePlaceholder({ type, className = '' }: Props) {
  const config = typeConfig[type] || typeConfig.activity

  return (
    <div className={`${config.gradient} flex flex-col items-center justify-center gap-1 ${className}`}>
      <span className="text-3xl leading-none">{config.emoji}</span>
      <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wide">
        {config.label}
      </span>
    </div>
  )
}
