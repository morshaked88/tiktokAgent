import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

export const maxDuration = 120

type KontextAspect =
  | '21:9' | '16:9' | '4:3' | '3:2' | '1:1' | '2:3' | '3:4' | '9:16' | '9:21'

const KONTEXT_ASPECTS: KontextAspect[] = [
  '21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21',
]

const ENFORCED_SUFFIX = ' PERFECT BOTTLE PRESERVATION: change ONLY the background and surroundings. Every perfume bottle from the reference images — including exact silhouette, cap shape, label position, label text, every letter, and all proportions — must remain 100% pixel-identical to the input. MATERIAL AND OPACITY LOCK: match each bottle\'s exact material and opacity as photographed — if opaque or solid-colored, it must stay fully opaque, never turned into clear or translucent glass; if clear or tinted glass, keep that exact transparency and tint. Do not redraw, redesign, or reinterpret any part of the bottles. Do not add dots, bullets, or separator characters to the label text that are not on the original label. FULL BOTTLE VISIBILITY: the ENTIRE bottle must be visible — from base to cap tip — never cropped or clipped at any edge. PHOTOREALISTIC: high-end commercial product photography, natural light, real camera — not CGI, not 3D, not illustration.'

export async function POST(req: NextRequest) {
  try {
    const { images, prompt, aspectRatio } = await req.json()

    if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not set in environment variables')
    if (!images || !images.length) throw new Error('Missing images')
    if (!prompt) throw new Error('Missing prompt')

    fal.config({ credentials: process.env.FAL_KEY })

    const aspect: KontextAspect = KONTEXT_ASPECTS.includes(aspectRatio) ? aspectRatio : '1:1'

    // Upload all reference images in parallel
    const imageUrls = await Promise.all(
      (images as { base64: string; mediaType: string }[]).map(async (img, i) => {
        const buffer = Buffer.from(img.base64, 'base64')
        const blob = new Blob([buffer], { type: img.mediaType })
        const file = new File([blob], `bottle-${i}.jpg`, { type: img.mediaType })
        return fal.storage.upload(file)
      })
    )

    const finalPrompt = prompt.trim() + ENFORCED_SUFFIX

    const input = imageUrls.length === 1
      ? { prompt: finalPrompt, image_url: imageUrls[0], aspect_ratio: aspect, output_format: 'jpeg', guidance_scale: 3.5 }
      : { prompt: finalPrompt, image_urls: imageUrls, aspect_ratio: aspect, output_format: 'jpeg', guidance_scale: 3.5 }

    // Use kontext-max for multi-image (supports image_urls array); kontext for single
    const modelId = imageUrls.length > 1
      ? 'fal-ai/flux-pro/kontext-max'
      : 'fal-ai/flux-pro/kontext'

    const result = await fal.subscribe(modelId, { input })

    const resultImages = (result.data as { images?: { url: string }[] })?.images
    const imageUrl = resultImages?.[0]?.url
    if (!imageUrl) throw new Error('Model returned no image')

    return NextResponse.json({ imageUrl })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('image-ad error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
