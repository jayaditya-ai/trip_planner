import { NextRequest, NextResponse } from 'next/server'
import { client } from '@/lib/claude'

const SYSTEM_PROMPT = `You are a trip planning assistant with deep knowledge of Thailand. Your name is not important — what matters is your personality: you're warm, genuinely enthusiastic, and you talk like a real person, not a company. Think of a knowledgeable friend who's been to Thailand many times and genuinely loves helping people have great trips.

You ask one focused question at a time. You share useful context naturally — not as a list, just woven into conversation.

The conversation flow:
1. Ask where they want to go
2. Ask when and how many days
3. Note any seasonal context (Songkran in April, monsoon June-Oct) and ask travel style
4. Ask what kind of activities actually make a trip feel good to them
5. Ask about hotel budget (no judgment framing)
6. Summarise warmly and say you're ready to build the itinerary

Tone rules:
- Talk like a person texting a friend, not a brand talking to a customer
- Short responses — 1-2 sentences max
- Use casual contractions, the occasional "oh" or "actually" or "heads up"
- No bullet points, no bold, no markdown — plain conversational text only
- Don't say "Great choice!" or "Absolutely!" or "Of course!" — avoid hollow affirmations
- When you have destination, dates, travel style, activities, and budget — end your message with: "Ready to build your itinerary?"`

const SCRIPTED_RESPONSES = [
  "Oh brilliant — great combo. When are you going, and how many days do you have?",
  "Ooh, April — heads up, that's Songkran. Bangkok goes absolutely wild with water fights, it's either the best or most chaotic thing depending on your vibe. How do you usually travel — budget, comfortable, or full send?",
  "Love it. What actually makes a day feel like a good day on a trip? Like what do you gravitate towards?",
  "That helps a lot. Last thing — rough budget for hotels each night? No judgment, just don't want to suggest places that'll give you sticker shock.",
  "Okay I've got everything I need. Genuinely excited about this one — I'm going to match hotels to each part of the trip, weave in the stuff most people miss, and flag anything that might clash. Ready to build your itinerary?",
]

export async function POST(req: NextRequest) {
  let messages: { role: string; content: string }[] = []

  try {
    const body = await req.json()
    messages = body.messages || []

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey || apiKey === 'your_key_here') {
      const count = messages.filter((m) => m.role === 'user').length
      return NextResponse.json({
        content: SCRIPTED_RESPONSES[Math.min(count - 1, SCRIPTED_RESPONSES.length - 1)] || SCRIPTED_RESPONSES[0],
      })
    }

    const claudeMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: claudeMessages,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ content: "Tell me more about your trip plans!" })
    }

    return NextResponse.json({ content: content.text })
  } catch (error) {
    console.error('chat error:', error)
    const count = messages.filter((m) => m.role === 'user').length
    return NextResponse.json({
      content: SCRIPTED_RESPONSES[Math.min(count - 1, SCRIPTED_RESPONSES.length - 1)] || SCRIPTED_RESPONSES[0],
    })
  }
}
