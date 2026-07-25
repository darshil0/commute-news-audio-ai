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
# Edit .env with your GEMINI_API_KEY

# Start development server
npm run dev
# Open http://localhost:5173 (Vite frontend)
# Backend: http://localhost:3000

# Verify setup (see Prerequisites & Verification below)
npm run test:setup
```

---

## Prerequisites & Verification

### System Requirements

| Requirement | Minimum | Recommended | Reason |
|---|---|---|---|
| **Node.js** | 16.x | 18.20+ | TypeScript, native fetch, crypto support |
| **npm** | 7.x | 9.x+ | Peer dependency resolution |
| **RAM** | 512 MB | 2 GB | Audio buffer handling, Gemini streaming |
| **Disk** | 500 MB | 2 GB | node_modules, audio cache (IndexedDB) |
| **Network** | Broadband | Stable connection | Gemini API calls, TTS streaming |

### Required API Keys & Access

| Service | Purpose | Setup | Free Tier |
|---|---|---|---|
| **Google Gemini** | News search grounding, summarization, TTS | [Get API Key](https://aistudio.google.com/app/apikey) | 60 reqs/min (15,000/day) |
| *(Optional) Speech API* | Fallback TTS if Google unavailable | Via GCP Console | Limited free quota |

### Pre-Installation Verification Checklist

Run this before installation to catch issues early:

```bash
# 1. Check Node.js version (must be 16.0.0+)
node --version
# Expected: v18.x.x or higher

# 2. Verify npm is functional
npm --version
# Expected: 7.x.x or higher

# 3. Test internet connectivity and DNS
ping -c 1 api.generativeai.google.com
# Expected: Reply from api.generativeai.google.com

# 4. Check available disk space
df -h .
# Expected: >500 MB available

# 5. Test Git access (if cloning)
git --version
# Expected: git version 2.x.x or higher
```

**Verification Script** (`verify-setup.sh`):

```bash
#!/bin/bash
set -e

echo "🔍 CommuteBrief Prerequisites Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Node.js check
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
  echo "❌ Node.js 16+ required. Found: $(node -v)"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# npm check
echo "✅ npm $(npm -v)"

# Disk space
DISK_AVAILABLE=$(df . | tail -1 | awk '{print $4}')
if [ "$DISK_AVAILABLE" -lt 500000 ]; then
  echo "⚠️  Warning: <500MB disk space available"
fi
echo "✅ Disk: $(df -h . | tail -1 | awk '{print $4}') available"

# Network check
if ping -c 1 api.generativeai.google.com &> /dev/null; then
  echo "✅ Internet connectivity: OK"
else
  echo "❌ Cannot reach Google API. Check firewall/VPN."
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All prerequisites verified!"
```

---

## Installation & Environment Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/darshil0/commute-news-audio-ai.git
cd commute-news-audio-ai
```

**Assumptions:**
- Git is installed and configured
- You have read access to the repository
- SSH or HTTPS credentials are set up

### Step 2: Install Dependencies

```bash
npm install
```

**What's installed:**
- React 19, TypeScript, Vite (frontend build)
- Express, Node.js runtime (backend)
- `@google/genai` SDK (Gemini API)
- `framer-motion`, `lucide-react`, `tailwind-css` (UI)

**Failure modes:**
- **`npm ERR! 404 not found`** → Check package name in `package.json`; verify npm registry access
- **`npm ERR! peer dep missing`** → Run `npm install --legacy-peer-deps` if needed
- **`EACCES: permission denied`** → Run `sudo npm install` (not recommended) or use nvm to manage Node

### Step 3: Configure Environment Variables

Create `.env` file in project root:

```bash
cp .env.example .env
```

Edit `.env` with required values:

```env
# REQUIRED: Gemini API Configuration
VITE_GEMINI_API_KEY=your-gemini-api-key-here
VITE_GEMINI_MODEL=gemini-3.6-flash

# Optional: Backend Configuration
BACKEND_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug

# Optional: Feature Flags
ENABLE_SEARCH_GROUNDING=true
ENABLE_TTS_CACHE=true
ENABLE_HAPTIC_FEEDBACK=true
```

