import { NextRequest, NextResponse } from 'next/server'

function getScriptTiming(duration: number) {
  if (duration <= 5) {
    return { hook: '0–1s', buildup: '1–3s', reveal: '3–4s', cta: '4–5s' }
  } else if (duration <= 8) {
    return { hook: '0–2s', buildup: '2–5s', reveal: '5–7s', cta: '7–8s' }
  } else if (duration <= 10) {
    return { hook: '0–2s', buildup: '2–6s', reveal: '6–9s', cta: '9–10s' }
  } else {
    return { hook: '0–3s', buildup: '3–15s', reveal: '15–25s', cta: '25–30s' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageMediaType, brandName, perfumeName, contentStyle, audience, cta, videoDuration, withMusic, withNarration, videoDetails } = await req.json()

    const STYLE_MAP: Record<string, string> = {
      luxury: 'luxury, aspirational, elegant, cinematic',
      trendy: 'trendy, Gen-Z, bold, fast-paced, slang-forward',
      romantic: 'romantic, sensual, poetic, slow-burn',
      storytelling: 'narrative-driven, personal, emotional story',
      educational: 'educational, informative about fragrance notes and ingredients',
      minimalist: 'clean, minimal, modern, white-space aesthetic — less is more',
      asmr: 'ASMR close-up, satisfying textures, soft whispered narration, highly sensory',
      humor: 'humorous, relatable, self-deprecating comedy, light-hearted tone',
      bold: 'bold, hype, high-energy, statement-making, street-culture aesthetic',
      comparison: 'comparison-style "smells like..." or "dupe of..." framing, value-driven',
    }

    const AUD_MAP: Record<string, string> = {
      general: 'general fragrance enthusiasts',
      genz: 'Gen Z (18–25 year olds)',
      millennials: 'millennials (26–40 year olds)',
      luxury: 'luxury shoppers who appreciate premium products',
      gifters: 'people looking to buy a gift',
      men: 'men who wear fragrances (35–55 year olds)',
      collectors: 'niche fragrance collectors and enthusiasts',
      budget: 'budget-conscious shoppers looking for the best value',
      wellness: 'wellness and clean beauty enthusiasts',
      professional: 'office professionals looking for a daily signature scent',
    }

    const CTA_MAP: Record<string, string> = {
      shop: 'Shop Now',
      link: 'Link in Bio',
      dm: 'DM to Order',
      save: 'Save for Later',
      none: 'none',
    }

    const dur = parseInt(videoDuration) || 10
    const timing = getScriptTiming(dur)

    const prompt = `You are an expert TikTok content creator specializing in luxury perfume and fragrance brands.

Analyze this perfume image and create a complete TikTok content package.

Context:
- Brand name: ${brandName || 'Unknown — infer from packaging if visible'}
- Perfume name: ${perfumeName || 'Unknown — infer from the bottle/packaging if visible'}
- Content style: ${STYLE_MAP[contentStyle] || STYLE_MAP.luxury}
- Target audience: ${AUD_MAP[audience] || AUD_MAP.general}
- Call to action: ${CTA_MAP[cta] || CTA_MAP.shop}
- Video duration: ${dur <= 10 ? dur + ' seconds' : '30 seconds (3-clip format)'}${videoDetails ? `\n- Additional details from creator: ${videoDetails}` : ''}

IMPORTANT: The "script" and "narrationScript" fields must contain plain text only — absolutely no emojis.

Return ONLY a valid JSON object (no markdown, no backticks, no extra text) with this exact structure:
{
  "perfumeName": "detected or inferred name",
  "brandName": "detected or inferred brand name",
  "vibeAnalysis": "2-sentence description of the perfume visual vibe and likely scent profile",
  "hook": "one powerful opening line (first 3 seconds) to stop the scroll",
  "script": {
    "hook": "${timing.hook} hook text (spoken/on-screen) — keep it very short and punchy. No emojis.",
    "buildup": "${timing.buildup} buildup narration — build desire and atmosphere. No emojis.",
    "reveal": "${timing.reveal} product reveal — describe what to show on screen. No emojis.",
    "cta": "${timing.cta} CTA text — strong close. No emojis."
  },${withNarration ? `
  "narrationScript": {
    "hook": "exact words to speak aloud for the hook (${timing.hook}). No emojis.",
    "buildup": "exact spoken narration for buildup (${timing.buildup}). No emojis.",
    "reveal": "exact spoken words for the reveal (${timing.reveal}). No emojis.",
    "cta": "exact spoken call-to-action (${timing.cta}). No emojis."
  },` : ''}${withMusic ? `
  "musicSuggestion": "specific background music recommendation: genre, mood, tempo (BPM), energy level, and 1–2 example artist/track styles that would match this video perfectly",` : ''}
  "caption": "full TikTok caption (2–4 sentences, engaging, matches the style)",
  "hashtags": ["15", "relevant", "hashtags", "without", "the", "hash", "symbol"],
  "tips": ["specific filming tip 1", "specific filming tip 2", "specific filming tip 3"],
  "videoPrompt": "a detailed Runway ML image-to-video prompt (max 400 chars) describing a cinematic product video of this perfume bottle. Describe camera motion, lighting, atmosphere. Style: ${STYLE_MAP[contentStyle] || STYLE_MAP.luxury}",
  "videoScenes": {
    "hook": "${timing.hook} — purely visual/cinematic description: what camera movement, lighting effect, or shot to open with. No spoken text. Max 80 chars.",
    "buildup": "${timing.buildup} — purely visual: how the camera moves, what the light does, what surfaces or textures to show. No spoken text. Max 100 chars.",
    "reveal": "${timing.reveal} — purely visual: the hero product shot, angle, light refraction, atmospheric detail. No spoken text. Max 100 chars.",
    "cta": "${timing.cta} — purely visual: final frame composition, hold shot, fade or cut style. No spoken text. Max 60 chars."
  }
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json({ error: err.error?.message || 'Anthropic API error' }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.content.map((i: { text?: string }) => i.text || '').join('')
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
