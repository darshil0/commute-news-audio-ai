# SYSTEM_SPEC.md - CommuteBrief System Specification

## 1. Purpose
**CommuteBrief (CommuteNews)** is a full-stack, audio-first single-page web application (SPA) designed to optimize daily commutes. It accepts pasted text articles or web news URLs, converts them into concise, structured summaries using server-side Gemini AI models, and synthesizes natural-sounding audio briefings using AI voice models or browser-native Text-to-Speech (TTS) fallbacks.

---

## 2. Scope

### In-Scope Capabilities
1. **Article & Link Intake**:
   - URL extraction and text summarization via Express `/api/extract` and `/api/summarize` proxy routes.
   - Voice profile customization (Zephyr, Kore, Charon, Puck, Fenrir) with live audition preview capabilities.
2. **Audio Synthesis & Playback**:
   - Server-side TTS synthesis via Gemini / `@google/genai` API (`/api/tts`).
   - Browser-native `window.speechSynthesis` graceful fallback when offline or when API limits/errors occur.
   - Custom audio player controls: Play/Pause, Seek Bar, Volume, Skip Next/Previous, Sleep Timer, and Speed Control (`0.5x` to `2.0x` with quick presets).
3. **Queue & Playlist Management**:
   - Interactive playlist creation, track reordering (HTML5 drag-and-drop), track additions, and removal.
   - Up-next queue playback sequence with automatic track progression upon completion.
4. **Search & Category Filtering**:
   - Tokenized fuzzy search utility (`src/utils/search.ts`) filtering articles across titles, summaries, authors, categories, tags, and saved/downloaded states in `HomeDashboard` and `PlaylistPanel`.
5. **Persistence & Offline Support**:
   - Client-side IndexedDB persistence (`src/lib/db.ts`) for articles, playlists, listening history, voice preferences, and audio progress tracking.
   - Offline detection and state indicators.
6. **Haptic Feedback**:
   - Hardware/browser `navigator.vibrate` haptic pulses for tab switches, playback actions, track skips, speed changes, and track completion.

---

## 3. Assumptions

1. **Environment & Server**: Runs in a Cloud Run / Node.js container behind an Nginx proxy routing traffic exclusively to port `3000`.
2. **API Access**: `GEMINI_API_KEY` is provided in the server environment (or injected via AI Studio secrets).
3. **Client Standards**: Modern web browser supporting HTML5 Web Audio API, IndexedDB, and optional Web Speech API (`window.speechSynthesis`).
4. **Offline Mode**: Browsers without network connectivity can still play cached audio or utilize client-side Web Speech TTS synthesis.

---

## 4. User Stories & Use Cases

### US-1: Article Intake & Briefing Generation
- **As a** daily commuter,
- **I want to** paste an article URL or text body,
- **So that** I can generate a concise audio brief for my commute.

### US-2: Personalized Voice Selection & Auditioning
- **As a** listener,
- **I want to** preview and select different AI narrator voice profiles (Calm, Energetic, Mellow, Crisp, Bold),
- **So that** my audio briefings match my preferred listening tone.

### US-3: Adaptive Audio Playback & Speed Controls
- **As a** user on the go,
- **I want to** adjust playback speed smoothly between 0.5x and 2.0x and use quick speed presets,
- **So that** I can listen at my ideal pacing.

### US-4: Playlist & Queue Organization
- **As a** power listener,
- **I want to** create custom playlists and reorder tracks via drag-and-drop,
- **So that** I can stream multiple briefs back-to-back during long rides.

### US-5: Fast Tokenized Search & Filtering
- **As a** user with a growing library of briefs,
- **I want to** quickly search through saved audio summaries in Home Dashboard and Playlist Panel,
- **So that** I can find specific topics instantly.

### US-6: Resilient Offline Playback & Speech Fallback
- **As a** commuter passing through low-connectivity areas,
- **I want** audio playback to continue seamlessly using local storage or browser Web Speech synthesis,
- **So that** my commute stream is never interrupted.

---

## 5. Acceptance Criteria

| ID | Category | Acceptance Criteria |
|---|---|---|
| **AC-1.1** | Intake | Submitting a valid text or URL invokes server endpoints `/api/extract` or `/api/summarize` and returns a structured brief title and summary. |
| **AC-1.2** | Intake | Missing or invalid URLs present user-friendly error feedback without crashing the application. |
| **AC-2.1** | Voice | The Profile panel displays 5 distinct voice profiles (Zephyr, Kore, Charon, Puck, Fenrir) with tone descriptions. |
| **AC-2.2** | Voice | Clicking "Audition" generates and plays a short audio preview clip from `/api/tts-preview`. |
| **AC-3.1** | Playback | The podcast player supports Play/Pause, Seek, Volume, 15s Skip Forward/Backward, and Sleep Timer. |
| **AC-3.2** | Playback | The speed slider allows smooth adjustments from `0.5x` to `2.0x` in `0.05x` steps, alongside quick preset buttons (`0.5x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`). |
| **AC-4.1** | Playlist | Users can create, rename, and delete custom playlists. |
| **AC-4.2** | Playlist | Tracks inside a playlist can be reordered using HTML5 drag-and-drop handles. |
| **AC-5.1** | Search | The search input in `HomeDashboard` and `PlaylistPanel` filters articles in real-time across titles, categories, authors, summaries, and tags. |
| **AC-5.2** | Search | Category filters include "All", "Saved", "Downloaded", and topic categories. |
| **AC-6.1** | Fallback | If the server TTS endpoint fails or the device is offline, playback automatically falls back to browser `window.speechSynthesis`. |
| **AC-6.2** | Haptics | Supported actions (tab changes, play/pause, track completion) trigger distinct haptic vibration patterns via `navigator.vibrate`. |

---

## 6. Non-Goals

- **External RSS Feed Crawler**: Background automatic crawling of arbitrary third-party RSS feeds is out of scope.
- **Multi-Tenant User Accounts**: Remote multi-user database authentication (e.g. Firebase Auth / OAuth) is out of scope for the current single-user client-side storage model.
- **Social Feed Sharing**: Native social networking or direct peer-to-peer sharing feeds are not included in this release.

---

## 7. Open Items & `[NEEDS CLARIFICATION]`

1. **`[NEEDS CLARIFICATION]` Cloud Storage Synchronization**: Currently, all briefs, playlists, and playback progress are stored locally in IndexedDB. If cloud multi-device sync is requested in future specs, backend database integration (such as Firestore) will need to be specified.
2. **`[NEEDS CLARIFICATION]` Custom Voice Model Fine-Tuning**: Custom user-uploaded voice cloning models are not currently supported; voice selection is restricted to the defined 5 standard preset voice profiles.

---

## 8. Validation Protocol

1. **Type Safety**: Run `npm run lint` (`tsc --noEmit`) to confirm zero compilation or type errors.
2. **Production Bundle**: Run `npm run build` to verify Vite and esbuild server bundler success.
3. **Runtime Verification**: Verify that port `3000` serves the SPA and Express backend proxy cleanly.
