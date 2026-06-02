import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

// Curated list of distinct camera move profiles. One is picked at random per
// request to ensure videos feel visually varied instead of always defaulting
// to "slow push-in".
const CAMERA_STYLES: { name: string; description: string }[] = [
  {
    name: 'Slow push-in dolly',
    description: 'Camera starts at a medium-wide distance and slowly dollies straight in toward the bottle, gently compressing the scene around it, settling on a tight hero close-up.',
  },
  {
    name: 'Orbit half-circle',
    description: 'Camera orbits smoothly around the bottle in a 180° arc, revealing different sides of the scene while the bottle stays centered in frame. Ends facing the bottle straight-on at hero distance.',
  },
  {
    name: 'Crane descent',
    description: 'Camera starts elevated well above eye-line looking down, then cranes smoothly downward, settling at the bottle\'s mid-height for the hero shot.',
  },
  {
    name: 'Pull-back reveal',
    description: 'Camera starts in an extreme close-up on a single detail of the bottle (cap facet, label letter, light refraction in the glass), then slowly pulls straight back to reveal the wider scene around it.',
  },
  {
    name: 'Tilt-up from ground',
    description: 'Camera starts at ground or table-surface level looking up past foreground elements, then tilts smoothly upward, settling at bottle eye-level for the hero shot.',
  },
  {
    name: 'Whip-pan reveal',
    description: 'Camera holds on a scene element (a hand, a wave, a window, a flame), then whip-pans quickly to the bottle in a single motion, settling on it for the hero shot.',
  },
  {
    name: 'Tracking sidemove',
    description: 'Camera tracks sideways (left-to-right or right-to-left) past foreground elements, revealing the bottle mid-shot, continuing past briefly before settling back on it.',
  },
  {
    name: 'Boom rise',
    description: 'Camera starts low near the table or ground, then booms vertically upward past the bottle, settling at bottle mid-height looking slightly downward.',
  },
  {
    name: 'Rack focus pull',
    description: 'Camera holds position throughout. Focus starts on a foreground element (a flower, a model\'s eyes, a flame), then racks smoothly to pull focus to the bottle behind or beside it.',
  },
  {
    name: 'Handheld documentary drift',
    description: 'Subtle handheld camera with natural micro-movements, drifting organically around the bottle as if a documentary photographer is walking around it, ending on a steady hero shot.',
  },
  {
    name: 'Diagonal arc',
    description: 'Camera moves on a diagonal arc — starting low and to one side, sweeping up and across to the opposite side at bottle height — revealing the scene in a single sweeping motion.',
  },
  {
    name: 'Top-down to eye-level swoop',
    description: 'Camera starts overhead looking straight down at the bottle and surroundings, then swoops down and forward in one smooth motion to settle at bottle eye-level for the hero shot.',
  },
]

