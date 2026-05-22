import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const {
      imageBase64,
      imageMediaType,
      brandName,
      perfumeName,
      gender,
      videoDuration,
      customScene,
    } = await req.json()

    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
    if (!imageBase64 || !imageMediaType) throw new Error('Missing image')

    const brand = (brandName || '').trim()
    const perfume = (perfumeName || '').trim()
    const gen = (gender || 'unisex').trim()
    const dur = parseInt(videoDuration) || 8
    const scene = (customScene || '').trim()

    const productLabel = [brand, perfume].filter(Boolean).join(' — ') || 'the perfume on the bottle'

    const sceneLine = scene
      ? `Scene the creator wants: "${scene}"`
      : 'The creator has no scene preference — invent a compelling cinematic concept that fits the perfume.'

    const prompt = `Create AI Prompt.
I want a cinematic video for my perfume brand ${productLabel} for ${gen}.
The video should be ${dur} seconds and the cinematic should not be related to the image background.
I need positive prompt, negative prompt and a prompt for an image that will be the first frame of the video.
${sceneLine}

Guidelines:
- positivePrompt: detailed cinematic image-to-video prompt describing camera motion, lighting, atmosphere, action and mood. Max 600 chars. Hyper-realistic, high-end commercial quality. Keep product integrity (label visible, no shape distortion).
- negativePrompt: comma-separated things to avoid (distortions, flickering, blurry text, shape changes, watermarks, extra fingers, low quality). Max 200 chars.
- firstFramePrompt: a prompt for an image generator that edits the uploaded perfume bottle photo into the opening frame of the video. Describe the new background, lighting, props, mood — but instruct that the perfume bottle itself must remain identical to the reference (same shape, label, proportions). Max 500 chars.

Return ONLY a valid JSON object — no markdown, no backticks, no commentary:
{"positivePrompt": "...", "negativePrompt": "...", "firstFramePrompt": "..."}`

    const body = JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1200,
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
      return NextResponse.json(
        { error: response.status === 529 ? 'Claude is overloaded — please try again in a moment.' : msg },
        { status: 500 },
      )
    }

    const data = await response.json()
    const raw = data.content.map((i: { text?: string }) => i.text || '').join('')
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    if (!parsed.positivePrompt || !parsed.negativePrompt || !parsed.firstFramePrompt) {
      throw new Error('Claude returned incomplete prompts')
    }

    return NextResponse.json({
      positivePrompt: String(parsed.positivePrompt),
      negativePrompt: String(parsed.negativePrompt),
      firstFramePrompt: String(parsed.firstFramePrompt),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
