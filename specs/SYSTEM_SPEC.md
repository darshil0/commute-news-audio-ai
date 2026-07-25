# SYSTEM_SPEC.md - CommuteBrief System Specification

## 1. Purpose
**CommuteBrief (CommuteNews)** is a full-stack, audio-first single-page web application (SPA) designed to optimize daily commutes. It accepts pasted text articles or web news URLs, converts them into concise, structured summaries using server-side Gemini AI models, synthesizes natural-sounding audio briefings using AI voice models or browser-native Text-to-Speech (TTS) fallbacks, and provides **secure, token-authenticated backend-driven cross-device synchronization** for playlists and user briefs powered by our custom Express server and JSON-file database.

---

## 2. Scope

### In-Scope Capabilities
1. **Article, Link & Live Search Intake**:
   - URL extraction and text summarization via Express `/api/articles/extract` and `/api/articles/summarize` proxy routes.
   - Real-time Gemini Search Grounding via Express `/api/articles/search-news` proxy route, allowing users to search real-time news articles or topics before generating audio summaries.
   - Grounded web sources / citations extraction and display.
   - Voice profile customization (Zephyr, Kore, Charon, Puck, Fenrir) with live audition preview capabilities.
2. **Audio Synthesis & Playback**:
   - Server-side TTS synthesis via Gemini / `@google/genai` API (`/api/articles/tts`).
   - Browser-native `window.speechSynthesis` graceful fallback when offline or when API limits/errors occur.
   - Custom audio player controls: Play/Pause, Seek Bar, Volume, Skip Next/Previous, Sleep Timer, and Speed Control (`0.5x` to `2.0x` with quick presets).
3. **Queue & Playlist Management**:
   - Interactive playlist creation, track reordering (HTML5 drag-and-drop), track additions, and removal.
   - Up-next queue playback sequence with automatic track progression upon completion.
4. **Search & Category Filtering**:
   - Tokenized fuzzy search utility (`src/utils/search.ts`) filtering articles across titles, summaries, authors, categories, tags, and saved/downloaded states in `HomeDashboard` and `PlaylistPanel`.
5. **Persistence & Offline Support**:
   - Client-side IndexedDB persistence (`src/lib/db.ts`) for local audio caching, articles, playlists, listening history, voice preferences, and audio progress tracking.
   - Offline detection and seamless state fallback.
6. **Cross-Device Synchronization (Backend Sync Integration)**:
   - Token-authenticated cloud sync across devices for user briefs, custom playlists, listening history, and playback progress.
   - Node/Express auth layer anchoring user isolation scope using salt-and-hash credentials in `data/users.json` and session-based JWT-style tokens.
   - Bi-directional sync endpoints (`/api/sync/save` and `/api/sync/get`) backing up data to isolated files in the `data/` directory.
   - Offline-first architecture where local IndexedDB operations sync to the Express backend upon network reconnection.
7. **Haptic Feedback**:
   - Hardware/browser `navigator.vibrate` haptic pulses for tab switches, playback actions, track skips, speed changes, and track completion.

---

## 3. Cloud Architecture & Synchronization Spec

### 3.1 Data Hierarchy & Schema
Data is structured and stored per user under isolated user-specific JSON files `data/sync_{username}.json` on the server:

#### Entity: `Article` (User Brief Metadata)
- **Properties**:
  - `id` (`string`, required): Unique identifier (collision-resistant UUID).
  - `title` (`string`, required): Title of the article or news brief.
  - `summary` (`string`, required): Gemini-generated concise summary text.
  - `originalText` (`string`, optional): Extracted raw article text.
  - `url` (`string`, optional): Original source website URL.
  - `category` (`string`, required): News category (e.g. Technology, Business, Science, World).
  - `tags` (`array` of `string`, required): Topic search tags.
  - `voiceName` (`string`, required): Selected TTS voice profile (Zephyr, Kore, Charon, Puck, Fenrir).
  - `isDownloaded` (`boolean`, required): Downloaded state indicator.
  - `isSaved` (`boolean`, required): Saved state indicator.
  - `createdAt` (`string`, required): Document creation ISO timestamp.
  - `playCount` (`number`, required): Tracks how many times the track was played.

