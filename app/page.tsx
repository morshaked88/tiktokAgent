'use client'

import { useState, useRef, useCallback } from 'react'
import styles from './page.module.css'

/* ── Types ───────────────────────────────────────────────── */
interface ContentResult {
  perfumeName: string
  brandName: string
  vibeAnalysis: string
  hook: string
  script: { hook: string; buildup: string; reveal: string; cta: string }
  narrationScript?: { hook: string; buildup: string; reveal: string; cta: string }
  musicSuggestion?: string
  caption: string
  hashtags: string[]
  tips: string[]
  videoPrompt: string
  videoScenes?: { hook: string; buildup: string; reveal: string; cta: string }
}

/* ── Constants ───────────────────────────────────────────── */
const CONTENT_STYLES = [
  { value: 'luxury',       label: '✨ Luxury & Aspirational' },
  { value: 'trendy',       label: '🔥 Trendy & Gen-Z' },
  { value: 'romantic',     label: '🌹 Romantic & Sensual' },
  { value: 'storytelling', label: '📖 Story-Driven' },
  { value: 'educational',  label: '🧪 Educational' },
  { value: 'minimalist',   label: '🤍 Minimalist & Modern' },
  { value: 'asmr',         label: '🎙 ASMR Close-Up' },
  { value: 'humor',        label: '😂 Humorous & Relatable' },
  { value: 'bold',         label: '⚡ Bold & Hype' },
  { value: 'comparison',   label: '⚖️ Comparison / Dupe' },
]

const AUDIENCES = [
  { value: 'general',      label: 'General Fragrance Lovers' },
  { value: 'genz',         label: 'Gen Z (18–25)' },
  { value: 'millennials',  label: 'Millennials (26–40)' },
  { value: 'luxury',       label: 'Luxury Shoppers' },
  { value: 'gifters',      label: 'Gift Buyers' },
  { value: 'men',          label: "Men's Fragrance (35–55)" },
  { value: 'collectors',   label: 'Niche Collectors' },
  { value: 'budget',       label: 'Budget-Conscious Shoppers' },
  { value: 'wellness',     label: 'Wellness & Clean Beauty' },
  { value: 'professional', label: 'Office / Daily Wearers' },
]

const CTAS = [
  { value: 'shop', label: 'Shop Now' },
  { value: 'link', label: 'Link in Bio' },
  { value: 'dm',   label: 'DM to Order' },
  { value: 'save', label: 'Save for Later' },
  { value: 'none', label: 'No CTA' },
]

const VIDEO_STYLES = [
  { value: 'cinematic', label: '✨ Luxury Cinematic' },
  { value: 'studio',    label: '🎞 Clean Studio' },
  { value: 'dreamy',    label: '🌹 Dreamy Romantic' },
  { value: 'trendy',    label: '⚡ Trendy & Bold' },
]

const BACKGROUNDS = [
  { value: 'original',        label: '📸 Original Photo' },
  { value: 'bokeh',           label: '🌟 Bokeh Blur' },
  { value: 'gradient-gold',   label: '✨ Gold Luxury' },
  { value: 'gradient-purple', label: '💜 Purple Dream' },
  { value: 'gradient-pink',   label: '🌸 Rose Pink' },
  { value: 'gradient-dark',   label: '🖤 Dark & Moody' },
  { value: 'gradient-teal',   label: '🌊 Deep Teal' },
  { value: 'studio-white',    label: '⬜ Studio White' },
]

const DURATION_OPTIONS = [
  { value: '5',  label: '5s — Quick Preview' },
  { value: '8',  label: '8s — Short Reel' },
  { value: '10', label: '10s — Standard' },
]

const DURATION_OPTIONS_AUDIO = [
  { value: '4', label: '4s' },
  { value: '6', label: '6s' },
  { value: '8', label: '8s — Recommended' },
]

/* ── Script timing labels (mirrors generate/route.ts logic) ─ */
function getTimingLabels(duration: number) {
  if (duration <= 5)  return { hook: '0–1s', buildup: '1–3s', reveal: '3–4s', cta: '4–5s' }
  if (duration <= 8)  return { hook: '0–2s', buildup: '2–5s', reveal: '5–7s', cta: '7–8s' }
  if (duration <= 10) return { hook: '0–2s', buildup: '2–6s', reveal: '6–9s', cta: '9–10s' }
  return { hook: '0–3s', buildup: '3–15s', reveal: '15–25s', cta: '25–30s' }
}

