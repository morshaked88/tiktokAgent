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
      parfumType,
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

    const type = (parfumType || 'PARFUM').trim().toUpperCase()
    const productLabel = [brand, perfume].filter(Boolean).join(' — ') || 'the perfume on the bottle'
    const labelText = [brand, perfume, type].filter(Boolean).join(' · ')

    const sceneLine = scene
      ? `Scene the creator wants: "${scene}"`
      : 'The creator has no scene preference — invent a compelling cinematic concept that fits the perfume.'

    const prompt = `Create AI Prompt.
I want a cinematic video for my perfume brand ${productLabel} for ${gen}.
The video should be ${dur} seconds and the cinematic should not be related to the image background.
I need positive prompt, negative prompt and a prompt for an image that will be the first frame of the video.
${sceneLine}

CRITICAL LABEL PRESERVATION RULE (applies to ALL three prompts):
The perfume bottle label has exactly three text elements that must never change:
  1. Brand name: "${brand || 'as shown on the bottle'}"
  2. Perfume name: "${perfume || 'as shown on the bottle'}"
  3. Parfum type: "${type}"
Every letter, word, and logo on the label — "${labelText}" — must remain 100% identical to the reference image throughout the entire video. Never allow any letter to change, blur, smear, warp, or be replaced by different characters. State the exact label text explicitly in the positive prompt. The label is a locked graphical asset, not AI-generated text.

Guidelines for positivePrompt:
Write a single flowing paragraph that describes a COMPLETE STORY arc across ${dur} seconds — not a static scene. The prompt must include three phases:
  OPENING (first ~20% of the video): establish the scene — where are we, what mood, what light. Camera starts at a specific position (e.g. extreme close-up of a texture, a wide establishing shot, a detail shot of an element in the scene).
  BUILD (middle ~60%): the world comes alive around the bottle — something moves, changes, or reveals. Use specific, physical camera movement (slow push-in, orbit, crane rise, tilt-up, whip pan) and describe what changes in the environment (light shifts, elements move, atmosphere thickens). The perfume bottle should be discovered or revealed naturally within the story.
  CLIMAX & END (final ~20%): the camera arrives at a definitive hero shot of the bottle — close, crisp, dramatic — and the motion settles. Describe the exact final frame (e.g. "ending on a tight hero shot of the bottle, label perfectly intact, golden light raking across the cap, scene holds").
Additional rules:
  - Max 700 chars. Hyper-realistic, high-end luxury commercial quality.
  - LABEL INTEGRITY: include this exact phrase verbatim in the prompt: "label reads '${labelText}' — every character stays sharp, legible and unchanged throughout every frame".
  - No spoken words or subtitles in the prompt.
  - Write camera moves as verbs in present tense ("camera slowly pushes in", "crane rises revealing", "arc left orbiting").
  - Avoid any camera angle that faces the label head-on for long — favor 3/4 angles so the label is visible but the model is less likely to re-generate the text.

Guidelines for negativePrompt:
Comma-separated list of things to avoid. Max 250 chars. MUST include all of these: label text distortion, letter morphing, text smearing, blurry label, changed words on bottle, logo warping, text flickering, letter substitution, bottle shape change, watermark, low resolution, cartoonish, jitter, extra objects.

Guidelines for firstFramePrompt:
Describe the opening frame of the video. STRICT BOTTLE PLACEMENT RULES — never break these:
  - The perfume bottle MUST be the primary subject, placed in the CENTER-FOREGROUND of the frame.
  - The bottle MUST be SHARP, IN FOCUS, and fully visible — no blur, no bokeh on the bottle itself.
  - The bottle MUST occupy at least 40% of the frame height — never small, never pushed to the background.
  - The label must face the camera at a 3/4 angle — readable, crisp, fully visible.
  - Background elements (scenery, props, lighting) must be BEHIND the bottle and can be soft/bokeh, but the bottle itself is always tack-sharp in the foreground.
  - The bottle must remain identical to the reference photo (same shape, label, proportions, colors).
  - Include the exact label text in the prompt: the label reads "${labelText}" — brand, name, and type must all appear exactly as in the reference.
  - Include the instruction: "perfume bottle sharp in foreground, label '${labelText}' fully legible, center frame, background softly blurred behind it".
Max 600 chars.

Return ONLY a valid JSON object — no markdown, no backticks, no commentary:
{"positivePrompt": "...", "negativePrompt": "...", "firstFramePrompt": "..."}`

    const body = JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1800,
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