#### Entity: `Playlist`
- **Properties**:
  - `id` (`string`, required): Unique playlist identifier (UUID).
  - `name` (`string`, required): User-defined playlist title.
  - `description` (`string`, optional): Optional playlist overview.
  - `articleIds` (`array` of `string`, required): Ordered list of `Article` IDs in the playlist.
  - `tags` (`array` of `string`, optional): Topic tags for playlist category.
  - `createdAt` (`string`, required): Creation ISO timestamp.

#### Entity: `UserPreferences`
- **Properties**:
  - `summaryLength` (`string`, required): Default summary length ("short" | "medium" | "detailed").
  - `summaryTone` (`string`, required): Default summary tone ("professional" | "engaging" | "concise").
  - `voiceName` (`string`, required): Default voice profile ID.
  - `playbackSpeed` (`number`, required): Preferred speed factor (`0.5` to `2.0`).
  - `theme` (`string`, required): Theme selection ("light" | "dark").

---

### 3.2 Security Model & Isolation
Authentication and session verification enforce strict boundaries:

1. **User Scope Isolation**: All synchronized reads and writes require token validation against the JWT-style authentication header. Only the authenticated user can access `data/sync_${username}.json`.
2. **Schema & Boundary Validation**:
   - User registration requires passwords to be at least 8 characters.
   - Username inputs are validated against `/^[a-z0-9_-]{3,32}$/` to eliminate path traversal risks.
   - Server-side path sanitization (`path.resolve(syncFile).startsWith(path.resolve(DATA_DIR))`) blocks access to files outside of the authorized directory.
3. **Password Security**: Credentials in `data/users.json` are hashed using PBKDF2 with SHA-256 and a unique 16-byte salt across 100,000 iterations.
4. **Signature Authenticity**: Session tokens are signed using HMAC-SHA256 using the server's `TOKEN_SECRET` environment variable and verified using a constant-time comparison `crypto.timingSafeEqual` to mitigate timing attacks.
5. **SSRF Defense**: The article extractor (`/api/articles/extract`) checks that target URL protocols are strictly `http:` or `https:`, and blocks calls targeting private IP addresses (RFC 1918/4193), loopback addresses, or link-local ranges.

---

### 3.3 Synchronization Logic & Conflict Resolution
1. **Offline-First Local Writes**: Client mutations immediately write to local IndexedDB (`src/lib/db.ts`) for zero-latency UI reactivity.
2. **Bi-Directional Cloud Sync**:
   - The React context monitors client network status. Upon going online or executing user actions, it fires backup reconciliation requests to `/api/sync/get` and `/api/sync/save`.
3. **Conflict Resolution Strategy**: Last-Write-Wins (LWW) based on server-side comparison of UTC creation/modification timestamps.
4. **Audio Binary Handling**: Raw synthesized audio base64 or blob buffers are stored locally in IndexedDB, keeping sync data payload sizes lean (under 100 KB per backup file) and maximizing backend throughput.

---

## 4. User Stories & Use Cases

### US-1: Article Intake & Briefing Generation
- **As a** daily commuter,
- **I want to** paste an article URL or text body,
- **So that** I can generate a concise audio brief for my commute.

### US-2: Personalized Voice Selection & Auditioning
- **As a** listener,
- **I want to** preview and select different AI narrator voice profiles,
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

### US-7: Cloud Cross-Device Synchronization
- **As a** multi-device commuter (e.g. laptop at work, phone on train),
- **I want** my briefs, playlists, and listening progress to synchronize automatically via the backend,
- **So that** I can seamlessly switch devices and pick up playback right where I stopped.

---

## 5. Acceptance Criteria

