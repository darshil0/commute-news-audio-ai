/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file src/lib/api.ts
 * @description REST client for all CommuteBrief Express server endpoints.
 *
 * All public methods are `static` on {@link ApiService} and communicate with
 * the Express server via the Fetch API. Network connectivity is pre-checked
 * with {@link isLikelyOnline} before any request is dispatched.
 *
 * Server base URLs (same origin, relative paths):
 * - Auth:     `/api/auth/register`, `/api/auth/login`
 * - Sync:     `/api/sync/save`, `/api/sync/get`
 * - Articles: `/api/articles/extract`, `/api/articles/summarize`,
 *             `/api/articles/search-news`, `/api/articles/tts`
 */

import { UserPreferences, SyncData } from "../types";

// ---------------------------------------------------------------------------
// Internal response shapes
// ---------------------------------------------------------------------------

/** Shape of a successful authentication response from `/api/auth/*`. */
interface AuthResponse {
  username: string;
  token: string;
}

/** Shape of a successful summarization response from `/api/articles/*`. */
interface SummarizeResponse {
  title: string;
  summary: string;
}

/** A single grounded web source citation returned with search results. */
export interface GroundedSource {
  /** Page title of the cited source. */
  title: string;
  /** Canonical URL of the cited source. */
  url: string;
}

/**
 * Shape of the response from `POST /api/articles/search-news`.
 * Produced by Gemini Search Grounding (`gemini-2.5-flash`).
 */
export interface SearchNewsResponse {
  /** AI-generated headline for the search result. */
  title: string;
  /** Inferred content category (e.g. "Technology", "Finance"). */
  category: string;
  /** AI-generated summary of grounded search results. */
  summary: string;
  /** Array of live web source citations used in grounding. */
  sources: GroundedSource[];
}

/** Shape of the response from `POST /api/articles/tts`. */
interface TTSResponse {
  /** Base-64 encoded MP3 audio data. */
  audioBase64: string;
}

/** Error body shape returned by Express endpoints on failure. */
interface ApiErrorBody {
  error?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Reads a JSON body from a {@link Response}, throwing if the content-type is
 * not `application/json`.
 * @template T - Expected shape of the parsed JSON body.
 */
async function readJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `Expected JSON response, received ${contentType || "unknown content type"}.`,
    );
  }
  return (await res.json()) as T;
}

/**
 * Reads a JSON body from a {@link Response} only when the content-type is
 * `application/json`. Returns `null` for all other content types.
 * @template T - Expected shape of the parsed JSON body.
 */
async function readMaybeJson<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return (await res.json()) as T;
}

/**
 * Extracts a human-readable error message from a non-OK {@link Response},
 * falling back to `fallback` when the body cannot be parsed.
 */
async function readErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  const data = await readMaybeJson<ApiErrorBody>(res);
  return data?.error || data?.message || fallback;
}

/**
 * Sends a `fetch` request and returns the parsed JSON body.
 * Throws a descriptive {@link Error} on network failure or non-2xx status.
 *
 * @template T - Expected shape of the successful JSON response.
 * @param input - Fetch-compatible URL or {@link Request}.
 * @param init - `RequestInit` options (method, headers, body, etc.).
 * @param fallbackError - Human-readable error used when the response body
 *   cannot be parsed.
 */
async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackError: string,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new Error(
      "Network error. Please check your connection and try again.",
    );
  }

  if (!res.ok) {
    throw new Error(await readErrorMessage(res, fallbackError));
  }

  return readJson<T>(res);
}

/**
 * Returns `true` when the browser reports that it is online.
 * Falls back to `true` in non-browser environments (SSR / test).
 */
function isLikelyOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

// ---------------------------------------------------------------------------
// Public API service
// ---------------------------------------------------------------------------

/**
 * Static service class for all CommuteBrief server API calls.
 *
 * All methods check connectivity with {@link isLikelyOnline} before
 * dispatching requests to avoid noisy network errors when offline.
 */
