/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserPreferences, SyncData } from "../types";

interface AuthResponse {
  username: string;
  token: string;
}

interface SummarizeResponse {
  title: string;
  summary: string;
}

interface TTSResponse {
  audioBase64: string;
}

interface ApiErrorBody {
  error?: string;
  message?: string;
}

async function readJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Expected JSON response, received ${contentType || "unknown content type"}.`);
  }
  return (await res.json()) as T;
}

async function readMaybeJson<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return (await res.json()) as T;
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await readMaybeJson<ApiErrorBody>(res);
  return data?.error || data?.message || fallback;
}

async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackError: string
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new Error("Network error. Please check your connection and try again.");
  }

  if (!res.ok) {
    throw new Error(await readErrorMessage(res, fallbackError));
  }

  return readJson<T>(res);
}

function isLikelyOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export class ApiService {
  static async register(username: string, password: string): Promise<AuthResponse> {
    return requestJson<AuthResponse>(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username, password }),
      },
      "Registration failed"
    );
  }

  static async login(username: string, password: string): Promise<AuthResponse> {
    return requestJson<AuthResponse>(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username, password }),
      },
      "Authentication failed"
    );
  }

  static async backupData(token: string, data: SyncData): Promise<void> {
    if (!isLikelyOnline()) {
      throw new Error("Offline: Sync is queued and will execute when reconnected.");
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
      "Backup sync failed"
    );
  }

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

  static async extractUrl(url: string, preferences: UserPreferences): Promise<SummarizeResponse> {
    if (!isLikelyOnline()) {
      throw new Error("Internet connection required to import and summarize URLs.");
    }

    return requestJson<SummarizeResponse>(
      "/api/articles/extract",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url, preferences }),
      },
      "Failed to extract and process the website URL."
    );
  }

  static async summarizeText(
    text: string,
    title: string,
    preferences: UserPreferences
  ): Promise<SummarizeResponse> {
    if (!isLikelyOnline()) {
      throw new Error("Internet connection required to generate summaries.");
    }

    return requestJson<SummarizeResponse>(
      "/api/articles/summarize",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ text, title, preferences }),
      },
      "Summarization failed."
    );
  }

  static async generateTTS(text: string, voiceName: string, speed: number): Promise<string> {
    if (!isLikelyOnline()) {
      throw new Error("Internet connection required to generate audio voiceover.");
    }

    const data = await requestJson<TTSResponse>(
      "/api/articles/tts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ text, voiceName, speed }),
      },
      "TTS voice synthesis failed."
    );

    return data.audioBase64;
  }
}