/* ── Background compositing ──────────────────────────────── */
async function compositeBackground(imageDataUrl: string, bg: string): Promise<string> {
  if (bg === 'original') return imageDataUrl

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 720
      canvas.height = 1280
      const ctx = canvas.getContext('2d')!

      if (bg === 'bokeh') {
        // Blurred full-bleed background
        const bgScale = Math.max(720 / img.width, 1280 / img.height)
        ctx.filter = 'blur(28px)'
        ctx.drawImage(
          img,
          (720 - img.width * bgScale) / 2,
          (1280 - img.height * bgScale) / 2,
          img.width * bgScale,
          img.height * bgScale,
        )
        ctx.filter = 'none'
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(0, 0, 720, 1280)
      } else {
        const gradients: Record<string, [string, string, string]> = {
          'gradient-gold':   ['#0d0800', '#3d2b00', '#1a1400'],
          'gradient-purple': ['#0d0014', '#2d0047', '#0d001a'],
          'gradient-pink':   ['#1a0010', '#4d0028', '#1a000d'],
          'gradient-dark':   ['#000000', '#111111', '#000000'],
          'gradient-teal':   ['#00141a', '#003d4d', '#001a1f'],
          'studio-white':    ['#f5f5f5', '#ffffff', '#eeeeee'],
        }
        const [c1, c2, c3] = gradients[bg] || gradients['gradient-gold']
        const grad = ctx.createLinearGradient(0, 0, 0, 1280)
        grad.addColorStop(0, c1)
        grad.addColorStop(0.5, c2)
        grad.addColorStop(1, c3)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, 720, 1280)
      }

      // Draw product image centered at 72% of canvas area
      const maxW = 720 * 0.72
      const maxH = 1280 * 0.72
      const scale = Math.min(maxW / img.width, maxH / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (720 - w) / 2, (1280 - h) / 2, w, h)

      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.src = imageDataUrl
  })
}

/* ── Small UI helpers ────────────────────────────────────── */
function OptionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.optionCard}>
      <div className={styles.optionLabel}>{label}</div>
      {children}
    </div>
  )
}

