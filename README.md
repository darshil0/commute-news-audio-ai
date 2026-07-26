# CommuteBrief: Smart Commute Audio Briefings

CommuteBrief is a full-stack web application designed to optimize daily commutes. It transforms real-time news search queries, web articles, and custom text into structured, audio-first briefings narrated by customizable AI voice profiles or client-side speech fallbacks.

---

## 🚀 Key Features

### 📡 Real-Time News Search (Gemini Search Grounding)
* **Live Web Grounding**: Search real-time news topics using Gemini Search Grounding (`gemini-2.5-flash`).
* **Source Citations**: Preview live web citations and original source links alongside the generated summary.
* **Instant Brief Creation**: One-tap action to save grounded briefings to your queue or stream audio immediately.

### 📰 Web URL & Text Intake
* **URL Extraction**: Import news articles and blog posts directly via URL.
* **Text Summarization**: Paste custom text or notes to generate structured commute audio briefs.

### 🎧 Adaptive Audio Player & Playback Speed
* **Custom Audio Controls**: Play, pause, seek, and skip between queued briefings.
* **Fluid Speed Control**: Adjustable speed slider (`0.5x` to `2.0x`) and quick preset buttons (`0.5x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`).
* **Sleep Timer**: Configurable countdown timer (5m to 60m) that automatically pauses playback when expired.

### 🔊 AI Narrator Voice Profiles
* **5 Distinct Voice Profiles**: Tailored styles including Zephyr (Calm Narrator), Kore (Energetic Host), Charon (Mellow Storyteller), Puck (Crisp Newsreader), and Fenrir (Bold Anchor).
* **Live Audition Preview**: Audition and test each voice profile directly in the settings panel before generating briefs.

### 📴 Offline Persistence & Haptic Feedback
* **IndexedDB Local Engine**: Save articles, playlists, and listening history locally for offline playback.
* **Tactile Haptics**: Snappy vibration feedback on tap, skip, and playback completion.

---

## 🛠️ Tech Stack & Architecture

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion (`motion/react`), Lucide Icons.
* **Backend**: Express server running on Node.js on port `3000` (`server.ts`), handling Gemini AI summarization, search grounding, and Text-to-Speech proxying.
* **AI Engine**: `@google/genai` TypeScript SDK utilizing `gemini-2.5-flash` with Google Search Grounding tools and `gemini-2.5-flash-preview-tts` for TTS generation.

---

## 📐 Spec-Driven Development (SDD) Workflow

This repository follows **Spec-Driven Development (SDD)**:
- **`AGENTS.md`**: Master guidelines for AI tools and contributors.
- **`specs/SYSTEM_SPEC.md`**: System requirements, user stories, and acceptance criteria.
- **`specs/IMPLEMENTATION_PLAN.md`**: Architecture breakdown and completed phase tracking.
- **`specs/VALIDATION_CHECKLIST.md`**: Quality assurance and testing protocol.

---

## 🐛 Bugs, Errors, and Defects Fixed

- **SSRF Endpoint Safeguards**: Protected `/api/articles/extract` against SSRF by checking schemes (`http:`, `https:`) and blocking private RFC 1918/4193 IP blocks, loopbacks, and link-local ranges.
- **Model Standardizations**: Aligned Express server AI requests to `@google/genai` models `gemini-2.5-flash` and `gemini-2.5-flash-preview-tts`.
- **Atomic Cloud Synchronization**: Fixed Firestore data-loss bug in `syncWithServer` by merging IndexedDB and cloud changes atomically.
- **Memory & Resource Eviction**: Fixed memory leak on article deletion by cleaning up playlist entries and removing cached `HTMLAudioElement` instances.
- **Audio Slider Scrubbing**: Isolated seek slider drag state (`isDragging`, `dragPos`) in `PodcastPlayer` to prevent audio playback jitter.
- **Filtered Drag-and-Drop Reordering**: Fixed track reordering in playlists when search query filters are active.
- **Firefox Drag-and-Drop Fix**: Added `dataTransfer.setData` payload for cross-browser HTML5 drag compatibility.
- **Null-Safe Fuzzy Search**: Added strict null, array, and string guards to `tokenize`, `scoreArticle`, and `searchAndFilterArticles`.
- **Theme & Accessibility Polish**: Fixed non-existent Tailwind utility classes (`zinc-750`, `zinc-850`, `w-4.5`) and added `aria-label`, `role="dialog"`, and `aria-current="page"` semantics.

---

## ⚙️ Development & Build Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript linting check
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```