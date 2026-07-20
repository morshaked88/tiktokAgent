import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

// Curated library of TikTok-proven creative formats. Each one defines an EVENT
// that happens in the first second (the hook), a motion arc, a camera energy,
// and a matching first-frame composition. One is picked at random per request
// so no two videos feel like the same slow product drift.
const CREATIVE_FORMATS: {
  name: string
  hook: string
  motion: string
  camera: string
  firstFrame: string
}[] = [
  {
    name: 'Hand grab & spritz',
    hook: 'Within the first second, an elegant hand with manicured nails enters frame and cups the base of the bottle lightly, lifting it just off the surface without ever gripping or covering the label.',
    motion: 'The hand keeps the bottle fully visible and undistorted as it rises, finger presses the nozzle, and a fine burst of mist erupts beside the label, backlit so every droplet glows. A second slower spray drifts through the light as the bottle is set back down facing camera, silhouette unchanged throughout.',
    camera: 'Handheld close-up with subtle natural shake, racking focus from hand to label, settling on a tight hero shot as the mist dissipates.',
    firstFrame: 'Bottle standing on a marble vanity or dresser edge, slightly off-center, warm directional light raking across it, real bathroom or bedroom depth behind.',
  },
  {
    name: 'Splash drop',
    hook: 'Within the first second, heavy water droplets rain down around the bottle and a slow-motion crown splash erupts at its base.',
    motion: 'Ripples radiate outward across a shallow mirror of dark water, droplets bounce off the glass shoulders and slide down the facets, the surface calms to a perfect reflection.',
    camera: 'Fast push-in during the splash that decelerates into a locked macro hero shot at label height.',
    firstFrame: 'Bottle standing in a shallow pool of dark reflective water, moody studio backlight, its mirror reflection below, droplets suspended on the glass.',
  },
  {
    name: 'Fast orbit reveal',
    hook: 'The video opens mid-motion: the camera is already whipping around the bottle with streaks of light smearing across the frame.',
    motion: 'Practical lights and lens flares streak past as motion blur, then the orbit decelerates smoothly over the last half into a still, powerful low-angle hero framing.',
    camera: 'A 180-degree fast orbit with motion blur that eases out into a locked low-angle close-up.',
    firstFrame: 'Bottle on a dark stone pedestal with strong rim lighting from two sides, points of warm practical light in the background bokeh.',
  },
  {
    name: 'World transformation',
    hook: 'Within the first second the entire world behind the bottle visibly starts to change — daylight begins sliding into dusk.',
    motion: 'A timelapse rushes around the perfectly still bottle: shadows sweep across the ground, city lights or candles ignite one by one, the sky deepens to night while the bottle catches each new light source.',
    camera: 'Very slow dolly-in on the motionless bottle while the timelapse rages behind it, ending tight on the glowing label.',
    firstFrame: 'Bottle on a real outdoor surface — rooftop ledge, cafe table, stone balustrade — with a wide, deep city or coastal vista behind it in late-afternoon sun.',
  },
  {
    name: 'Silk reveal',
    hook: 'The video opens on the bottle standing beside a loosely draped silk cloth (never covering the bottle itself); within the first second a gust of wind lifts the fabric away.',
    motion: 'The silk whips past the lens in slow motion, folds catching the light as they fly, while the bottle remains fully visible and untouched the entire time; loose strands keep floating at the edges of frame as the air settles.',
    camera: 'Slow-motion medium shot pushing in gently as the fabric clears, finishing on a clean hero close-up.',
    firstFrame: 'Bottle standing upright with a sheer silk fabric draped over one side, dramatic warm side-light, dark elegant backdrop.',
  },
  {
    name: 'Macro whip',
    hook: 'The video opens in extreme macro: light travels across the cut-glass facets and condensation beads slide down the bottle shoulder.',
    motion: 'A droplet rolls the full height of the glass in slow motion, then the camera whips back with speed-ramp energy, revealing the entire bottle in its environment.',
    camera: 'Extreme macro opening, then a fast pull-back whip that speed-ramps into a slow settled full-bottle hero shot.',
    firstFrame: 'Extreme close-up composition is NOT allowed for the first frame — instead show the full chilled bottle covered in fine condensation droplets, cool crisp light, dark reflective surface.',
  },
  {
    name: 'UGC vanity',
    hook: 'Within the first second a hand reaches in and tilts the bottle toward the camera, phone-camera style.',
    motion: 'The hand rotates the bottle so the label catches the window light, gives it a small admiring turn, and props it back down; a subtle refocus breathes like a real phone video.',
    camera: 'Casual handheld phone framing with a natural micro-shake and one small refocus, phone camera quality rather than cinematic.',
    firstFrame: 'Bottle sitting on a real, lived-in vanity among a couple of everyday objects, soft natural window light, authentic phone-photo look, not studio-perfect.',
  },
  {
    name: 'Petal storm',
    hook: 'Within the first second a gust sweeps a storm of flower petals through the frame around the bottle.',
    motion: 'Petals tumble past in slow motion, a few grazing the glass and sliding off, golden-hour lens flare passes across the lens as the gust fades and the last petals settle around the base.',
    camera: 'Slow lateral tracking move through the floating petals that eases into a low-angle hero close-up.',
    firstFrame: 'Bottle on warm stone or sand at golden hour, scattered fresh petals around its base, low sun creating a soft flare, real outdoor location.',
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
    // NOTE: this is a description of the label's separate text lines for the
    // model to read, not literal on-label text — never join these with a
    // punctuation character (e.g. "·"), or the model will render that glyph
    // as if it were printed on the bottle.
    const labelLines = [brand, perfume, type].filter(Boolean)
    // Describes the label as separate lines the model should copy verbatim —
    // never joined with a separator glyph, which the model would render as a
    // literal character printed on the bottle.
    const labelLinesDescription = labelLines.map(l => `"${l}"`).join(' and ')

    const sceneLine = scene
      ? `Scene the creator wants: "${scene}"`
      : 'The creator has no scene preference — invent a compelling cinematic concept that fits the perfume.'

    // Use the user's chosen creative format, or pick randomly when "auto"
    const chosen = cameraStyle && cameraStyle !== 'auto'
      ? CREATIVE_FORMATS.find(s => s.name === cameraStyle) ?? null
      : null
    const selectedStyle = chosen ?? CREATIVE_FORMATS[Math.floor(Math.random() * CREATIVE_FORMATS.length)]

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
These are separate lines of text exactly as they appear on the reference image's label — NOT one string joined by a dot, bullet, comma, or any other separator character. Never introduce a "•", "·", or any punctuation mark between them that isn't already printed on the real label. Every letter, word, and logo on the label must remain 100% identical to the reference image throughout the entire video. Never allow any letter to change, blur, smear, warp, or be replaced by different characters, and never add extra characters or symbols that aren't on the original label. The label is a locked graphical asset, not AI-generated text.

CRITICAL BOTTLE GEOMETRY PRESERVATION RULE — THE #1 PRIORITY, OVERRIDES EVERYTHING ELSE (applies to ALL three prompts):
The perfume bottle's physical form must remain pixel-identical to the reference image throughout every single frame:
  - Cap: exact same shape, size, material, color (do not change the cap into a different design)
  - Bottle silhouette: exact same outline, faceting, edges, and proportions
  - Bottle material and opacity: if the reference bottle is opaque/solid-colored (e.g. matte white, frosted, ceramic, painted), it MUST stay fully opaque — never reinterpreted as clear or translucent glass. If it is clear or tinted glass, keep that exact transparency level and tint. Never change an opaque bottle into a see-through one or vice versa.
  - Label position on the bottle: same placement, same size, same border
  - All dimensions and aspect ratios of the bottle: unchanged
The model must NOT re-design, re-interpret, warp, bend, squash, or stretch the bottle at any point. Treat it as a rigid, locked, photographed product — only the world, light, and any hands/fabric/water AROUND it can change.
HANDS AND OBJECTS RULE: if the format involves a hand, fabric, or liquid near the bottle, that hand/fabric/liquid must only ever touch or pass beside the OUTSIDE surface of the bottle — never grip it tightly enough to visually compress it, never wrap around it so it disappears from view, and never obscure the label. If a hand lifts the bottle, describe it cupping the base/sides lightly, bottle silhouette fully visible at all times. The bottle's outline must stay legible and undistorted behind or beside any interacting element in every frame.

PHOTOREALISM RULE (applies to ALL three prompts):
The output must look like LIVE-ACTION FOOTAGE shot on a real film camera — never CGI, never 3D render, never animation. Use anchor words like "shot on 35mm film", "ARRI Alexa", "anamorphic lens", "natural light", "real location", "live-action commercial", "documentary realism". Avoid generic luxury-render vocabulary that pushes models toward CGI: "sparkles", "floating particles", "magical glow", "dreamy aura", "ethereal mist" — drop these unless the user explicitly asked for them. People, fabrics, water, skin, and metal must read as physically real materials with believable reflections and skin texture.

USER ELEMENTS RULE — MOST IMPORTANT:
${scene ? `The creator wrote: "${scene}". Extract every concrete noun (people, objects, locations, props, vehicles, animals) from that sentence — they are MANDATORY visual elements. List the 2–3 most important ones VERBATIM in the FIRST SENTENCE of positivePrompt and the FIRST SENTENCE of firstFramePrompt. Do not paraphrase ("yacht" stays "yacht", "female model" stays "female model"). Do not soften, generalize, or omit them.` : 'The creator wrote no scene — invent a single concrete, real-world location with at most 2 visual elements. Be specific (e.g. "sun-bleached cliffs in Capri at golden hour" not "beautiful coastal scenery").'}

PROMPT LENGTH RULE:
Short, concrete, noun-heavy prompts produce better video than long descriptive ones. The video model has limited attention — more words means more dilution, not more detail. Distill ruthlessly: 2–3 nouns, 1 location, 1 lighting condition, 1 camera move per phase. Drop adjective stacks. Drop abstract mood words.

MANDATORY CREATIVE FORMAT (this is the concept you MUST execute — do not substitute or water it down):
Format: **${selectedStyle.name}**
HOOK (must happen in the FIRST SECOND of the video): ${selectedStyle.hook}
MOTION ARC: ${selectedStyle.motion}
CAMERA: ${selectedStyle.camera}
TikTok punishes videos where nothing happens in the first second. The hook event above is the single most important part of the prompt — state it as the very first action, in present tense, immediately after the realism sentence. Never replace it with a slow static camera drift. If the creator gave a custom scene, stage this format INSIDE their scene (their elements stay mandatory).

Guidelines for positivePrompt:
Single flowing paragraph describing a STORY ARC across ${dur} seconds where something visibly HAPPENS — an event, not a camera drift past a still object. The prompt MUST start with the verbatim realism declaration below and MUST end with the verbatim label lock. Structure:
  SENTENCE 1 (verbatim, no edits, must be the very first sentence): Photorealistic live-action footage, real people and real materials, shot on a real cinema camera — not CGI, not 3D render, not animation.
  SENTENCE 2 — THE HOOK: the format's hook event, happening immediately, in present tense, plus the user's mandatory scene elements verbatim + real location + lens/light anchor (e.g. "shot on 35mm film, natural sunlight").
  SENTENCE 3 — THE ARC: the format's motion arc and camera energy across the remaining seconds — HOOK (first ~1s): the event fires. BUILD (~60%): the motion arc plays out, physical materials reacting believably. SETTLE (final ~20%): motion eases and the camera lands on a tight hero shot of the bottle.
  SENTENCE 4 — SOUND: one short clause of diegetic sound design matching the action (e.g. "sound: a soft spray hiss and airy ambient tone" / "sound: water splash and low ambient hum"). No voices, no music lyrics.
  SENTENCE 5 (verbatim, no edits): Bottle cap, silhouette, material, opacity and proportions stay identical to the reference frame in every frame.
  SENTENCE 6 (verbatim, no edits, must be the very last sentence): label shows ${labelLinesDescription} on separate lines exactly as in the reference image, with no added dots, bullets, or separator characters — every individual letter stays sharp, in the same position, and unchanged throughout every frame; no letter may warp, blur, swap, or be re-rendered.
Hard rules:
  - This prompt drives an IMAGE-TO-VIDEO model whose start frame is already the fully composed scene. Spend words on MOTION, ACTION, and CHANGE — what moves, what enters frame, how light shifts — not on re-describing static scenery the start frame already shows.
  - HARD MAX: 900 characters total. Shorter is better. If you cannot fit everything, cut adjectives — never cut the realism, the hook event, bottle-lock, user elements, or label sentence.
  - Live-action realism only. Never use the words: CGI, render, 3D, animated, cartoon, illustration, digital art.
  - Action and camera as present-tense verbs ("a hand lifts the bottle", "camera whips around").
  - Hands and people may appear and interact with the bottle, but the bottle itself is never deformed by the interaction.
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
The composition must match the STARTING moment of the assigned creative format so the video's hook can fire from it:
Format first-frame composition: ${selectedStyle.firstFrame}
Hard rules:
  - SENTENCE 1: The format's first-frame composition above + user's mandatory elements verbatim + real location + "photorealistic, shot on 35mm film, natural light, not CGI".
  - SENTENCE 2 (verbatim): Keep the perfume bottle untouched — same cap shape, same silhouette, same material and opacity (do not turn an opaque bottle transparent or vice versa), same label, same letters, same position.
  - The ENTIRE perfume bottle MUST be fully visible in the frame — from the bottom of the base to the top of the cap — with clear empty space above and below. NEVER crop, clip, or cut off any part of the bottle at any frame edge.
  - The bottle is the sharp, in-focus foreground subject occupying 45–65% of the frame height; it may sit slightly off-center if the format calls for it. The environment behind it must feel like a real place with believable depth — never a flat blurred studio backdrop.
  - Do NOT add hands, people, splashes, or fabric touching the bottle in the first frame — those events happen in the video, not the still. Props NEAR the bottle (water surface, petals, silk beside it) are allowed when the format calls for them.
  - Label at 3/4 angle, showing ${labelLinesDescription} on separate lines exactly as in the reference image — fully legible, no added dots, bullets, or separator characters between the lines.
  - Live action only. Never describe the image as a render, illustration, or digital art.
  - HARD MAX: 600 characters.

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
