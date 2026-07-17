# CommuteBrief System Architecture & Design Documentation

This document describes the high-level architecture, component hierarchy, database schema, and core design decisions underlying **CommuteBrief: Smart Commute Audio Briefings**.

---

## 🏗️ 1. Architecture Overview

CommuteBrief is a local-first single-page application (SPA) with a secure, server-side Express AI proxy backend.

```
       ┌────────────────────────────────────────────────────────┐
       │                       Web Client                       │
       │                                                        │
       │    ┌──────────────────┐        ┌──────────────────┐    │
       │    │   React Components│        │   AppContext.tsx │    │
       │    └─────────┬────────┘        └────────┬─────────┘    │
       │              │                          │              │
       │              └──────────────┬───────────┘              │
       │                             ▼                          │
       │                     ┌──────────────┐                   │
       │                     │  localDB.ts  │ (IndexedDB)       │
       │                     └──────┬───────┘                   │
       └────────────────────────────┼───────────────────────────┘
                                    │ (HTTPS API Calls)
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │                   Express Backend                      │
       │                                                        │
       │    ┌──────────────────┐        ┌──────────────────┐    │
       │    │  Auth / Sync API │        │ Gemini AI Proxy  │    │
       │    └──────────────────┘        └────────┬─────────┘    │
       └─────────────────────────────────────────┼──────────────┘
                                                 │
                                                 ▼
                                        Google Gemini API
```

### Core Design Decisions
1. **Local-First Capabilities**: Metadata, custom playlists, bookmarks, and play queues are fully stored inside the browser's IndexedDB. Even without network connectivity, users can browse their feed, manage playlists, and play previously downloaded/cached audio briefings.
2. **Server-Side AI Proxy**: Direct connection to Google Gemini models is routed through the Express backend to keep API credentials secure while standardizing parameters and handling retries/safety fallback.
3. **Optimized Token & Network Usage**: Web URLs imported are extracted via fetch operations and processed on the server to keep user mobile bandwidth usage low.

---

## 📦 2. Component Layout & State Flow

The UI of CommuteBrief is structured as a series of modular dashboards managed via tabs:

* **HomeDashboard**: Displays the main user news stream with categories, quick filters (all, saved, offline), in-progress briefs, search options, and interactive playback triggers.
* **IntakePanel**: The central gateway where users can paste raw text or submit a web URL to trigger the Gemini AI summarization engine. It includes real-time narrator style modifiers (pacing, voice, length).
* **PlaylistPanel**: Handles playlist aggregation, description tags, and custom dragging mechanisms.
* **QueuePanel**: Up-next queue playlist showing real-time playlist sequences with list item drag-and-drop handles.
* **ProfilePanel**: Coordinates user account authentication, background manual/automatic synchronization backup utilities, and runs automated testing diagnostics.
* **PodcastPlayer**: Persistent audio player overlay supporting speed multipliers, sleep sliders, time seeks, and expanded view modes.

---

## 💾 3. Database & Sync Schemes

### IndexedDB Store Configuration (`CommuteNewsDB`)
- `articles`: Stores individual parsed brief metadata, categories, voice models, read state, and metadata.
- `playlists`: Stores playlist title, descriptions, tags, and arrays of `articleIds`.
- `progress`: Tracking active listening positions, completion flags, and timestamp marks.
- `settings`: Preserves user configuration preferences (voice narrator, default speed, theme).
- `audioStore`: Caches raw synthesized base64 wave audio binaries mapping directly to unique article IDs.

### Cloud Synchronization Architecture
When online, user profiles trigger synchronization. The application reconciles changes by:
1. Fetching remote backups of user states.
2. Comparing timestamps and merging missing objects into IndexedDB.
3. Uploading a reconciled snapshot to the central Express server storage vault.

---

## 🔒 4. Security Infrastructure Design

The Express backend implements explicit validation layers to protect server resources, prevent attacks, and ensure user privacy.

```
Incoming Request
       │
       ▼
 ┌───────────┐
 │ IP Filter │ ────(If Blocked IP)────► 403 Forbidden (Anti-SSRF Protection)
 └─────┬─────┘
       │ (Allowed IP)
       ▼
 ┌───────────┐
 │ Auth Hook │ ────(If Invalid Token / Path Traversal)──► 401/400 (Identity Validation)
 └─────┬─────┘
       │ (Authorized User)
       ▼
 ┌───────────┐
 │ Controller│ ────(Sanitize Username)────► Safe File Store / API Proxies
 └───────────┘
```

### SSRF Protection / IP Filter
The server uses an IP lookup helper (`isBlockedIp`) that inspects hostnames and URLs. It resolves hostnames and explicitly blocks loopback, private IPv4 subnets, link-local, multicast, and matching IPv6 blocks.

### Token Authentication Layer
- User identity is signed using a cryptographic HMAC (SHA-256) signature.
- Tokens enforce an exact 30-day lifetime check (`Date.now() - 30 * 24 * 60 * 60 * 1000`).
- Tokens must contain modern explicit claim headers (`exp`); tokens lacking these or having invalid/expired signatures are immediately rejected.

### Path-Traversal and Username Safety
- Usernames must strictly conform to a safe alphanumeric regex validation (`USERNAME_PATTERN`): only lowercase alphanumeric, single hyphens, or underscores are allowed, with length bounded between 3 and 32 characters.
- Synchronization endpoints map session IDs and usernames directly to storage files via `safeSyncFilePath`. This enforces path resolution inside a designated sync directory and rejects any input containing navigation sequences (`..`, `/`, `\`).
