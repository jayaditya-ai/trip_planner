'use client'

import { useState } from 'react'
import ChatOnboarding from '@/components/ChatOnboarding'
import PlannerScreen from '@/components/PlannerScreen'
import { TripPreferences, Trip } from '@/types'
import { seedTrip } from '@/lib/seedData'

type AppScreen = 'chat' | 'loading' | 'planner'

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>('chat')
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loadingMsg, setLoadingMsg] = useState('')

  const handleBuildItinerary = async (preferences: TripPreferences) => {
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
    return <PlannerScreen trip={trip} onBack={handleBackToChat} />
  }

  return <ChatOnboarding onBuildItinerary={handleBuildItinerary} />
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
