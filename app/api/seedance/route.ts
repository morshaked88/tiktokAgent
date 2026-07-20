import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// Submit-only — returns requestId immediately so the client can poll.
// maxDuration only needs to cover end-card upload + queue submit (~10s).
export const maxDuration = 60

type Resolution = '480p' | '720p' | '1080p'
type Aspect = 'auto' | '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16'

const RESOLUTIONS: Resolution[] = ['480p', '720p', '1080p']
const ASPECTS: Aspect[] = ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']

const END_CARD_FILES: Record<string, { file: string; label: string }> = {
  bienitu:   { file: 'end-card.png',          label: 'BIENÍTU' },
  levantier: { file: 'end-card-levantier.png', label: 'LEVANTIER DUBAI' },
  lelin:     { file: 'end-card-lelin.png',     label: 'LELIN' },
}

const endCardCache: Record<string, string> = {}

async function getEndCardUrl(brand: string): Promise<string | null> {
  const entry = END_CARD_FILES[brand]
  if (!entry) return null
  if (endCardCache[brand]) return endCardCache[brand]
  try {
    const filePath = path.join(process.cwd(), 'public', entry.file)
    const buffer = await readFile(filePath)
    const blob = new Blob([new Uint8Array(buffer)], { type: 'image/png' })
    const file = new File([blob], entry.file, { type: 'image/png' })
    endCardCache[brand] = await fal.storage.upload(file)
    return endCardCache[brand]
  } catch (e) {
    console.warn(`End-card upload skipped (${brand}):`, e instanceof Error ? e.message : e)
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
      endCard,
    } = await req.json()

    if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not set in environment variables')
    if (!imageUrl) throw new Error('Missing imageUrl')
    if (!prompt) throw new Error('Missing prompt')

    fal.config({ credentials: process.env.FAL_KEY })

    const res: Resolution = RESOLUTIONS.includes(resolution) ? resolution : '720p'
    const ar: Aspect = ASPECTS.includes(aspectRatio) ? aspectRatio : 'auto'

    let dur: number | 'auto' = 'auto'
    if (duration && duration !== 'auto') {
      const n = parseInt(String(duration), 10)
      if (Number.isFinite(n) && n >= 4 && n <= 15) dur = n
    }

    const endImageUrl = await getEndCardUrl(endCard || 'bienitu')

    const REALISM_PREFIX = 'Photorealistic live-action footage, real people and real materials, shot on a real cinema camera — not CGI, not 3D render, not animation. '
    // Explicit asset-role assignment (Seedance responds best when the input
    // image's role is stated): start frame = composed scene + locked product.
    // This is the ONLY place enforcing bottle-lock at generation time, since
    // Seedance's image-to-video endpoint has no negative-prompt parameter —
    // it must carry the full weight of preventing geometry/label drift alone.
    const BOTTLE_LOCK_PREFIX = 'TOP PRIORITY, OVERRIDES ALL OTHER INSTRUCTIONS: the input image is the start frame and the product reference. The perfume bottle in it is a rigid, locked, photographed product — its cap shape, silhouette, material, opacity, label position, and every letter on the label stay pixel-identical to that start frame in every single frame of the video, never warped, bent, squashed, stretched, or redrawn, and never turned from opaque into transparent (or transparent into opaque). Any hand, fabric, or liquid may only touch or pass beside the outside of the bottle — never grip it tightly, never wrap around it, never obscure the label or silhouette. Do NOT show the bottle spraying, misting, or dispensing perfume, and do NOT show a hand pressing the nozzle, even if that is not explicitly forbidden elsewhere in the prompt. Only the world, light, people, and materials around the bottle move; the bottle itself never changes. '

    let built = String(prompt)
    if (!built.toLowerCase().includes('locked, photographed product')) {
      built = BOTTLE_LOCK_PREFIX + built
    }
    if (!built.toLowerCase().includes('photorealistic live-action')) {
      built = REALISM_PREFIX + built
    }
    const endCardLabel = END_CARD_FILES[endCard]?.label ?? 'brand end-card'
    const finalPrompt = endImageUrl
      ? `${built} In the final second, the scene fades smoothly to the ${endCardLabel} brand end-card on a black background.`
      : built

    const input: Record<string, unknown> = {
      image_url: imageUrl,
      prompt: finalPrompt,
      resolution: res,
      duration: dur,
      aspect_ratio: ar,
      generate_audio: generateAudio !== false,
    }
    if (endImageUrl) input.end_image_url = endImageUrl

    // Submit to fal queue — returns immediately with a request_id.
    // The client polls /api/seedance-poll for the result.
    const submitted = await fal.queue.submit('bytedance/seedance-2.0/image-to-video', { input })

    return NextResponse.json({
      requestId: submitted.request_id,
      audioUsed: generateAudio !== false,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('Seedance submit error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
