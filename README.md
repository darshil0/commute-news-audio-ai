# CommuteBrief: Smart Commute Audio Briefings

Transform real-time news, web articles, and custom text into structured, AI-narrated audio briefings optimized for daily commutes.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites & Verification](#prerequisites--verification)
- [Installation & Environment Setup](#installation--environment-setup)
- [Running the Application](#running-the-application)
- [Architecture & Data Flow](#architecture--data-flow)
- [Feature Specification](#feature-specification)
- [API Reference](#api-reference)
- [Testing & Validation](#testing--validation)
- [Troubleshooting](#troubleshooting)
- [Edge Cases & Known Limitations](#edge-cases--known-limitations)
- [Contributing](#contributing)

---

## Quick Start

**For experienced developers** (assumes Node.js 18+, Gemini API key ready):

```bash
# Clone and setup
git clone https://github.com/darshil0/commute-news-audio-ai.git
cd commute-news-audio-ai

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and TOKEN_SECRET

# Start development server (runs full stack)
npm run dev
# Open http://localhost:3000 (Vite frontend proxy)
```

---

## Prerequisites & Verification

### System Requirements

| Requirement | Minimum | Recommended | Reason |
|---|---|---|---|
| **Node.js** | 18.x | 20.x+ | Modern ES modules, native fetch, crypto support |
| **npm** | 9.x | 10.x+ | Modern dependency resolution |
| **RAM** | 512 MB | 2 GB | Audio buffer handling, Gemini streaming |
| **Disk** | 500 MB | 2 GB | Node modules, local sync cache |
| **Network** | Broadband | Stable connection | Gemini API calls, TTS streaming |

### Required API Keys & Access

| Service | Purpose | Setup | Free Tier |
|---|---|---|---|
| **Google Gemini** | Real-time Search Grounding, summarization, and TTS | [Get API Key](https://aistudio.google.com/app/apikey) | 15 reqs/min on free tier |

### Pre-Installation Verification Checklist

Run this before installation to catch environment issues early:

```bash
# 1. Check Node.js version (must be 18.0.0+)
node --version
# Expected: v18.x.x or higher

# 2. Verify npm is functional
npm --version
# Expected: 9.x.x or higher

# 3. Check available disk space
df -h .
# Expected: >500 MB available

# 4. Check git installation
git --version
# Expected: git version 2.x.x or higher
```

---

## Installation & Environment Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/darshil0/commute-news-audio-ai.git
cd commute-news-audio-ai
```

### Step 2: Install Dependencies

```bash
npm install
```

**What's installed:**
- **Frontend Framework**: React 19, TypeScript, Vite
- **Backend Runtime**: Node.js, Express, `tsx`
- **AI Integrations**: `@google/genai` (Gemini API)
- **UI Components**: `motion` (Framer Motion 12), `lucide-react`, `tailwindcss` (v4)

### Step 3: Configure Environment Variables

Create `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with required values:

```env
# REQUIRED: Secret key used to sign session tokens for sync authentication.
TOKEN_SECRET="your-secure-random-secret-key"

# REQUIRED: Gemini API Configuration
GEMINI_API_KEY="your-gemini-api-key-here"

# OPTIONAL: Host URL configuration
APP_URL="http://localhost:3000"
```

**Critical Security Notes:**
- **NEVER commit `.env` or data files to Git** — they are added to `.gitignore`.
- API keys are managed purely on the server-side (`server.ts`) and never exposed to the client bundle to prevent key leakage.

---

## Running the Application

### Development Mode

Start the full-stack development server (Express serving both API endpoints and the Vite middleware for frontend assets):

```bash
npm run dev
```

**Verify it's running:**

```bash
# Verify backend API endpoints and hot reloading
curl http://localhost:3000/api/sync/get
# Expected: 401 Unauthorized (since no Bearer token is provided, but verifies server is active on Port 3000)
```

### Production Mode

Build and run the optimized production version:

```bash
# Compile TypeScript, bundle frontend, and package the Express server
npm run build

# Start the production Express server
npm run start
```

---

## Architecture & Data Flow

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React 19 SPA (Vite)                                 │  │
│  │  ├─ IntakePanel (Live News Search, Paste Text, URLs)  │  │
│  │  ├─ PodcastPlayer (Adaptive Speed & Controls)        │  │
│  │  ├─ ProfilePanel (5 Voice Profiles, Diagnostics)     │  │
│  │  └─ IndexedDB Store (Local Audio Cache, Offline DB)  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬──────────────────────────────────────────┘
                 │ HTTP API Proxy Calls
                 │ Port 3000
┌────────────────▼──────────────────────────────────────────┐
│              Node.js Backend (Express on :3000)            │
│  ├─ /api/auth/register, /api/auth/login                 │
│  ├─ /api/sync/save, /api/sync/get                       │
│  ├─ /api/articles/extract & /api/articles/summarize     │
│  ├─ /api/articles/search-news                           │
│  └─ /api/articles/tts                                   │
└────────────────┬──────────────────────────────────────────┘
                 │ gRPC/REST
┌────────────────▼──────────────────────────────────────────┐
│                Google Cloud (Gemini API)                  │
│  ├─ Gemini 3.6 Flash (Search Grounding & Summarization)   │
│  └─ Gemini 3.1 Flash TTS Preview (Audio Synthesis)        │
└──────────────────────────────────────────────────────────┘
```

### Data Flow: Creating a Grounded Audio Brief

1. **User Query**: User enters a news topic (e.g., "AI regulations 2024") in the "Live Search" tab.
2. **Search Grounding**: The frontend dispatches a search request to `/api/articles/search-news`.
3. **Live Search**: The backend uses the Gemini 3.6 Flash model with the built-in googleSearch tool. Gemini searches the web, digests citations, and returns structured summary text alongside grounding citations/sources.
4. **Accept & Audio Gen**: User clicks "Save and Play" on the brief. The frontend calls `/api/articles/tts` with the summary text and preferred voice (e.g., "Zephyr").
5. **TTS streaming**: The backend returns the binary voiceover stream, which is stored in IndexedDB for offline resilience and instantly loaded into the adaptive HTML5 `<audio>` player.

---

## Feature Specification

### 1. Real-Time News Search (Gemini Search Grounding)

**Acceptance Criteria:**
- Submitting a news query returns a grounded executive summary in under 10 seconds.
- Displays web citations/sources with secure outbound links (`rel="noopener noreferrer"`).
- Offers one-click "Add & Play Audio Now" / "Save to Briefs" actions.

---

### 2. Adaptive Audio Player

**Acceptance Criteria:**
- Complete player controls: Play/Pause, Seek Bar, 15s Skip Forward/Backward, Volume, Queue Progress.
- Adjust playback speed smoothly between `0.5x` and `2.0x` in steps of `0.05x`, alongside quick preset buttons (`0.5x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`).
- Integrates Sleep Timer with auto-pause execution when remaining time expires.

---

### 3. AI Voice Profiles (5 Distinct Narrators)

Supported prebuilt voices:

| Profile | Voice Name | Style | Use Case |
|---|---|---|---|
| **Zephyr** | `Zephyr` | Calm, conversational | General news |
| **Kore** | `Kore` | Energetic, upbeat | Breaking news, sports |
| **Charon** | `Charon` | Mellow, storytelling | In-depth analysis |
| **Puck** | `Puck` | Crisp, professional | Business, tech |
| **Fenrir** | `Fenrir` | Bold, authoritative | Politics, major events |

---

### 4. Offline Persistence & Fallback

- **Durable Local Storage**: All user briefs, playlists, preferences, and listening progress are stored locally in IndexedDB (`src/lib/db.ts`).
- **Seamless Speech Fallback**: If the server TTS API is unreachable or the device is completely offline, playback automatically falls back to browser-native `window.speechSynthesis`.
- **Haptic Pulse Feedback**: Supported actions (tab switches, play/pause, track skips, track completion) trigger vibration patterns via `navigator.vibrate`.

---

## API Reference

### 1. Authentication Endpoints

#### `POST /api/auth/register` & `POST /api/auth/login`
Registers or authenticates a user.
- **Constraints**: Usernames must strictly match `/^[a-z0-9_-]{3,32}$/` to prevent path traversal risks. Passwords must be at least 8 characters.
- **Request**:
  ```json
  { "username": "commuter_john", "password": "securepassword123" }
  ```
- **Response**:
  ```json
  { "username": "commuter_john", "token": "jwt-like-session-token-string" }
  ```

---

### 2. Synchronization Endpoints

#### `POST /api/sync/save` & `GET /api/sync/get`
Backs up or retrieves client states. Requires `Authorization: Bearer <token>` header.
- **Backup Schema**:
  ```json
  {
    "articles": [],
    "playlists": [],
    "progress": [],
    "preferences": {}
  }
  ```

---

### 3. Intake & Summarization Endpoints

#### `POST /api/articles/extract`
Extracts HTML body from a secure URL and generates a summary.
- **Security**: Strict SSRF protections block private RFC 1918/4193, loopback, and link-local IP addresses.
- **Request**:
  ```json
  {
    "url": "https://example.com/news-story",
    "preferences": { "summaryLength": "medium", "summaryTone": "engaging" }
  }
  ```
- **Response**:
  ```json
  { "title": "Article Title", "summary": "Extracted summary narrative text." }
  ```

#### `POST /api/articles/summarize`
Summarizes raw text payload.

#### `POST /api/articles/search-news`
Performs real-time Gemini Search Grounding on live web content.
- **Response**:
  ```json
  {
    "title": "Headline",
    "category": "Technology",
    "summary": "Grounded news narrative",
    "sources": [
      { "title": "Source Site", "url": "https://source.com/page" }
    ]
  }
  ```

#### `POST /api/articles/tts`
Synthesizes speech audio from narrative text.
- **Response**:
  ```json
  { "audioBase64": "base64-encoded-audio-data", "speed": 1.0 }
  ```

---

## Testing & Validation

### Verification Command Routine

Run this automated validation routine before committing any changes to ensure repository health:

```bash
# 1. Execute full linting and TypeScript compilation checks
npm run lint

# 2. Build production assets and bundle Express backend
npm run build
```

---

## Troubleshooting

### Issue: `GEMINI_API_KEY` undefined / 500 error on AI calls

- **Diagnosis**: Ensure a valid `.env` file exists in the project root directory. Verify that `GEMINI_API_KEY` is defined without any extra surrounding spaces or quotes.
- **Fix**: Restart the server (`npm run dev`) after any modifications to the `.env` file.

### Issue: Sync endpoints return "Forbidden file path access"

- **Diagnosis**: The server enforces username sanitization checks and folder scope bounds to prevent path traversal. Ensure registered usernames only contain alphanumeric characters, underscores, or hyphens, matching `/^[a-z0-9_-]{3,32}$/`.

---

## Edge Cases & Known Limitations

- **Browser Storage Quota**: Offline briefs use IndexedDB to store base64 audio data. If your browser storage quota is reached, use the "Clear Cached Audio" function in the Profile Panel to free space.
- **English-First Narration**: Gemini TTS prebuilt voice preview models are highly optimized for English pronunciation; foreign-language text may result in accented phonetics.

---

## Contributing

1. **Spec-First Development**: Always check the specifications in `/specs/SYSTEM_SPEC.md` and `/specs/IMPLEMENTATION_PLAN.md` before coding. Document changes in the spec first if introducing new features.
2. **Quality Hardening**: Enforce strict type safety. Avoid using `any` types. Ensure all changes pass `npm run lint` and `npm run build`.
