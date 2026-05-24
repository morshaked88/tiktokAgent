import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const maxDuration = 300

type Resolution = '480p' | '720p' | '1080p'
type Aspect = 'auto' | '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16'

const RESOLUTIONS: Resolution[] = ['480p', '720p', '1080p']
const ASPECTS: Aspect[] = ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']

// Cache the uploaded end-card URL for the lifetime of the server process
let cachedEndCardUrl: string | null = null

async function getEndCardUrl(): Promise<string | null> {
  if (cachedEndCardUrl) return cachedEndCardUrl
  try {
    const filePath = path.join(process.cwd(), 'public', 'end-card.png')
    const buffer = await readFile(filePath)
    const blob = new Blob([new Uint8Array(buffer)], { type: 'image/png' })
    const file = new File([blob], 'end-card.png', { type: 'image/png' })
    cachedEndCardUrl = await fal.storage.upload(file)
    return cachedEndCardUrl
  } catch (e) {
    console.warn('End-card upload skipped:', e instanceof Error ? e.message : e)
    return null
  }
}

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

    const res: Resolution = RESOLUTIONS.includes(resolution) ? resolution : '720p'
    const ar: Aspect = ASPECTS.includes(aspectRatio) ? aspectRatio : 'auto'

    // Seedance expects duration as an integer (4–15), not a string — except the literal "auto"
    let dur: number | 'auto' = 'auto'
    if (duration && duration !== 'auto') {
      const n = parseInt(String(duration), 10)
      if (Number.isFinite(n) && n >= 4 && n <= 15) dur = n
    }

    const endImageUrl = await getEndCardUrl()
    const REALISM_PREFIX = 'Photorealistic live-action footage, real people and real materials, shot on a real cinema camera — not CGI, not 3D render, not animation. '
    const userPrompt = String(prompt)
    const withRealism = userPrompt.toLowerCase().includes('photorealistic live-action')
      ? userPrompt
      : REALISM_PREFIX + userPrompt
    const finalPrompt = endImageUrl
      ? `${withRealism} In the final second, the scene fades smoothly to the BIENÍTU brand end-card on a black background.`
      : withRealism

    const baseInput: Record<string, unknown> = {
      image_url: imageUrl,
      prompt: finalPrompt,
      resolution: res,
      duration: dur,
      aspect_ratio: ar,
    }
    if (endImageUrl) baseInput.end_image_url = endImageUrl

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
      const is422 = msg.toLowerCase().includes('unprocessable') || msg.toLowerCase().includes('sensitive content') || msg.includes('422')
      if (is422 && audioUsed) {
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
