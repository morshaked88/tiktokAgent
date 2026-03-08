import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const {
      imageDataUrl,
      videoPrompt,
      duration,
      extraInstructions,
    } = await req.json()

    const userExtra = extraInstructions ? extraInstructions.trim() : ''
    const finalPrompt = [videoPrompt, userExtra].filter(Boolean).join('. ')

    const dur = Math.min(10, Math.max(5, parseInt(duration) || 10))

    // Upload image to get a public HTTPS URL (AtlasCloud requires URL, not base64)
    const mimeType = imageDataUrl.split(';')[0].split(':')[1] || 'image/jpeg'
    const base64Data = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl
    const buffer = Buffer.from(base64Data, 'base64')
    const form = new FormData()
    form.append('file', new Blob([buffer], { type: mimeType }), 'image.jpg')
    const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form })
    if (!uploadRes.ok) throw new Error('Image upload failed')
    const uploadJson = await uploadRes.json()
    // tmpfiles.org returns https://tmpfiles.org/123/img.jpg — convert to direct download URL
    const imageUrl = (uploadJson.data?.url as string).replace('tmpfiles.org/', 'tmpfiles.org/dl/')

    // Submit generation job
    const genRes = await fetch('https://api.atlascloud.ai/api/v1/model/generateVideo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ATLASCLOUD_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'bytedance/seedance-v1.5-pro/image-to-video-fast',
        aspect_ratio: '9:16',
        camera_fixed: false,
        duration: dur,
        generate_audio: true,
        image: imageUrl,
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
