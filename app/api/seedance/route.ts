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

    // Seedance expects duration as an integer (4–15), not a string — except the literal "auto"
    let dur: number | 'auto' = 'auto'
    if (duration && duration !== 'auto') {
      const n = parseInt(String(duration), 10)
      if (Number.isFinite(n) && n >= 4 && n <= 15) dur = n
    }

    const baseInput = {
      image_url: imageUrl,
      prompt: finalPrompt,
      resolution: res,
      duration: dur,
      aspect_ratio: ar,
    }

    const runWithAudio = async (withAudio: boolean) =>
      fal.subscribe('bytedance/seedance-2.0/image-to-video', {
        input: { ...baseInput, generate_audio: withAudio },
      })

    let result: Awaited<ReturnType<typeof runWithAudio>>
    let audioUsed = generateAudio !== false

    try {
      result = await runWithAudio(audioUsed)
    } catch (firstErr: unknown) {
      const msg = firstErr instanceof Error ? firstErr.message : String(firstErr)
      const isSensitiveAudio = msg.toLowerCase().includes('sensitive content')
      if (isSensitiveAudio && audioUsed) {
        // Audio triggered content filter — retry silently without audio
        audioUsed = false
        result = await runWithAudio(false)
      } else {
        throw firstErr
      }
    }

    const videoUrl = (result.data as { video?: { url: string } })?.video?.url
    if (!videoUrl) throw new Error('Seedance returned no video URL')
    return NextResponse.json({ videoUrl, audioUsed })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('Seedance 2.0 error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
