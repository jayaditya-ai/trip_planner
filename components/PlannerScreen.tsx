'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Trip, Day, Stop, AlternativeOption, HardConflict, SoftConflict } from '@/types'
import DayPlan from './DayPlan'
import HotelCard from './HotelCard'
import ActivityCard from './ActivityCard'
import ConflictBanner from './ConflictBanner'
import IntelPanel from './IntelPanel'
import AddStopModal from './AddStopModal'
import { detectHardConflicts } from '@/lib/conflictDetection'

interface Props {
  trip: Trip
  onBack: () => void
  onUpdateTrip: (trip: Trip) => void
}

const typeColors = {
  hotel: 'border-[#003B95] bg-[#EBF3FF]',
  activity: 'border-amber-400 bg-amber-50',
  food: 'border-green-600 bg-green-50',
  transit: 'border-gray-400 bg-gray-100',
  'local-tip': 'border-orange-400 bg-orange-50',
}

export default function PlannerScreen({ trip, onBack, onUpdateTrip }: Props) {
  const [tripData, setTripData] = useState<Trip>(trip)
  const [activeDayNumber, setActiveDayNumber] = useState(1)
  const [hardConflicts, setHardConflicts] = useState<HardConflict[]>([])
  const [softConflicts, setSoftConflicts] = useState<SoftConflict[]>([])
  const [softLoading, setSoftLoading] = useState(false)
  const [showAddStop, setShowAddStop] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  const activeDay = tripData.days.find((d) => d.dayNumber === activeDayNumber) || tripData.days[0]

  // Sync external trip changes in (e.g. from page.tsx restoring from URL/localStorage)
  useEffect(() => {
    setTripData(trip)
  }, [trip])

  const runHardConflicts = useCallback((stops: Stop[]) => {
    const results = detectHardConflicts(stops)
    setHardConflicts(results)
  }, [])

  const fetchSoftConflicts = useCallback(async (day: Day) => {
    setSoftLoading(true)
    setSoftConflicts([])
    try {
      const res = await fetch('/api/detect-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stops: day.stops,
          date: day.date,
          city: day.city,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSoftConflicts(Array.isArray(data) ? data : [])
      }
    } catch {
      setSoftConflicts([])
    } finally {
      setSoftLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeDay) {
      runHardConflicts(activeDay.stops)
      fetchSoftConflicts(activeDay)
    }
  }, [activeDayNumber, activeDay, runHardConflicts, fetchSoftConflicts])

  // Close share menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false)
      }
    }
    if (showShareMenu) {
      document.addEventListener('mousedown', handler)
    }
    return () => document.removeEventListener('mousedown', handler)
  }, [showShareMenu])

  // Central trip updater — keeps local state, pushes up, re-runs conflicts
  const applyTripUpdate = useCallback(
    (updatedTrip: Trip) => {
      setTripData(updatedTrip)
      onUpdateTrip(updatedTrip)
      const updatedDay = updatedTrip.days.find((d) => d.dayNumber === activeDayNumber)
      if (updatedDay) {
        runHardConflicts(updatedDay.stops)
      }
    },
    [activeDayNumber, onUpdateTrip, runHardConflicts]
  )

  const handleSwapAlternative = (stop: Stop, alt: AlternativeOption) => {
    const newDays = tripData.days.map((day) => {
      if (day.dayNumber !== activeDayNumber) return day

      const newStops = day.stops.map((s) => {
        if (s.id !== stop.id) return s

        const currentAsAlt: AlternativeOption = {
          id: `alt-prev-${s.id}`,
          name: s.title.replace(/^Check in — /, ''),
          price: s.price || 0,
          reason: 'Previous AI pick — swapped by you.',
        }

        const newAlts = [
          ...(s.alternatives || []).filter((a) => a.id !== alt.id),
          currentAsAlt,
        ]

        return {
          ...s,
          title: s.title.replace(/(Check in — ).+/, `$1${alt.name}`),
          subtitle: s.subtitle.replace(/฿[\d,]+\/night/, `฿${alt.price.toLocaleString()}/night`),
          price: alt.price,
          whyChosen: alt.reason,
          source: 'user' as const,
          imageUrl: alt.imageUrl,
          alternatives: newAlts,
        }
      })

      return { ...day, stops: newStops }
    })

    applyTripUpdate({ ...tripData, days: newDays })
  }

  // After swap, re-run hard conflicts
  useEffect(() => {
    if (activeDay) {
      runHardConflicts(activeDay.stops)
    }
  }, [tripData, activeDay, runHardConflicts])

  // Delete a stop from the active day
  const handleDeleteStop = useCallback(
    (stopId: string) => {
      const newDays = tripData.days.map((day) => {
        if (day.dayNumber !== activeDayNumber) return day
        return { ...day, stops: day.stops.filter((s) => s.id !== stopId) }
      })
      applyTripUpdate({ ...tripData, days: newDays })
    },
    [tripData, activeDayNumber, applyTripUpdate]
  )

  // Swap two stops in the active day
  const handleMoveStop = useCallback(
    (stopId: string, direction: 'up' | 'down') => {
      const newDays = tripData.days.map((day) => {
        if (day.dayNumber !== activeDayNumber) return day
        const stops = [...day.stops]
        const idx = stops.findIndex((s) => s.id === stopId)
        if (idx < 0) return day
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= stops.length) return day
        ;[stops[idx], stops[swapIdx]] = [stops[swapIdx], stops[idx]]
        return { ...day, stops }
      })
      applyTripUpdate({ ...tripData, days: newDays })
    },
    [tripData, activeDayNumber, applyTripUpdate]
  )

  // Share: Copy link
  const handleCopyLink = async () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(tripData))))
      const url = `${window.location.origin}${window.location.pathname}?trip=${encoded}`
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // fallback silent fail
    }
    setShowShareMenu(false)
  }

  // Share: PDF
  const handleExportPDF = () => {
    setShowShareMenu(false)
    window.print()
  }

  const formatTripMeta = () => {
    const p = tripData.preferences
    return `${formatDateRange(p.startDate, p.endDate)} · ${p.days} days · ${p.travellerType}`
  }

  // Flatten all stops for the active day with section context
  const activeDaySections = activeDay ? groupStopsIntoSections(activeDay.stops) : []
  const allActiveSectionStops = activeDaySections.flatMap((s) => s.stops)

  return (
    <div className="flex flex-col h-screen bg-[#f0f4f8]">
      {/* Header */}
      <div className="bg-[#003B95] px-5 py-3 flex items-center gap-3 shrink-0 no-print">
        <button
          onClick={onBack}
          className="text-white text-xs bg-white/15 hover:bg-white/25 transition-colors px-3 py-1.5 rounded-md"
        >
          ← Edit preferences
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-white truncate">{tripData.name}</div>
          <div className="text-[11px] text-white/65 mt-0.5">{formatTripMeta()}</div>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800">
            ฿{tripData.estimatedTotal.toLocaleString()} est.
          </span>
          {tripData.seasonalNote && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
              Songkran season
            </span>
          )}

          {/* Share button */}
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => setShowShareMenu((v) => !v)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                copiedLink
                  ? 'bg-green-500 text-white'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
            >
              {copiedLink ? '✓ Copied!' : '⬆ Share'}
            </button>

            {showShareMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                <button
                  onClick={handleExportPDF}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <span className="text-base">🖨</span> Export PDF
                </button>
                <div className="border-t border-gray-100" />
                <button
                  onClick={handleCopyLink}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <span className="text-base">🔗</span> Copy link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Day Plan sidebar */}
        <DayPlan
          days={tripData.days}
          activeDayNumber={activeDayNumber}
          onSelectDay={setActiveDayNumber}
          tripName={tripData.name}
          tripMeta={formatTripMeta()}
          trip={tripData}
          onUpdateTrip={applyTripUpdate}
        />

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeDay && (
            <>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Day {activeDay.dayNumber} — {activeDay.label}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatFullDate(activeDay.date)} · {activeDay.city}
                  </p>
                </div>
                {tripData.seasonalNote && activeDayNumber <= 5 && (
                  <span className="ml-auto text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Songkran week
                  </span>
                )}
              </div>

              {/* Conflict banner */}
              <ConflictBanner hardConflicts={hardConflicts} softConflicts={softConflicts} />
              {softLoading && (
                <div className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
                  <span className="animate-pulse">●</span>
                  Checking for soft conflicts…
                </div>
              )}

              {/* Timeline */}
              <div className="flex flex-col">
                {activeDay.stops.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <div className="text-3xl mb-2">📅</div>
                    <p className="text-sm">This day hasn&apos;t been planned yet.</p>
                    <p className="text-xs mt-1">Add stops using the button below.</p>
                  </div>
                ) : (
                  activeDaySections.map((section, si) => (
                    <div key={si}>
                      {section.label && (
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-3">
                          {section.label}
                        </div>
                      )}
                      {section.stops.map((stop) => {
                        const globalIdx = allActiveSectionStops.findIndex((s) => s.id === stop.id)
                        const total = allActiveSectionStops.length
                        const isFirst = globalIdx === 0
                        const isLast = globalIdx === total - 1

                        return (
                          <div key={stop.id} id={stop.id} className="flex gap-2.5 mb-1">
                            {/* Time column */}
                            <div className="w-11 shrink-0 text-right pt-3.5">
                              {stop.time && stop.type !== 'local-tip' && (
                                <span className="text-[11px] text-gray-400">{stop.time}</span>
                              )}
                            </div>

                            {/* Connector */}
                            <div className="flex flex-col items-center w-4 shrink-0">
                              <div className="w-px flex-1 bg-gray-200" />
                              {stop.type !== 'local-tip' && (
                                <div
                                  className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 my-2 ${typeColors[stop.type] || typeColors.activity}`}
                                />
                              )}
                              <div className="w-px flex-1 bg-gray-200" />
                            </div>

                            {/* Card */}
                            <div className="flex-1 min-w-0">
                              {stop.type === 'hotel' ? (
                                <HotelCard
                                  stop={stop}
                                  onSwapAlternative={(alt) => handleSwapAlternative(stop, alt)}
                                  onDelete={() => handleDeleteStop(stop.id)}
                                  onMoveUp={!isFirst ? () => handleMoveStop(stop.id, 'up') : undefined}
                                  onMoveDown={!isLast ? () => handleMoveStop(stop.id, 'down') : undefined}
                                />
                              ) : (
                                <ActivityCard
                                  stop={stop}
                                  onDelete={() => handleDeleteStop(stop.id)}
                                  onMoveUp={!isFirst ? () => handleMoveStop(stop.id, 'up') : undefined}
                                  onMoveDown={!isLast ? () => handleMoveStop(stop.id, 'down') : undefined}
                                />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}

                {/* Add stop button */}
                <div className="flex items-center gap-3 mt-2 mb-6 no-print">
                  <div className="flex-1 border-t border-dashed border-gray-200" />
                  <button
                    onClick={() => setShowAddStop(true)}
                    className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-full px-3 py-1 hover:border-blue-400 hover:text-blue-500 transition-colors bg-white"
                  >
                    + Add stop
                  </button>
                  <div className="flex-1 border-t border-dashed border-gray-200" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Intel panel */}
        {activeDay && (
          <IntelPanel
            day={activeDay}
            hardConflicts={hardConflicts}
            softConflicts={softConflicts}
          />
        )}
      </div>

      {/* Add Stop Modal */}
      {showAddStop && activeDay && (
        <AddStopModal
          activeDay={activeDay}
          trip={tripData}
          onClose={() => setShowAddStop(false)}
          onSave={(updatedTrip) => {
            applyTripUpdate(updatedTrip)
          }}
        />
      )}
    </div>
  )
}

interface Section {
  label: string
  stops: Stop[]
}

function groupStopsIntoSections(stops: Stop[]): Section[] {
  const sections: Section[] = []

  // Separate hotels and non-hotels
  const hotels = stops.filter(s => s.type === 'hotel')
  const others = stops.filter(s => s.type !== 'hotel')

  if (hotels.length > 0) {
    sections.push({ label: 'Stay', stops: hotels })
  }

  // Group remaining by time
  const morning = others.filter(s => {
    const h = parseInt(s.time?.split(':')[0] || '12')
    return h < 12
  })
  const afternoon = others.filter(s => {
    const h = parseInt(s.time?.split(':')[0] || '12')
    return h >= 12 && h < 17
  })
  const evening = others.filter(s => {
    const h = parseInt(s.time?.split(':')[0] || '12')
    return h >= 17
  })

  if (morning.length > 0) sections.push({ label: 'Morning', stops: morning })
  if (afternoon.length > 0) sections.push({ label: 'Afternoon', stops: afternoon })
  if (evening.length > 0) sections.push({ label: 'Evening', stops: evening })

  return sections.filter(s => s.stops.length > 0)
}

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start)
    const e = new Date(end)
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${s.toLocaleDateString('en-US', opts)}–${e.toLocaleDateString('en-US', opts)}`
  } catch {
    return `${start} – ${end}`
  }
}

function formatFullDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}
