import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { images, brandName, perfumeName, gender, parfumType, customScene, aspectRatio } = await req.json()

    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
    if (!images || !images.length) throw new Error('Missing images')

    const brand = (brandName || '').trim()
    const perfume = (perfumeName || '').trim()
    const gen = (gender || 'unisex').trim()
    const type = (parfumType || 'PARFUM').trim().toUpperCase()
    const productLabel = [brand, perfume].filter(Boolean).join(' — ') || 'the perfume on the bottle'
    const labelText = [brand, perfume, type].filter(Boolean).join(' · ')
    const scene = (customScene || '').trim()
    const aspect = aspectRatio || '1:1'
    const bottleCount = images.length

    const sceneLine = scene
      ? `Scene the creator wants: "${scene}"`
      : 'The creator has no scene preference — invent a compelling editorial-style commercial concept: a specific real-world location with luxury mood (e.g. "sun-drenched marble countertop in a Capri villa" or "mist-covered black granite surface at dawn"). Be concrete, not abstract.'

    const bottleNote = bottleCount > 1
      ? `All ${bottleCount} bottles must appear in the composition — arranged together in the foreground, all fully visible.`
      : 'The bottle is the single hero subject, centered in the foreground.'

    const content: unknown[] = images.map(
      (img: { base64: string; mediaType: string }) => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
      })
    )

    content.push({
      type: 'text',
      text: `Create a single image editing prompt for a perfume ad.

Product: ${productLabel} for ${gen}
Label text: "${labelText}"
Output aspect ratio: ${aspect}
${sceneLine}

CRITICAL RULES:
1. BOTTLE PRESERVATION: Every bottle's cap shape, silhouette, glass color, label position, and every letter must remain pixel-identical to the reference. Phrase the prompt as a BACKGROUND REPLACEMENT — never imply redrawing the bottle.
2. COMPOSITION: ${bottleNote} Background is the scene. No cropping — full bottle visible from base to cap tip.
3. PHOTOREALISM: Must read as a real high-end commercial photograph. Use anchors: "product photography", "shot on medium format camera", "natural light", "real location". No CGI, no 3D render.
4. LABEL: Reference the exact label text "${labelText}". Every letter stays sharp.

Write the adPrompt as a direct editing instruction starting with "Change the background to [scene]". Keep it 200–400 characters. End with a label-lock sentence.

Return ONLY valid JSON: {"adPrompt": "..."} — no markdown, no backticks, no commentary.`,
    })

    const body = JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content }],
    })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = (err as { error?: { message?: string } }).error?.message || `Anthropic API error ${response.status}`
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.content.map((i: { text?: string }) => i.text || '').join('')
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    if (!parsed.adPrompt) throw new Error('Claude returned an incomplete prompt')

    return NextResponse.json({ adPrompt: String(parsed.adPrompt) })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
