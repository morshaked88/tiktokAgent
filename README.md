# 🌸 Scent & Scroll — TikTok Content Agent

AI-powered TikTok content generator for perfume brands.  
Upload a perfume photo → get a full script, caption, hashtags, and an AI-generated video.

---

## ⚡ Quick Start (5 minutes)

### 1. Install Node.js
Download from https://nodejs.org (choose the LTS version)

### 2. Set up your API keys
Copy the example env file and fill in your keys:
```
cp .env.local.example .env.local
```
Then open `.env.local` and add:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
RUNWAY_API_KEY=key_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to get the keys:**
- **Anthropic key**: https://console.anthropic.com → API Keys
- **Runway key**: https://app.runwayml.com → Account Settings → API Keys

### 3. Install dependencies
Open a terminal in this folder and run:
```
npm install
```

### 4. Start the app
```
npm run dev
```

### 5. Open in your browser
Go to: **http://localhost:3000**

---

## 🎬 How to use

1. Upload a photo of your perfume bottle
2. Enter the brand name and perfume name (or leave blank to auto-detect)
3. Choose your content style, target audience, and CTA
4. Click **Generate TikTok Content** — Claude will analyze the image and create:
   - ⚡ Scroll-stopping hook
   - 🎬 Full 30-second video script
   - ✍️ TikTok caption
   - # 15 hashtags
   - 💡 Filming tips
5. Click **Generate TikTok Video with Runway** — AI generates a 9:16 video clip
6. Download your video and post to TikTok!

---

## 📁 Project structure

```
scent-scroll/
├── app/
│   ├── api/
│   │   ├── generate/route.ts   ← Claude API (content generation)
│   │   └── runway/route.ts     ← Runway API (video generation)
│   ├── layout.tsx
│   ├── page.tsx                ← Main UI
│   ├── page.module.css
│   └── globals.css
├── .env.local.example
├── package.json
└── README.md
```

---

## 💡 Tips

- Use high-quality photos with good lighting for best results
- The Runway free tier gives ~125 credits (about 5–10 videos)
- 9:16 ratio is perfect for TikTok vertical format
- Video generation takes 1–3 minutes per clip