**Critical Notes:**
- **NEVER commit `.env` to Git** — add to `.gitignore`
- API keys exposed in `.env` are a security risk; use GitHub Secrets for CI/CD
- `VITE_*` prefix makes variables accessible in browser (expose only non-sensitive data)
- Without `GEMINI_API_KEY`, search grounding and TTS will fail

### Step 4: Validate Installation

```bash
# Run linter to catch TypeScript/ESLint errors
npm run lint

# (Optional) Build production version to verify all assets compile
npm run build

echo "✅ Installation complete! Ready to start dev server."
```

**Expected output:**
```
✅ All TypeScript files pass type checking
✅ No ESLint errors
✅ Build artifacts generated in ./dist/
```

---

## Running the Application

### Development Mode

Start both frontend (Vite dev server) and backend (Express):

```bash
npm run dev
```

**What starts:**
- **Frontend:** Vite dev server on `http://localhost:5173`
- **Backend:** Express on `http://localhost:3000`
- Hot module reloading enabled (frontend changes auto-refresh)

**Verify it's running:**

```bash
# Terminal 1: Check frontend
curl http://localhost:5173
# Expected: HTML response with React app

# Terminal 2: Check backend
curl http://localhost:3000/health
# Expected: {"status": "ok"}
```

### Production Mode

Build and run optimized production version:

```bash
# Build frontend (minified React bundle)
npm run build

# Build backend (compile TypeScript)
npm run build:server

# Start production server
npm run start
```

**Environment:**
- `NODE_ENV=production` enables performance optimizations, disables console logging
- Frontend assets served from `./dist/` (gzipped, cached)
- Backend listens on port defined in `.env` or `3000`

---

## Architecture & Data Flow

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React 19 App (Vite)                                 │  │
│  │  ├─ NewsSearch Component (Gemini Search Grounding)   │  │
│  │  ├─ AudioPlayer Component (Playback Control)         │  │
│  │  ├─ VoiceProfiles Panel (5 AI Narrators)            │  │
│  │  └─ OfflineStore (IndexedDB - Briefs, History)      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬──────────────────────────────────────────┘
                 │ HTTP/WebSocket
┌────────────────▼──────────────────────────────────────────┐
│              Node.js Backend (Express on :3000)            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /search   → Gemini Search Grounding API             │  │
│  │  /summarize → Gemini Content Summarization           │  │
│  │  /tts       → Google Cloud TTS (or fallback)         │  │
│  │  /briefing  → Save/Retrieve briefing metadata        │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬──────────────────────────────────────────┘
                 │ API calls (gRPC/REST)
┌────────────────▼──────────────────────────────────────────┐
│           External APIs (Google Cloud)                     │
│  ├─ Gemini 3.6 Flash (LLM + Search Grounding)             │
│  ├─ Cloud Text-to-Speech (TTS)                           │
│  └─ Web Search (via Search Grounding tool)               │
└──────────────────────────────────────────────────────────┘
```

### Data Flow: Creating an Audio Brief

**Given:** User enters a news topic (e.g., "AI regulations 2024")

**When:** User clicks "Create Brief"

**Then:**

1. **Frontend** sends search query to Backend `/search` endpoint
2. **Backend** calls Gemini API with Search Grounding tool
3. **Gemini** performs web search, returns results + citations
4. **Backend** summarizes results into structured brief (title, summary, sources)
5. **Frontend** receives briefing JSON
6. **Frontend** calls `/tts` with selected voice profile (e.g., "Zephyr")
7. **Backend** streams audio bytes to frontend
8. **Frontend** stores brief + audio in IndexedDB (offline persistence)
9. **Audio Player** displays playback controls, applies speed/sleep timer
10. **IndexedDB** persists brief for offline playback later

### State Management

- **Frontend State:** React `useState` for UI (current playing brief, selected voice, speed)
- **Persistent Storage:** IndexedDB for briefs, playback history, user preferences
- **Backend State:** Express session/memory (transient; no DB required for MVP)

---

## Feature Specification

### 1. Real-Time News Search (Gemini Search Grounding)

**Acceptance Criteria:**

```
Given: User is on the News Search tab
When: User enters "AI regulations Europe 2024" and clicks "Search"
Then: 
  ✅ Within 3-5 seconds, results appear
  ✅ Each result includes title, snippet, source link
  ✅ Results are dated and sorted by relevance
  ✅ User can click "Add to Brief" to create an audio brief
  ✅ Search is cached for 1 hour to reduce API calls