function StyledSelect({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select className={styles.select} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function StyledInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <input
      className={styles.input}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

function ContentCard({
  icon, iconBg, title, children, copyText,
}: {
  icon: string; iconBg: string; title: string; children: React.ReactNode; copyText?: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!copyText) return
    navigator.clipboard.writeText(copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className={styles.contentCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardType}>
          <div className={styles.cardIcon} style={{ background: iconBg }}>{icon}</div>
          <span className={styles.cardTitle}>{title}</span>
        </div>
        {copyText && (
          <button className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ''}`} onClick={copy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        )}
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  )
}

/* ── Clip card for multi-clip mode ───────────────────────── */
function ClipCard({ label, url }: { label: string; url: string | null }) {
  return (
    <div className={styles.clipCard}>
      <div className={styles.clipLabel}>{label}</div>
      {url ? (
        <>
          <video src={url} controls playsInline className={styles.videoEl} />
          <a href={url} download={`${label.toLowerCase().replace(/\s+/g, '-')}.mp4`} className={styles.dlBtn}>
            ⬇ Download
          </a>
        </>
      ) : (
        <div className={styles.clipPending}>Generating…</div>
      )}
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function Home() {
  // Image
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMediaType, setImageMediaType] = useState<string>('image/jpeg')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Form
  const [brandName, setBrandName] = useState('')
  const [perfumeName, setPerfumeName] = useState('')
  const [contentStyle, setContentStyle] = useState('luxury')
  const [audience, setAudience] = useState('general')
  const [cta, setCta] = useState('shop')
  const [videoPlatform, setVideoPlatform] = useState<'runway' | 'seedance'>('runway')
  const [videoDuration, setVideoDuration] = useState('10')
  const [withAudio, setWithAudio] = useState(false)
  const [withMusic, setWithMusic] = useState(false)
  const [withNarration, setWithNarration] = useState(false)
  const [videoDetails, setVideoDetails] = useState('')

  // Content generation
  const [genStep, setGenStep] = useState<'idle'|'loading'|'done'>('idle')
  const [genError, setGenError] = useState('')
  const [content, setContent] = useState<ContentResult | null>(null)

  // Video options (after content is generated)
  const [videoStyle, setVideoStyle] = useState('cinematic')
  const [background, setBackground] = useState('original')
  const [extraInstructions, setExtraInstructions] = useState('')

  // Single-clip video state
  const [videoStep, setVideoStep] = useState<'idle'|'submitting'|'done'|'error'>('idle')
  const [videoProgress, setVideoProgress] = useState(5)
  const [videoStatusText, setVideoStatusText] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoError, setVideoError] = useState('')
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Multi-clip video state (3 × 10s)
  const [clipUrls, setClipUrls] = useState<(string | null)[]>([null, null, null])
  const [clipErrors, setClipErrors] = useState<(string | null)[]>([null, null, null])

  const isMultiClip = videoDuration === '30'
  const dur = parseInt(videoDuration) || 10
  const timing = getTimingLabels(dur)

  /* ── Image ── */
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => {
      const url = e.target?.result as string
      setImageDataUrl(url)
      setImageBase64(url.split(',')[1])
      setImageMediaType(file.type)
    }
    reader.readAsDataURL(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  /* ── Step 1: Generate content ── */
  const generateContent = async () => {
    if (!imageBase64) return
    setGenStep('loading')
    setGenError('')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, imageMediaType, brandName, perfumeName, contentStyle, audience, cta, videoDuration, withMusic, withNarration, videoDetails }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed')
      setContent(data)
      setGenStep('done')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      setGenError(message)
      setGenStep('idle')
    }
  }

  /* ── Step 2a: Seedance ── */
  const generateSeedanceVideo = async (composited: string) => {
    setVideoStep('submitting')
    setVideoError('')
    setVideoProgress(10)
    setVideoStatusText('Sending to Seedance...')

    pollRef.current = setInterval(() => {
      setVideoProgress(p => Math.min(p + 1, 90))
      setVideoStatusText('Seedance is generating your video with AI audio — 2–5 min')
    }, 6000)

    try {
      const res = await fetch('/api/seedance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: composited,
          videoPrompt: fullVideoPrompt,
          duration: videoDuration,
          visualStyle: videoStyle,
          extraInstructions,
        }),
      })
      const data = await res.json()
      clearInterval(pollRef.current!)
      if (!res.ok || data.error) throw new Error(data.error || 'Seedance generation failed')
      setVideoProgress(100)
      setVideoUrl(data.videoUrl)
      setVideoStep('done')
    } catch (e: unknown) {
      clearInterval(pollRef.current!)
      const message = e instanceof Error ? e.message : 'Unknown error'
      setVideoError(message)
      setVideoStep('error')
    }
  }

  /* ── Step 2b: Single Runway clip ── */
  const generateSingleVideo = async (composited: string) => {
    setVideoStep('submitting')
    setVideoError('')
    setVideoProgress(10)
    setVideoStatusText('Sending to Runway ML...')

    pollRef.current = setInterval(() => {
      setVideoProgress(p => Math.min(p + 2, 90))
      setVideoStatusText('Generating your video — this takes 1–3 minutes ☕')
    }, 5000)

    try {
      const res = await fetch('/api/runway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: composited,
          videoPrompt: fullVideoPrompt,
          duration: videoDuration,
          visualStyle: videoStyle,
          withAudio,
          extraInstructions,
        }),
      })
      const data = await res.json()
      clearInterval(pollRef.current!)
      if (!res.ok || data.error) throw new Error(data.error || 'Runway generation failed')
      setVideoProgress(100)
      setVideoUrl(data.videoUrl)
      setVideoStep('done')
    } catch (e: unknown) {
      clearInterval(pollRef.current!)
      const message = e instanceof Error ? e.message : 'Unknown error'
      setVideoError(message)
      setVideoStep('error')
    }
  }

  /* ── Step 2b: Multi-clip (3 parallel requests) ── */
  const generateMultiClips = async (composited: string) => {
    const segments = [
      { clipIndex: 0, label: 'Clip 1 — Hook', focusText: content!.script.hook },
      { clipIndex: 1, label: 'Clip 2 — Build-Up', focusText: content!.script.buildup },
      { clipIndex: 2, label: 'Clip 3 — Reveal & CTA', focusText: content!.script.reveal + ' ' + content!.script.cta },
    ]

    setVideoStep('submitting')
    setClipUrls([null, null, null])
    setClipErrors([null, null, null])
    setVideoProgress(10)
    setVideoStatusText('Generating 3 clips in parallel — takes 2–5 minutes ☕')

    pollRef.current = setInterval(() => {
      setVideoProgress(p => Math.min(p + 1, 90))
    }, 5000)

    const promises = segments.map(({ clipIndex, focusText }) =>
      fetch('/api/runway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: composited,
          videoPrompt: fullVideoPrompt,
          duration: '10',
          visualStyle: videoStyle,
          withAudio: false,
          clipIndex,
          focusText,
          extraInstructions,
        }),
      }).then(async r => {
        const d = await r.json()
        if (!r.ok || d.error) throw new Error(d.error || 'Runway failed')
        return { clipIndex, videoUrl: d.videoUrl as string }
      }).catch((e: Error) => ({ clipIndex, error: e.message }))
    )

    const results = await Promise.all(promises)
    clearInterval(pollRef.current!)
    setVideoProgress(100)

    const urls: (string | null)[] = [null, null, null]
    const errs: (string | null)[] = [null, null, null]
    for (const r of results) {
      if ('videoUrl' in r) urls[r.clipIndex] = r.videoUrl
      else if ('error' in r) errs[r.clipIndex] = r.error
    }
    setClipUrls(urls)
    setClipErrors(errs)
    setVideoStep('done')
  }

  /* ── Step 2 entry ── */
  const generateVideo = async () => {
    if (!imageDataUrl || !content) return
    const composited = await compositeBackground(imageDataUrl, background)
    if (videoPlatform === 'seedance') {
      generateSeedanceVideo(composited)
    } else if (isMultiClip) {
      generateMultiClips(composited)
    } else {
      generateSingleVideo(composited)
    }
  }

  const resetAll = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setImageBase64(null); setImageDataUrl(null); setImageMediaType('image/jpeg')
    setContent(null); setGenStep('idle'); setGenError('')
    setBrandName(''); setPerfumeName('')
    setVideoStep('idle'); setVideoUrl(''); setVideoError(''); setVideoProgress(5)
    setClipUrls([null, null, null]); setClipErrors([null, null, null])
    setExtraInstructions('')
    setWithMusic(false); setWithNarration(false); setVideoDetails('')
    setVideoPlatform('runway')
  }

  const scriptCopy = content
    ? `HOOK (${timing.hook}): ${content.script.hook}\n\nBUILD-UP (${timing.buildup}): ${content.script.buildup}\n\nREVEAL (${timing.reveal}): ${content.script.reveal}\n\nCTA (${timing.cta}): ${content.script.cta}`
    : ''

  // Video prompt: cinematic visual description only (no script/narration text — triggers moderation)
  const fullVideoPrompt = content ? [
    content.videoPrompt,
    content.musicSuggestion
      ? `Audio mood: ${content.musicSuggestion.split('.')[0].slice(0, 80)}`
      : null,
  ].filter(Boolean).join('. ') : ''

  const durationOpts = withAudio ? DURATION_OPTIONS_AUDIO : DURATION_OPTIONS

  return (
    <main className={styles.main}>
      <div className={styles.container}>

        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.logoTag}>AI Content Agent</div>
          <h1 className={styles.h1}>Scent &amp; <em>Scroll</em></h1>
          <p className={styles.subtitle}>TikTok Content Studio for Perfume Brands</p>
          <div className={styles.badgeRow}>
            <span className={`${styles.badge} ${styles.badgeClaude}`}>✦ Powered by Claude AI</span>
            <span className={`${styles.badge} ${styles.badgeRunway}`}>Runway ML + Seedance</span>
          </div>
        </header>

        {/* ── Upload + Form (only shown before results) ── */}
        {genStep !== 'done' && (
          <>
            {/* Upload zone */}
            <div
              className={`${styles.uploadZone} ${dragging ? styles.uploadZoneDragging : ''} ${imageBase64 ? styles.uploadZoneHasImage : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !imageBase64 && fileRef.current?.click()}
            >
              {imageBase64 ? (
                <div className={styles.previewWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageDataUrl!} alt="Perfume preview" className={styles.preview} />
                  <button className={styles.removeBtn} onClick={e => { e.stopPropagation(); setImageBase64(null); setImageDataUrl(null) }}>
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <>
                  <span className={styles.uploadEmoji}>🌸</span>
                  <p className={styles.uploadTitle}>Drop your perfume photo here</p>
                  <p className={styles.uploadHint}>JPG, PNG, WEBP</p>
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                  >
                    Choose Image
                  </button>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]) }}
              />
            </div>

            {/* Platform selector */}
            <div className={styles.platformRow}>
              <div className={styles.optionLabel}>Video Platform</div>
              <div className={styles.platformToggle}>
                <button
                  type="button"
                  className={`${styles.platformBtn} ${videoPlatform === 'runway' ? styles.platformBtnActive : ''}`}
                  onClick={() => { setVideoPlatform('runway') }}
                >
                  Runway ML
                </button>
                <button
                  type="button"
                  className={`${styles.platformBtn} ${videoPlatform === 'seedance' ? styles.platformBtnActiveSeedance : ''}`}
                  onClick={() => { setVideoPlatform('seedance'); setWithAudio(false) }}
                >
                  Seedance v1.5 Pro
                </button>
              </div>
              {videoPlatform === 'seedance' && (
                <p className={styles.platformNote}>10s portrait video with native AI audio</p>
              )}
            </div>

            {/* Options */}
            <div className={styles.optionsGrid}>
              <OptionCard label="Brand Name">
                <StyledInput value={brandName} onChange={setBrandName} placeholder="e.g. Chanel, Dior, Your Brand..." />
              </OptionCard>
              <OptionCard label="Perfume Name">
                <StyledInput value={perfumeName} onChange={setPerfumeName} placeholder="e.g. Midnight Oud, No. 5..." />
              </OptionCard>
              <OptionCard label="Content Style">
                <StyledSelect value={contentStyle} onChange={setContentStyle} options={CONTENT_STYLES} />
              </OptionCard>
              <OptionCard label="Target Audience">
                <StyledSelect value={audience} onChange={setAudience} options={AUDIENCES} />
              </OptionCard>
              <OptionCard label="Call to Action">
                <StyledSelect value={cta} onChange={setCta} options={CTAS} />
              </OptionCard>
              <OptionCard label="Video Duration">
                <StyledSelect value={videoDuration} onChange={v => {
                  setVideoDuration(v)
                  if (v === '30') setWithAudio(false)
                }} options={durationOpts} />
              </OptionCard>
            </div>

            {/* Extra details */}
            <div className={styles.extraInstructionsWrap}>
              <div className={styles.optionLabel}>Video Details <span className={styles.optionalTag}>(optional)</span></div>
              <textarea
                className={styles.textarea}
                value={videoDetails}
                onChange={e => setVideoDetails(e.target.value)}
                placeholder="e.g. It's a limited edition summer release, target brides, emphasise the floral top notes..."
                rows={2}
              />
            </div>

            {/* Feature toggles */}
            <div className={styles.toggleGroup}>
              <label className={styles.audioToggle}>
                <input type="checkbox" checked={withNarration} onChange={e => setWithNarration(e.target.checked)} />
                <span className={styles.audioToggleLabel}>🎙 Add video narration script</span>
              </label>
              <label className={styles.audioToggle}>
                <input type="checkbox" checked={withMusic} onChange={e => setWithMusic(e.target.checked)} />
                <span className={styles.audioToggleLabel}>🎵 Add background music suggestion</span>
              </label>
            </div>

            {/* Audio toggle — Runway only */}
            {videoPlatform === 'runway' && videoDuration !== '30' && (
              <div className={styles.audioToggleRow}>
                <label className={styles.audioToggle}>
                  <input
                    type="checkbox"
                    checked={withAudio}
                    onChange={e => {
                      setWithAudio(e.target.checked)
                      if (e.target.checked && !['4','6','8'].includes(videoDuration)) {
                        setVideoDuration('8')
                      }
                    }}
                  />
                  <span className={styles.audioToggleLabel}>
                    🔊 Generate with AI audio (uses Veo 3.1 Fast model — 4/6/8s only)
                  </span>
                </label>
              </div>
            )}

            {genError && <div className={styles.errorMsg}>⚠ {genError}</div>}

            <button
              className={styles.generateBtn}
              disabled={!imageBase64 || genStep === 'loading'}
              onClick={generateContent}
            >
              {genStep === 'loading' ? (
                <span className={styles.btnLoading}>
                  <span className={`${styles.spinner} spin`} /> Generating...
                </span>
              ) : '✦ Generate TikTok Content'}
            </button>
          </>
        )}

        {/* ── Loading spinner ── */}
        {genStep === 'loading' && (
          <div className={styles.loadingCenter}>
            <div className={`${styles.ring} spin`} />
            <p className={styles.loadingText}>Crafting your content...</p>
          </div>
        )}

        {/* ── Results ── */}
        {genStep === 'done' && content && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>
                Your <em>Content</em>
                {(content.brandName || brandName) && (
                  <span className={styles.resultsBrand}> — {content.brandName || brandName}</span>
                )}
              </h2>
              <button className={styles.newBtn} onClick={resetAll}>↩ Start Over</button>
            </div>

            <ContentCard icon="🔮" iconBg="linear-gradient(135deg,rgba(255,200,0,0.2),rgba(255,100,0,0.2))"
              title="Perfume Vibe Analysis" copyText={content.vibeAnalysis}>
              <p className={styles.bodyText}>{content.vibeAnalysis}</p>
            </ContentCard>

            <ContentCard icon="⚡" iconBg="linear-gradient(135deg,rgba(255,200,0,0.2),rgba(255,100,0,0.2))"
              title="Scroll-Stopping Hook" copyText={content.hook}>
              <p className={styles.hookText}>"{content.hook}"</p>
            </ContentCard>

            <ContentCard icon="🎬" iconBg="linear-gradient(135deg,rgba(255,45,85,0.2),rgba(105,201,208,0.2))"
              title="Video Script" copyText={scriptCopy}>
              {([
                [`Hook (${timing.hook})`, content.script.hook],
                [`Build-Up (${timing.buildup})`, content.script.buildup],
                [`Reveal (${timing.reveal})`, content.script.reveal],
                [`CTA (${timing.cta})`, content.script.cta],
              ] as [string, string][]).map(([label, text]) => (
                <div key={label} className={styles.scriptSection}>
                  <div className={styles.scriptLabel}>{label}</div>
                  <p className={styles.bodyText}>{text}</p>
                </div>
              ))}
            </ContentCard>

            {content.narrationScript && (
              <ContentCard icon="🎙" iconBg="linear-gradient(135deg,rgba(105,201,208,0.2),rgba(179,136,255,0.2))"
                title="Video Narration Script"
                copyText={`HOOK: ${content.narrationScript.hook}\n\nBUILD-UP: ${content.narrationScript.buildup}\n\nREVEAL: ${content.narrationScript.reveal}\n\nCTA: ${content.narrationScript.cta}`}>
                {([
                  [`Hook (${timing.hook})`, content.narrationScript.hook],
                  [`Build-Up (${timing.buildup})`, content.narrationScript.buildup],
                  [`Reveal (${timing.reveal})`, content.narrationScript.reveal],
                  [`CTA (${timing.cta})`, content.narrationScript.cta],
                ] as [string, string][]).map(([label, text]) => (
                  <div key={label} className={styles.scriptSection}>
                    <div className={styles.scriptLabel}>{label}</div>
                    <p className={styles.bodyText}>{text}</p>
                  </div>
                ))}
              </ContentCard>
            )}

            {content.musicSuggestion && (
              <ContentCard icon="🎵" iconBg="linear-gradient(135deg,rgba(201,168,76,0.2),rgba(255,45,85,0.1))"
                title="Background Music Suggestion" copyText={content.musicSuggestion}>
                <p className={styles.bodyText}>{content.musicSuggestion}</p>
              </ContentCard>
            )}

            <ContentCard icon="✍️" iconBg="linear-gradient(135deg,rgba(179,136,255,0.2),rgba(105,201,208,0.2))"
              title="TikTok Caption" copyText={content.caption}>
              <p className={styles.bodyText}>{content.caption}</p>
            </ContentCard>

            <ContentCard icon="#" iconBg="rgba(201,168,76,0.15)"
              title="Hashtags" copyText={content.hashtags.map(h => '#' + h).join(' ')}>
              <div className={styles.hashtagCloud}>
                {content.hashtags.map(h => (
                  <span key={h} className={styles.hashtagPill}>#{h}</span>
                ))}
              </div>
            </ContentCard>

            <ContentCard icon="💡" iconBg="linear-gradient(135deg,rgba(179,136,255,0.2),rgba(105,201,208,0.2))"
              title="Pro Filming Tips" copyText={content.tips.join('\n')}>
              <div className={styles.tipsBox}>
                {content.tips.map((t, i) => (
                  <div key={i} className={styles.tipRow}>
                    <span className={styles.tipArrow}>→</span>
                    <p className={styles.tipText}>{t}</p>
                  </div>
                ))}
              </div>
            </ContentCard>

            {/* ── Video section ── */}
            <div className={styles.videoDivider}>
              <div className={styles.dividerLine} />
              <span className={styles.dividerLabel}>
                {videoPlatform === 'seedance' ? 'AI Video via Seedance v1.5 Pro' : 'AI Video via Runway ML'}
              </span>
              <div className={styles.dividerLine} />
            </div>

            {/* Video controls */}
            {(videoStep === 'idle' || videoStep === 'error') && (
              <>
                <div className={styles.optionsGrid}>
                  <OptionCard label="Visual Style">
                    <StyledSelect value={videoStyle} onChange={setVideoStyle} options={VIDEO_STYLES} />
                  </OptionCard>
                  <OptionCard label="Background">
                    <StyledSelect value={background} onChange={setBackground} options={BACKGROUNDS} />
                  </OptionCard>
                </div>

                {/* Extra instructions */}
                <div className={styles.extraInstructionsWrap}>
                  <div className={styles.optionLabel}>Additional Video Instructions <span className={styles.optionalTag}>(optional)</span></div>
                  <textarea
                    className={styles.textarea}
                    value={extraInstructions}
                    onChange={e => setExtraInstructions(e.target.value)}
                    placeholder="e.g. Add slow-motion water droplets falling on the bottle, golden particles floating, close-up on the cap..."
                    rows={3}
                  />
                </div>

                <div className={styles.videoMeta}>
                  {videoPlatform === 'seedance' ? (
                    <>
                      <span>Duration: <strong>{videoDuration}s</strong></span>
                      <span className={styles.audioBadge}>Native AI Audio</span>
                    </>
                  ) : (
                    <>
                      <span>Duration: <strong>{isMultiClip ? '3 × 10s clips' : videoDuration + 's'}</strong></span>
                      {withAudio && <span className={styles.audioBadge}>AI Audio</span>}
                      {isMultiClip && <span className={styles.multiClipNote}>3 parallel generations • stitch in TikTok editor</span>}
                    </>
                  )}
                </div>

                {videoStep === 'error' && <div className={styles.errorMsg}>⚠ {videoError} — please try again.</div>}
                <button
                  className={videoPlatform === 'seedance' ? styles.generateSeedanceBtn : styles.generateVideoBtn}
                  onClick={generateVideo}
                >
                  {videoPlatform === 'seedance' ? 'Generate Video with Seedance' : 'Generate TikTok Video with Runway'}
                </button>
              </>
            )}

            {/* Generating */}
            {videoStep === 'submitting' && (
              <div className={styles.videoStatusCard}>
                <div className={`${styles.videoRing} spin`} />
                <p className={styles.videoStatusTitle}>
                  {isMultiClip ? 'Generating 3 clips in parallel...' : 'Generating your video...'}
                </p>
                <p className={styles.videoStatusSub}>{videoStatusText}</p>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${videoProgress}%` }} />
                </div>
                <p className={styles.progressLabel}>
                  {isMultiClip ? 'Each clip takes 1–3 minutes ☕' : 'This takes 1–3 minutes ☕'}
                </p>
              </div>
            )}

            {/* Single clip done */}
            {videoStep === 'done' && !isMultiClip && videoUrl && (
              <div className={styles.videoResultCard}>
                <video src={videoUrl} controls playsInline className={styles.videoEl} />
                <div className={styles.videoActions}>
                  <a href={videoUrl} download="tiktok-perfume-video.mp4" className={styles.dlBtn}>
                    ⬇ Download Video
                  </a>
                  <button className={styles.regenBtn} onClick={() => setVideoStep('idle')}>↩ Regenerate</button>
                </div>
              </div>
            )}

            {/* Multi-clip done */}
            {videoStep === 'done' && isMultiClip && (
              <div className={styles.multiClipGrid}>
                {(['Hook', 'Build-Up', 'Reveal & CTA'] as const).map((label, i) => (
                  <div key={i}>
                    <ClipCard label={`Clip ${i + 1} — ${label}`} url={clipUrls[i]} />
                    {clipErrors[i] && <div className={styles.errorMsg}>⚠ {clipErrors[i]}</div>}
                  </div>
                ))}
                <button className={styles.regenBtn} onClick={() => { setVideoStep('idle'); setClipUrls([null,null,null]) }}>
                  ↩ Regenerate All
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}
