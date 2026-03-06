import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageMediaType, brandName, perfumeName, contentStyle, audience, cta } = await req.json()

    const STYLE_MAP: Record<string, string> = {
      luxury: 'luxury, aspirational, elegant, cinematic',
      trendy: 'trendy, Gen-Z, bold, fast-paced, slang-forward',
      romantic: 'romantic, sensual, poetic, slow-burn',
      storytelling: 'narrative-driven, personal, emotional story',
      educational: 'educational, informative about fragrance notes and ingredients',
    }

    const AUD_MAP: Record<string, string> = {
      general: 'general fragrance enthusiasts',
      genz: 'Gen Z (18–25 year olds)',
      millennials: 'millennials (26–40 year olds)',
      luxury: 'luxury shoppers who appreciate premium products',
      gifters: 'people looking to buy a gift',
    }

    const CTA_MAP: Record<string, string> = {
      shop: 'Shop Now',
      link: 'Link in Bio',
      dm: 'DM to Order',
      save: 'Save for Later',
      none: 'none',
    }

    const prompt = `You are an expert TikTok content creator specializing in luxury perfume and fragrance brands.

Analyze this perfume image and create a complete TikTok content package.

Context:
- Brand name: ${brandName || 'Unknown — infer from packaging if visible'}
- Perfume name: ${perfumeName || 'Unknown — infer from the bottle/packaging if visible'}
- Content style: ${STYLE_MAP[contentStyle] || STYLE_MAP.luxury}
- Target audience: ${AUD_MAP[audience] || AUD_MAP.general}
- Call to action: ${CTA_MAP[cta] || CTA_MAP.shop}

Return ONLY a valid JSON object (no markdown, no backticks, no extra text) with this exact structure:
{
  "perfumeName": "detected or inferred name",
  "brandName": "detected or inferred brand name",
  "vibeAnalysis": "2-sentence description of the perfume visual vibe and likely scent profile",
  "hook": "one powerful opening line (first 3 seconds) to stop the scroll",
  "script": {
    "hook": "0–3 sec hook text (spoken/on-screen)",
    "buildup": "3–15 sec buildup narration",
    "reveal": "15–25 sec product reveal description with what to show",
    "cta": "25–30 sec CTA text"
  },
  "caption": "full TikTok caption (2–4 sentences, engaging, matches the style)",
  "hashtags": ["15", "relevant", "hashtags", "without", "the", "hash", "symbol"],
  "tips": ["specific filming tip 1", "specific filming tip 2", "specific filming tip 3"],
  "videoPrompt": "a detailed Runway ML image-to-video prompt (max 400 chars) describing a cinematic product video of this perfume bottle. Describe camera motion, lighting, atmosphere. Style: ${STYLE_MAP[contentStyle] || STYLE_MAP.luxury}"
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
