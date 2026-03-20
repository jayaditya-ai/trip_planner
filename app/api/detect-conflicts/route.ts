import { NextRequest, NextResponse } from 'next/server'
import { client } from '@/lib/claude'
import { Stop, SoftConflict } from '@/types'

const SYSTEM_PROMPT = `You are a Thailand travel expert analyzing a day's itinerary for soft conflicts and suboptimal planning.

Analyze the provided stops and return ONLY a JSON array of soft conflict warnings. Return an empty array [] if no issues found.

Each conflict object:
{
  "type": "crowd" | "seasonal" | "logical-flow" | "timing",
  "stopIds": string[] (IDs of affected stops),
  "message": string (specific, actionable warning — 1-2 sentences),
  "severity": "warning"
}

Look for:
- crowd: visiting popular sites during peak hours (temples 10am-2pm, markets midday, etc.)
- seasonal: April = Songkran festival, extreme heat 12-16h, things to be aware of
- logical-flow: inefficient routing (going to north then south then north), awkward transitions
- timing: things that are technically possible but impractical (rushed meals, back-to-back intense activities, jet lag on arrival day)

Rules:
1. Return ONLY a JSON array, no markdown, no explanation
2. Be specific — reference the actual stop names and times
3. Only flag genuine issues, not minor things
4. Maximum 3-4 conflicts per day
5. Make messages helpful and actionable`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const stops: Stop[] = body.stops
    const date: string = body.date
    const city: string = body.city

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey || apiKey === 'your_key_here') {
      // Return demo soft conflicts for seed data day 1
      return NextResponse.json([
        {
          type: 'timing',
          stopIds: ['d1-activity-1'],
          message: 'Lumpini Park closes at 21:00. Your dinner at 18:00 ends around 19:30, leaving only ~90 min at the park before closing.',
          severity: 'warning',
        },
      ] satisfies SoftConflict[])
    }

    const stopsText = stops
      .filter(s => s.time)
      .map(s => `[${s.id}] ${s.time} — ${s.title} (${s.duration}min, ${s.location || 'N/A'}${s.closingTime ? `, closes ${s.closingTime}` : ''})`)
      .join('\n')

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this day's stops for soft conflicts:\nDate: ${date}\nCity: ${city}\n\nStops:\n${stopsText}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json([])
    }

    let rawText = content.text.trim()
    rawText = rawText.replace(/^```json\n?/i, '').replace(/\n?```$/, '').trim()

    const conflicts = JSON.parse(rawText)
    return NextResponse.json(Array.isArray(conflicts) ? conflicts : [])
  } catch (error) {
    console.error('detect-conflicts error:', error)
    return NextResponse.json([])
  }
}
