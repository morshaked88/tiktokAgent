import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

export const maxDuration = 300

type Resolution = '480p' | '720p' | '1080p'
type Aspect = 'auto' | '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16'

const RESOLUTIONS: Resolution[] = ['480p', '720p', '1080p']
const ASPECTS: Aspect[] = ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']

export async function POST(req: NextRequest) {
  try {
    const {
      imageUrl,
      prompt,
      resolution,
      duration,
      aspectRatio,
      generateAudio,
    } = await req.json()

    if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not set in environment variables')
    if (!imageUrl) throw new Error('Missing imageUrl')
    if (!prompt) throw new Error('Missing prompt')

    fal.config({ credentials: process.env.FAL_KEY })

    const finalPrompt = String(prompt)

    const res: Resolution = RESOLUTIONS.includes(resolution) ? resolution : '720p'
    const ar: Aspect = ASPECTS.includes(aspectRatio) ? aspectRatio : 'auto'

    let dur: string = 'auto'
    if (duration && duration !== 'auto') {
      const n = parseInt(String(duration), 10)
      if (Number.isFinite(n) && n >= 4 && n <= 15) dur = String(n)
    }

    const result = await fal.subscribe('bytedance/seedance-2.0/image-to-video', {
      input: {
        image_url: imageUrl,
        prompt: finalPrompt,
        resolution: res,
        duration: dur,
        aspect_ratio: ar,
        generate_audio: generateAudio !== false,
      },
    })

    const videoUrl = (result.data as { video?: { url: string } })?.video?.url
    if (!videoUrl) throw new Error('Seedance returned no video URL')
    return NextResponse.json({ videoUrl })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('Seedance 2.0 error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
