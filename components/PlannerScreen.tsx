'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
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
  const [addStopTime, setAddStopTime] = useState<string | undefined>(undefined)

  const openAddStop = (time?: string) => {
    setAddStopTime(time)
    setShowAddStop(true)
  }
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

  // Drag-and-drop reorder + cascade times
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return
      if (result.destination.index === result.source.index) return
      const newDays = tripData.days.map((day) => {
        if (day.dayNumber !== activeDayNumber) return day
        const stops = [...day.stops]
        const [removed] = stops.splice(result.source.index, 1)
        stops.splice(result.destination!.index, 0, removed)
        return { ...day, stops: recascadeTimes(stops) }
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

  return (
    <>
    {/* ── Print-only view: all days ── */}
    <div className="print-only p-8 font-sans text-black">
      <div className="mb-6 pb-4 border-b-2 border-gray-800">
        <h1 className="text-2xl font-bold">{tripData.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{formatTripMeta()} · ฿{tripData.estimatedTotal.toLocaleString()} estimated</p>
        {tripData.seasonalNote && <p className="text-xs text-amber-700 mt-1">{tripData.seasonalNote}</p>}
      </div>
      {tripData.days.map((day, di) => (
        <div key={day.dayNumber} style={{ pageBreakBefore: di > 0 ? 'always' : 'auto' }} className="mb-10">
          <div className="mb-3 pb-2 border-b border-gray-300">
            <h2 className="text-lg font-bold">Day {day.dayNumber} — {day.label}</h2>
            <p className="text-xs text-gray-500">{formatFullDate(day.date)} · {day.city}</p>
          </div>
          {day.stops.map(stop => (
            <div key={stop.id} className="flex gap-4 mb-3 text-sm">
              <span className="w-12 shrink-0 text-gray-400 font-mono text-xs pt-0.5">{stop.time || ''}</span>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{stop.title}</div>
                <div className="text-gray-500 text-xs">{stop.subtitle}</div>
                {stop.whyChosen && <div className="text-gray-600 text-xs mt-0.5 italic">{stop.whyChosen}</div>}
              </div>
              {stop.price !== undefined && stop.price !== null && (
                <span className="shrink-0 text-xs font-semibold text-gray-700">
                  {stop.price === 0 ? 'Free' : `฿${stop.price.toLocaleString()}`}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>

    {/* ── Main app shell ── */}
    <div className="app-shell flex flex-col h-screen bg-[#f0f4f8]">
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
              <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex flex-col">
                {activeDay.stops.length === 0 ? (
                  <div
                    onClick={() => openAddStop()}
                    className="text-center py-16 text-gray-400 cursor-pointer rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:text-blue-400 hover:bg-blue-50/40 transition-all"
                  >
                    <div className="text-3xl mb-2">＋</div>
                    <p className="text-sm font-medium">Click to add your first stop</p>
                  </div>
                ) : (
                  <Droppable droppableId="timeline">
                    {(droppableProvided) => (
                      <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
                        {activeDay.stops.map((stop, index) => {
                          const prevStop = index > 0 ? activeDay.stops[index - 1] : null
                          const gapMins = prevStop?.time && stop.time
                            ? tMins(stop.time) - (tMins(prevStop.time) + (prevStop.duration || 0))
                            : 0

                          return (
                            <div key={stop.id}>
                              {/* Gap spacer between stops */}
                              {gapMins >= 20 && <GapSpacer prevEndMin={tMins(prevStop!.time!) + (prevStop!.duration || 0)} startMin={tMins(stop.time!)} onAdd={openAddStop} />}

                              <Draggable draggableId={stop.id} index={index}>
                                {(draggableProvided, snapshot) => (
                                  <div
                                    ref={draggableProvided.innerRef}
                                    {...draggableProvided.draggableProps}
                                    {...draggableProvided.dragHandleProps}
                                    id={stop.id}
                                    className={`flex gap-2.5 mb-1 ${snapshot.isDragging ? 'opacity-75 shadow-2xl rounded-xl scale-[1.01]' : 'cursor-grab active:cursor-grabbing'}`}
                                  >
                                    {/* Time column */}
                                    <div className="w-11 shrink-0 text-right pt-3.5">
                                      {stop.time && stop.type !== 'local-tip' && (
                                        <span className="text-[11px] text-gray-500 font-mono">{stop.time}</span>
                                      )}
                                    </div>

                                    {/* Connector */}
                                    <div className="flex flex-col items-center w-4 shrink-0">
                                      <div className="w-px flex-1 bg-gray-200" />
                                      {stop.type !== 'local-tip' && (
                                        <div className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 my-2 ${typeColors[stop.type] || typeColors.activity}`} />
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
                                        />
                                      ) : (
                                        <ActivityCard
                                          stop={stop}
                                          onDelete={() => handleDeleteStop(stop.id)}
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            </div>
                          )
                        })}
                        {droppableProvided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}

                {/* Add stop button */}
                <div className="flex items-center gap-3 mt-2 mb-6 no-print">
                  <div className="flex-1 border-t border-dashed border-gray-200" />
                  <button
                    onClick={() => openAddStop()}
                    className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-full px-3 py-1 hover:border-blue-400 hover:text-blue-500 transition-colors bg-white"
                  >
                    + Add stop
                  </button>
                  <div className="flex-1 border-t border-dashed border-gray-200" />
                </div>
              </div>
              </DragDropContext>
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
          defaultTime={addStopTime}
          onClose={() => { setShowAddStop(false); setAddStopTime(undefined) }}
          onSave={(updatedTrip) => {
            applyTripUpdate(updatedTrip)
          }}
        />
      )}
    </div>
    </>
  )
}


// ─── Time helpers ────────────────────────────────────────────────────────────

function tMins(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function tStr(mins: number): string {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function recascadeTimes(stops: Stop[]): Stop[] {
  const result = [...stops]
  let cursor: number | null = null
  for (let i = 0; i < result.length; i++) {
    const s = result[i]
    if (!s.time || s.type === 'local-tip') continue
    if (cursor === null) {
      cursor = tMins(s.time) + (s.duration || 0)
    } else {
      result[i] = { ...s, time: tStr(cursor) }
      cursor = cursor + (s.duration || 0)
    }
  }
  return result
}

// Gap spacer — shows hour tick marks in free time between stops, clickable to add a stop
function GapSpacer({ prevEndMin, startMin, onAdd }: { prevEndMin: number; startMin: number; onAdd: (time: string) => void }) {
  const gapMin = startMin - prevEndMin
  if (gapMin < 20) return null
  const PX_PER_MIN = 0.85
  const heightPx = Math.max(36, gapMin * PX_PER_MIN)

  const ticks: { label: string; pct: number }[] = []
  const firstHour = Math.ceil(prevEndMin / 60)
  const lastHour = Math.floor(startMin / 60)
  for (let h = firstHour; h <= lastHour; h++) {
    ticks.push({ label: `${String(h).padStart(2, '0')}:00`, pct: ((h * 60 - prevEndMin) / gapMin) * 100 })
  }

  const clickTime = tStr(prevEndMin)

  return (
    <div
      className="flex gap-2.5 group/gap cursor-pointer"
      style={{ height: heightPx }}
      onClick={() => onAdd(clickTime)}
      title={`Add stop at ${clickTime}`}
    >
      <div className="w-11 shrink-0" />
      <div className="flex flex-col items-center w-4 shrink-0">
        <div className="w-px flex-1 bg-gray-100 group-hover/gap:bg-blue-200 transition-colors" />
      </div>
      <div className="flex-1 relative">
        {/* Hover hint */}
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover/gap:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-[11px] text-blue-400 font-medium bg-blue-50 border border-blue-200 rounded-full px-3 py-0.5">
            + add stop at {clickTime}
          </span>
        </div>
        {/* Hour ticks — hide on hover */}
        <div className="group-hover/gap:opacity-0 transition-opacity">
          {ticks.map(({ label, pct }) => (
            <div
              key={label}
              className="absolute left-0 right-2 flex items-center gap-2"
              style={{ top: `calc(${pct}% - 7px)` }}
            >
              <span className="text-[9px] text-gray-300 font-mono tabular-nums">{label}</span>
              <div className="flex-1 border-t border-dashed border-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
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
