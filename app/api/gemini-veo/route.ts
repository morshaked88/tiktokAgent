import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const VIDEO_STYLES: Record<string, string> = {
  cinematic: 'cinematic slow zoom, luxury perfume advertisement, golden light bokeh',
  studio:    'smooth rotation, close-up product shot, soft studio lighting',
  dreamy:    'dreamy slow motion, flowers and mist, romantic atmosphere',
  trendy:    'dynamic fast cuts, trendy aesthetic, vibrant colors',
}

export const maxDuration = 300 // 5-minute timeout for long-running generation

export async function POST(req: NextRequest) {
  try {
    const {
      imageBase64,
      imageMediaType,
      videoPrompt,
      visualStyle,
      resolution,   // '720p' | '1080p' | '4k'
      extraInstructions,
    } = await req.json()

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

    const styleTag = VIDEO_STYLES[visualStyle] || VIDEO_STYLES.cinematic
    const userExtra = extraInstructions ? extraInstructions.trim() : ''
    const fullPrompt = [videoPrompt, styleTag, userExtra].filter(Boolean).join('. ').slice(0, 1000)

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: fullPrompt,
      image: {
        imageBytes: imageBase64,  // raw base64, no data URI prefix
        mimeType: imageMediaType || 'image/jpeg',
      },
      config: {
        aspectRatio: '9:16',
        resolution: resolution || '720p',
        numberOfVideos: 1,
      },
    })

    // Poll until done (Gemini uses long-running operations)
    while (!operation.done) {
      await new Promise(r => setTimeout(r, 10000))
      operation = await ai.operations.getVideosOperation({ operation })
    }

    const video = operation.response?.generatedVideos?.[0]?.video
    if (!video?.uri) throw new Error('No video URI returned from Veo 3.1.')

    return NextResponse.json({ fileUri: video.uri, mimeType: video.mimeType || 'video/mp4' })

  } catch (e: unknown) {
    let message = e instanceof Error ? e.message : 'Unknown error'
    let status = 500

    // Parse Gemini API error JSON embedded in the thrown error message
    try {
      const parsed = JSON.parse(message)
      const apiErr = parsed?.error
      if (apiErr) {
        if (apiErr.code === 429) {
          message = 'Gemini Veo quota exceeded — please check your Google AI billing or try again later.'
          status = 429
        } else {
          message = apiErr.message ?? message
        }
      }
    } catch { /* not JSON, use message as-is */ }

    console.error('Gemini Veo error:', message)
    return NextResponse.json({ error: message }, { status })
  }
}