```

**Edge Cases:**

| Scenario | Expected Behavior | Fallback |
|---|---|---|
| No results found | Show "No results" message | Suggest related topics |
| API rate limit hit | Show "Rate limit exceeded" after 60+ requests | Disable search for 1 min |
| Network timeout (>10s) | Cancel request, show error | Retry with exponential backoff |
| Malformed query (empty, >500 chars) | Reject input, show validation error | Clear input, focus search box |

---

### 2. Adaptive Audio Player

**Acceptance Criteria:**

```
Given: User has queued 3+ briefings
When: User clicks Play
Then:
  ✅ Audio starts at current position (or 0:00 if new)
  ✅ Playback speed can be adjusted 0.5x → 2.0x (6 presets)
  ✅ User can skip to next/previous brief (<200ms latency)
  ✅ Sleep timer countdown displays, auto-pauses at 0
  ✅ Progress bar seekable via click or drag
```

**Test Cases:**

| Test | Input | Expected Output | Validation |
|---|---|---|---|
| Play/Pause Toggle | Click play → click pause | Audio starts, pauses at same position | Audio doesn't skip |
| Speed Change | Change speed 1.0x → 1.5x mid-play | Speed changes smoothly | Pitch preserved, no distortion |
| Skip on Last Brief | Playing brief #3, click Next | Shows "End of queue" message | Queue doesn't loop unexpectedly |
| Sleep Timer Expire | Set 5-min timer, wait 5m 10s | Playback auto-pauses | Timer resets, audio stops cleanly |

---

### 3. AI Voice Profiles (5 Distinct Narrators)

**Voice Options:**

| Profile | Style | Use Case | Gender |
|---|---|---|---|
| **Zephyr** | Calm, conversational | General news | Neutral |
| **Kore** | Energetic, upbeat | Breaking news, sports | Neutral |
| **Charon** | Mellow, storytelling | In-depth analysis | Neutral |
| **Puck** | Crisp, professional | Business, tech | Neutral |
| **Fenrir** | Bold, authoritative | Political, major events | Neutral |

**Acceptance Criteria:**

```
Given: User navigates to Voice Settings
When: User clicks "Preview" next to a voice
Then:
  ✅ 10-15 second sample audio plays immediately
  ✅ User can select voice and it applies to all new briefs
  ✅ Previously generated briefs keep their original voice
  ✅ Voice preference saved to IndexedDB
```

---

### 4. Offline Persistence & Haptic Feedback

**Offline Mode:**

```
Given: User is offline (no internet)
When: User opens app
Then:
  ✅ Cached briefs display and play back fully
  ✅ Search feature disabled (shows "Offline" badge)
  ✅ IndexedDB contains all articles, metadata, audio
  ✅ Haptic feedback still works (device-level vibration)
