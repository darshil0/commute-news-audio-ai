# CommuteBrief: Smart Commute Audio Briefings

CommuteBrief is a full-stack web application designed to optimize daily commutes. It transforms real-time news search queries, web articles, and custom text into structured, audio-first briefings narrated by customizable AI voice profiles or client-side speech fallbacks.

---

## 🚀 Key Features

### 📡 Real-Time News Search (Gemini Search Grounding)

- **Live Web Grounding**: Search real-time news topics using Gemini Search Grounding (`gemini-2.5-flash`).
- **Source Citations**: Preview live web citations and original source links alongside the generated summary.
- **Instant Brief Creation**: One-tap action to save grounded briefings to your queue or stream audio immediately.

### 📰 Web URL & Text Intake

- **URL Extraction**: Import news articles and blog posts directly via URL.
- **Text Summarization**: Paste custom text or notes to generate structured commute audio briefs.

### 🎧 Adaptive Audio Player & Playback Controls

- **Custom Audio Controls**: Play, pause, seek, and skip between queued briefings.
- **Fluid Speed Control**: Adjustable speed slider (`0.5x` to `2.0x`) and quick preset buttons (`0.5x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`).
- **Sleep Timer**: Configurable countdown timer (5m to 60m) that automatically pauses playback when expired.

### 🔊 AI Narrator Voice Profiles

- **5 Distinct Voice Profiles**: Tailored styles including Zephyr (Calm Narrator), Kore (Energetic Host), Charon (Mellow Storyteller), Puck (Crisp Newsreader), and Fenrir (Bold Anchor).
- **Live Audition Preview**: Audition and test each voice profile directly in the settings panel before generating briefs.

### 📴 Offline Persistence & Haptic Feedback

- **IndexedDB Local Engine**: Save articles, playlists, and listening history locally for offline playback.
- **Tactile Haptics**: Snappy vibration feedback on tap, skip, and playback completion.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion (`motion/react`), Lucide Icons.
- **Backend**: Express server running on Node.js on port `3000` (`server.ts`), handling Gemini AI summarization, search grounding, and Text-to-Speech proxying.
- **AI Engine**: `@google/genai` TypeScript SDK utilizing `gemini-2.5-flash` with Google Search Grounding tools and `gemini-2.5-flash-preview-tts` for TTS generation.

---

## 🔑 Environment Variables

The application configures required environment variables in `.env.example`:

```env
# Server Gemini API Key (Required for AI summarization & TTS)
GEMINI_API_KEY=

# Optional Secret Key for Production Auth Tokens
TOKEN_SECRET=
```

---

## 📚 Documentation Map

This repository follows **Spec-Driven Development (SDD)** principles where specs serve as the source of truth. The complete documentation structure is organized as follows:

| Document                                                               | Description                                 | Key Focus Areas                                                                                 |
| :--------------------------------------------------------------------- | :------------------------------------------ | :---------------------------------------------------------------------------------------------- |
| **[`AGENTS.md`](./AGENTS.md)**                                         | Spec-Driven Development rules & constraints | SDD lifecycle, ambiguity protocols (`[NEEDS CLARIFICATION]`), system rules                      |
| **[`specs/SYSTEM_SPEC.md`](./specs/SYSTEM_SPEC.md)**                   | Master System Specification                 | System scope, Firestore schema, ABAC rules, user stories, acceptance criteria                   |
| **[`specs/IMPLEMENTATION_PLAN.md`](./specs/IMPLEMENTATION_PLAN.md)**   | Architecture Mapping & Roadmap              | Component mapping, completed roadmap phases (1–8), defect tracking catalog                      |
| **[`specs/VALIDATION_CHECKLIST.md`](./specs/VALIDATION_CHECKLIST.md)** | Verification & QA Protocol                  | Type safety, production build validation, feature AC checks, defect verifications               |
| **[`CHANGELOG.md`](./CHANGELOG.md)**                                   | Release & Version History                   | Version release notes following standard [Keep a Changelog](https://keepachangelog.com/) format |
| **[`HANDOFF_LOG.md`](./HANDOFF_LOG.md)**                               | Agent Handoff & Audit Logs                  | Engineering audits, visual layout verifications, and context handoff logs                       |
| **[`LICENSE`](./LICENSE)**                                             | Open-source MIT License                     | Project license terms and permissions                                                           |

---

## ⚙️ Development & Build Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript linting check
npm run lint

# Format codebase with Prettier
npm run format

# Build for production
npm run build

# Start production server
npm run start
```

---

## 📄 License

This project is licensed under the [License](LICENSE).


