'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatMessage, TripPreferences } from '@/types'

interface Props {
  onBuildItinerary: (preferences: TripPreferences) => void
}

type ConversationStage =
  | 'destination'
  | 'dates'
  | 'travellers'
  | 'style'
  | 'activities'
  | 'budget'
  | 'done'

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'bot-0',
    role: 'bot',
    content: "Oh hey! I'm so glad you're here — trip planning is genuinely my favourite thing. Where are we heading?",
  },
]

const MCQ_OPTIONS: Record<string, string[]> = {
  travellers: ['Solo', 'Couple', 'Family', 'Group'],
  style: ['Budget conscious', 'Mid-range comfort', 'Splurge on experiences'],
  activities: ['Beach & water', 'Food & street eats', 'Temples & culture', 'Nightlife', 'Off-beat / local'],
  budget: ['Under ฿2,000/night', '฿2,000–5,000/night', '฿5,000–10,000/night', 'No limit'],
}

export default function ChatOnboarding({ onBuildItinerary }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [stage, setStage] = useState<ConversationStage>('destination')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedMCQ, setSelectedMCQ] = useState<Record<string, string[]>>({})
  const [preferences, setPreferences] = useState<Partial<TripPreferences>>({})
  const [ctaReady, setCtaReady] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const apiHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const addBotMessage = (content: string, mcqOptions?: string[], mcqGroupId?: string) => {
    const msg: ChatMessage = {
      id: `bot-${Date.now()}`,
      role: 'bot',
      content,
      mcqOptions: mcqOptions?.map((o) => ({ label: o, value: o })),
      mcqGroupId,
    }
    setMessages((prev) => [...prev, msg])
    apiHistoryRef.current.push({ role: 'assistant', content })
  }

  const parsePreferencesFromText = (text: string, currentStage: ConversationStage): Partial<TripPreferences> => {
    const updates: Partial<TripPreferences> = {}
    const lower = text.toLowerCase()

    if (currentStage === 'destination') {
      const destinations: string[] = []
      if (lower.includes('bangkok')) destinations.push('Bangkok')
      if (lower.includes('koh samui') || lower.includes('samui')) destinations.push('Koh Samui')
      if (lower.includes('chiang mai')) destinations.push('Chiang Mai')
      if (lower.includes('phuket')) destinations.push('Phuket')
      if (lower.includes('krabi')) destinations.push('Krabi')
      if (lower.includes('pai')) destinations.push('Pai')
      if (destinations.length === 0) destinations.push('Bangkok')
      updates.destinations = destinations
    }

    if (currentStage === 'dates') {
      // Try to extract days count
      const daysMatch = text.match(/(\d+)\s*day/i)
      if (daysMatch) updates.days = parseInt(daysMatch[1])

      // Try to detect April
      if (lower.includes('april') || lower.includes('apr')) {
        updates.startDate = '2026-04-05'
        updates.endDate = '2026-04-15'
        if (!updates.days) updates.days = 10
      } else {
        // Default to near future
        const today = new Date()
        const start = new Date(today)
        start.setDate(today.getDate() + 30)
        const end = new Date(start)
        end.setDate(start.getDate() + (updates.days || 7) - 1)
        updates.startDate = start.toISOString().split('T')[0]
        updates.endDate = end.toISOString().split('T')[0]
        if (!updates.days) updates.days = 7
      }

      // Traveller type
      if (lower.includes('solo')) updates.travellerType = 'Solo'
      else if (lower.includes('couple') || lower.includes('partner')) updates.travellerType = 'Couple'
      else if (lower.includes('family') || lower.includes('kids')) updates.travellerType = 'Family'
      else updates.travellerType = 'Solo'
    }

    return updates
  }

  const handleMCQSelect = (groupId: string, value: string) => {
    if (groupId === 'activities') {
      // Multi-select — toggle, require explicit confirm
      setSelectedMCQ((prev) => {
        const current = prev[groupId] || []
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
        return { ...prev, [groupId]: updated }
      })
    } else {
      // Single-select — set and auto-send
      setSelectedMCQ((prev) => ({ ...prev, [groupId]: [value] }))
      setTimeout(() => sendMessage(value), 50)
    }
  }

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim()
    if (!msgText && stage !== 'activities') return

    // For MCQ stages, use selected values
    let finalText = msgText
    if (stage === 'style' && selectedMCQ.style?.[0]) {
      finalText = selectedMCQ.style[0]
    } else if (stage === 'activities') {
      const selected = selectedMCQ.activities || []
      if (selected.length === 0) return
      finalText = selected.join(', ')
    } else if (stage === 'budget' && selectedMCQ.budget?.[0]) {
      finalText = selectedMCQ.budget[0]
    }

    if (!finalText) return

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: finalText,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    apiHistoryRef.current.push({ role: 'user', content: finalText })

    // Parse preferences
    const updates = parsePreferencesFromText(finalText, stage)
    const newPrefs = { ...preferences, ...updates }

    if (stage === 'travellers') {
      newPrefs.travellerType = finalText
    } else if (stage === 'style') {
      newPrefs.travelStyle = finalText
    } else if (stage === 'activities') {
      newPrefs.activities = (selectedMCQ.activities || []).length > 0
        ? selectedMCQ.activities
        : finalText.split(',').map(s => s.trim())
    } else if (stage === 'budget') {
      newPrefs.budget = finalText
    }

    setPreferences(newPrefs)

    // Show typing indicator
    setIsTyping(true)

    try {
      // Get next stage
      const nextStage = getNextStage(stage)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiHistoryRef.current }),
      })

      const data = res.ok ? await res.json() : { content: getScriptedResponse(stage) }
      const botResponse = data.content || getScriptedResponse(stage)

      setIsTyping(false)
      setStage(nextStage)

      if (nextStage === 'done') {
        setCtaReady(true)
        addBotMessage(botResponse)
      } else if (nextStage === 'travellers') {
        addBotMessage(botResponse, MCQ_OPTIONS.travellers, 'travellers')
      } else if (nextStage === 'style') {
        addBotMessage(botResponse, MCQ_OPTIONS.style, 'style')
      } else if (nextStage === 'activities') {
        addBotMessage(botResponse, MCQ_OPTIONS.activities, 'activities')
      } else if (nextStage === 'budget') {
        addBotMessage(botResponse, MCQ_OPTIONS.budget, 'budget')
      } else {
        addBotMessage(botResponse)
      }
    } catch {
      setIsTyping(false)
      const nextStage = getNextStage(stage)
      setStage(nextStage)
      const response = getScriptedResponse(stage)

      if (nextStage === 'done') {
        setCtaReady(true)
        addBotMessage(response)
      } else if (nextStage === 'travellers') {
        addBotMessage(response, MCQ_OPTIONS.travellers, 'travellers')
      } else if (nextStage === 'style') {
        addBotMessage(response, MCQ_OPTIONS.style, 'style')
      } else if (nextStage === 'activities') {
        addBotMessage(response, MCQ_OPTIONS.activities, 'activities')
      } else if (nextStage === 'budget') {
        addBotMessage(response, MCQ_OPTIONS.budget, 'budget')
      } else {
        addBotMessage(response)
      }
    }
  }

  const handleBuildItinerary = () => {
    const finalPrefs: TripPreferences = {
      destinations: preferences.destinations || ['Bangkok', 'Koh Samui'],
      startDate: preferences.startDate || '2026-04-05',
      endDate: preferences.endDate || '2026-04-15',
      days: preferences.days || 10,
      travelStyle: preferences.travelStyle || 'Mid-range comfort',
      budget: preferences.budget || '฿2,000–5,000/night',
      activities: preferences.activities || ['Beach & water', 'Food & street eats'],
      travellerType: preferences.travellerType || 'Solo',
    }
    onBuildItinerary(finalPrefs)
  }

  const responseCount = messages.filter(m => m.role === 'user').length

  const hasDestination = !!(preferences.destinations?.length)
  const hasDates = !!(preferences.startDate)
  const hasTravellers = !!(preferences.travellerType)
  const canBuild = hasDestination && hasDates && hasTravellers

  const missingFields = [
    !hasDestination && '📍 Where',
    !hasDates && '📅 When',
    !hasTravellers && '👥 Who',
  ].filter(Boolean) as string[]

  return (
    <div className="flex flex-col min-h-screen bg-[#003B95]">
      {/* Top bar */}
      <div className="flex items-center gap-2.5 px-6 pt-5 pb-0">
        <div className="text-[22px] font-bold text-white tracking-tight">
          ago<span className="text-[#E22B00]">da</span>
        </div>
        <span className="text-[10px] font-medium text-white bg-white/15 px-2 py-0.5 rounded-full">
          Trip Planner Beta
        </span>
      </div>

      {/* Hero */}
      <div className="px-6 pt-7 pb-4 text-center">
        <h1 className="text-[22px] font-bold text-white leading-snug mb-2">
          Figure out the trip first.<br />Book after.
        </h1>
        <p className="text-sm text-white/70 leading-relaxed">
          Tell me where you&apos;re going and what you&apos;re into.<br />
          I&apos;ll put together something that actually makes sense.
        </p>
      </div>

      {/* Chat window */}
      <div className="flex-1 mx-4 bg-white rounded-2xl flex flex-col overflow-hidden mb-4" style={{ minHeight: 0 }}>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ maxHeight: 'calc(100vh - 340px)' }}>
          {messages.map((msg) => (
            <div key={msg.id}>
              <div className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {msg.role === 'bot' ? (
                  <img
                    src="/pete.png"
                    alt="Pete"
                    className="w-7 h-7 rounded-full shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold bg-[#E22B00] text-white">
                    J
                  </div>
                )}
                {/* Bubble */}
                <div
                  className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[82%] ${
                    msg.role === 'bot'
                      ? 'bg-[#f3f6fb] text-gray-800 rounded-tl-sm'
                      : 'bg-[#003B95] text-white rounded-tr-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>

              {/* MCQ options */}
              {msg.mcqOptions && msg.mcqGroupId && (
                <div className="mt-2 ml-9">
                  <div className="flex flex-wrap gap-1.5">
                    {msg.mcqOptions.map((opt) => {
                      const isSelected = (selectedMCQ[msg.mcqGroupId!] || []).includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleMCQSelect(msg.mcqGroupId!, opt.value)}
                          className={`text-xs px-3 py-1.5 rounded-full border-[1.5px] font-medium transition-all ${
                            isSelected
                              ? 'bg-[#003B95] text-white border-[#003B95]'
                              : 'bg-white text-[#003B95] border-[#003B95] hover:bg-[#003B95] hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                  {/* Confirm button for multi-select (activities) */}
                  {msg.mcqGroupId === 'activities' && (selectedMCQ['activities'] || []).length > 0 && stage === 'activities' && (
                    <button
                      onClick={() => sendMessage()}
                      className="mt-2 text-xs px-4 py-1.5 rounded-full bg-[#E22B00] text-white font-semibold hover:bg-[#ff4a1c] transition-colors"
                    >
                      Done →
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2 flex-row">
              <img
                src="/pete.png"
                alt="Pete"
                className="w-7 h-7 rounded-full shrink-0 object-cover"
              />
              <div className="flex items-center gap-1 px-4 py-3 bg-[#f3f6fb] rounded-2xl rounded-tl-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:200ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:400ms]" />
              </div>
            </div>
          )}

          {/* Trip summary card — shown when Pete wraps up */}
          {ctaReady && (
            <div className="flex gap-2 flex-row mt-1 mb-1">
              <img
                src="/pete.png"
                alt="Pete"
                className="w-7 h-7 rounded-full shrink-0 object-cover self-end"
              />
              <div className="flex-1 bg-[#f3f6fb] border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Got it — here&apos;s what I&apos;m working with</p>
                <div className="flex flex-wrap gap-1.5">
                  {(preferences.destinations || ['Bangkok', 'Koh Samui']).map((d) => (
                    <span key={d} className="text-xs bg-[#003B95]/10 text-[#003B95] font-semibold px-2.5 py-1 rounded-full">{d}</span>
                  ))}
                  <span className="text-xs bg-white border border-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-full">
                    {preferences.days || 10} days
                  </span>
                  <span className="text-xs bg-white border border-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-full">
                    {preferences.travelStyle || 'Mid-range'}
                  </span>
                  {(preferences.activities || []).slice(0, 2).map((a) => (
                    <span key={a} className="text-xs bg-orange-50 text-orange-700 font-medium px-2.5 py-1 rounded-full">{a}</span>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">Add anything else below, or hit the button to go.</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input — always visible */}
        <div className="px-3 py-2 border-t border-gray-100 flex gap-2 items-center relative">
          {canBuild && (
            <button
              onClick={handleBuildItinerary}
              className="absolute -top-8 right-3 bg-[#E22B00] hover:bg-[#ff4a1c] text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1 transition-all"
            >
              Build plan
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={
              stage === 'activities'
                ? 'Select activities above or type…'
                : stage === 'style'
                ? 'Select your style above or type…'
                : stage === 'budget'
                ? 'Select budget above or type…'
                : 'Type a message…'
            }
            className="flex-1 border-[1.5px] border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-[#003B95] text-gray-800 placeholder:text-gray-400"
          />
          <button
            onClick={() => sendMessage()}
            disabled={isTyping}
            className="w-[34px] h-[34px] rounded-full bg-[#003B95] hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center shrink-0 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] fill-white">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  )
}

function getNextStage(current: ConversationStage): ConversationStage {
  const order: ConversationStage[] = ['destination', 'dates', 'travellers', 'style', 'activities', 'budget', 'done']
  const idx = order.indexOf(current)
  return idx < order.length - 1 ? order[idx + 1] : 'done'
}

function getScriptedResponse(stage: ConversationStage): string {
  const responses: Record<ConversationStage, string> = {
    destination: "Oh brilliant — great combo. When are you going, and how many days are you thinking?",
    dates: "Perfect. And who's making this trip?",
    travellers: "Got it! Now — how do you usually like to travel? Are we keeping it lean, comfortable, or full send?",
    style: "Love it. Okay so — what actually matters to you on this trip? Like, what makes a day feel like a *good* day?",
    activities: "Perfect, that helps a lot. Last thing — what's your rough budget for hotels each night? No judgment, just helps me not suggest places that'll give you sticker shock.",
    budget: "Okay I've got everything I need. Genuinely excited about this one — I'm going to match hotels to each part of the trip, weave in the local stuff most people miss, and flag anything that might clash. Give me a sec.",
    done: "Right, let's build this!",
  }
  return responses[stage] || "Tell me more — I'm all ears!"
}