```

**Haptic Events:**

- Tap on button: 10ms vibration
- Skip to next: 20ms + 10ms (double pulse)
- Playback complete: 50ms + 30ms (two-tone)
- Error state: 100ms (long buzz)

---

## API Reference

### Backend Endpoints

#### `POST /api/search`

Search for news articles with Gemini Search Grounding.

**Request:**

```json
{
  "query": "AI regulations Europe 2024",
  "limit": 5,
  "timeRange": "week"
}
```

**Response:**

```json
{
  "status": "success",
  "results": [
    {
      "id": "article_123",
      "title": "EU AI Act: New Regulations Take Effect",
      "snippet": "The European Union's comprehensive AI regulation...",
      "source": "https://example.com/article",
      "publishedAt": "2024-06-09T10:00:00Z",
      "relevanceScore": 0.95,
      "citations": ["source1", "source2"]
    }
  ],
  "totalResults": 42,
  "requestId": "req_abc123"
}
```

**Error Responses:**

```json
{
  "status": "error",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "60 requests/min exceeded. Retry after 60s.",
  "retryAfter": 60
}
```

**Status Codes:**

| Code | Meaning | Action |
|---|---|---|
| 200 | Success | Parse results |
| 400 | Bad request (empty query, >500 chars) | Validate input |
| 401 | Unauthorized (invalid API key) | Check `.env` GEMINI_API_KEY |
| 429 | Rate limited | Retry after `retryAfter` seconds |
| 500 | Server error | Retry with exponential backoff |
| 503 | Service unavailable | Show "Service down" message |

---

#### `POST /api/summarize`

Summarize URL or text content into structured brief.

**Request:**

```json
{
  "content": "URL or text",
  "type": "url | text",
  "format": "brief"
}
```

**Response:**

```json
{
  "status": "success",
  "briefing": {
    "id": "brief_456",
    "title": "Article Title",
    "summary": "Structured summary (3-5 sentences)",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "sources": [{"url": "...", "title": "..."}],
    "createdAt": "2024-06-09T10:05:00Z"
  }
}
```

---

#### `POST /api/tts`

Generate audio from briefing text with selected voice profile.

**Request:**

```json
{
  "text": "Briefing summary text",
  "voiceProfile": "zephyr",
  "audioFormat": "mp3"
}
```

**Response:**

```
(Binary audio stream - mp3/wav)
Content-Type: audio/mpeg
Content-Length: 245632
```

**Failure Handling:**

- Timeout (>15s): Abort stream, return 408 Request Timeout
- Unsupported voice: Return 400 Bad Request with valid options
- API key invalid: Return 401 Unauthorized

---

### Frontend API (React Hooks)

```typescript
// Use news search
const { results, loading, error } = useNewsSearch(query);

// Load briefing from IndexedDB
const { brief, audioUrl } = useBriefing(briefId);

// Manage audio playback
const { play, pause, seek, speed, setSpeed } = useAudioPlayer();

// Access voice profiles
const { voices, selectVoice, previewVoice } = useVoiceProfiles();
```

---

## Testing & Validation

### Test Strategy

**Test Pyramid:**

```
        ▲
       /|\
      / | \        E2E Tests (10%)
     /  |  \       ├─ Full user workflows
    /   |   \      ├─ Search → Brief → Playback
   /    |    \     └─ Offline mode
  /____ | ____\    
  /     |     \    Integration Tests (30%)
 /      |      \   ├─ Backend + Gemini API
/       |       \  ├─ TTS generation
┌───────┼───────┐  └─ IndexedDB persistence
│ Unit Tests (60%) │  ├─ Components (React)
│ ├─ Utilities     │  ├─ API handlers
│ ├─ Hooks         │  └─ Voice selection
│ └─ Parsing       │
└──────────────────┘
```

### Unit Tests (Jest/Vitest)

**Test: Voice Profile Selection**

```typescript
import { describe, it, expect } from 'vitest';
import { useVoiceProfiles } from './useVoiceProfiles';

