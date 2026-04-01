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
    const { imageBase64, imageMediaType, brandName, perfumeName, contentStyle, audience, cta, videoDuration, withMusic, withNarration, videoDetails, mode, customScene, customNarratorEnabled, customNarratorText, customMusicEnabled, customMusicText } = await req.json()

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
    const isCustom = mode === 'custom'
    const hasNarration = isCustom ? !!customNarratorEnabled : withNarration
    const hasMusic = isCustom ? !!customMusicEnabled : withMusic

    const commonFields = `
  "perfumeName": "detected or inferred name",
  "brandName": "detected or inferred brand name",
  "vibeAnalysis": "2-sentence description of the perfume visual vibe and likely scent profile",
  "hook": "one powerful opening line (first 3 seconds) to stop the scroll",
  "script": {
    "hook": "${timing.hook} hook text — very short and punchy. No emojis.",
    "buildup": "${timing.buildup} buildup — build desire and atmosphere. No emojis.",
    "reveal": "${timing.reveal} reveal — what to show on screen. No emojis.",
    "cta": "${timing.cta} CTA — strong close. No emojis."
  },${hasNarration ? `
  "narrationScript": {
    "hook": "spoken words for hook (${timing.hook}). No emojis.",
    "buildup": "spoken narration for buildup (${timing.buildup}). No emojis.",
    "reveal": "spoken words for reveal (${timing.reveal}). No emojis.",
    "cta": "spoken call-to-action (${timing.cta}). No emojis."
  },` : ''}${hasMusic ? `
  "musicSuggestion": "background music: genre, mood, BPM, energy, 1–2 artist/track examples",` : ''}
  "caption": "full TikTok caption (2–4 sentences)",
  "hashtags": ["15", "relevant", "hashtags", "no", "hash", "symbol"],
  "tips": ["filming tip 1", "filming tip 2", "filming tip 3"]`

    const aiJsonSchema = `{${commonFields},
  "videoPrompt": "cinematic image-to-video prompt, max 180 chars: camera motion + lighting + atmosphere only",
  "videoScenes": {
    "hook": "visual action for ${timing.hook}, max 55 chars, no spoken text",
    "buildup": "visual action for ${timing.buildup}, max 65 chars, no spoken text",
    "reveal": "visual action for ${timing.reveal}, max 65 chars, no spoken text",
    "cta": "final frame for ${timing.cta}, max 45 chars, no spoken text"
  }
}`

    const customJsonSchema = `{${commonFields},
  "videoPrompt": "Elaborate the creator's rough concept into a detailed cinematic AI video prompt (max 600 chars). Expand with: specific camera movements, lighting details, textures, atmosphere, and explicit product integrity rules (label always visible, no shape distortion, etc). Hyper-realistic, high-end commercial quality. Do NOT include timing labels.",
  "negativePrompt": "comma-separated list of things to avoid: distortions, flickering, blurry text, shape changes, quality issues — max 150 chars",
  "videoScenes": {
    "hook": "visual action for ${timing.hook}, max 55 chars, no spoken text",
    "buildup": "visual action for ${timing.buildup}, max 65 chars, no spoken text",
    "reveal": "visual action for ${timing.reveal}, max 65 chars, no spoken text",
    "cta": "final frame for ${timing.cta}, max 45 chars, no spoken text"
  }
}`

    const sharedImportant = `IMPORTANT: script and narrationScript must be plain text only — no emojis.
IMPORTANT: narrationScript total words across all 4 segments must not exceed ${Math.round(dur * 2.5)} words (${dur}s video at 2.5 words/sec).
Return ONLY a valid JSON object — no markdown, no backticks, no extra text.`

    const prompt = isCustom
      ? `You are an expert AI video prompt engineer and TikTok content creator specializing in luxury perfume.

The creator has a rough vision — your job is to elaborate it into a polished cinematic AI video prompt while generating the full content package.

Brand: ${brandName || 'infer from image'}
Perfume: ${perfumeName || 'infer from image'}
Video duration: ${dur} seconds
Creator's concept: "${customScene}"${customNarratorEnabled ? (customNarratorText ? `\nNarrator style/lines: "${customNarratorText}"` : '\nNarrator: auto-generate to match the concept') : ''}${customMusicEnabled ? (customMusicText ? `\nMusic preference: "${customMusicText}"` : '\nMusic: auto-generate a fitting suggestion') : ''}

${sharedImportant}

${customJsonSchema}`
      : `You are an expert TikTok content creator specializing in luxury perfume and fragrance brands.

Analyze this perfume image and create a complete TikTok content package.

Brand: ${brandName || 'Unknown — infer from packaging'}
Perfume: ${perfumeName || 'Unknown — infer from packaging'}
Style: ${STYLE_MAP[contentStyle] || STYLE_MAP.luxury}
Audience: ${AUD_MAP[audience] || AUD_MAP.general}
CTA: ${CTA_MAP[cta] || CTA_MAP.shop}
Duration: ${dur} seconds${videoDetails ? `\nExtra details: ${videoDetails}` : ''}

${sharedImportant}

${aiJsonSchema}`

    const body = JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
          { type: 'text', text: prompt },
        ],
      }],
    })

    const fetchClaude = () => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body,
    })

    let response = await fetchClaude()
    for (let attempt = 1; attempt <= 3 && response.status === 529; attempt++) {
      await new Promise(r => setTimeout(r, attempt * 8000))
      response = await fetchClaude()
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = (err as { error?: { message?: string } }).error?.message || `Anthropic API error ${response.status}`
      return NextResponse.json({ error: response.status === 529 ? 'Claude is overloaded — please try again in a moment.' : msg }, { status: 500 })
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