export async function POST(req: NextRequest) {
  try {
    const {
      imageBase64,
      imageMediaType,
      brandName,
      perfumeName,
      gender,
      parfumType,
      cameraStyle,
      videoDuration,
      customScene,
    } = await req.json()

    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
    if (!imageBase64 || !imageMediaType) throw new Error('Missing image')

    const brand = (brandName || '').trim()
    const perfume = (perfumeName || '').trim()
    const gen = (gender || 'unisex').trim()
    const dur = parseInt(videoDuration) || 8
    const scene = (customScene || '').trim()

    const type = (parfumType || 'PARFUM').trim().toUpperCase()
    const productLabel = [brand, perfume].filter(Boolean).join(' — ') || 'the perfume on the bottle'
    const labelText = [brand, perfume, type].filter(Boolean).join(' · ')

    const sceneLine = scene
      ? `Scene the creator wants: "${scene}"`
      : 'The creator has no scene preference — invent a compelling cinematic concept that fits the perfume.'

    // Use the user's chosen style, or pick randomly when "auto"
    const chosen = cameraStyle && cameraStyle !== 'auto'
      ? CAMERA_STYLES.find(s => s.name === cameraStyle) ?? null
      : null
    const selectedStyle = chosen ?? CAMERA_STYLES[Math.floor(Math.random() * CAMERA_STYLES.length)]

    const prompt = `Create AI Prompt.
I want a cinematic video for my perfume brand ${productLabel} for ${gen}.
The video should be ${dur} seconds and the cinematic should not be related to the image background.
I need positive prompt, negative prompt and a prompt for an image that will be the first frame of the video.
${sceneLine}

CRITICAL LABEL PRESERVATION RULE (applies to ALL three prompts):
The perfume bottle label has exactly three text elements that must never change:
  1. Brand name: "${brand || 'as shown on the bottle'}"
  2. Perfume name: "${perfume || 'as shown on the bottle'}"
  3. Parfum type: "${type}"
Every letter, word, and logo on the label — "${labelText}" — must remain 100% identical to the reference image throughout the entire video. Never allow any letter to change, blur, smear, warp, or be replaced by different characters. State the exact label text explicitly in the positive prompt. The label is a locked graphical asset, not AI-generated text.

CRITICAL BOTTLE GEOMETRY PRESERVATION RULE (applies to ALL three prompts):
The perfume bottle's physical form must remain pixel-identical to the reference image throughout every frame:
  - Cap: exact same shape, size, material, color (do not change the cap into a different design)
  - Bottle silhouette: exact same outline, faceting, edges, and proportions
  - Glass color and clarity: identical hue and transparency
  - Label position on the bottle: same placement, same size, same border
  - All dimensions and aspect ratios of the bottle: unchanged
The model must NOT re-design or re-interpret the bottle. Treat it as a locked, photographed product — only the world around it can change.

PHOTOREALISM RULE (applies to ALL three prompts):
The output must look like LIVE-ACTION FOOTAGE shot on a real film camera — never CGI, never 3D render, never animation. Use anchor words like "shot on 35mm film", "ARRI Alexa", "anamorphic lens", "natural light", "real location", "live-action commercial", "documentary realism". Avoid generic luxury-render vocabulary that pushes models toward CGI: "sparkles", "floating particles", "magical glow", "dreamy aura", "ethereal mist" — drop these unless the user explicitly asked for them. People, fabrics, water, skin, and metal must read as physically real materials with believable reflections and skin texture.

USER ELEMENTS RULE — MOST IMPORTANT:
${scene ? `The creator wrote: "${scene}". Extract every concrete noun (people, objects, locations, props, vehicles, animals) from that sentence — they are MANDATORY visual elements. List the 2–3 most important ones VERBATIM in the FIRST SENTENCE of positivePrompt and the FIRST SENTENCE of firstFramePrompt. Do not paraphrase ("yacht" stays "yacht", "female model" stays "female model"). Do not soften, generalize, or omit them.` : 'The creator wrote no scene — invent a single concrete, real-world location with at most 2 visual elements. Be specific (e.g. "sun-bleached cliffs in Capri at golden hour" not "beautiful coastal scenery").'}

PROMPT LENGTH RULE:
Short, concrete, noun-heavy prompts produce better video than long descriptive ones. The video model has limited attention — more words means more dilution, not more detail. Distill ruthlessly: 2–3 nouns, 1 location, 1 lighting condition, 1 camera move per phase. Drop adjective stacks. Drop abstract mood words.

MANDATORY CAMERA STYLE (this is the camera move you MUST use — do not substitute):
Camera profile: **${selectedStyle.name}**
Mechanics: ${selectedStyle.description}
Use this exact camera move in SENTENCE 3 of positivePrompt. Adapt the description naturally into the prompt (e.g. integrate "${selectedStyle.name.toLowerCase()}" wording), but do NOT replace it with a different camera move like "slow push-in" if that is not the assigned style. The first frame composition in firstFramePrompt should match the STARTING position of this camera move.

Guidelines for positivePrompt:
Single flowing paragraph describing a STORY ARC across ${dur} seconds. The prompt MUST start with the verbatim realism declaration below and MUST end with the verbatim label lock. Structure:
  SENTENCE 1 (verbatim, no edits, must be the very first sentence): Photorealistic live-action footage, real people and real materials, shot on a real cinema camera — not CGI, not 3D render, not animation.
  SENTENCE 2: User's mandatory scene elements verbatim + real location + lens/light anchor (e.g. "shot on 35mm film, natural sunlight").
  SENTENCE 3: 3-phase camera move using the MANDATORY CAMERA STYLE assigned above — OPENING (~20%): where the camera starts (matches the start position of the assigned style). BUILD (~60%): execute the assigned camera move + one thing changing in the environment. CLIMAX (~20%): camera settles on a tight hero shot of the bottle.
  SENTENCE 4 (verbatim, no edits): Bottle cap, silhouette and proportions stay identical to the reference frame in every frame.
  SENTENCE 5 (verbatim, no edits, must be the very last sentence): label reads '${labelText}' — every individual letter stays sharp, in the same position, and unchanged throughout every frame; no letter may warp, blur, swap, or be re-rendered.
Hard rules:
  - HARD MAX: 700 characters total. Shorter is better. If you cannot fit everything, cut adjectives — never cut the realism, bottle-lock, user elements, or label sentence.
  - Live-action realism only. Never use the words: CGI, render, 3D, animated, cartoon, illustration, digital art.
  - Camera moves as present-tense verbs ("camera pushes in", "crane rises").
  - Prefer 3/4 angle on the bottle, not head-on.
  - No spoken words, no subtitles, no on-screen text other than the label.

Guidelines for negativePrompt:
Comma-separated, max 400 chars. MUST include (target the exact failure modes — label drift and cap/silhouette drift):
  CGI, 3D render, animated, plastic look, video game, synthetic,
  label text distortion, label text warping, label text morphing, label text blurring, label letters changing, label letters swapping, individual letters becoming illegible, letters becoming gibberish, partial label distortion,
  bottle cap changing shape, cap becoming a different design, cap warping, cap morphing, cap re-rendered,
  bottle silhouette changing, bottle outline distorting, bottle proportions changing, bottle re-designed,
  glass color shifting, label repositioning, label resizing,
  watermark, jitter, low resolution, deformed hands.

Guidelines for firstFramePrompt:
This prompt is fed to an image editor (Flux Kontext) that takes the user's bottle photo as input. Phrase the prompt as a SURGICAL BACKGROUND REPLACEMENT, not a fresh image generation. Describe the new scene/setting/lighting around the bottle, but explicitly state that the bottle itself (cap, silhouette, glass, label) must remain pixel-identical to the reference. Use language like "change the background to X, keep the bottle untouched" — never language that implies redrawing the bottle.
Hard rules:
  - SENTENCE 1: User's mandatory elements verbatim + real location + "photorealistic, shot on 35mm film, natural light, not CGI".
  - SENTENCE 2 (verbatim): Keep the perfume bottle untouched — same cap shape, same silhouette, same glass color, same label, same letters, same position.
  - The perfume bottle MUST be the primary subject in the CENTER-FOREGROUND, sharp and in focus, occupying at least 40% of frame height. Background softly blurred.
  - Label at 3/4 angle, reads '${labelText}' — fully legible, brand + name + type all visible.
  - Live action only. Never describe the image as a render, illustration, or digital art.
  - HARD MAX: 500 characters.

Return ONLY a valid JSON object — no markdown, no backticks, no commentary:
{"positivePrompt": "...", "negativePrompt": "...", "firstFramePrompt": "..."}`

    const body = JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1800,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
          { type: 'text', text: prompt },
        ],
      }],
    })

    const fetchClaude = () => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body,
    })

    let response = await fetchClaude()
    for (let attempt = 1; attempt <= 3 && response.status === 529; attempt++) {
      await new Promise(r => setTimeout(r, attempt * 8000))
      response = await fetchClaude()
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = (err as { error?: { message?: string } }).error?.message || `Anthropic API error ${response.status}`
      return NextResponse.json(
        { error: response.status === 529 ? 'Claude is overloaded — please try again in a moment.' : msg },
        { status: 500 },
      )
    }

    const data = await response.json()
    const raw = data.content.map((i: { text?: string }) => i.text || '').join('')
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    if (!parsed.positivePrompt || !parsed.negativePrompt || !parsed.firstFramePrompt) {
      throw new Error('Claude returned incomplete prompts')
    }

    return NextResponse.json({
      positivePrompt: String(parsed.positivePrompt),
      negativePrompt: String(parsed.negativePrompt),
      firstFramePrompt: String(parsed.firstFramePrompt),
      cameraStyle: selectedStyle.name,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
