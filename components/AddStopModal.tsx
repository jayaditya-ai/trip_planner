'use client'

import { useState } from 'react'
import { Trip, Stop, StopType, Day } from '@/types'

interface Props {
  activeDay: Day
  trip: Trip
  onClose: () => void
  onSave: (updatedTrip: Trip) => void
  defaultTime?: string
}

const stopTypes: { value: StopType; label: string }[] = [
  { value: 'activity', label: 'Activity' },
  { value: 'food', label: 'Food' },
  { value: 'transit', label: 'Transit' },
  { value: 'local-tip', label: 'Local Tip' },
]

export default function AddStopModal({ activeDay, trip, onClose, onSave, defaultTime }: Props) {
  const [type, setType] = useState<StopType>('activity')
  const [name, setName] = useState('')
  const [time, setTime] = useState(defaultTime || '09:00')
  const [duration, setDuration] = useState(60)
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [price, setPrice] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!time.match(/^\d{2}:\d{2}$/)) errs.time = 'Use HH:MM format'
    if (duration < 1) errs.duration = 'Duration must be at least 1 minute'
    return errs
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const newStop: Stop = {
      id: `user-stop-${Date.now()}`,
      type,
      time,
      duration,
      title: name.trim(),
      subtitle: location.trim() || activeDay.city,
      price: price !== '' ? Number(price) : undefined,
      currency: 'THB',
      location: location.trim() || undefined,
      localIntel: notes.trim() || undefined,
      source: 'user',
    }

    // Insert stop into the day sorted by time
    const updatedDays = trip.days.map((day) => {
      if (day.dayNumber !== activeDay.dayNumber) return day
      const newStops = [...day.stops, newStop].sort((a, b) => {
        if (!a.time) return 1
        if (!b.time) return -1
        return a.time.localeCompare(b.time)
      })
      return { ...day, stops: newStops }
    })

    onSave({ ...trip, days: updatedDays })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer / Modal */}
      <div className="relative w-full sm:max-w-lg bg-[#1a1f2e] rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        {/* Handle bar for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white">Add a stop</h2>
            <p className="text-xs text-white/50 mt-0.5">
              Day {activeDay.dayNumber} — {activeDay.label}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
          {/* Stop type */}
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-1.5">
              Stop Type
            </label>
            <div className="flex flex-wrap gap-2">
              {stopTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    type === t.value
                      ? 'bg-[#003B95] text-white border border-blue-400'
                      : 'bg-white/10 text-white/60 border border-white/10 hover:bg-white/20'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-1.5">
              Name / Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })) }}
              placeholder="e.g. Wat Pho Temple, Pad Thai at Or Tor Kor..."
              className={`w-full bg-white/10 border ${errors.name ? 'border-red-500' : 'border-white/15'} rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30`}
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          {/* Time + Duration */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-1.5">
                Time <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => { setTime(e.target.value); setErrors((p) => ({ ...p, time: '' })) }}
                placeholder="HH:MM"
                className={`w-full bg-white/10 border ${errors.time ? 'border-red-500' : 'border-white/15'} rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30`}
              />
              {errors.time && <p className="text-xs text-red-400 mt-1">{errors.time}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-1.5">
                Duration (min) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={duration}
                min={1}
                onChange={(e) => { setDuration(Number(e.target.value)); setErrors((p) => ({ ...p, duration: '' })) }}
                className={`w-full bg-white/10 border ${errors.duration ? 'border-red-500' : 'border-white/15'} rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30`}
              />
              {errors.duration && <p className="text-xs text-red-400 mt-1">{errors.duration}</p>}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-1.5">
              Location / Area <span className="text-white/30">(optional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Rattanakosin Island, Silom..."
              className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-1.5">
              Price in THB <span className="text-white/30">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">฿</span>
              <input
                type="number"
                value={price}
                min={0}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-white/10 border border-white/15 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-1.5">
              Notes / Local Intel <span className="text-white/30">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any tips, reminders, or insider knowledge..."
              className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-white/20 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-[#003B95] hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              Add Stop
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
