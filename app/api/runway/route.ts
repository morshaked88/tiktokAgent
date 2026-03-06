import { NextRequest, NextResponse } from 'next/server'
import RunwayML from '@runwayml/sdk'

const VIDEO_STYLES: Record<string, string> = {
  cinematic: 'cinematic slow zoom, luxury perfume advertisement, golden light bokeh',
  studio:    'smooth rotation, close-up product shot, soft studio lighting',
  dreamy:    'dreamy slow motion, flowers and mist, romantic atmosphere',
  trendy:    'dynamic fast cuts, trendy aesthetic, vibrant colors',
}

function buildPrompt(base: string, styleTag: string, extra?: string): string {
  return ((base || '') + ' ' + styleTag + (extra ? ' ' + extra : '')).trim().slice(0, 1000)
}

// POST /api/runway — submit job and poll until done
export async function POST(req: NextRequest) {
  try {
    const {
      imageDataUrl,
      videoPrompt,
      duration,
      visualStyle,
      withAudio,
      clipIndex, // 0=hook, 1=buildup, 2=reveal  (for multi-clip, client calls 3 times)
      focusText, // optional: script segment text to focus this clip on
      extraInstructions, // optional: user's extra video instructions
    } = await req.json()

    const client = new RunwayML({ apiKey: process.env.RUNWAY_API_KEY })
    const styleTag = VIDEO_STYLES[visualStyle] || VIDEO_STYLES.cinematic
    const userExtra = extraInstructions ? extraInstructions.trim() : ''
    const focusHint = focusText ? `Scene focus: ${focusText}` : ''

    const finalPrompt = buildPrompt(videoPrompt, styleTag, [focusHint, userExtra].filter(Boolean).join('. '))

    if (withAudio) {
      // veo3.1_fast: supports audio, duration 4 | 6 | 8
      const allowed = [4, 6, 8] as const
      const reqDur = parseInt(duration) || 8
      const dur = allowed.reduce((prev, curr) =>
        Math.abs(curr - reqDur) < Math.abs(prev - reqDur) ? curr : prev
      )

      const task = await client.imageToVideo
        .create({
          model: 'veo3.1_fast',
          promptImage: imageDataUrl,
          promptText: finalPrompt,
          ratio: '720:1280',
          duration: dur,
          audio: true,
        })
        .waitForTaskOutput()

      const videoUrl = Array.isArray(task.output) ? task.output[0] : null
      if (!videoUrl) throw new Error('No video URL returned from Runway.')
      return NextResponse.json({ videoUrl, clipIndex: clipIndex ?? 0 })
    }

    // Standard gen4.5: duration is any integer 2–10
    const dur = Math.min(10, Math.max(2, parseInt(duration) || 10))

    const task = await client.imageToVideo
      .create({
        model: 'gen4.5',
        promptImage: imageDataUrl,
        promptText: finalPrompt,
        ratio: '720:1280',
        duration: dur,
      })
      .waitForTaskOutput()

    const videoUrl = Array.isArray(task.output) ? task.output[0] : null
    if (!videoUrl) throw new Error('No video URL returned from Runway.')

    return NextResponse.json({ videoUrl, clipIndex: clipIndex ?? 0 })

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('Runway error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
