import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

// Each poll call is quick — just a status check + optional result fetch.
export const maxDuration = 30

const MODEL_ID = 'bytedance/seedance-2.0/image-to-video'

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get('requestId')
  if (!requestId) {
    return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
  }

  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: 'FAL_KEY is not set' }, { status: 500 })
  }
  fal.config({ credentials: process.env.FAL_KEY })

  try {
    const status = await fal.queue.status(MODEL_ID, { requestId, logs: false })

    if (status.status !== 'COMPLETED') {
      return NextResponse.json({ pending: true, queueStatus: status.status })
    }

    // Job complete — fetch result
    const result = await fal.queue.result(MODEL_ID, { requestId })
    const videoUrl = (result.data as { video?: { url: string } })?.video?.url
    if (!videoUrl) throw new Error('Seedance returned no video URL')

    return NextResponse.json({ videoUrl })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const audioError =
      msg.toLowerCase().includes('unprocessable') ||
      msg.toLowerCase().includes('sensitive content') ||
      msg.includes('422') ||
      msg.toLowerCase().includes('audio')
    return NextResponse.json({ error: msg, audioError }, { status: 500 })
  }
}