describe('useVoiceProfiles', () => {
  it('should initialize with default voice (Zephyr)', () => {
    // Arrange
    const expectedDefault = 'zephyr';
    
    // Act
    const { currentVoice } = useVoiceProfiles();
    
    // Assert
    expect(currentVoice).toBe(expectedDefault);
  });

  it('should persist voice selection to IndexedDB', async () => {
    // Arrange
    const { selectVoice, currentVoice } = useVoiceProfiles();
    const newVoice = 'fenrir';
    
    // Act
    await selectVoice(newVoice);
    
    // Assert
    expect(currentVoice).toBe(newVoice);
    // Verify IndexedDB contains preference
    const stored = await db.preferences.get('voiceProfile');
    expect(stored).toBe(newVoice);
  });

  it('should reject invalid voice profile', () => {
    // Arrange
    const { selectVoice } = useVoiceProfiles();
    
    // Act & Assert
    expect(() => selectVoice('invalid-voice')).toThrow(
      'Voice profile "invalid-voice" not found'
    );
  });
});
```

---

### Integration Tests

**Test: Search → Summarize → TTS Flow**

```typescript
describe('News Brief Creation Flow', () => {
  it('should create audio brief from search query', async () => {
    // Arrange
    const query = 'AI regulations';
    const server = setupMockGeminiAPI();
    
    // Act
    const results = await api.search(query);
    const briefing = await api.summarize(results[0].url);
    const audioStream = await api.tts(briefing.summary, 'kore');
    
    // Assert
    expect(results.length).toBeGreaterThan(0);
    expect(briefing.title).toBeDefined();
    expect(audioStream).toBeInstanceOf(Blob);
    expect(audioStream.type).toBe('audio/mpeg');
  });

  it('should handle API timeout gracefully', async () => {
    // Arrange
    const server = setupMockAPI();
    server.delay = 15000; // >timeout
    
    // Act & Assert
    await expect(api.search('query')).rejects.toThrow(
      'Request timeout after 10s'
    );
  });
});
```

---

### End-to-End Tests (Playwright/Cypress)

```typescript
describe('User Workflow: Search to Playback', () => {
  it('should create and play audio brief', async () => {
    // Arrange
    await page.goto('http://localhost:5173');
    
    // Act: Search
    await page.fill('input[placeholder="Search news..."]', 'AI safety');
    await page.click('button:has-text("Search")');
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
    
    // Act: Create brief
    await page.click('[data-testid="add-to-brief-0"]');
    await page.waitForSelector('[data-testid="voice-selector"]');
    await page.selectOption('[data-testid="voice-selector"]', 'puck');
    
    // Act: Generate audio
    await page.click('button:has-text("Generate Brief")');
    await page.waitForSelector('audio', { timeout: 10000 });
    
    // Act: Play audio
    const audioElement = await page.$('audio');
    await page.click('button[aria-label="Play"]');
    await page.waitForTimeout(2000); // Let audio play
    
    // Assert
    const isPlaying = await audioElement.evaluate((el) => !el.paused);
    expect(isPlaying).toBe(true);
  });
});
```

---

### Manual QA Checklist

Run before each release:

- [ ] **Search Grounding**
  - [ ] Search returns results in <5s
  - [ ] Results include source citations
  - [ ] Rate limiting works (60+ requests show error)
  
- [ ] **Audio Playback**
  - [ ] Play/pause toggles correctly
  - [ ] Speed changes 0.5x–2.0x smoothly
  - [ ] Skip doesn't crash on last item
  - [ ] Sleep timer auto-pauses at 0
  
- [ ] **Offline Mode**
  - [ ] Disable wifi, app still plays cached briefs
  - [ ] Search disabled offline
  - [ ] Haptic feedback works
  
- [ ] **Voice Profiles**
  - [ ] All 5 voices audition correctly
  - [ ] Voice preference persists after reload
  - [ ] Invalid voice rejected with error
  
- [ ] **Error Handling**
  - [ ] API timeout shows error + retry
  - [ ] Invalid API key shows clear message
  - [ ] Network errors handled gracefully

---

## Troubleshooting

### Installation & Setup Issues

#### Issue: `npm install` fails with peer dependency error

**Symptoms:**
```
npm ERR! peer dep missing: react@^18.0.0, resolved to 19.0.0-alpha
```

**Solution:**
```bash
npm install --legacy-peer-deps
```

**Why:** React 19 is pre-release; some packages expect React 18. `--legacy-peer-deps` skips strict peer dep checks.

---

#### Issue: `GEMINI_API_KEY` undefined, Search returns 401

**Symptoms:**
```
Error: Unauthorized - Invalid or missing API key
POST /api/search → 401
```

**Diagnosis:**
```bash
# Check if .env exists
ls -la .env
# Should exist in project root

# Verify key is set
grep GEMINI_API_KEY .env
# Should show: VITE_GEMINI_API_KEY=sk-...
```

**Solution:**
1. Get API key from https://aistudio.google.com/app/apikey
2. Add to `.env`: `VITE_GEMINI_API_KEY=your-key`
3. Restart dev server: `npm run dev`
4. Test: `curl http://localhost:3000/health`

---

#### Issue: `npm run dev` starts only frontend, backend won't start

**Symptoms:**
```
Vite server ready at http://localhost:5173
(no backend output)
```

