'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import styles from './page.module.css'

/* ── Types ───────────────────────────────────────────────── */
type Step =
  | 'upload'
  | 'prompts-loading'
  | 'prompts-ready'
  | 'frame-loading'
  | 'frame-ready'
  | 'video-config'
  | 'video-loading'
  | 'video-done'

type Resolution = '480p' | '720p' | '1080p'
type Aspect = 'auto' | '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16'

/* ── Constants ───────────────────────────────────────────── */
const GENDERS = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'unisex', label: 'Unisex' },
]

const PARFUM_TYPES = [
  { value: 'PARFUM', label: 'PARFUM' },
  { value: 'EAU DE PARFUM', label: 'EAU DE PARFUM' },
]

const END_CARDS = [
  { value: 'bienitu',   label: 'BIENÍTU' },
  { value: 'levantier', label: 'LEVANTIER DUBAI' },
]

const CAMERA_STYLES = [
  { value: 'auto',              label: '🎲 Auto (random each time)' },
  { value: 'Zoom in',           label: '🔍 Zoom In' },
  { value: 'Zoom out',          label: '🔎 Zoom Out' },
  { value: 'Dolly in',          label: '▶ Dolly In' },
  { value: 'Dolly out',         label: '◀ Dolly Out' },
  { value: 'Pan left to right', label: '→ Pan Left to Right' },
  { value: 'Pan right to left', label: '← Pan Right to Left' },
  { value: 'Tilt top to bottom', label: '↓ Tilt Top to Bottom' },
  { value: 'Tilt bottom to top', label: '↑ Tilt Bottom to Top' },
]

const VIDEO_DURATIONS = [
  { value: '4',  label: '4s' },
  { value: '5',  label: '5s' },
  { value: '6',  label: '6s' },
  { value: '7',  label: '7s' },
  { value: '8',  label: '8s — Recommended' },
  { value: '9',  label: '9s' },
  { value: '10', label: '10s' },
  { value: '12', label: '12s' },
  { value: '15', label: '15s' },
]

const RESOLUTIONS: { value: Resolution; label: string }[] = [
  { value: '480p',  label: '480p' },
  { value: '720p',  label: '720p — Recommended' },
  { value: '1080p', label: '1080p' },
]

const SEEDANCE_DURATIONS = [
  { value: 'auto', label: 'Auto' },
  { value: '4',  label: '4s' },
  { value: '5',  label: '5s' },
  { value: '6',  label: '6s' },
  { value: '7',  label: '7s' },
  { value: '8',  label: '8s' },
  { value: '9',  label: '9s' },
  { value: '10', label: '10s' },
  { value: '11', label: '11s' },
  { value: '12', label: '12s' },
  { value: '13', label: '13s' },
  { value: '14', label: '14s' },
  { value: '15', label: '15s' },
]

const ASPECTS: { value: Aspect; label: string }[] = [
  { value: 'auto', label: 'Auto (from image)' },
  { value: '9:16', label: '9:16 — Portrait' },
  { value: '3:4',  label: '3:4' },
  { value: '1:1',  label: '1:1 — Square' },
  { value: '4:3',  label: '4:3' },
  { value: '16:9', label: '16:9 — Landscape' },
  { value: '21:9', label: '21:9 — Cinematic' },
]

/* ── UI helpers ──────────────────────────────────────────── */
function OptionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.optionCard}>
      <div className={styles.optionLabel}>{label}</div>
      {children}
    </div>
  )
}

