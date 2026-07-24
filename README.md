# CommuteBrief: Smart Commute Audio Briefings

CommuteBrief is a highly polished, single-page application (SPA) with full-stack capabilities designed to optimize your morning and evening commute. It transforms long articles, news, and technical papers into concise, structured summaries and reads them aloud using high-quality Text-to-Speech (TTS) narrators or client-side Web Speech fallbacks.

---

## 📐 Spec-Driven Development (SDD) Workflow

This repository adheres strictly to a **Spec-Driven Development (SDD)** process. Documentation and specification files are treated as the single source of truth for all software design, features, bug fixes, and agent execution.

### Key SDD Assets
- **`AGENTS.md`**: Master instructions and protocol for AI coding agents working in this repository.
- **`specs/SYSTEM_SPEC.md`**: Core system specification defining purpose, scope, assumptions, user stories, acceptance criteria, non-goals, and open questions (`[NEEDS CLARIFICATION]`).
- **`specs/IMPLEMENTATION_PLAN.md`**: Codebase architecture mapping, completed phases, and upcoming roadmap items.
- **`specs/VALIDATION_CHECKLIST.md`**: Verification protocol and testing checklist for developers and automated tools.

### SDD Process for Contributors & Agents
1. **Spec First**: Review `specs/SYSTEM_SPEC.md` before making changes. If adding features or altering behavior, update the spec document first.
2. **Implementation Plan**: Map changes to specific acceptance criteria in `specs/IMPLEMENTATION_PLAN.md`.
3. **Surgical Changes**: Make minimal, reviewable code modifications.
4. **Validation**: Verify changes against `specs/VALIDATION_CHECKLIST.md` using `npm run lint` and `npm run build`.
5. **Handoff**: Document all updates in `CHANGELOG.md` and `specs/IMPLEMENTATION_PLAN.md` to maintain async handoff clarity.

---

## 🚀 Key Features

### 🎧 Adaptive Audio Player & Playback Speed
* **Custom Playback Controls**: Easily play, pause, seek, and skip between briefings.
* **Speed Slider (0.5x to 2.0x)**: Seamlessly adjust narrator speed using a fluid slider (`no-swipe` protected for gesture handling).
* **Speed Presets**: Quick-tap preset buttons (`0.5x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`) for rapid tempo tuning.
* **Sleep Timer**: Configurable countdown timer (5m to 60m) that automatically pauses playback upon expiry.

### 🔊 AI Narrator Voice Settings (Profile Panel)
* **Voice Customization**: Choose between five distinct voice styles tailored for different information genres:
  * **Calm Narrator (Zephyr)**: Deep, professional, and reassuring—ideal for complex analysis, tech, and political journals.
  * **Energetic Host (Kore)**: Warm, bright, and highly enthusiastic, matching the style of an engaging morning commute podcast.
  * **Mellow Storyteller (Charon)**: Calm, slow, and relaxing—perfect for human interest stories and casual summaries.
  * **Crisp Newsreader (Puck)**: Sharp, rapid-fire, and crystal clear—suited for fast-paced daily briefs and headlines.
  * **Bold Anchor (Fenrir)**: Grounded, authoritative, and powerful—suited for editorial opinions and critical reporting.
* **Real-time Live Preview**: Generate and play live voice previews directly from the settings panel to audition each voice profile before compiling.

### 🔍 Tokenized Fuzzy Search & Category Filters
* **High-Performance Search**: Filter briefs in real-time across titles, categories, summaries, authors, and tags in `HomeDashboard` and `PlaylistPanel`.
* **Category Chips**: Filter by "All", "Saved", "Downloaded", or specific domain categories.

### 📳 Tactile Haptic Feedback (System-Wide)
* Custom haptic pulses trigger over `navigator.vibrate` (when supported by hardware/browser) to enrich tactile feedback:
  * **Tab Navigation**: Light tap (`15ms`) on shifting screens or swiping.
  * **Audio Playing / Loading**: Snappy confirmation pulse (`30ms`).
  * **Playback Pauses & Seeks**: Soft pulses (`20ms` and `15ms`).
  * **Track Navigation**: Balanced skip pulses (`25ms`).
  * **Article Completed**: A triple-pulse heartbeat pattern (`[40ms, 80ms, 40ms]`) announcing successful summary play completion.

---

## 🛠️ Architecture & Tech Stack

### Client-Side (React, TypeScript, Tailwind CSS)
* **Framework**: React 19 with Vite as the build engine.
* **State Management**: Context-driven architecture (`AppContext`) with durable synchronization to client-side IndexedDB storage (`src/lib/db.ts`).
* **Animations**: Framer Motion (`motion/react`) driving route transitions and fluid controls.
* **Icons**: Vector icon sets from `lucide-react`.

### Server-Side (Node.js, Express)
* **Express API Engine**: Acts as a proxy handling Gemini summarization and Text-to-Speech (TTS) audio synthesis safely on the backend.
* **Vite Dev Middleware**: Integrated inside `server.ts` to coordinate hot assets and SPA fallback handling on port `3000`.

---

## ⚙️ Setup & Installation

### 1. Configure Secrets
Ensure your environment contains the required Gemini API Key on the server side. Create a `.env` file in the root based on `.env.example`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Local Development
Start the application dev server (monitored on port `3000`):
```bash
npm run dev
```

### 3. Verification & Build
Verify type safety and compile production bundles:
```bash
npm run lint
npm run build
npm run start
```