**Solution:**
Check `package.json` `dev` script. Should start both frontend + backend:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\""
  }
}
```

If missing, install concurrently:
```bash
npm install --save-dev concurrently
```

---

### API & Runtime Issues

#### Issue: Search returns results, but audio generation (TTS) fails

**Symptoms:**
```
GET /api/tts → 500 Internal Server Error
Audio: <audio> tag stays empty
```

**Diagnosis:**
```bash
# Check backend logs
tail -f /tmp/commute-brief.log | grep TTS

# Test TTS endpoint directly
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"test","voiceProfile":"zephyr"}'
```

**Common Causes:**

| Cause | Fix |
|---|---|
| Google Cloud TTS API not enabled | Enable in GCP Console: APIs & Services > Enable APIs > Cloud Text-to-Speech |
| Gemini API key has no TTS permission | Use same key for both Search Grounding + TTS |
| Voice profile name misspelled | Use exact names: `zephyr`, `kore`, `charon`, `puck`, `fenrir` |

---

#### Issue: IndexedDB quota exceeded, offline briefings not saving

**Symptoms:**
```
IndexedDB Error: QuotaExceededError (50MB default limit)
Brief not saved to offline storage
```

**Solution:**
1. Clear IndexedDB (Settings > Clear Cache)
2. Request persistent storage permission:
   ```typescript
   if (navigator.storage && navigator.storage.persist) {
     const persistent = await navigator.storage.persist();
     console.log(`Persistent storage: ${persistent}`);
   }
   ```
3. Monitor storage: `DevTools > Application > IndexedDB`

---

#### Issue: Playback speed changes cause audio to distort or skip

**Symptoms:**
```
Change speed 1.0x → 1.5x: audio stutters, pitch warps
```

**Root Cause:** HTML5 `<audio>` playback rate applies to entire stream; some audio formats don't handle >1.5x well.

**Solution:**
```typescript
// Clamp speed to safe range
const safeSpeed = Math.max(0.75, Math.min(1.75, userSpeed));
audioElement.playbackRate = safeSpeed;

