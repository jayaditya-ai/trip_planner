import { NextRequest, NextResponse } from 'next/server'
import { client } from '@/lib/claude'
import { Stop } from '@/types'

const SYSTEM_PROMPT = `You are an expert Thailand travel logistics planner.
Given a journey between two cities, generate a realistic transit day as a JSON array of Stop objects.
Return ONLY a raw JSON array — no markdown, no explanation.

Each Stop in the array must have this shape:
{
  "id": string (unique, e.g. "transit-d1-checkout"),
  "type": "hotel" | "activity" | "food" | "transit" | "local-tip",
  "time": "HH:MM",
  "duration": number (minutes),
  "title": string,
  "subtitle": string,
  "price": number | null (THB),
  "currency": "THB",
  "location": string,
  "tags": string[],
  "whyChosen": null,
  "localIntel": string | null,
  "source": "system",
  "alternatives": null,
  "closingTime": null
}

Generate 2–3 stops:
1. A checkout/departure note (type: "transit")
2. The main travel leg (type: "transit") — include realistic options, duration, cost
3. An arrival/check-in note (type: "transit" or "hotel")

Include practical localIntel tips (baggage storage, transport apps, timing advice).`

const bangkokToSamuiFallback: Stop[] = [
  {
    id: `transit-fallback-checkout-${Date.now()}`,
    type: 'transit',
    time: '08:00',
    duration: 60,
    title: 'Check out & head to Suvarnabhumi Airport',
    subtitle: 'Allow 60–90 min to airport from central Bangkok',
    price: 350,
    currency: 'THB',
    location: 'Bangkok',
    tags: ['departure', 'airport'],
    whyChosen: undefined,
    localIntel: 'Use Grab or BTS Airport Rail Link (฿45). Avoid taxis in morning rush.',
    source: 'system',
    alternatives: undefined,
    closingTime: undefined,
  },
  {
    id: `transit-fallback-flight-${Date.now()}`,
    type: 'transit',
    time: '10:30',
    duration: 70,
    title: 'Bangkok (BKK) → Koh Samui (USM)',
    subtitle: 'Bangkok Airways direct flight ~1h 10min',
    price: 2800,
    currency: 'THB',
    location: 'Suvarnabhumi Airport',
    tags: ['flight', 'Bangkok Airways'],
    whyChosen: undefined,
    localIntel: 'Bangkok Airways has a free lounge for all passengers at BKK — worth arriving early.',
    source: 'system',
    alternatives: undefined,
    closingTime: undefined,
  },
  {
    id: `transit-fallback-arrival-${Date.now()}`,
    type: 'transit',
    time: '12:30',
    duration: 45,
    title: 'Arrive Koh Samui — transfer to hotel',
    subtitle: 'Taxi or hotel pickup from USM Airport',
    price: 400,
    currency: 'THB',
    location: 'Koh Samui Airport',
    tags: ['arrival', 'transfer'],
    whyChosen: undefined,
    localIntel: 'Pre-book your hotel transfer — airport taxis charge premium rates (~฿400–600 to Chaweng).',
    source: 'system',
    alternatives: undefined,
    closingTime: undefined,
  },
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fromCity, toCity, date, travelStyle } = body as {
      fromCity: string
      toCity: string
      date: string
      travelStyle: string
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey || apiKey === 'your_key_here') {
      return NextResponse.json(bangkokToSamuiFallback)
    }

    const userMessage = `Generate transit day stops from ${fromCity} to ${toCity} on ${date}.
Travel style: ${travelStyle}.
Include realistic transport options, timings, and costs in THB.
Return a JSON array of 2–3 stops covering the full journey.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json(bangkokToSamuiFallback)
    }

    let rawText = content.text.trim()
    rawText = rawText.replace(/^```json\n?/i, '').replace(/\n?```$/, '').trim()

    const stops: Stop[] = JSON.parse(rawText)
    return NextResponse.json(stops)
  } catch (error) {
    console.error('generate-transit error:', error)
    return NextResponse.json(bangkokToSamuiFallback)
  }
}
