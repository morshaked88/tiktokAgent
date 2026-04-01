import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, videoPrompt, negativePrompt, duration, extraInstructions } = await req.json()

    if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not set in environment variables')
    fal.config({ credentials: process.env.FAL_KEY })

    const userExtra = extraInstructions ? extraInstructions.trim() : ''
    const finalPrompt = [videoPrompt, userExtra].filter(Boolean).join('. ')

    // fal.ai supports 4s / 6s / 8s
    const durMap: Record<string, '4s' | '6s' | '8s'> = {
      '4': '4s', '5': '6s', '6': '6s', '7': '8s', '8': '8s', '10': '8s',
    }
    const dur = durMap[String(duration)] ?? '8s'

    // Upload image to tmpfiles.org to get a public HTTPS URL
    const mimeType = imageDataUrl.split(';')[0].split(':')[1] || 'image/jpeg'
    const base64Data = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl
    const buffer = Buffer.from(base64Data, 'base64')
    const form = new FormData()
    form.append('file', new Blob([buffer], { type: mimeType }), 'image.jpg')
    const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form })
    if (!uploadRes.ok) throw new Error('Image upload failed')
    const uploadJson = await uploadRes.json()
    const imageUrl = (uploadJson.data?.url as string).replace('tmpfiles.org/', 'tmpfiles.org/dl/')

    const result = await fal.subscribe('fal-ai/veo3.1/fast/image-to-video', {
      input: {
        image_url: imageUrl,
        prompt: finalPrompt,
        ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
        duration: dur,
        aspect_ratio: '9:16',
        generate_audio: true,
        resolution: '720p',
      },
    })

    const videoUrl = (result.data as { video?: { url: string } })?.video?.url
    if (!videoUrl) throw new Error('fal.ai returned no video URL')
    return NextResponse.json({ videoUrl })

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('Veo 3.1 error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