export class ApiService {
  /**
   * Registers a new account on `POST /api/auth/register`.
   * @param username - Lowercase username (regex `^[a-z0-9_-]{3,32}$`).
   * @param password - Plaintext password (hashed server-side with bcrypt).
   * @returns JWT token and confirmed username on success.
   * @throws {Error} If the username is taken or validation fails.
   */
  static async register(
    username: string,
    password: string,
  ): Promise<AuthResponse> {
    return requestJson<AuthResponse>(
      "/api/auth/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username, password }),
      },
      "Registration failed",
    );
  }

  /**
   * Authenticates an existing account on `POST /api/auth/login`.
   * @param username - Account username.
   * @param password - Account password.
   * @returns JWT token and confirmed username on success.
   * @throws {Error} If credentials are invalid.
   */
  static async login(
    username: string,
    password: string,
  ): Promise<AuthResponse> {
    return requestJson<AuthResponse>(
      "/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username, password }),
      },
      "Authentication failed",
    );
  }

  /**
   * Uploads a full data snapshot to `POST /api/sync/save`.
   * Requires a valid JWT bearer token obtained from {@link login} or
   * {@link register}.
   * @param token - JWT bearer token for authentication.
   * @param data - Full {@link SyncData} snapshot to persist server-side.
   * @throws {Error} If the device is offline or the request fails.
   */
  static async backupData(token: string, data: SyncData): Promise<void> {
    if (!isLikelyOnline()) {
      throw new Error(
        "Offline: Sync is queued and will execute when reconnected.",
      );
    }

    await requestJson<{ success: boolean }>(
      "/api/sync/save",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      },
      "Backup sync failed",
    );
  }

  /**
   * Downloads the latest data snapshot from `GET /api/sync/get`.
   * Returns `null` when the device is offline, the request fails, or no
   * backup exists for the authenticated user.
   * @param token - JWT bearer token for authentication.
   * @returns {@link SyncData} on success, or `null` on failure / no data.
   */
  static async getBackupData(token: string): Promise<SyncData | null> {
    if (!isLikelyOnline()) {
      return null;
    }

    let res: Response;
    try {
      res = await fetch("/api/sync/get", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      return null;
    }

    if (!res.ok) {
      return null;
    }

    const data = await readMaybeJson<SyncData | { empty?: boolean }>(res);
    if (!data || ("empty" in data && data.empty)) {
      return null;
    }

    return data as SyncData;
  }

  /**
   * Fetches, extracts, and summarizes a web article via
   * `POST /api/articles/extract`.
   * The server performs SSRF-safe URL fetching and Gemini summarization.
   * @param url - Public HTTP/HTTPS URL of the article to import.
   * @param preferences - User preferences that influence summary style.
   * @returns AI-generated `title` and `summary` for the article.
   * @throws {Error} If the device is offline or extraction fails.
   */
  static async extractUrl(
    url: string,
    preferences: UserPreferences,
  ): Promise<SummarizeResponse> {
    if (!isLikelyOnline()) {
      throw new Error(
        "Internet connection required to import and summarize URLs.",
      );
    }

    return requestJson<SummarizeResponse>(
      "/api/articles/extract",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ url, preferences }),
      },
      "Failed to extract and process the website URL.",
    );
  }

  /**
   * Summarizes user-provided raw text via `POST /api/articles/summarize`.
   * @param text - Raw text content to summarize.
   * @param title - User-provided working title for the brief.
   * @param preferences - User preferences that influence summary style.
   * @returns AI-generated `title` and `summary`.
   * @throws {Error} If the device is offline or summarization fails.
   */
  static async summarizeText(
    text: string,
    title: string,
    preferences: UserPreferences,
  ): Promise<SummarizeResponse> {
    if (!isLikelyOnline()) {
      throw new Error("Internet connection required to generate summaries.");
    }

    return requestJson<SummarizeResponse>(
      "/api/articles/summarize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ text, title, preferences }),
      },
      "Summarization failed.",
    );
  }

  /**
   * Searches real-time news using Gemini Search Grounding via
   * `POST /api/articles/search-news`.
   * @param query - Free-text search query (e.g. "AI chip shortage 2025").
   * @param preferences - User preferences that influence summary style.
   * @returns Grounded {@link SearchNewsResponse} with title, summary, and
   *   source citations.
   * @throws {Error} If the device is offline or search grounding fails.
   */
  static async searchNews(
    query: string,
    preferences: UserPreferences,
  ): Promise<SearchNewsResponse> {
    if (!isLikelyOnline()) {
      throw new Error("Internet connection required to search real-time news.");
    }

    return requestJson<SearchNewsResponse>(
      "/api/articles/search-news",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query, preferences }),
      },
      "Search grounding failed.",
    );
  }

  /**
   * Generates TTS audio via `POST /api/articles/tts` using the
   * `gemini-2.5-flash-preview-tts` model.
   * @param text - Text content to synthesize into speech.
   * @param voiceName - Gemini TTS voice name (e.g. `"Zephyr"`, `"Kore"`).
   * @param speed - Playback speed multiplier forwarded to the TTS model.
   * @returns Base-64 encoded MP3 audio string ready for `HTMLAudioElement`.
   * @throws {Error} If the device is offline or TTS synthesis fails.
   */
  static async generateTTS(
    text: string,
    voiceName: string,
    speed: number,
  ): Promise<string> {
    if (!isLikelyOnline()) {
      throw new Error(
        "Internet connection required to generate audio voiceover.",
      );
    }

    const data = await requestJson<TTSResponse>(
      "/api/articles/tts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ text, voiceName, speed }),
      },
      "TTS voice synthesis failed.",
    );

    return data.audioBase64;
  }
}
