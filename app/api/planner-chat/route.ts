import { NextRequest, NextResponse } from 'next/server'
import { client } from '@/lib/claude'
import { Trip } from '@/types'

const FALLBACK_RESPONSES = [
  "Looking at your itinerary — Day 3 with the Grand Palace and floating market is going to be a long one. You might want to flip the order if you're coming from Silom.",
  "One thing to flag: Songkran hits right when you're in Bangkok on April 13. The streets around Silom go wild — pack a waterproof bag for anything electronic.",
  "The ferry from Surat Thani to Koh Samui is about 2 hours. Bangkok Airways also flies direct from Suvarnabhumi — worth it for the time saved on a mid-range trip.",
  "Happy to help! What specifically would you like to know or change?",
]

export async function POST(req: NextRequest) {
  let messages: { role: 'user' | 'assistant'; content: string }[] = []
  let trip: Trip | null = null

  try {
    const body = await req.json()
    messages = body.messages || []
    trip = body.trip || null

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey || apiKey === 'your_key_here') {
      const count = messages.filter((m) => m.role === 'user').length
      return NextResponse.json({
        content: FALLBACK_RESPONSES[Math.min(count - 1, FALLBACK_RESPONSES.length - 1)] ?? FALLBACK_RESPONSES[0],
      })
    }

    const tripContext = trip
      ? `\n\nHere is the user's current itinerary:\n${JSON.stringify(trip, null, 2)}`
      : ''

    const systemPrompt = `You are Pete, a knowledgeable and friendly trip planning assistant. The user has already built their itinerary and is now viewing it in the planner.${tripContext}

Your role: help them tweak stops, suggest alternatives, answer questions about destinations, give local tips, or flag potential issues.

Tone rules:
- Talk like a person texting a friend, not a brand
- Short responses — 2-3 sentences max unless they ask for detail
- No bullet points, no bold, no markdown — plain conversational text only
- Don't say "Great choice!" or "Absolutely!" — avoid hollow affirmations
- Be specific to THEIR trip — reference actual stop names, dates, cities from the itinerary`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: systemPrompt,
      messages,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ content: "Tell me what you'd like to change!" })
    }

    return NextResponse.json({ content: content.text })
  } catch (error) {
    console.error('planner-chat error:', error)
    const count = messages.filter((m) => m.role === 'user').length
    return NextResponse.json({
      content: FALLBACK_RESPONSES[Math.min(count - 1, FALLBACK_RESPONSES.length - 1)] ?? FALLBACK_RESPONSES[0],
    })
  }
}
