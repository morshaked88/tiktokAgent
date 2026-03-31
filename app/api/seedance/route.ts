import { NextRequest, NextResponse } from 'next/server'

const MODEL = 'fal-ai/veo3.1/fast/image-to-video'
const FAL_BASE = 'https://queue.fal.run'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, videoPrompt, duration, extraInstructions } = await req.json()

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

    const headers = {
      'Authorization': `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json',
    }

    if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not set in environment variables')

    // Submit to fal.ai queue
    const submitRes = await fetch(`${FAL_BASE}/${MODEL}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: finalPrompt,
        image_url: imageUrl,
        aspect_ratio: '9:16',
        duration: dur,
        generate_audio: true,
        resolution: '720p',
      }),
    })
    const submitText = await submitRes.text()
    if (!submitRes.ok) {
      const err = JSON.parse(submitText || '{}')
      throw new Error(err.detail || err.message || `fal.ai error ${submitRes.status}: ${submitText.slice(0, 200)}`)
    }
    const { request_id } = JSON.parse(submitText) as { request_id: string }

    // Poll status every 5s (max ~7 min)
    const statusUrl = `${FAL_BASE}/${MODEL}/requests/${request_id}/status`
    const resultUrl = `${FAL_BASE}/${MODEL}/requests/${request_id}`

    for (let i = 0; i < 84; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const statusRes = await fetch(statusUrl, { headers: { Authorization: `Key ${process.env.FAL_KEY}` } })
      const { status } = await statusRes.json().catch(() => ({ status: 'IN_PROGRESS' })) as { status: string }

      if (status === 'COMPLETED') {
        const resultRes = await fetch(resultUrl, { headers: { Authorization: `Key ${process.env.FAL_KEY}` } })
        const result = await resultRes.json() as { video?: { url: string } }
        const videoUrl = result.video?.url
        if (!videoUrl) throw new Error('No video URL in fal.ai response')
        return NextResponse.json({ videoUrl })
      }

      if (status === 'FAILED') throw new Error('fal.ai generation failed')
    }

    throw new Error('fal.ai generation timed out after 7 minutes')

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('Veo 3.1 error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
