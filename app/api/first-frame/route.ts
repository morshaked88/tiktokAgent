import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

export const maxDuration = 180

type NanoBananaAspect =
  | 'auto' | '21:9' | '16:9' | '3:2' | '4:3' | '5:4'
  | '1:1' | '4:5' | '3:4' | '2:3' | '9:16'

const NANO_ASPECTS: NanoBananaAspect[] = [
  'auto', '21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16',
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

    const aspect: NanoBananaAspect = NANO_ASPECTS.includes(aspectRatio) ? aspectRatio : '9:16'

    const enforcedPrompt = `${firstFramePrompt.trim()} The perfume bottle from the reference image must appear sharp, in focus, centered in the foreground, occupying at least 40% of the frame height, label fully visible and legible at a 3/4 angle. Do not push the bottle to the background. Do not blur the bottle. Background may be softly blurred but the bottle must be tack-sharp.`

    const result = await fal.subscribe('fal-ai/nano-banana/edit', {
      input: {
        prompt: enforcedPrompt,
        image_urls: [uploadedUrl],
        aspect_ratio: aspect,
        output_format: 'jpeg',
        num_images: 1,
      },
    })

    const images = (result.data as { images?: { url: string }[] })?.images
    const imageUrl = images?.[0]?.url
    if (!imageUrl) throw new Error('nano-banana returned no image')

    return NextResponse.json({ imageUrl })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('first-frame error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
