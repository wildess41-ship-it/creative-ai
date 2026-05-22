# Creative AI — Product Video Generator

**Transform product images into high-converting video creatives for TikTok, Instagram Reels, Facebook Ads and Shorts — entirely in your browser.**

---

## Overview

Creative AI is a **100% static, portable, and exportable** web application. It runs entirely in the user's browser with no server, no backend, no database, and no dependencies on any cloud service.

| Feature | Detail |
|---|---|
| Technology | HTML5 · CSS3 · JavaScript Vanilla |
| Processing | Browser-native (Canvas API + MediaRecorder) |
| Server required | None |
| Export format | MP4 / WebM |
| Supported platforms | TikTok Ads · Instagram Reels · Facebook Ads · Shorts |

---

## Quick Start

### Option 1 — Open Locally

1. Download the `Creative-AI` folder.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
3. Start creating.

> **Note:** For full functionality (audio loading, JSON fetching), open via a local server or hosting. Some browsers restrict `fetch()` on `file://` URLs.

### Option 2 — Local Server (Recommended)

```bash
# Python 3
cd Creative-AI
python3 -m http.server 8080
# Open: http://localhost:8080
```

```bash
# Node.js (npx)
npx serve Creative-AI
```

### Option 3 — Deploy to Hosting

Upload the entire `Creative-AI` folder to any static hosting:

| Platform | How |
|---|---|
| **Vercel** | `vercel deploy` or drag-and-drop |
| **Netlify** | Drag-and-drop the folder at netlify.com |
| **GitHub Pages** | Push to a repo and enable Pages |
| **Traditional hosting** | Upload via FTP/cPanel |

---

## Project Structure

```
Creative-AI/
├── index.html              # Main application
├── styles.css              # Full UI stylesheet
├── app.js                  # Main controller
├── README.md               # This file
│
├── assets/
│   ├── music/              # Place royalty-free MP3 files here
│   │   ├── luxury-01.mp3
│   │   ├── emotional-01.mp3
│   │   └── ...
│   ├── fonts/              # Optional custom fonts
│   └── overlays/           # Optional overlay images
│
├── templates/
│   └── templates.json      # Animation presets, ratios, durations
│
├── niches/
│   └── niches.json         # 8 niches with templates, colors, animations
│
├── localization/
│   ├── pt-BR.json          # Portuguese (Brazil)
│   ├── en-US.json          # English (US)
│   ├── en-UK.json          # English (UK)
│   ├── es-ES.json          # Spanish (Spain)
│   ├── es-MX.json          # Spanish (Mexico)
│   ├── fr-FR.json          # French
│   └── de-DE.json          # German
│
└── engine/
    ├── upload.js           # Image upload, validation, preview
    ├── templateSelector.js # Template resolution by niche/country
    ├── copyEngine.js       # AIDA copywriting generator
    ├── animationEngine.js  # Canvas animations (Ken Burns, zoom, pan…)
    ├── audioEngine.js      # Music selection and audio mixing
    ├── renderEngine.js     # Frame-by-frame canvas renderer
    ├── batchQueue.js       # Sequential batch processing queue
    └── exportEngine.js     # MP4 export via MediaRecorder
```

---

## Adding Music

Place royalty-free MP3 files in `assets/music/` following this naming convention:

```
luxury-01.mp3    luxury-02.mp3
emotional-01.mp3 emotional-02.mp3
premium-01.mp3   premium-02.mp3
energetic-01.mp3 energetic-02.mp3
viral-01.mp3     viral-02.mp3
ugc-01.mp3       ugc-02.mp3
```

If no music files are found, the engine generates a procedural ambient tone as fallback.

**Recommended royalty-free sources:**
- [Pixabay Music](https://pixabay.com/music/)
- [Free Music Archive](https://freemusicarchive.org/)
- [ccMixter](https://ccmixter.org/)

---

## Supported Formats

| Format | Resolution | Platform |
|---|---|---|
| 9:16 | 1080 × 1920 | TikTok · Reels · Shorts |
| 1:1  | 1080 × 1080 | Instagram Feed · Facebook |
| 4:5  | 1080 × 1350 | Instagram Feed |

---

## Supported Niches

| Niche | Templates |
|---|---|
| Jewelry & Accessories | Luxury · Emotional Gift · Premium Lifestyle |
| Beauty & Skincare | Glow · Premium Skin · Transformation |
| Fashion | Editorial · Lifestyle · Viral |
| Gadgets | Problem Solution · Wow Effect · Before After |
| Home & Decor | Cozy · Minimal · Luxury Living |
| Fitness | Power · Transformation · Lifestyle |
| Pet Products | Happy Pet · Premium Care · Emotional Bond |
| Baby & Family | Tender · Safe & Secure · Family Love |

---

## Supported Languages & Countries

| Language | Countries |
|---|---|
| Português (BR) | Brazil |
| English (US) | United States · Canada |
| English (UK) | United Kingdom |
| Español (ES) | Spain |
| Español (MX) | Mexico |
| Français | France · Canada |
| Deutsch | Germany |

---

## AIDA Copy Structure

Each creative follows the AIDA framework:

| Phase | Time | Word Limit | Purpose |
|---|---|---|---|
| Attention (Hook) | 0–2s | ≤ 7 words | Stop the scroll |
| Interest | 2–5s | ≤ 10 words | Build curiosity |
| Desire | 5–8s | ≤ 8 words | Create want |
| Action (CTA) | 8–12s | ≤ 4 words | Drive conversion |

---

## Animations Available

- **Cinematic Zoom** — Slow zoom in for premium feel
- **Ken Burns** — Classic pan and zoom
- **Parallax** — Fake depth effect
- **Pan** — Smooth horizontal movement
- **Glow** — Pulsing light overlay
- **Blur Reveal** — Sharp reveal from blur
- **Sparkle** — Floating particle system
- **Smooth Transition** — Cross-fade between images
- **Zoom Punch** — Quick zoom burst

---

## Browser Compatibility

| Browser | Support |
|---|---|
| Chrome 90+ | Full |
| Edge 90+ | Full |
| Firefox 90+ | Full |
| Safari 15+ | Full |
| Mobile Chrome | Full |
| Mobile Safari | Full |

---

## Export Note

The export engine uses the browser's native **MediaRecorder API**. The output format depends on browser support:

- **Chrome/Edge:** MP4 (H.264) when supported, WebM (VP9) as fallback
- **Firefox:** WebM (VP9)
- **Safari:** MP4 (H.264)

All output files are labeled `.mp4` for convenience. If your player does not open the file, rename it to `.webm`.

For guaranteed MP4 re-encoding, run the exported file through [HandBrake](https://handbrake.fr/) (free).

---

## License

This project is provided as-is for personal and commercial use. Music files are not included — users must provide their own royalty-free tracks.

---

*Creative AI — 100% Browser-based · No server required · Export anywhere*
