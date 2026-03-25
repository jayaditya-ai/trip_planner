'use client'

import { useState, useEffect } from 'react'
import ChatOnboarding from '@/components/ChatOnboarding'
import PlannerScreen from '@/components/PlannerScreen'
import { TripPreferences, Trip, ChatMessage } from '@/types'
import { seedTrip } from '@/lib/seedData'

type AppScreen = 'chat' | 'loading' | 'planner'

const LS_TRIP_KEY = 'trip_planner_trip'
const LS_SCREEN_KEY = 'trip_planner_screen'

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>('chat')
  const [trip, setTrip] = useState<Trip | null>(null)
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatDisplayMessages, setChatDisplayMessages] = useState<ChatMessage[]>([])
  const [loadingMsg, setLoadingMsg] = useState('')
  const [hydrated, setHydrated] = useState(false)

  // On mount: check URL param first, then localStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const encoded = params.get('trip')
      if (encoded) {
        const decoded = decodeURIComponent(escape(atob(encoded)))
        const restored = JSON.parse(decoded) as Trip
        setTrip(restored)
        setScreen('planner')
        setHydrated(true)
        return
      }
    } catch {
      // invalid URL param — fall through to localStorage
    }

    try {
      const savedScreen = localStorage.getItem(LS_SCREEN_KEY) as AppScreen | null
      const savedTrip = localStorage.getItem(LS_TRIP_KEY)
      if (savedTrip) {
        const parsedTrip = JSON.parse(savedTrip) as Trip
        setTrip(parsedTrip)
        if (savedScreen === 'planner') {
          setScreen('planner')
        }
      }
    } catch {
      // invalid localStorage data — start fresh
    }

    setHydrated(true)
  }, [])

  // Persist screen changes
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(LS_SCREEN_KEY, screen)
    } catch {
      // storage may be unavailable
    }
  }, [screen, hydrated])

  // Persist trip changes
  useEffect(() => {
    if (!hydrated) return
    try {
      if (trip) {
        localStorage.setItem(LS_TRIP_KEY, JSON.stringify(trip))
      } else {
        localStorage.removeItem(LS_TRIP_KEY)
      }
    } catch {
      // storage may be unavailable
    }
  }, [trip, hydrated])

  const handleBuildItinerary = async (preferences: TripPreferences, history: { role: 'user' | 'assistant'; content: string }[] = [], displayMessages: ChatMessage[] = []) => {
    setChatHistory(history)
    setChatDisplayMessages(displayMessages)
    setScreen('loading')
    setLoadingMsg('Analysing your preferences…')

    try {
      await delay(800)
      setLoadingMsg('Matching hotels to each zone…')
      await delay(700)
      setLoadingMsg('Adding local intel and activities…')

      const res = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      })

      setLoadingMsg('Checking for conflicts…')
      await delay(500)

      if (res.ok) {
        const data = await res.json()
        setTrip(data)
      } else {
        setTrip(seedTrip)
      }

      setScreen('planner')
    } catch {
      setTrip(seedTrip)
      setScreen('planner')
    }
  }

  const handleBackToChat = () => {
    setScreen('chat')
    setTrip(null)
  }

  const handleNewTrip = () => {
    try {
      localStorage.removeItem(LS_TRIP_KEY)
      localStorage.removeItem(LS_SCREEN_KEY)
    } catch {
      // ignore
    }
    // Clear trip param from URL without reload
    const url = new URL(window.location.href)
    url.searchParams.delete('trip')
    window.history.replaceState({}, '', url.toString())
    setTrip(null)
    setScreen('chat')
  }

  const handleUpdateTrip = (updatedTrip: Trip) => {
    setTrip(updatedTrip)
  }

  // Don't render anything until we've checked localStorage (avoids hydration flash)
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#003B95] flex items-center justify-center">
        <div className="text-[22px] font-bold text-white tracking-tight">
          ago<span className="text-[#E22B00]">da</span>
        </div>
      </div>
    )
  }

  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-[#003B95] flex flex-col items-center justify-center gap-6">
        <div className="text-[22px] font-bold text-white tracking-tight">
          ago<span className="text-[#E22B00]">da</span>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <span
              className="w-3 h-3 rounded-full bg-white/60 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-3 h-3 rounded-full bg-white/60 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-3 h-3 rounded-full bg-white/60 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <p className="text-white/80 text-sm font-medium">{loadingMsg}</p>
        </div>
        <p className="text-white/40 text-xs mt-4 max-w-xs text-center">
          Crafting your perfect Thailand itinerary with hotels, activities, and local intel.
        </p>
      </div>
    )
  }

  if (screen === 'planner' && trip) {
    return (
      <PlannerScreen
        trip={trip}
        onBack={handleBackToChat}
        onUpdateTrip={handleUpdateTrip}
        onNewTrip={handleNewTrip}
        chatHistory={chatHistory}
        chatDisplayMessages={chatDisplayMessages}
      />
    )
  }

  return <ChatOnboarding onBuildItinerary={handleBuildItinerary} />
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
