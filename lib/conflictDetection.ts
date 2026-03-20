import { Stop, HardConflict } from '@/types'

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function detectHardConflicts(stops: Stop[]): HardConflict[] {
  const conflicts: HardConflict[] = []
  const scheduledStops = stops.filter(s => s.time && s.type !== 'local-tip')

  for (let i = 0; i < scheduledStops.length; i++) {
    const stop = scheduledStops[i]
    const startMin = timeToMinutes(stop.time)
    const endMin = startMin + (stop.duration || 0)

    // Check closing time violation
    if (stop.closingTime) {
      const closingMin = timeToMinutes(stop.closingTime)
      if (startMin >= closingMin) {
        conflicts.push({
          type: 'closing-time',
          stopIds: [stop.id],
          message: `"${stop.title}" is scheduled at ${stop.time} but closes at ${stop.closingTime}.`,
          severity: 'error',
        })
      }
      // Check if visit extends past closing time
      if (endMin > closingMin) {
        conflicts.push({
          type: 'closing-time',
          stopIds: [stop.id],
          message: `"${stop.title}" closes at ${stop.closingTime} but activity runs until ${minutesToTime(endMin)}.`,
          severity: 'error',
        })
      }
    }

    // Check overlap with next stop
    if (i < scheduledStops.length - 1) {
      const nextStop = scheduledStops[i + 1]
      const nextStartMin = timeToMinutes(nextStop.time)

      if (endMin > nextStartMin) {
        conflicts.push({
          type: 'overlap',
          stopIds: [stop.id, nextStop.id],
          message: `"${stop.title}" ends at ${minutesToTime(endMin)} but "${nextStop.title}" starts at ${nextStop.time} — ${endMin - nextStartMin} min overlap.`,
          severity: 'error',
        })
      }

      // Transit gap check: consecutive stops in different locations with < 15 min gap and no transit stop
      const hasTransitBetween = stops.some(s => {
        if (s.type !== 'transit') return false
        if (!s.time) return false
        const tMin = timeToMinutes(s.time)
        return tMin >= endMin && tMin <= nextStartMin
      })

      if (
        !hasTransitBetween &&
        stop.location &&
        nextStop.location &&
        stop.location !== nextStop.location &&
        stop.type !== 'transit' &&
        nextStop.type !== 'transit'
      ) {
        const gap = nextStartMin - endMin
        if (gap < 15 && gap >= 0) {
          conflicts.push({
            type: 'transit-gap',
            stopIds: [stop.id, nextStop.id],
            message: `Only ${gap} min between "${stop.title}" (${stop.location}) and "${nextStop.title}" (${nextStop.location}) — not enough travel time.`,
            severity: 'error',
          })
        }
      }
    }
  }

  return conflicts
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
