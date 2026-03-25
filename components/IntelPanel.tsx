'use client'

import { useState, useRef, useEffect } from 'react'
import { Day, HardConflict, SoftConflict, Trip } from '@/types'

interface ChatMessage {
  id: string
  role: 'user' | 'bot'
  content: string
}

const INITIAL_CHAT_MESSAGE = "Hey! Ask me anything about your trip — I can suggest changes, give local tips, or flag anything worth knowing."

const FALLBACK_RESPONSES = [
  "Looking at Day 3 — the Grand Palace and floating market combo is a long day. Consider flipping the order if you're coming from Silom.",
  "Heads up: Songkran on Apr 13 means Silom and Khao San go wild with water fights. Pack a waterproof bag for anything electronic.",
  "Bangkok Airways flies direct Suvarnabhumi → Koh Samui in 70 min. Worth it vs the ferry for a mid-range trip.",
  "Happy to help! What would you like to know or change?",
]

interface Props {
  day: Day
  hardConflicts: HardConflict[]
  softConflicts: SoftConflict[]
  trip: Trip
  onNewTrip: () => void
  chatHistory?: { role: 'user' | 'assistant'; content: string }[]
  chatDisplayMessages?: { id: string; role: 'user' | 'bot'; content: string }[]
}

function calcDaySpend(day: Day): number {
  return day.stops.reduce((sum, s) => sum + (s.price || 0), 0)
}

function calcFreeTime(day: Day): string {
  const scheduled = day.stops.filter(s => s.time && s.type !== 'local-tip')
  if (scheduled.length === 0) return 'All day'
  const totalMinutes = scheduled.reduce((sum, s) => sum + (s.duration || 0), 0)
  const freeMin = Math.max(0, 16 * 60 - totalMinutes)
  if (freeMin < 60) return `${freeMin} min`
  return `${(freeMin / 60).toFixed(1)} hrs`
}

function getPace(day: Day): string {
  const activities = day.stops.filter(s => s.type === 'activity').length
  if (activities >= 4) return 'Intense'
  if (activities >= 2) return 'Moderate'
  return 'Light'
}

const getWeatherForCity = (city: string) => {
  if (city.toLowerCase().includes('samui') || city.toLowerCase().includes('koh')) {
    return { temp: '32°C', humidity: '72%', note: 'Plan beach time before 11am and after 16:00.' }
  }
  return { temp: '34°C', humidity: '78%', note: 'Plan indoor breaks 13–16h.' }
}

const getCrowdNote = (day: Day) => {
  const label = day.label.toLowerCase()
  if (label.includes('songkran')) return { level: 'Very High', note: 'Songkran festival — street closures near Silom & Khao San.' }
  if (day.city.toLowerCase().includes('bangkok')) return { level: 'High', note: 'BTS rush hour 17–19h. Add 20 min buffer.' }
  return { level: 'Moderate', note: 'Weekend crowds at popular spots.' }
}

const getTransitNote = (day: Day) => {
  const hasTransit = day.stops.some(s => s.type === 'transit')
  if (!hasTransit) return null
  if (day.city.toLowerCase().includes('bangkok')) return 'BTS runs every 3-5 min. Grab app recommended for longer journeys.'
  if (day.city.toLowerCase().includes('samui') || day.city.toLowerCase().includes('koh')) return 'Motorbike rental ฿200/day recommended. Fixed-rate taxis from villa.'
  return 'Check transit stops for transport details.'
}

