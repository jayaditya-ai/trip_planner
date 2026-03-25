'use client'

import { useState, useRef, useEffect } from 'react'
import { Trip } from '@/types'

interface Message {
  id: string
  role: 'user' | 'bot'
  content: string
}

interface Props {
  trip: Trip
}

const INITIAL_MESSAGE =
  "Hey! I can see your itinerary — ask me anything about it. Want to swap something out, add a stop, or just get some local tips?"

export default function PlannerChatWidget({ trip }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: 'bot-0', role: 'bot', content: INITIAL_MESSAGE },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const apiHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: INITIAL_MESSAGE },
  ])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isTyping) return

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
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
      setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: 'bot', content: botText }])
    } catch {
      const fallback = "Sorry, I lost the thread — ask me again!"
      apiHistoryRef.current.push({ role: 'assistant', content: fallback })
      setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: 'bot', content: fallback }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 no-print">
      {/* Chat panel */}
      {open && (
        <div
          className="w-[340px] bg-[#1a1f2e] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10"
          style={{ height: '460px' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10 shrink-0">
            <img src="/pete.png" alt="Pete" className="w-8 h-8 rounded-full object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">Pete</div>
              <div className="text-[10px] text-white/50">Trip Assistant · {trip.name}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors text-xs"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 scrollbar-hide">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.role === 'bot' ? (
                  <img
                    src="/pete.png"
                    alt="Pete"
                    className="w-6 h-6 rounded-full shrink-0 object-cover self-end"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold bg-[#E22B00] text-white self-end">
                    J
                  </div>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed max-w-[80%] ${
                    msg.role === 'bot'
                      ? 'bg-white/10 text-white/90 rounded-tl-sm'
                      : 'bg-[#003B95] text-white rounded-tr-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-2">
                <img
                  src="/pete.png"
                  alt="Pete"
                  className="w-6 h-6 rounded-full shrink-0 object-cover"
                />
                <div className="flex items-center gap-1 px-3 py-2.5 bg-white/10 rounded-2xl rounded-tl-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-white/10 flex gap-2 items-center shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about your trip…"
              className="flex-1 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
            />
            <button
              onClick={sendMessage}
              disabled={isTyping || !input.trim()}
              className="w-8 h-8 rounded-full bg-[#003B95] hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center shrink-0 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Close chat' : 'Ask Pete'}
        className="relative w-14 h-14 rounded-full shadow-xl hover:scale-105 transition-transform overflow-hidden border-2 border-white/20"
      >
        <img src="/pete.png" alt="Ask Pete" className="w-full h-full object-cover" />
        {/* Unread dot — only when closed */}
        {!open && (
          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#E22B00] rounded-full border-2 border-white" />
        )}
      </button>
    </div>
  )
}
