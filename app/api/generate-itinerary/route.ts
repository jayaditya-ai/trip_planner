import { NextRequest, NextResponse } from 'next/server'
import { client } from '@/lib/claude'
import { seedTrip } from '@/lib/seedData'
import { TripPreferences } from '@/types'

const SYSTEM_PROMPT = `You are an expert Thailand travel planner for Agoda. Generate a detailed trip itinerary as a JSON object.

Return ONLY valid JSON matching this exact TypeScript interface — no markdown, no explanation, just raw JSON:

{
  "id": string,
  "name": string,
  "currency": "THB",
  "estimatedTotal": number,
  "seasonalNote": string | null,
  "preferences": TripPreferences,
  "days": Day[]
}

Where Day has:
{
  "dayNumber": number,
  "date": "YYYY-MM-DD",
  "label": string (short, catchy day label),
  "status": "full" | "partial" | "empty",
  "city": string,
  "stops": Stop[]
}

Where Stop has:
{
  "id": string (unique, e.g. "d1-hotel-1"),
  "type": "hotel" | "activity" | "food" | "transit" | "local-tip",
  "time": "HH:MM",
  "duration": number (minutes),
  "title": string,
  "subtitle": string,
  "price": number | null (THB),
  "currency": "THB",
  "location": string,
  "tags": string[],
  "whyChosen": string | null (for hotels and food: explain why this was chosen based on preferences),
  "localIntel": string | null (insider tip, specific and actionable),
  "source": "system",
  "alternatives": AlternativeOption[] | null (for hotel stops: provide exactly 3 alternatives),
  "closingTime": "HH:MM" | null (for venues with closing times)
}

Where AlternativeOption has:
{
  "id": string,
  "name": string,
  "price": number (THB per night for hotels),
  "reason": string (brief, honest trade-off)
}

Critical rules:
1. Return ONLY the JSON object, nothing else
2. All stops must have realistic Thailand data
3. Set source: "system" for all stops
4. Include whyChosen for all hotel and food stops — reference the traveler's stated preferences
5. Include localIntel for at least half of stops — make it specific and actionable (prices, names, insider knowledge)
6. Pre-fill alternatives array for ALL hotel stops with exactly 3 alternatives
7. Set closingTime for venues that have one (parks, temples, restaurants, markets)
8. Avoid scheduling conflicts: check that stop.time + stop.duration doesn't overlap with next stop's time
9. Include transit stops between locations more than 15 min apart
10. If traveling in April, include Songkran festival context
11. Generate days covering the full trip duration
12. Set day status: "full" if 4+ stops, "partial" if 2-3 stops, "empty" if 0-1 stops
13. estimatedTotal should be realistic sum of all priced stops
14. Include seasonalNote if relevant (Songkran in April, monsoon season etc.)`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const preferences: TripPreferences = body.preferences

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey || apiKey === 'your_key_here') {
      return NextResponse.json(seedTrip)
    }

    const userMessage = `Generate a ${preferences.days}-day Thailand itinerary with these preferences:
- Destinations: ${preferences.destinations.join(', ')}
- Dates: ${preferences.startDate} to ${preferences.endDate}
- Travel style: ${preferences.travelStyle}
- Budget: ${preferences.budget} per night for hotels
- Activities of interest: ${preferences.activities.join(', ')}
- Traveller type: ${preferences.travellerType}

Generate a complete itinerary for all ${preferences.days} days. Make it feel like a real, thoughtful plan from someone who knows Thailand deeply.`

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json(seedTrip)
    }

    let rawText = content.text.trim()
    // Strip markdown code blocks if Claude added them
    rawText = rawText.replace(/^```json\n?/i, '').replace(/\n?```$/, '').trim()

    const trip = JSON.parse(rawText)
    return NextResponse.json(trip)
  } catch (error) {
    console.error('generate-itinerary error:', error)
    return NextResponse.json(seedTrip)
  }
}