export default function IntelPanel({ day, hardConflicts, softConflicts, trip, onNewTrip, chatHistory, chatDisplayMessages }: Props) {
  const daySpend = calcDaySpend(day)
  const freeTime = calcFreeTime(day)
  const pace = getPace(day)
  const weather = getWeatherForCity(day.city)
  const crowd = getCrowdNote(day)
  const transit = getTransitNote(day)
  const totalConflicts = hardConflicts.length + softConflicts.length

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    chatDisplayMessages && chatDisplayMessages.length > 0
      ? chatDisplayMessages.map(m => ({ id: m.id, role: m.role, content: m.content }))
      : [{ id: 'bot-0', role: 'bot', content: INITIAL_CHAT_MESSAGE }]
  )
  const [chatInput, setChatInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const apiHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>(
    chatHistory && chatHistory.length > 0
      ? [...chatHistory]
      : [{ role: 'assistant', content: INITIAL_CHAT_MESSAGE }]
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isTyping])

  const sendMessage = async () => {
    const text = chatInput.trim()
    if (!text || isTyping) return

    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: text }
    setChatMessages((prev) => [...prev, userMsg])
    setChatInput('')
    apiHistoryRef.current.push({ role: 'user', content: text })
    setIsTyping(true)

    try {
      const res = await fetch('/api/planner-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiHistoryRef.current, trip }),
      })
      const data = res.ok ? await res.json() : { content: "I'm having a moment — try again!" }
      const botText = data.content || "I'm having a moment — try again!"
      apiHistoryRef.current.push({ role: 'assistant', content: botText })
      setChatMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: 'bot', content: botText }])
    } catch {
      const fallback = FALLBACK_RESPONSES[Math.min(apiHistoryRef.current.filter(m => m.role === 'user').length - 1, FALLBACK_RESPONSES.length - 1)]
      apiHistoryRef.current.push({ role: 'assistant', content: fallback })
      setChatMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: 'bot', content: fallback }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="w-[220px] bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden no-print">

      {/* ── Top: Intel content (scrollable) ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Day summary */}
        <div className="px-3.5 py-3 border-b border-gray-100">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
            Day Summary
          </div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] text-gray-500">Planned spend</span>
            <span className="text-[11px] font-semibold text-gray-800">
              ฿{daySpend.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] text-gray-500">Free time</span>
            <span className="text-[11px] font-semibold text-gray-800">{freeTime}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-gray-500">Pace</span>
            <span
              className={`text-[11px] font-semibold ${
                pace === 'Intense'
                  ? 'text-red-600'
                  : pace === 'Moderate'
                  ? 'text-amber-600'
                  : 'text-green-600'
              }`}
            >
              {pace}
            </span>
          </div>
        </div>

        {/* On-ground intel */}
        <div className="px-3.5 py-3 border-b border-gray-100">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
            Day&apos;s Tips
          </div>

          <div className="flex gap-2 mb-2 items-start">
            <div className="w-5 h-5 rounded bg-blue-50 text-blue-700 flex items-center justify-center text-[11px] shrink-0">
              ☀
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">
              <span className="font-semibold text-gray-800">{weather.temp}</span>, humidity {weather.humidity}. {weather.note}
            </p>
          </div>

          <div className="flex gap-2 mb-2 items-start">
            <div className="w-5 h-5 rounded bg-amber-50 text-amber-700 flex items-center justify-center text-[11px] shrink-0">
              !
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">
              <span className="font-semibold text-gray-800">Crowds: {crowd.level}</span> — {crowd.note}
            </p>
          </div>

          {transit && (
            <div className="flex gap-2 mb-2 items-start">
              <div className="w-5 h-5 rounded bg-gray-100 text-gray-600 flex items-center justify-center text-[11px] shrink-0">
                ↔
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">{transit}</p>
            </div>
          )}

          <div className="flex gap-2 items-start">
            <div className="w-5 h-5 rounded bg-red-50 text-red-600 flex items-center justify-center text-[11px] shrink-0">
              $
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">
              Tuk-tuks near tourist zones are{' '}
              <span className="font-semibold text-gray-800">3–4x Grab price</span> this week.
            </p>
          </div>
        </div>

        {/* Conflicts summary */}
        {totalConflicts > 0 && (
          <div className="mx-3 my-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
            <div className="text-[11px] font-semibold text-amber-700 mb-0.5">
              {totalConflicts} {totalConflicts === 1 ? 'conflict' : 'conflicts'} flagged
            </div>
            <div className="text-[10px] text-amber-600 leading-snug">
              {hardConflicts.length > 0 && `${hardConflicts.length} scheduling error${hardConflicts.length > 1 ? 's' : ''}. `}
              {softConflicts.length > 0 && `${softConflicts.length} timing note${softConflicts.length > 1 ? 's' : ''}.`}
            </div>
          </div>
        )}

        {/* Suggestions */}
        <div className="px-3.5 py-3">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
            Add to this day
          </div>
          {getSuggestions(day).map((s, i) => (
            <button
              key={i}
              className="block w-full text-left text-[11px] px-2 py-1.5 mb-1.5 border border-gray-200 rounded-md bg-white text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom: Pete chat ── */}
      <div className="h-[280px] bg-white flex flex-col border-t border-gray-200 shrink-0">
        {/* Chat header */}
        <div className="flex items-center gap-2 px-3.5 py-2 border-b border-gray-100 shrink-0">
          <img src="/pete.png" alt="Pete" className="w-6 h-6 rounded-full object-cover shrink-0" />
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex-1">Ask Pete</div>
          <button
            onClick={onNewTrip}
            title="Start a new trip"
            className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-red-500 transition-colors px-2 py-0.5 rounded-full hover:bg-red-50"
          >
            New trip
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M5 13h11.17l-4.88 4.88c-.39.39-.39 1.03 0 1.42.39.39 1.02.39 1.41 0l6.59-6.59c.39-.39.39-1.02 0-1.41l-6.59-6.59c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L16.17 11H5c-.55 0-1 .45-1 1s.45 1 1 1z"/></svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2 scrollbar-hide">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'bot' ? (
                <img src="/pete.png" alt="Pete" className="w-5 h-5 rounded-full shrink-0 object-cover self-end" />
              ) : (
                <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold bg-[#E22B00] text-white self-end">
                  J
                </div>
              )}
              <div
                className={`px-2.5 py-1.5 rounded-xl text-[11px] leading-snug max-w-[85%] ${
                  msg.role === 'bot'
                    ? 'bg-[#f3f6fb] text-gray-800 rounded-tl-sm'
                    : 'bg-[#003B95] text-white rounded-tr-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-1.5">
              <img src="/pete.png" alt="Pete" className="w-5 h-5 rounded-full shrink-0 object-cover" />
              <div className="flex items-center gap-1 px-2.5 py-2 bg-[#f3f6fb] rounded-xl rounded-tl-sm">
                <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-2.5 py-2 flex gap-1.5 items-center shrink-0 border-t border-gray-100">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about your trip…"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-[11px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#003B95]"
          />
          <button
            onClick={sendMessage}
            disabled={isTyping || !chatInput.trim()}
            className="w-6 h-6 rounded-full bg-[#003B95] hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center shrink-0 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  )
}

function getSuggestions(day: Day): string[] {
  const city = day.city.toLowerCase()
  const label = day.label.toLowerCase()

  if (label.includes('arrival') || label.includes('check-in')) {
    return ['+ Night market nearby', '+ Rooftop bar', '+ Street food walk']
  }
  if (label.includes('temple') || label.includes('culture')) {
    return ['+ Tuk-tuk tour', '+ Thai cooking class', '+ Museum visit']
  }
  if (city.includes('samui') || city.includes('koh')) {
    return ['+ Snorkelling trip', '+ Muay Thai show', '+ Coconut farm tour']
  }
  if (label.includes('songkran') || label.includes('festival')) {
    return ['+ Songkran after-party', '+ Temple blessing ceremony', '+ Water gun shop nearby']
  }
  if (label.includes('departure') || label.includes('fly')) {
    return ['+ Airport lounge access', '+ Last Thai breakfast', '+ Duty-free shortlist']
  }
  return ['+ Muay Thai show nearby', '+ Rooftop bar (฿400–800)', '+ Move dinner earlier']
}
