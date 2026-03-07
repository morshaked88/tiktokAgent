import { NextRequest, NextResponse } from 'next/server'

// Proxies a Gemini Files API video URI back to the client,
// injecting the API key server-side so it's never exposed to the browser.
export async function GET(req: NextRequest) {
  const uri = req.nextUrl.searchParams.get('uri')
  if (!uri) return NextResponse.json({ error: 'Missing uri' }, { status: 400 })

  // Only allow Gemini Files API URIs
  if (!uri.startsWith('https://generativelanguage.googleapis.com/')) {
    return NextResponse.json({ error: 'Invalid URI' }, { status: 400 })
  }

  const downloadUrl = uri.includes('?') ? `${uri}&alt=media` : `${uri}?alt=media`

  const upstream = await fetch(downloadUrl, {
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! },
  })

  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream error: ${upstream.status}` }, { status: 502 })
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'video/mp4',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
