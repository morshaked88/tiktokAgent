'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import styles from './page.module.css'

/* ── Types ───────────────────────────────────────────────── */
type AdMode = 'video' | 'image'

type Step =
  | 'upload'
  | 'prompts-loading'
  | 'prompts-ready'
  | 'frame-loading'
  | 'frame-ready'
  | 'video-config'
  | 'video-loading'
  | 'video-done'

type ImageStep =
  | 'upload'
  | 'prompts-loading'
  | 'prompts-ready'
  | 'generating'
  | 'done'

type Resolution = '480p' | '720p' | '1080p'
type Aspect = 'auto' | '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16'
type ImageAspect = '1:1' | '3:4' | '9:16' | '16:9' | '4:3'

type AdImage = { base64: string; mediaType: string; dataUrl: string }

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
  { value: 'lelin',     label: 'LELIN' },
]

const CAMERA_STYLES = [
  { value: 'auto',                 label: '🎲 Auto (random each time)' },
  { value: 'Hand grab & spritz',   label: '🖐 Hand Grab & Spritz' },
  { value: 'Splash drop',          label: '💧 Splash Drop' },
  { value: 'Fast orbit reveal',    label: '🌀 Fast Orbit Reveal' },
  { value: 'World transformation', label: '🌆 World Transformation' },
  { value: 'Silk reveal',          label: '🎗 Silk Reveal' },
  { value: 'Macro whip',           label: '🔬 Macro Whip' },
  { value: 'UGC vanity',           label: '🤳 UGC Vanity' },
  { value: 'Petal storm',          label: '🌸 Petal Storm' },
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

const IMAGE_AD_ASPECTS: { value: ImageAspect; label: string }[] = [
  { value: '1:1',  label: '1:1 — Square' },
  { value: '3:4',  label: '3:4 — Portrait' },
  { value: '9:16', label: '9:16 — Stories / Reels' },
  { value: '16:9', label: '16:9 — Landscape' },
  { value: '4:3',  label: '4:3 — Horizontal' },
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
  // Mode
  const [adMode, setAdMode] = useState<AdMode>('video')

  // Shared form fields (reused across both modes)
  const [brandName, setBrandName] = useState('')
  const [perfumeName, setPerfumeName] = useState('')
  const [gender, setGender] = useState('women')
  const [parfumType, setParfumType] = useState('PARFUM')

  // Shared UI state
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(5)
  const progressRef = useRef<NodeJS.Timeout | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  /* ─── VIDEO MODE state ─── */
  const [step, setStep] = useState<Step>('upload')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMediaType, setImageMediaType] = useState<string>('image/jpeg')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [cameraStyle, setCameraStyle] = useState('auto')
  const [resolvedCameraStyle, setResolvedCameraStyle] = useState('')
  const [videoDuration, setVideoDuration] = useState('8')
  const [customScene, setCustomScene] = useState('')
  const [positivePrompt, setPositivePrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [firstFramePrompt, setFirstFramePrompt] = useState('')
  const [firstFrameUrl, setFirstFrameUrl] = useState('')
  const [seedanceResolution, setSeedanceResolution] = useState<Resolution>('720p')
  const [seedanceDuration, setSeedanceDuration] = useState('auto')
  const [seedanceAspect, setSeedanceAspect] = useState<Aspect>('9:16')
  const [seedanceAudio, setSeedanceAudio] = useState(true)
  const [endCard, setEndCard] = useState('bienitu')
  const [videoUrl, setVideoUrl] = useState('')
  const [audioDropped, setAudioDropped] = useState(false)

  /* ─── IMAGE AD MODE state ─── */
  const [imageStep, setImageStep] = useState<ImageStep>('upload')
  const [adImages, setAdImages] = useState<AdImage[]>([])
  const [imageAdScene, setImageAdScene] = useState('')
  const [imageAdAspect, setImageAdAspect] = useState<ImageAspect>('1:1')
  const [imageAdPrompt, setImageAdPrompt] = useState('')
  const [imageAdResultUrl, setImageAdResultUrl] = useState('')
  const [adDragging, setAdDragging] = useState(false)
  const adFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    if (progressRef.current) clearInterval(progressRef.current)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
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
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100)
    } catch {
      window.open(url, '_blank')
    }
  }

  /* ── Shared image compression ── */
  const compressAndConvert = (
    file: File,
    onResult: (base64: string, mediaType: string, dataUrl: string) => void,
  ) => {
    const reader = new FileReader()
    reader.onload = e => {
      const originalUrl = e.target?.result as string
      const originalB64 = originalUrl.split(',')[1]
      const MAX_B64 = 4_500_000

      if (originalB64.length <= MAX_B64) {
        onResult(originalB64, file.type, originalUrl)
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
        onResult(best.split(',')[1], 'image/jpeg', best)
      }
      img.src = originalUrl
    }
    reader.readAsDataURL(file)
  }

  /* ─── VIDEO MODE handlers ─── */
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    compressAndConvert(file, (base64, mediaType, dataUrl) => {
      setImageDataUrl(dataUrl)
      setImageBase64(base64)
      setImageMediaType(mediaType)
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

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

  const approveFirstFrame = () => {
    setSeedanceDuration(prev => prev === 'auto' ? videoDuration : prev)
    setStep('video-config')
  }

  const generateVideo = async () => {
    if (!firstFrameUrl) return
    setStep('video-loading')
    setErrorMsg('')
    startProgress(92, 4000)

    // Seedance's image-to-video endpoint has no negative-prompt parameter —
    // appending the negative list to the prompt would inject the failure-mode
    // vocabulary ("label warping", "deformed hands") as generation content.
    // Send only the positive motion prompt.
    const combinedPrompt = positivePrompt.trim()

    // ── 1. Submit job (returns immediately with requestId) ──
    let requestId: string
    let audioUsed = seedanceAudio

    try {
      const submitRes = await fetch('/api/seedance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const submitData = await submitRes.json()
      if (!submitRes.ok || submitData.error) throw new Error(submitData.error || 'Submission failed')
      requestId = submitData.requestId
      audioUsed = submitData.audioUsed ?? seedanceAudio
    } catch (e: unknown) {
      stopProgress(0)
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setStep('video-config')
      return
    }

    // ── 2. Poll /api/seedance-poll every 5 s ──
    const MAX_POLLS = 84 // ~7 minutes
    let pollCount = 0
    let retried = false

    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    const poll = async () => {
      pollCount++
      if (pollCount > MAX_POLLS) {
        stopPolling()
        stopProgress(0)
        setErrorMsg('Video generation timed out after 7 minutes. Please try again.')
        setStep('video-config')
        return
      }

      try {
        const pollRes = await fetch(`/api/seedance-poll?requestId=${requestId}`)
        const pollData = await pollRes.json()

        if (pollData.pending) return // still processing

        // Audio content-filter error — retry once without audio
        if (!pollRes.ok && pollData.audioError && audioUsed && !retried) {
          retried = true
          audioUsed = false
          const retryRes = await fetch('/api/seedance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: firstFrameUrl,
              prompt: combinedPrompt,
              resolution: seedanceResolution,
              duration: seedanceDuration,
              aspectRatio: seedanceAspect,
              generateAudio: false,
              endCard,
            }),
          })
          const retryData = await retryRes.json()
          if (!retryRes.ok || retryData.error) throw new Error(retryData.error || 'Retry failed')
          requestId = retryData.requestId
          pollCount = 0
          return
        }

        if (!pollRes.ok || pollData.error) throw new Error(pollData.error || 'Video generation failed')

        // Done
        stopPolling()
        stopProgress()
        setVideoUrl(String(pollData.videoUrl))
        setAudioDropped(seedanceAudio && !audioUsed)
        setStep('video-done')
      } catch (e: unknown) {
        stopPolling()
        stopProgress(0)
        setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
        setStep('video-config')
      }
    }

    pollIntervalRef.current = setInterval(poll, 5000)
    poll() // immediate first check
  }

  const resetAll = () => {
    if (progressRef.current) clearInterval(progressRef.current)
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
    setStep('upload')
    setErrorMsg('')
    setProgress(5)
    setImageBase64(null); setImageDataUrl(null); setImageMediaType('image/jpeg')
    setBrandName(''); setPerfumeName(''); setGender('women'); setParfumType('PARFUM')
    setCameraStyle('auto'); setResolvedCameraStyle(''); setEndCard('bienitu')
    setVideoDuration('8'); setCustomScene('')
    setPositivePrompt(''); setNegativePrompt(''); setFirstFramePrompt('')
    setFirstFrameUrl('')
    setSeedanceResolution('720p'); setSeedanceDuration('auto')
    setSeedanceAspect('9:16'); setSeedanceAudio(true)
    setVideoUrl('')
  }

  /* ─── IMAGE AD MODE handlers ─── */
  const processAdFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    compressAndConvert(file, (base64, mediaType, dataUrl) => {
      setAdImages(prev => {
        if (prev.length >= 4) return prev
        return [...prev, { base64, mediaType, dataUrl }]
      })
    })
  }

  const processAdFiles = (files: FileList | File[]) => {
    const arr = Array.from(files)
    arr.forEach(f => processAdFile(f))
  }

  const removeAdImage = (index: number) => {
    setAdImages(prev => prev.filter((_, i) => i !== index))
  }

  const onAdDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setAdDragging(false)
    processAdFiles(e.dataTransfer.files)
  }, [adImages])

  const generateImagePrompts = async () => {
    if (!adImages.length) return
    setImageStep('prompts-loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/image-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: adImages.map(img => ({ base64: img.base64, mediaType: img.mediaType })),
          brandName, perfumeName, gender, parfumType,
          customScene: imageAdScene,
          aspectRatio: imageAdAspect,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Prompt generation failed')
      setImageAdPrompt(data.adPrompt)
      setImageStep('prompts-ready')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setImageStep('upload')
    }
  }

  const generateImageAd = async () => {
    if (!adImages.length || !imageAdPrompt) return
    setImageStep('generating')
    setErrorMsg('')
    startProgress(90, 1800)
    try {
      const res = await fetch('/api/image-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: adImages.map(img => ({ base64: img.base64, mediaType: img.mediaType })),
          prompt: imageAdPrompt,
          aspectRatio: imageAdAspect,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Image generation failed')
      stopProgress()
      setImageAdResultUrl(data.imageUrl)
      setImageStep('done')
    } catch (e: unknown) {
      stopProgress(0)
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setImageStep('prompts-ready')
    }
  }

  const resetImageAd = () => {
    if (progressRef.current) clearInterval(progressRef.current)
    setImageStep('upload')
    setAdImages([])
    setImageAdScene('')
    setImageAdAspect('1:1')
    setImageAdPrompt('')
    setImageAdResultUrl('')
    setErrorMsg('')
    setProgress(5)
  }

  const switchMode = (mode: AdMode) => {
    if (mode === adMode) return
    setAdMode(mode)
    setErrorMsg('')
  }

  /* ── Render helpers ── */
  const showVideoInitialForm = adMode === 'video' && step === 'upload'
  const showVideoPromptsLoading = adMode === 'video' && step === 'prompts-loading'
  const showVideoPromptsReady = adMode === 'video' && (step === 'prompts-ready' || step === 'frame-loading')
  const showVideoFrameLoading = adMode === 'video' && step === 'frame-loading'
  const showVideoFrameReady = adMode === 'video' && step === 'frame-ready'
  const showVideoConfig = adMode === 'video' && (step === 'video-config' || step === 'video-loading')
  const showVideoLoading = adMode === 'video' && step === 'video-loading'
  const showVideoDone = adMode === 'video' && step === 'video-done'

  const showImageForm = adMode === 'image' && imageStep === 'upload'
  const showImagePromptsLoading = adMode === 'image' && imageStep === 'prompts-loading'
  const showImagePromptsReady = adMode === 'image' && imageStep === 'prompts-ready'
  const showImageGenerating = adMode === 'image' && imageStep === 'generating'
  const showImageDone = adMode === 'image' && imageStep === 'done'

  return (
    <main className={styles.main}>
      <div className={styles.container}>

        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.logoTag}>AI Perfume Ad Studio</div>
          <h1 className={styles.h1}>Scent &amp; <em>Scroll</em></h1>
          <p className={styles.subtitle}>Powered by Claude · Flux Kontext · Seedance 2.0</p>
          <div className={styles.badgeRow}>
            <span className={`${styles.badge} ${styles.badgeClaude}`}>✦ Prompts by Claude</span>
            <span className={`${styles.badge} ${styles.badgeRunway}`}>Flux Kontext · Seedance 2.0</span>
          </div>
        </header>

        {/* ── Mode Toggle ── */}
        <div className={styles.modeToggleRow}>
          <button
            className={`${styles.modeToggleBtn} ${adMode === 'video' ? styles.modeToggleBtnActiveVideo : ''}`}
            onClick={() => switchMode('video')}
          >
            🎬 Video Ad
          </button>
          <button
            className={`${styles.modeToggleBtn} ${adMode === 'image' ? styles.modeToggleBtnActiveImage : ''}`}
            onClick={() => switchMode('image')}
          >
            🖼 Image Ad
          </button>
        </div>

        {/* ════════════════════════════════
            VIDEO MODE
        ════════════════════════════════ */}

        {/* ── Video Step 1: Upload + form ── */}
        {showVideoInitialForm && (
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
              <OptionCard label="Creative Style">
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

        {/* ── Video Step 2: Prompts loading ── */}
        {showVideoPromptsLoading && (
          <div className={styles.loadingCenter}>
            <div className={`${styles.ring} spin`} />
            <p className={styles.loadingText}>Claude is crafting your prompts...</p>
          </div>
        )}

        {/* ── Video Step 3: Prompts ready ── */}
        {showVideoPromptsReady && (
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
            <PromptCard title="First-Frame Image Prompt" icon="🖼" value={firstFramePrompt} onChange={setFirstFramePrompt} />

            <div className={styles.optionsGrid}>
              <OptionCard label="First-Frame Aspect Ratio">
                <StyledSelect value={seedanceAspect} onChange={setSeedanceAspect} options={ASPECTS} />
              </OptionCard>
            </div>

            {errorMsg && <div className={styles.errorMsg}>⚠ {errorMsg}</div>}

            {showVideoFrameLoading ? (
              <div className={styles.videoStatusCard}>
                <div className={`${styles.videoRing} spin`} />
                <p className={styles.videoStatusTitle}>Generating first frame...</p>
                <p className={styles.videoStatusSub}>Flux Kontext is compositing your bottle into the scene — 10–30 seconds</p>
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

        {/* ── Video Step 5: First frame ready ── */}
        {showVideoFrameReady && (
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

        {/* ── Video Step 6: Video config + loading ── */}
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

        {/* ── Video Step 8: Done ── */}
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

        {/* ════════════════════════════════
            IMAGE AD MODE
        ════════════════════════════════ */}

        {/* ── Image Step 1: Upload + form ── */}
        {showImageForm && (
          <>
            {/* Multi-image upload zone */}
            <div className={styles.adUploadSection}>
              {adImages.length === 0 ? (
                <div
                  className={`${styles.uploadZone} ${adDragging ? styles.uploadZoneDragging : ''}`}
                  onDragOver={e => { e.preventDefault(); setAdDragging(true) }}
                  onDragLeave={() => setAdDragging(false)}
                  onDrop={onAdDrop}
                  onClick={() => adFileRef.current?.click()}
                >
                  <span className={styles.uploadEmoji}>🌸</span>
                  <p className={styles.uploadTitle}>Drop perfume bottle photos here</p>
                  <p className={styles.uploadHint}>Up to 4 bottles · JPG, PNG, WEBP</p>
                  <button type="button" className={styles.uploadBtn} onClick={e => { e.stopPropagation(); adFileRef.current?.click() }}>
                    Choose Images
                  </button>
                </div>
              ) : (
                <div
                  className={`${styles.adImagesZone} ${adDragging ? styles.uploadZoneDragging : ''}`}
                  onDragOver={e => { e.preventDefault(); setAdDragging(true) }}
                  onDragLeave={() => setAdDragging(false)}
                  onDrop={onAdDrop}
                >
                  <div className={styles.adImagesGrid}>
                    {adImages.map((img, i) => (
                      <div key={i} className={styles.adImageThumb}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.dataUrl} alt={`Bottle ${i + 1}`} className={styles.adImageImg} />
                        <button
                          className={styles.adImageRemoveBtn}
                          onClick={() => removeAdImage(i)}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {adImages.length < 4 && (
                      <button
                        className={styles.adImageAddBtn}
                        onClick={() => adFileRef.current?.click()}
                        title="Add another bottle"
                      >
                        <span className={styles.adImageAddIcon}>+</span>
                        <span className={styles.adImageAddLabel}>Add bottle</span>
                      </button>
                    )}
                  </div>
                  <p className={styles.adImagesHint}>{adImages.length}/4 bottles · drag more to add</p>
                </div>
              )}
              <input
                ref={adFileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files) { processAdFiles(e.target.files); e.target.value = '' } }}
              />
            </div>

            {/* Form fields */}
            <div className={styles.optionsGrid}>
              <OptionCard label="Brand Name">
                <StyledInput value={brandName} onChange={setBrandName} placeholder="e.g. Chanel, BIENÍTU..." />
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
              <OptionCard label="Output Format">
                <StyledSelect value={imageAdAspect} onChange={setImageAdAspect} options={IMAGE_AD_ASPECTS} />
              </OptionCard>
            </div>

            <div className={styles.extraInstructionsWrap}>
              <div className={styles.optionLabel}>Scene Description <span className={styles.optionalTag}>(optional)</span></div>
              <textarea
                className={styles.textarea}
                value={imageAdScene}
                onChange={e => setImageAdScene(e.target.value)}
                placeholder="Describe the setting — e.g. marble countertop with roses, sunset on a yacht deck, dark velvet surface with gold accents... Leave empty and the AI invents one."
                rows={3}
              />
            </div>

            {errorMsg && <div className={styles.errorMsg}>⚠ {errorMsg}</div>}

            <button
              className={styles.generateBtn}
              disabled={adImages.length === 0}
              onClick={generateImagePrompts}
            >
              ✦ Generate Ad Prompt
            </button>
          </>
        )}

        {/* ── Image Step 2: Prompts loading ── */}
        {showImagePromptsLoading && (
          <div className={styles.loadingCenter}>
            <div className={`${styles.ring} spin`} />
            <p className={styles.loadingText}>Claude is crafting your ad prompt...</p>
          </div>
        )}

        {/* ── Image Step 3: Prompt ready ── */}
        {showImagePromptsReady && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>
                Your <em>Ad Prompt</em>
                {(brandName || perfumeName) && (
                  <span className={styles.resultsBrand}> — {[brandName, perfumeName].filter(Boolean).join(' ')}</span>
                )}
              </h2>
              <button className={styles.newBtn} onClick={resetImageAd}>↩ Start Over</button>
            </div>

            <p className={styles.platformNote} style={{ marginBottom: 16 }}>
              Edit the prompt below before generating your ad image.
            </p>

            <PromptCard title="Image Ad Prompt" icon="🖼" value={imageAdPrompt} onChange={setImageAdPrompt} />

            {errorMsg && <div className={styles.errorMsg}>⚠ {errorMsg}</div>}

            <button
              className={styles.generateImageAdBtn}
              disabled={!imageAdPrompt}
              onClick={generateImageAd}
            >
              ✦ Generate Image Ad
            </button>
            <button className={styles.newBtn} style={{ width: '100%', padding: '12px', marginTop: 8 }} onClick={() => setImageStep('upload')}>
              ← Back
            </button>
          </div>
        )}

        {/* ── Image Step 4: Generating ── */}
        {showImageGenerating && (
          <div className={styles.videoStatusCard}>
            <div className={`${styles.videoRing} spin`} style={{ borderTopColor: '#b388ff' }} />
            <p className={styles.videoStatusTitle}>Generating your ad image...</p>
            <p className={styles.videoStatusSub}>Flux Kontext is compositing your bottles — 15–45 seconds</p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed, #b388ff)' }} />
            </div>
            <p className={styles.progressLabel}>{progress}%</p>
          </div>
        )}

        {/* ── Image Step 5: Done ── */}
        {showImageDone && imageAdResultUrl && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>Your <em>Image Ad</em></h2>
              <button className={styles.newBtn} onClick={resetImageAd}>↩ Start Over</button>
            </div>

            <div className={styles.videoResultCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageAdResultUrl} alt="Generated ad image" className={styles.videoEl} style={{ objectFit: 'contain', background: '#000' }} />
              <div className={styles.videoActions}>
                <button className={styles.dlBtn} onClick={() => downloadFile(imageAdResultUrl, 'perfume-ad.jpg')}>⬇ Download Image</button>
                <button className={styles.regenBtn} onClick={generateImageAd}>↻ Regenerate</button>
              </div>
            </div>

            <button
              className={styles.newBtn}
              style={{ width: '100%', padding: '12px', marginTop: 16 }}
              onClick={() => setImageStep('prompts-ready')}
            >
              ← Edit Prompt
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
