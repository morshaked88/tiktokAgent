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
  caption: string
  hashtags: string[]
  tips: string[]
  videoPrompt: string
}

/* ── Constants ───────────────────────────────────────────── */
const CONTENT_STYLES = [
  { value: 'luxury',       label: '✨ Luxury & Aspirational' },
  { value: 'trendy',       label: '🔥 Trendy & Gen-Z' },
  { value: 'romantic',     label: '🌹 Romantic & Sensual' },
  { value: 'storytelling', label: '📖 Story-Driven' },
  { value: 'educational',  label: '🧪 Educational' },
]

const AUDIENCES = [
  { value: 'general',    label: 'General Fragrance Lovers' },
  { value: 'genz',       label: 'Gen Z (18–25)' },
  { value: 'millennials',label: 'Millennials (26–40)' },
  { value: 'luxury',     label: 'Luxury Shoppers' },
  { value: 'gifters',    label: 'Gift Buyers' },
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

  // Content generation
  const [genStep, setGenStep] = useState<'idle'|'loading'|'done'>('idle')
  const [genError, setGenError] = useState('')
  const [content, setContent] = useState<ContentResult | null>(null)

  // Video
  const [videoDuration, setVideoDuration] = useState('10')
  const [videoStyle, setVideoStyle] = useState('cinematic')
  const [videoStep, setVideoStep] = useState<'idle'|'submitting'|'done'|'error'>('idle')
  const [videoProgress, setVideoProgress] = useState(5)
  const [videoStatusText, setVideoStatusText] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoError, setVideoError] = useState('')
  const pollRef = useRef<NodeJS.Timeout | null>(null)

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
        body: JSON.stringify({ imageBase64, imageMediaType, brandName, perfumeName, contentStyle, audience, cta }),
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

  /* ── Step 2: Generate video via Runway SDK (server handles polling) ── */
  const generateVideo = async () => {
    if (!imageDataUrl || !content) return
    setVideoStep('submitting')
    setVideoError('')
    setVideoProgress(10)
    setVideoStatusText('Sending to Runway ML...')

    // Animate progress while server is processing (SDK polls internally)
    pollRef.current = setInterval(() => {
      setVideoProgress(p => Math.min(p + 2, 90))
      setVideoStatusText('Generating your video — this takes 1–3 minutes ☕')
    }, 5000)

    try {
      const res = await fetch('/api/runway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl,
          videoPrompt: content.videoPrompt,
          duration: videoDuration,
          visualStyle: videoStyle,
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

  const resetAll = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setImageBase64(null); setImageDataUrl(null); setImageMediaType('image/jpeg')
    setContent(null); setGenStep('idle'); setGenError('')
    setBrandName(''); setPerfumeName('')
    setVideoStep('idle'); setVideoUrl(''); setVideoError(''); setVideoProgress(5)
  }

  const scriptCopy = content
    ? `HOOK (0-3s): ${content.script.hook}\n\nBUILD-UP (3-15s): ${content.script.buildup}\n\nREVEAL (15-25s): ${content.script.reveal}\n\nCTA (25-30s): ${content.script.cta}`
    : ''

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
            <span className={`${styles.badge} ${styles.badgeRunway}`}>🎬 + Runway ML Video</span>
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
                  <label
                    htmlFor="fileInput"
                    className={styles.uploadBtn}
                    onClick={e => e.stopPropagation()}
                  >
                    Choose Image
                  </label>
                </>
              )}
              <input
                id="fileInput"
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]) }}
              />
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
            </div>

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
                ['🎬 Hook (0–3s)', content.script.hook],
                ['📈 Build-Up (3–15s)', content.script.buildup],
                ['✨ Reveal (15–25s)', content.script.reveal],
                ['📣 CTA (25–30s)', content.script.cta],
              ] as [string, string][]).map(([label, text]) => (
                <div key={label} className={styles.scriptSection}>
                  <div className={styles.scriptLabel}>{label}</div>
                  <p className={styles.bodyText}>{text}</p>
                </div>
              ))}
            </ContentCard>

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
              <span className={styles.dividerLabel}>🎬 AI Video via Runway ML</span>
              <div className={styles.dividerLine} />
            </div>

            {/* Controls */}
            {(videoStep === 'idle' || videoStep === 'error') && (
              <>
                <div className={styles.optionsGrid}>
                  <OptionCard label="Video Duration">
                    <StyledSelect value={videoDuration} onChange={setVideoDuration}
                      options={[{ value: '5', label: '5 seconds' }, { value: '10', label: '10 seconds' }]} />
                  </OptionCard>
                  <OptionCard label="Visual Style">
                    <StyledSelect value={videoStyle} onChange={setVideoStyle} options={VIDEO_STYLES} />
                  </OptionCard>
                </div>
                {videoStep === 'error' && <div className={styles.errorMsg}>⚠ {videoError} — please try again.</div>}
                <button className={styles.generateVideoBtn} onClick={generateVideo}>
                  🎬 Generate TikTok Video with Runway
                </button>
              </>
            )}

            {/* Generating */}
            {videoStep === 'submitting' && (
              <div className={styles.videoStatusCard}>
                <div className={`${styles.videoRing} spin`} />
                <p className={styles.videoStatusTitle}>Generating your video...</p>
                <p className={styles.videoStatusSub}>{videoStatusText}</p>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${videoProgress}%` }} />
                </div>
                <p className={styles.progressLabel}>This takes 1–3 minutes ☕</p>
              </div>
            )}

            {/* Done */}
            {videoStep === 'done' && videoUrl && (
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
          </div>
        )}

      </div>
    </main>
  )
}
