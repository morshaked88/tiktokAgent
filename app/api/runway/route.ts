import { NextRequest, NextResponse } from 'next/server'
import RunwayML from '@runwayml/sdk'

const VIDEO_STYLES: Record<string, string> = {
  cinematic: 'cinematic slow zoom, luxury perfume advertisement, golden light bokeh',
  studio:    'smooth rotation, close-up product shot, soft studio lighting',
  dreamy:    'dreamy slow motion, flowers and mist, romantic atmosphere',
  trendy:    'dynamic fast cuts, trendy aesthetic, vibrant colors',
}

// POST /api/runway — submit job and poll until done
export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, videoPrompt, duration, visualStyle } = await req.json()

    const client = new RunwayML({
      apiKey: process.env.RUNWAY_API_KEY,
    })

    const finalPrompt = ((videoPrompt || '') + ' ' + (VIDEO_STYLES[visualStyle] || VIDEO_STYLES.cinematic))
      .trim()
      .slice(0, 512)

    const task = await client.imageToVideo
      .create({
        model: 'gen4.5',
        promptImage: imageDataUrl,   // data URI (base64) supported directly
        promptText: finalPrompt,
        ratio: '720:1280',           // 9:16 vertical for TikTok
        duration: parseInt(duration) === 5 ? 5 : 10,
      })
      .waitForTaskOutput()

    // task.output is an array of video URLs
    const videoUrl = Array.isArray(task.output) ? task.output[0] : null
    if (!videoUrl) throw new Error('No video URL returned from Runway.')

    return NextResponse.json({ videoUrl })

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('Runway error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
