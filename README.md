# CommuteBrief: Smart Commute Audio Briefings

CommuteBrief is a highly polished, single-page application (SPA) with full-stack capabilities designed to optimize your morning and evening commute. It transforms long articles, news, and technical papers into concise, structured summaries and reads them aloud using high-quality Text-to-Speech (TTS) narrators.

---

## 🚀 Key Features

### 🎧 Adaptive Audio Player & Playback Speed
* **Custom Playback Controls**: Easily play, pause, and skip between briefings.
* **Speed Slider (0.5x to 2.0x)**: Seamlessly adjust your narrator's speed using a custom-styled slider (`no-swipe` protected for natural container interaction).
* **Speed Presets**: Quick-tap presets (`0.5x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`) for rapid tempo tuning.

### 🔊 AI Narrator Voice Settings (Profile Panel)
* **Voice Customization**: Choose between five distinct voice styles tailored for different genres of information:
  * **Calm Narrator (Zephyr)**: Deep, professional, and reassuring—ideal for complex analysis, tech, and political journals.
  * **Energetic Host (Kore)**: Warm, bright, and highly enthusiastic, matching the style of an engaging morning commute podcast.
  * **Mellow Storyteller (Charon)**: Calm, slow, and relaxing—perfect for human interest stories and casual summaries.
  * **Crisp Newsreader (Puck)**: Sharp, rapid-fire, and crystal clear—suited for fast-paced daily briefs and headlines.
  * **Bold Anchor (Fenrir)**: Grounded, authoritative, and powerful—suited for editorial opinions and critical reporting.
* **Real-time Live Preview**: Generate and play live voice previews directly from the settings panel to audition each voice profile before compiling.

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
* **Framework**: React 18+ with Vite as the build engine.
* **State Management**: Context-driven architecture (`AppContext`) with durable synchronization to client-side storage and backend synchronization.
* **Animations**: Framer Motion (`motion/react`) driving route transitions and fluid slider controls.
* **Icons**: Feather-style vector sets from `lucide-react`.

### Server-Side (Node.js, Express)
* **Express API Engine**: Acts as a proxy to handle Gemini summarization and Text-to-Speech (TTS) audio synthesis safely, keeping sensitive credentials secure on the backend.
* **Vite Dev Middleware**: Integrated inside `server.ts` to coordinate hot assets and SPA fallback handling under port `3000`.

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

### 3. Production Build
Compile both the client-side single page app and the self-contained backend bundle:
```bash
npm run build
npm run start
```

---

## 📚 System Documentation

For detailed information on design patterns, engineering metrics, and core API setups, please review our comprehensive guide directories:

* **[Design and Architecture Mapping (Design.MD)](Design.MD)**: System component layout, offline database schema setups, state flow mappings, and core design choices.
* **[Technical Skills Profile (Skills.MD)](Skills.MD)**: Breakdown of technical expertise, frameworks, haptic utilities, and library layers utilized.
* **[Prompt Engineering Specifications (PROMPTS.md)](PROMPTS.md)**: Details on the reverse engineered prompt models, JSON compilers, and inline audio tags configuration parameters.