// For >1.75x, consider re-rendering audio at faster rate server-side
if (userSpeed > 1.75) {
  // Re-request TTS with faster speaking rate parameter
  const audio = await tts(text, voice, { rate: 1.25 });
}
```

---

### Browser & Device Issues

#### Issue: Haptic feedback not working on mobile

**Symptoms:**
```
Android/iOS device, no vibration on button tap
```

**Diagnosis:**
```typescript
// Check if Vibration API is available
console.log(navigator.vibrate ? 'Available' : 'Not supported');
```

**Solution:**
1. Ensure HTTPS (Vibration API requires secure context)
2. Check if vibration permissions granted
3. Test: `navigator.vibrate(100)` in DevTools console
4. Some devices have vibration disabled in settings

---

#### Issue: Audio streaming stops/buffers on slow network

**Symptoms:**
```
Audio plays 10s, then freezes while buffering
Network: 2G/3G (< 256 kbps)
```

**Solution:**
1. Enable audio caching in `.env`: `ENABLE_TTS_CACHE=true`
2. Request lower bitrate: change TTS quality to "low"
3. Pre-load audio on better connection (WiFi)
4. Fallback to client-side speech synthesis (less robust but always works):
   ```typescript
   if (audioStream fails) {
     const synth = window.speechSynthesis;
     synth.speak(utterance);
   }
   ```

---

## Edge Cases & Known Limitations

### Edge Cases Handled

| Scenario | Behavior | Code |
|---|---|---|
| Search returns 0 results | Show "No results" + suggest similar topics | `frontend/components/SearchEmpty.tsx` |
| User searches while offline | Disable search input, show "Offline" badge | `useNetworkStatus()` hook |
| API rate limit (60 req/min exceeded) | Queue search, retry after 60s | Backend retry logic |
| Speech synthesis not available | Fall back to HTML5 audio only (no voice) | `useVoiceProfiles()` error boundary |
| IndexedDB quota full (50MB) | Delete oldest briefs automatically | `cleanupIndexedDB()` |
| Audio codec unsupported by browser | Try MP3 → WAV → fallback to text | `getAudioFormat()` |
| User closes tab during TTS generation | Gracefully cancel stream, clean up | Abort controller |
| Viewport <320px (very small phone) | Stack layout vertically, hide non-essential controls | Tailwind responsive classes |

### Known Limitations

| Limitation | Impact | Workaround | Planned Fix |
|---|---|---|---|
| **No multi-user sync** | Briefs only saved locally, not synced across devices | Export/import briefs manually | Planned: Cloud sync v2.0 |
| **No pause-resume of TTS generation** | If TTS cut off mid-way, must re-generate full audio | Re-trigger TTS generation | Cache partial audio streams |
| **Gemini Search Grounding rate limit (60 req/min)** | Heavy usage blocked for 1 min | Implement local caching, debounce searches | Subscribe to higher tier |
| **English-only voice narration** | Non-English briefs use default text-to-speech | Manually select language in future version | Add multi-language support |
| **Audio only, no transcript view** | Can't read while listening | Display transcript alongside player (planned) | Add transcript display v1.5 |
| **No dark mode** | Eye strain for night commute users | Use browser's native dark mode CSS | Dark mode UI v1.3 |

---

## Contributing

### Guidelines

1. **Spec-Driven Development (SDD):** Before coding, check `specs/` folder
   - `SYSTEM_SPEC.md` — Requirements & user stories
   - `IMPLEMENTATION_PLAN.md` — Architecture & phases
   - `VALIDATION_CHECKLIST.md` — QA criteria

2. **Code Standards:**
   - TypeScript strict mode enabled
   - Components: Functional + React Hooks only
   - No `any` types; use proper TypeScript interfaces
   - 80+ character line limit for readability
   - Unit test coverage: >80% for utilities, >60% for components

3. **Testing Before PR:**
   ```bash
   npm run lint      # TypeScript + ESLint
   npm run test      # Unit + integration tests
   npm run build     # Production build verification
   ```

4. **Commit Messages:**
   ```
   [feature|fix|docs|test] Brief description

   - Detail 1
   - Detail 2
   References #issue-number
   ```

5. **PR Process:**
   - Link to related issue/spec
   - Describe changes + testing performed
   - Request review from QA specialist before merge
   - Ensure CI/CD passes (lint, build, tests)

---

## Assumptions & Design Decisions

### Assumptions

- **User has stable internet for initial setup & search** — Offline works for cached briefs only
- **Gemini API key is kept private** — Never commit `.env`; use GitHub Secrets for CI/CD
- **Target devices: modern browsers** (Chrome, Safari, Firefox, Edge on desktop & mobile)
- **Audio formats:** MP3 preferred; WAV fallback; codec auto-detection
- **Commute duration:** 15m–60m (audio briefs sized for this window)
- **No user authentication** — MVP is single-user; multi-user auth planned for v2.0

### Design Decisions

1. **Why IndexedDB over localStorage?**
   - localStorage: 5–10 MB limit (insufficient for audio)
   - IndexedDB: 50 MB+ per app; better for large binary data (audio)

2. **Why Gemini over other LLMs?**
   - Search Grounding built-in (no separate search API needed)
   - Strong summarization + TTS integration
   - Competitive pricing on free tier

3. **Why Express + Node.js?**
   - Full-stack JavaScript (code reuse, team familiarity)
   - Lightweight for MVP (no database needed)
   - Easy scaling: stateless, can add Node cluster later

4. **Why 5 voice profiles (not more)?**
   - Balance: variety without overwhelming UX
   - Storage: 5 × TTS models manageable; >10 becomes costly
   - Testing: QA load (more profiles = more test cases)

---

## Version History

| Version | Date | Changes |
|---|---|---|
| **1.0.0** | 2024-06-09 | Initial release: Search Grounding, Audio Player, 5 Voice Profiles, Offline Mode |
| **0.9.0** | 2024-06-01 | Beta: Core features, React 19 + Vite |
| **0.1.0** | 2024-05-01 | Alpha: Proof of concept |

---

## License

[Add your license here, e.g., MIT, Apache 2.0]

---

## Support & Contact

- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions
- **Email:** [your email]
- **Spec Document:** See `/specs/` folder for full system documentation

---

## Quick Reference

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Test | `npm run test` |
| Build | `npm run build` |
| Production | `npm run start` |
| Verify setup | `npm run test:setup` or `bash verify-setup.sh` |
| Clear cache | DevTools > Application > Storage > Clear All |