| ID | Category | Acceptance Criteria |
|---|---|---|
| **AC-1.1** | Intake | Submitting a valid text or URL invokes server endpoints `/api/articles/extract` or `/api/articles/summarize` and returns a structured brief title and summary. |
| **AC-1.2** | Intake | Missing or invalid URLs present user-friendly error feedback without crashing the application. |
| **AC-2.1** | Voice | The Profile panel displays 5 distinct voice profiles (Zephyr, Kore, Charon, Puck, Fenrir) with tone descriptions. |
| **AC-2.2** | Voice | Clicking "Audition" generates and plays a voice preview clip via `/api/articles/tts`. |
| **AC-3.1** | Playback | The podcast player supports Play/Pause, Seek, Volume, 15s Skip Forward/Backward, and Sleep Timer. |
| **AC-3.2** | Playback | The speed slider allows smooth adjustments from `0.5x` to `2.0x` in `0.05x` steps, alongside quick preset buttons (`0.5x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`). |
| **AC-4.1** | Playlist | Users can create, view, and delete custom playlists. |
| **AC-4.2** | Playlist | Tracks inside a playlist can be reordered using HTML5 drag-and-drop handles. |
| **AC-5.1** | Search | The search input in `HomeDashboard` and `PlaylistPanel` filters articles in real-time across titles, categories, authors, summaries, and tags. |
| **AC-5.2** | Search | Category filters include "All", "Saved", "Downloaded", and topic categories. |
| **AC-6.1** | Fallback | If the server TTS endpoint fails or the device is offline, playback automatically falls back to browser `window.speechSynthesis`. |
| **AC-6.2** | Haptics | Supported actions (tab changes, play/pause, track completion) trigger distinct haptic vibration patterns via `navigator.vibrate`. |
| **AC-7.1** | Cloud Sync | User authentication anchors registration and sync paths isolated by secure token checks. |
| **AC-7.2** | Cloud Sync | Creating, updating, or deleting briefs/playlists on one device backs up to the Express server and synchronizes across secondary devices upon user session login within 2 seconds. |
| **AC-7.3** | Cloud Sync | Playback progress offsets are saved and synchronized to allow cross-device resume. |
| **AC-7.4** | Cloud Sync | The security rules strictly restrict file-sync folder access to path boundaries and validate registration credentials. |
| **AC-8.1** | Security | Registration enforces username character allowlist (`/^[a-z0-9_-]{3,32}$/`) to eliminate path traversal risks in user sync file storage. |
| **AC-8.2** | Security | `TOKEN_SECRET` environment variable is documented in `.env.example` and validated for token signature security. |
| **AC-8.3** | Security | URL extraction (`/api/articles/extract`) enforces HTTP/HTTPS scheme check and blocks private IP, loopback, and link-local ranges against SSRF. |
| **AC-8.4** | Data Integrity | Articles and playlists generate collision-resistant UUIDs (`crypto.randomUUID()`) to preserve IndexedDB key safety. |
| **AC-8.5** | Data Integrity | Diagnostic tests purge temporary progress records and test entries to prevent cloud sync pollution. |
| **AC-8.6** | UX / Safety | Permanent deletion of briefs and playlists requires user confirmation to prevent accidental loss. |
| **AC-8.7** | Performance | Search filtering precomputes relevance scores once per item rather than recomputing inside sorting comparators. |

---

## 6. Non-Goals

- **External RSS Feed Crawler**: Background automatic crawling of arbitrary third-party RSS feeds is out of scope.
- **Public Community Brief Sharing**: Public brief social feeds or uncontrolled cross-user document reads are excluded; data access is strictly locked to the authenticated owner.
- **Binary Audio Storage in Backup Files**: Raw audio blob binaries are NOT stored inside synchronized backups; audio streams and local audio files are cached locally in IndexedDB to preserve performance.

---

## 7. Verification Protocol

1. **Type Safety**: Run `npm run lint` (`tsc --noEmit`) to confirm zero compilation or type errors.
2. **Production Bundle**: Run `npm run build` to verify Vite and esbuild server bundler success.
3. **Runtime Verification**: Verify that port `3000` serves the SPA and Express backend proxy cleanly.