function StyledSelect<T extends string>({ value, onChange, options }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select className={styles.select} value={value} onChange={e => onChange(e.target.value as T)}>
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

function PromptCard({
  title, icon, value, onChange,
}: { title: string; icon: string; value: string; onChange: (v: string) => void }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className={styles.contentCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardType}>
          <div className={styles.cardIcon} style={{ background: 'linear-gradient(135deg,rgba(105,201,208,0.2),rgba(179,136,255,0.2))' }}>{icon}</div>
          <span className={styles.cardTitle}>{title}</span>
        </div>
        <button className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ''}`} onClick={copy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className={styles.cardBody}>
        <textarea
          className={styles.textarea}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={Math.max(3, Math.min(8, Math.ceil(value.length / 80)))}
        />
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function Home() {
  // Flow state
  const [step, setStep] = useState<Step>('upload')
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(5)
  const progressRef = useRef<NodeJS.Timeout | null>(null)

  // Image
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMediaType, setImageMediaType] = useState<string>('image/jpeg')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Form (step 1)
  const [brandName, setBrandName] = useState('')
  const [perfumeName, setPerfumeName] = useState('')
  const [gender, setGender] = useState('women')
  const [parfumType, setParfumType] = useState('PARFUM')
  const [cameraStyle, setCameraStyle] = useState('auto')
  const [resolvedCameraStyle, setResolvedCameraStyle] = useState('')
  const [videoDuration, setVideoDuration] = useState('8')
  const [customScene, setCustomScene] = useState('')

  // Generated prompts (step 3)
  const [positivePrompt, setPositivePrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [firstFramePrompt, setFirstFramePrompt] = useState('')

  // First-frame image
  const [firstFrameUrl, setFirstFrameUrl] = useState('')

  // Seedance video options (step 6)
  const [seedanceResolution, setSeedanceResolution] = useState<Resolution>('720p')
  const [seedanceDuration, setSeedanceDuration] = useState('auto')
  const [seedanceAspect, setSeedanceAspect] = useState<Aspect>('9:16')
  const [seedanceAudio, setSeedanceAudio] = useState(true)
  const [endCard, setEndCard] = useState('bienitu')

  // Final video
  const [videoUrl, setVideoUrl] = useState('')
  const [audioDropped, setAudioDropped] = useState(false)

  useEffect(() => () => {
    if (progressRef.current) clearInterval(progressRef.current)
  }, [])

  /* ── Image upload ── */
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => {
      const originalUrl = e.target?.result as string
      const originalB64 = originalUrl.split(',')[1]
      const MAX_B64 = 4_500_000

      if (originalB64.length <= MAX_B64) {
        setImageDataUrl(originalUrl)
        setImageBase64(originalB64)
        setImageMediaType(file.type)
        return
      }

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, 3000 / Math.max(img.width, img.height))
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        const tryQ = (q: number) => canvas.toDataURL('image/jpeg', q)

        let lo = 0.4, hi = 0.95, best = tryQ(0.95)
        for (let i = 0; i < 7; i++) {
          const mid = (lo + hi) / 2
          const attempt = tryQ(mid)
          if (attempt.split(',')[1].length <= MAX_B64) { lo = mid; best = attempt }
          else hi = mid
        }
        setImageDataUrl(best)
        setImageBase64(best.split(',')[1])
        setImageMediaType('image/jpeg')
      }
      img.src = originalUrl
    }
    reader.readAsDataURL(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  /* ── Progress helpers ── */
  const startProgress = (ceiling = 90, tickMs = 1200) => {
    if (progressRef.current) clearInterval(progressRef.current)
    setProgress(8)
    progressRef.current = setInterval(() => {
      setProgress(p => Math.min(p + 1, ceiling))
    }, tickMs)
  }
  const stopProgress = (final = 100) => {
    if (progressRef.current) clearInterval(progressRef.current)
    progressRef.current = null
    setProgress(final)
  }

  const downloadFile = async (url: string, filename: string) => {
    try {
      const blob = await fetch(url).then(r => r.blob())
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      a.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  /* ── Step 1 → 3: Generate the 3 prompts ── */
  const generatePrompts = async () => {
    if (!imageBase64) return
    setStep('prompts-loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64, imageMediaType,
          brandName, perfumeName, gender, parfumType, cameraStyle, videoDuration, customScene,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Prompt generation failed')
      setPositivePrompt(data.positivePrompt)
      setNegativePrompt(data.negativePrompt)
      setFirstFramePrompt(data.firstFramePrompt)
      setResolvedCameraStyle(data.cameraStyle || '')
      setStep('prompts-ready')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setStep('upload')
    }
  }

  /* ── Step 3 → 5: Generate first-frame image ── */
  const generateFirstFrame = async () => {
    if (!imageBase64 || !firstFramePrompt) return
    setStep('frame-loading')
    setErrorMsg('')
    startProgress(90, 1500)
    try {
      const res = await fetch('/api/first-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64, imageMediaType,
          firstFramePrompt,
          aspectRatio: seedanceAspect === 'auto' ? '9:16' : seedanceAspect,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'First-frame generation failed')
      stopProgress()
      setFirstFrameUrl(data.imageUrl)
      setStep('frame-ready')
    } catch (e: unknown) {
      stopProgress(0)
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setStep('prompts-ready')
    }
  }

  /* ── Step 5 → 6: Approve first frame, configure video ── */
  const approveFirstFrame = () => {
    // Sync seedance duration default to user's intended video duration
    setSeedanceDuration(prev => prev === 'auto' ? videoDuration : prev)
    setStep('video-config')
  }

  /* ── Step 6 → 8: Generate Seedance video ── */
  const generateVideo = async () => {
    if (!firstFrameUrl) return
    setStep('video-loading')
    setErrorMsg('')
    startProgress(92, 3500)
    try {
      const neg = negativePrompt.trim()

      // Always append the resolved camera style name so Seedance knows the intended
      // move even if the user edited the positive prompt and removed it.
      const positiveWithCamera = resolvedCameraStyle && resolvedCameraStyle !== 'auto' &&
        !positivePrompt.toLowerCase().includes(resolvedCameraStyle.toLowerCase())
          ? `${positivePrompt} Camera move: ${resolvedCameraStyle}.`
          : positivePrompt

      const combinedPrompt = neg
        ? `positivePrompt - ${positiveWithCamera} negativePrompt-${neg}`
        : positiveWithCamera

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 420_000) // 7 min client timeout
      let res: Response
      try {
        res = await fetch('/api/seedance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            imageUrl: firstFrameUrl,
            prompt: combinedPrompt,
            resolution: seedanceResolution,
            duration: seedanceDuration,
            aspectRatio: seedanceAspect,
            generateAudio: seedanceAudio,
            endCard,
          }),
        })
      } finally {
        clearTimeout(timeoutId)
      }
      const text = await res.text()
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Server error: ${text.slice(0, 120)}`)
      }
      if (!res.ok || data.error) throw new Error(String(data.error) || 'Video generation failed')
      stopProgress()
      setVideoUrl(String(data.videoUrl))
      setAudioDropped(seedanceAudio && data.audioUsed === false)
      setStep('video-done')
    } catch (e: unknown) {
      stopProgress(0)
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setStep('video-config')
    }
  }

  const resetAll = () => {
    if (progressRef.current) clearInterval(progressRef.current)
    setStep('upload')
    setErrorMsg('')
    setProgress(5)
    setImageBase64(null); setImageDataUrl(null); setImageMediaType('image/jpeg')
    setBrandName(''); setPerfumeName(''); setGender('women'); setParfumType('PARFUM'); setCameraStyle('auto'); setResolvedCameraStyle(''); setEndCard('bienitu')
    setVideoDuration('8'); setCustomScene('')
    setPositivePrompt(''); setNegativePrompt(''); setFirstFramePrompt('')
    setFirstFrameUrl('')
    setSeedanceResolution('720p'); setSeedanceDuration('auto')
    setSeedanceAspect('9:16'); setSeedanceAudio(true)
    setVideoUrl('')
  }

  /* ── Render ──────────────────────────────────────────────── */
  const showInitialForm = step === 'upload'
  const showPromptsLoading = step === 'prompts-loading'
  const showPromptsReady = step === 'prompts-ready' || step === 'frame-loading'
  const showFrameLoading = step === 'frame-loading'
  const showFrameReady = step === 'frame-ready'
  const showVideoConfig = step === 'video-config' || step === 'video-loading'
  const showVideoLoading = step === 'video-loading'
  const showVideoDone = step === 'video-done'

  return (
    <main className={styles.main}>
      <div className={styles.container}>

        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.logoTag}>AI Perfume Video Studio</div>
          <h1 className={styles.h1}>Scent &amp; <em>Scroll</em></h1>
          <p className={styles.subtitle}>Image → Cinematic Video, powered by Seedance 2.0</p>
          <div className={styles.badgeRow}>
            <span className={`${styles.badge} ${styles.badgeClaude}`}>✦ Prompts by Claude</span>
            <span className={`${styles.badge} ${styles.badgeRunway}`}>Seedance 2.0 · Nano Banana</span>
          </div>
        </header>

        {/* ── Step 1: Upload + form ── */}
        {showInitialForm && (
          <>
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

            <div className={styles.optionsGrid}>
              <OptionCard label="Brand Name">
                <StyledInput value={brandName} onChange={setBrandName} placeholder="e.g. Chanel, Dior, Your Brand..." />
              </OptionCard>
              <OptionCard label="Perfume Name">
                <StyledInput value={perfumeName} onChange={setPerfumeName} placeholder="e.g. Midnight Oud, No. 5..." />
              </OptionCard>
              <OptionCard label="Gender">
                <StyledSelect value={gender} onChange={setGender} options={GENDERS} />
              </OptionCard>
              <OptionCard label="Parfum Type">
                <StyledSelect value={parfumType} onChange={setParfumType} options={PARFUM_TYPES} />
              </OptionCard>
              <OptionCard label="Video Duration">
                <StyledSelect value={videoDuration} onChange={setVideoDuration} options={VIDEO_DURATIONS} />
              </OptionCard>
              <OptionCard label="Camera Style">
                <StyledSelect value={cameraStyle} onChange={setCameraStyle} options={CAMERA_STYLES} />
              </OptionCard>
              <OptionCard label="End Card">
                <StyledSelect value={endCard} onChange={setEndCard} options={END_CARDS} />
              </OptionCard>
            </div>

            <div className={styles.extraInstructionsWrap}>
              <div className={styles.optionLabel}>Scene Description <span className={styles.optionalTag}>(optional)</span></div>
              <textarea
                className={styles.textarea}
                value={customScene}
                onChange={e => setCustomScene(e.target.value)}
                placeholder="Describe the scene you want — e.g. golden hour on a windswept cliff, slow dolly toward the bottle, floating silk... Leave empty to let the AI invent one."
                rows={3}
              />
            </div>

            {errorMsg && <div className={styles.errorMsg}>⚠ {errorMsg}</div>}

            <button
              className={styles.generateBtn}
              disabled={!imageBase64}
              onClick={generatePrompts}
            >
              ✦ Generate AI Prompts
            </button>
          </>
        )}

        {/* ── Step 2: Prompts loading ── */}
        {showPromptsLoading && (
          <div className={styles.loadingCenter}>
            <div className={`${styles.ring} spin`} />
            <p className={styles.loadingText}>Claude is crafting your prompts...</p>
          </div>
        )}

        {/* ── Step 3: Prompts ready + first-frame loading overlay ── */}
        {showPromptsReady && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>
                Your <em>AI Prompts</em>
                {(brandName || perfumeName) && (
                  <span className={styles.resultsBrand}> — {[brandName, perfumeName].filter(Boolean).join(' ')}</span>
                )}
              </h2>
              <button className={styles.newBtn} onClick={resetAll}>↩ Start Over</button>
            </div>

            <p className={styles.platformNote} style={{ marginBottom: 16 }}>
              Edit any prompt below before generating the first frame.
            </p>

            <PromptCard title="Positive Prompt" icon="✦" value={positivePrompt} onChange={setPositivePrompt} />
            <PromptCard title="Negative Prompt" icon="✕" value={negativePrompt} onChange={setNegativePrompt} />
            <PromptCard title="First-Frame Image Prompt" icon="🖼" value={firstFramePrompt} onChange={setFirstFramePrompt} />

            <div className={styles.optionsGrid}>
              <OptionCard label="First-Frame Aspect Ratio">
                <StyledSelect value={seedanceAspect} onChange={setSeedanceAspect} options={ASPECTS} />
              </OptionCard>
            </div>

            {errorMsg && <div className={styles.errorMsg}>⚠ {errorMsg}</div>}

            {showFrameLoading ? (
              <div className={styles.videoStatusCard}>
                <div className={`${styles.videoRing} spin`} />
                <p className={styles.videoStatusTitle}>Generating first frame...</p>
                <p className={styles.videoStatusSub}>Nano Banana is editing your bottle into the scene — 10–30 seconds</p>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <button
                className={styles.generateSeedanceBtn}
                disabled={!positivePrompt || !firstFramePrompt}
                onClick={generateFirstFrame}
              >
                Generate First Frame Image
              </button>
            )}
          </div>
        )}

        {/* ── Step 5: First frame ready — approve or regenerate ── */}
        {showFrameReady && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>Your <em>First Frame</em></h2>
              <button className={styles.newBtn} onClick={resetAll}>↩ Start Over</button>
            </div>

            <div className={styles.videoResultCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={firstFrameUrl} alt="Generated first frame" className={styles.videoEl} style={{ objectFit: 'contain', background: '#000' }} />
              <div className={styles.videoActions}>
                <button className={styles.regenBtn} onClick={generateFirstFrame}>↻ Regenerate</button>
                <button className={styles.dlBtn} onClick={() => downloadFile(firstFrameUrl!, 'first-frame.jpg')}>⬇ Download</button>
              </div>
            </div>

            {errorMsg && <div className={styles.errorMsg} style={{ marginTop: 16 }}>⚠ {errorMsg}</div>}

            <div className={styles.videoDivider}>
              <div className={styles.dividerLine} />
              <span className={styles.dividerLabel}>Approve to continue</span>
              <div className={styles.dividerLine} />
            </div>

            <button className={styles.generateSeedanceBtn} onClick={approveFirstFrame}>
              ✓ Approve & Configure Video
            </button>
            <button className={styles.newBtn} style={{ width: '100%', padding: '12px' }} onClick={() => setStep('prompts-ready')}>
              ← Back to prompts
            </button>
          </div>
        )}

        {/* ── Step 6: Video config + loading ── */}
        {showVideoConfig && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>Configure <em>Seedance 2.0</em></h2>
              <button className={styles.newBtn} onClick={resetAll}>↩ Start Over</button>
            </div>

            <div className={styles.videoResultCard} style={{ marginBottom: 20 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={firstFrameUrl} alt="First frame" className={styles.videoEl} style={{ objectFit: 'contain', background: '#000', maxHeight: 360 }} />
            </div>

            <div className={styles.optionsGrid}>
              <OptionCard label="Resolution">
                <StyledSelect value={seedanceResolution} onChange={setSeedanceResolution} options={RESOLUTIONS} />
              </OptionCard>
              <OptionCard label="Duration">
                <StyledSelect value={seedanceDuration} onChange={setSeedanceDuration} options={SEEDANCE_DURATIONS} />
              </OptionCard>
              <OptionCard label="Aspect Ratio">
                <StyledSelect value={seedanceAspect} onChange={setSeedanceAspect} options={ASPECTS} />
              </OptionCard>
              <OptionCard label="Audio">
                <label className={styles.audioToggle} style={{ marginTop: 4 }}>
                  <input type="checkbox" checked={seedanceAudio} onChange={e => setSeedanceAudio(e.target.checked)} />
                  <span className={styles.audioToggleLabel}>🔊 Generate synchronized audio</span>
                </label>
              </OptionCard>
            </div>

            {errorMsg && <div className={styles.errorMsg}>⚠ {errorMsg}</div>}

            {showVideoLoading ? (
              <div className={styles.videoStatusCard}>
                <div className={`${styles.videoRing} spin`} />
                <p className={styles.videoStatusTitle}>Generating your video...</p>
                <p className={styles.videoStatusSub}>Seedance 2.0 is rendering — typically 2–5 minutes ☕</p>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
                <p className={styles.progressLabel}>{progress}%</p>
              </div>
            ) : (
              <button className={styles.generateSeedanceBtn} onClick={generateVideo}>
                Generate Video with Seedance 2.0
              </button>
            )}
            {!showVideoLoading && (
              <button className={styles.newBtn} style={{ width: '100%', padding: '12px' }} onClick={() => setStep('frame-ready')}>
                ← Back to first frame
              </button>
            )}
          </div>
        )}

        {/* ── Step 8: Video done ── */}
        {showVideoDone && videoUrl && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>Your <em>Video</em></h2>
              <button className={styles.newBtn} onClick={resetAll}>↩ Start Over</button>
            </div>

            {audioDropped && (
              <div className={styles.errorMsg} style={{ marginBottom: '1rem' }}>
                ⚠ Audio was disabled — fal.ai flagged the generated audio as sensitive content. Video generated without audio.
              </div>
            )}
            <div className={styles.videoResultCard}>
              <video src={videoUrl} controls playsInline className={styles.videoEl} />
              <div className={styles.videoActions}>
                <button className={styles.dlBtn} onClick={() => downloadFile(videoUrl, 'perfume-video.mp4')}>⬇ Download Video</button>
                <button className={styles.regenBtn} onClick={() => setStep('video-config')}>↻ Regenerate</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
