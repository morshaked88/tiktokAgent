import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

export const maxDuration = 180

type KontextAspect =
  | '21:9' | '16:9' | '4:3' | '3:2' | '1:1' | '2:3' | '3:4' | '9:16' | '9:21'

const KONTEXT_ASPECTS: KontextAspect[] = [
  '21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21',
]

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageMediaType, firstFramePrompt, aspectRatio } = await req.json()

    if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not set in environment variables')
    if (!imageBase64 || !firstFramePrompt) throw new Error('Missing required input')

    fal.config({ credentials: process.env.FAL_KEY })

    const mimeType = imageMediaType || 'image/jpeg'
    const buffer = Buffer.from(imageBase64, 'base64')
    const blob = new Blob([buffer], { type: mimeType })
    const file = new File([blob], 'perfume.jpg', { type: mimeType })
    const uploadedUrl = await fal.storage.upload(file)

    const aspect: KontextAspect = KONTEXT_ASPECTS.includes(aspectRatio) ? aspectRatio : '9:16'

    const enforcedPrompt = `${firstFramePrompt.trim()} PERFECT BOTTLE PRESERVATION: change ONLY the background and surroundings. The perfume bottle from the reference image — including its exact silhouette, cap shape, glass color, label position, label text, every letter, and all proportions — must remain 100% pixel-identical to the input. Do not redraw, redesign, or reinterpret any part of the bottle itself. Composition: the bottle is centered in the foreground, sharp and in focus, occupying at least 40% of the frame height, label at 3/4 angle, fully legible. Background may be softly blurred but the bottle is tack-sharp. PHOTOREALISTIC: real photograph shot on a 35mm film camera with natural lighting — not CGI, not 3D, not illustration, not digital art.`

    const result = await fal.subscribe('fal-ai/flux-pro/kontext', {
      input: {
        prompt: enforcedPrompt,
        image_url: uploadedUrl,
        aspect_ratio: aspect,
        output_format: 'jpeg',
        guidance_scale: 3.5,
      },
    })

    const images = (result.data as { images?: { url: string }[] })?.images
    const imageUrl = images?.[0]?.url
    if (!imageUrl) throw new Error('Flux Kontext returned no image')

    return NextResponse.json({ imageUrl })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('first-frame error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
