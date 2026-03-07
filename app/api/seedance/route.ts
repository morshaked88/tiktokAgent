import { NextRequest, NextResponse } from 'next/server'

const VIDEO_STYLES: Record<string, string> = {
  cinematic: 'cinematic slow zoom, luxury perfume advertisement, golden light bokeh',
  studio:    'smooth rotation, close-up product shot, soft studio lighting',
  dreamy:    'dreamy slow motion, flowers and mist, romantic atmosphere',
  trendy:    'dynamic fast cuts, trendy aesthetic, vibrant colors',
}

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const {
      imageDataUrl,
      videoPrompt,
      duration,
      visualStyle,
      extraInstructions,
    } = await req.json()

    const styleTag = VIDEO_STYLES[visualStyle] || VIDEO_STYLES.cinematic
    const userExtra = extraInstructions ? extraInstructions.trim() : ''
    const finalPrompt = [videoPrompt, styleTag, userExtra].filter(Boolean).join('. ').slice(0, 2000)

    const dur = Math.min(10, Math.max(5, parseInt(duration) || 10))


    // Strip data URI prefix — AtlasCloud expects raw base64
    const rawBase64 = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl

    // Submit generation job
    const genRes = await fetch('https://api.atlascloud.ai/api/v1/model/generateVideo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ATLASCLOUD_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'bytedance/seedance-v1.5-pro/image-to-video',
        aspect_ratio: '9:16',
        camera_fixed: false,
        duration: dur,
        generate_audio: true,
        image: rawBase64,
        prompt: finalPrompt,
        resolution: '720p',
        seed: -1,
      }),
    })

    if (!genRes.ok) {
      const err = await genRes.json().catch(() => ({}))
      throw new Error(err.message || `AtlasCloud error: ${genRes.status}`)
    }

    const genJson = await genRes.json()
    const predictionId = genJson.data?.id
    if (!predictionId) throw new Error('No prediction ID returned from Seedance')

    // Poll until done (max ~7 min)
    const pollUrl = `https://api.atlascloud.ai/api/v1/model/prediction/${predictionId}`
    const maxAttempts = 84 // 84 × 5s = 7 min

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 5000))

      const pollRes = await fetch(pollUrl, {
        headers: { 'Authorization': `Bearer ${process.env.ATLASCLOUD_API_KEY}` },
      })
      const result = await pollRes.json()
      const status = result.data?.status

      if (status === 'completed' || status === 'succeeded') {
        const videoUrl = result.data?.outputs?.[0]
        if (!videoUrl) throw new Error('No video URL in Seedance response')
        return NextResponse.json({ videoUrl })
      }

      if (status === 'failed') {
        throw new Error(result.data?.error || 'Seedance generation failed')
      }
    }

    throw new Error('Seedance generation timed out after 7 minutes')

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('Seedance error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
