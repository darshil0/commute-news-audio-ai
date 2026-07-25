# VALIDATION_CHECKLIST.md - SDD Verification Checklist

Use this checklist to validate code changes and ensure compliance with the Spec-Driven Development (SDD) standards before completing any work turn.

---

## 1. Automated Build & Type Verification

- [ ] **Linter / Type Checking**:
  ```bash
  npm run lint
  ```
  *Pass Criteria*: TypeScript checks compile with zero errors.

- [ ] **Production Build**:
  ```bash
  npm run build
  ```
  *Pass Criteria*: `vite build` and `esbuild server.ts` complete successfully, generating the production build in `dist/` and server in `dist/server.cjs`.

---

## 2. Feature Acceptance Criteria Verification

- [ ] **AC-1 (Intake & Summarization)**:
  - Submitting article text or URL invokes server endpoints (`/api/articles/extract` / `/api/articles/summarize`).
  - Extracted title and summary are accurately displayed in the brief list.

- [ ] **AC-2 (Voice Profiles & Audition)**:
  - All 5 voice profiles (Zephyr, Kore, Charon, Puck, Fenrir) are selectable in the Profile Panel.
  - Clicking "Audition" generates and plays a voice preview sample.

- [ ] **AC-3 (Playback & Speed Controls)**:
  - Audio player plays, pauses, seeks, and skips tracks cleanly.
  - Speed slider adjusts between `0.5x` and `2.0x`. Quick preset buttons set exact speeds (`1.0x`, `1.25x`, `1.5x`, etc.).

- [ ] **AC-4 (Playlists & Drag-and-Drop Reordering)**:
  - Users can create, view, and delete playlists.
  - Dragging track handles in a playlist reorders the queue correctly.

- [ ] **AC-5 (Tokenized Search & Category Filters)**:
  - Search input filters articles by title, author, summary, tags, and categories in real time.
  - Filter chips ("All", "Saved", "Downloaded") filter the feed accurately.

- [ ] **AC-6 (Speech Fallback & Haptic Pulse)**:
  - When offline or if TTS API fails, playback falls back to browser `window.speechSynthesis`.
  - Haptic feedback (`navigator.vibrate`) triggers on user interactions without console warnings.

---

## 3. Spec & Documentation Consistency Check

- [ ] **SDD Alignment**:
  - Code changes match the definitions in `/specs/SYSTEM_SPEC.md`.
  - Any new behavior or scope change has been documented in `/specs/SYSTEM_SPEC.md` first.
  - Unclear requirements are flagged with `[NEEDS-CLARIFICATION]`.

- [ ] **Documentation Updates**:
  - `/README.md` accurately reflects project architecture and SDD workflow.
  - `/AGENTS.md` provides clear guidance for future AI agents.
  - `CHANGELOG.md` records all major additions, changes, and fixes.

---

## 4. Security & Data Integrity Verification

- [ ] **AC-8.1 (Username Character Allowlist)**:
  - User registration rejects usernames with illegal characters or path traversal sequences (`../`).
  - Allowed username pattern: `/^[a-z0-9_-]{3,32}$/`.

- [ ] **AC-8.2 (Token Secret Security)**:
  - `TOKEN_SECRET` documented in `.env.example` and verified on server initialization.

- [ ] **AC-8.3 (SSRF Defense)**:
  - Article URL extractor rejects non-HTTP/HTTPS protocols and private RFC 1918/4193 / loopback / link-local addresses.

- [ ] **AC-8.4 (Collision-Resistant IDs)**:
  - Articles and playlists use `crypto.randomUUID()` to prevent key collision overwrites in IndexedDB.

- [ ] **AC-8.5 (Diagnostic Data Isolation)**:
  - Diagnostic test runner purges temporary test articles and progress entries to prevent cloud sync pollution.

- [ ] **AC-8.6 (Destructive Action Confirmation)**:
  - Deleting briefs in `HomeDashboard` and deleting playlists in `PlaylistPanel` requires explicit user confirmation.

- [ ] **AC-8.7 (Optimized Search Scoring)**:
  - `searchAndFilterArticles` in `search.ts` precomputes relevance scores once per item to avoid redundant score computation during sorting.
