/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file server.ts
 * @description CommuteBrief Express server — handles all backend API routes,
 * Gemini AI integration, JWT authentication, cross-device sync, and Vite
 * dev-server middleware.
 *
 * ## API Routes
 * | Method | Path                          | Description                              |
 * |--------|-------------------------------|------------------------------------------|
 * | POST   | `/api/auth/register`          | Create a new user account (bcrypt hash)  |
 * | POST   | `/api/auth/login`             | Authenticate and receive a JWT token     |
 * | POST   | `/api/sync/save`              | Upload full data snapshot (JWT required) |
 * | GET    | `/api/sync/get`               | Download full data snapshot (JWT req.)   |
 * | POST   | `/api/articles/extract`       | SSRF-safe URL fetch + Gemini summarize   |
 * | POST   | `/api/articles/summarize`     | Summarize raw text via Gemini            |
 * | POST   | `/api/articles/search-news`   | Real-time news via Search Grounding      |
 * | POST   | `/api/articles/tts`           | Text-to-Speech via `gemini-2.5-flash-preview-tts` |
 *
 * ## Environment Variables
 * - `GEMINI_API_KEY` *(required)* — Google Gemini API key.
 * - `TOKEN_SECRET`  *(required in production)* — HMAC-SHA256 secret for JWT
 *   signing. Defaults to `"dev-only-change-me"` in development.
 * - `PORT` *(optional)* — TCP port to listen on. Defaults to `3000`.
 * - `NODE_ENV` — Set to `"production"` to enforce `TOKEN_SECRET` validation.
 *
 * ## Security Controls
 * - Per-IP sliding-window rate limiting on all `/api/articles/*` endpoints.
 * - SSRF protection: blocks private IP ranges on article URL extraction.
 * - Username allowlist regex: `^[a-z0-9_-]{3,32}$`.
 * - JWT signed with HMAC-SHA256; tokens expire after 7 days.
 */

import express, { NextFunction, Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

/**
 * Validates required environment variables at startup.
 * In production mode, throws a fatal error when `TOKEN_SECRET` is absent.
 * Logs warnings for missing or malformed `GEMINI_API_KEY`.
 * @throws {Error} If `NODE_ENV === "production"` and `TOKEN_SECRET` is unset.
 */
function validateEnvironment() {
  if (process.env.NODE_ENV === "production" && !process.env.TOKEN_SECRET) {
    throw new Error(
      "FATAL: TOKEN_SECRET environment variable must be set in production deployments. Exiting startup.",
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(
      "[Env Warning] GEMINI_API_KEY is not configured. AI features will fail until set.",
    );
  } else if (!apiKey.startsWith("AIza")) {
    console.warn(
      "[Env Warning] GEMINI_API_KEY format looks unexpected (expected prefix 'AIza').",
    );
  }
}

const TOKEN_SECRET = process.env.TOKEN_SECRET || "dev-only-change-me";

/**
 * Per-IP request timestamp log used by the sliding-window rate limiter.
 * Keyed by `"<path>:<ip>"` to scope limits per endpoint per client.
 */
type RateLimitEntry = { timestamps: number[] };
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Creates an Express middleware that enforces a per-IP sliding-window rate
 * limit scoped to the matched request path.
 *
 * Requests exceeding the limit receive a `429 Too Many Requests` response with
 * a JSON error body. All violations are logged via {@link logStructured}.
 *
 * @param maxRequests - Maximum number of requests allowed in the window.
 * @param windowMs - Window duration in milliseconds.
 * @returns Express middleware function.
 */
function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = rateLimitStore.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      rateLimitStore.set(key, entry);
    }

    // Filter out timestamps older than current window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= maxRequests) {
      logStructured(
        "warn",
        `Rate limit exceeded for IP: ${ip} on ${req.path}`,
        {
          ip,
          endpoint: req.path,
          count: entry.timestamps.length,
        },
      );
      res.status(429).json({
        error: `Too many requests to ${req.path}. Please try again later.`,
      });
      return;
    }

    entry.timestamps.push(now);
    next();
  };
}

const globalRateLimiter = createRateLimiter(60, 60 * 1000); // 60 req/min
const aiRouteRateLimiter = createRateLimiter(15, 60 * 1000); // 15 req/min

// Periodic cleanup of stale rate-limit store entries every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > now - 60000);
      if (entry.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  },
  10 * 60 * 1000,
);

function logStructured(
  level: "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>,
) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata,
  };
  const jsonStr = JSON.stringify(payload);
  if (level === "error") console.error(jsonStr);
  else if (level === "warn") console.warn(jsonStr);
  else console.log(jsonStr);
}

const USERNAME_REGEX = /^[a-z0-9_-]{3,32}$/;

function isPrivateOrInternalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host === "::1" ||
    host === "0.0.0.0"
  ) {
    return true;
  }

  const ipMatch = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipMatch) {
    const [, a, b, c, d] = ipMatch.map(Number);
    if (a === 127) return true; // 127.0.0.0/8 (loopback)
    if (a === 10) return true; // 10.0.0.0/8 (private)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (private)
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 (private)
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local)
    if (a === 0) return true; // 0.0.0.0/8
  }
  return false;
}

type UserRecord = {
  passwordHash: string;
  salt: string;
};

type UsersDb = Record<string, UserRecord>;

type Preferences = {
  summaryLength?: "short" | "medium" | "detailed";
  summaryTone?: "professional" | "engaging" | "concise";
  voiceName?: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
  playbackSpeed?: number;
};

type AuthRequest = Request & {
  username?: string;
};

type ApiError = Error & {
  statusCode?: number;
};

if (!fsSync.existsSync(DATA_DIR)) {
  fsSync.mkdirSync(DATA_DIR, { recursive: true });
}

let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw Object.assign(new Error("GEMINI_API_KEY is not configured."), {
        statusCode: 500,
      });
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }
  return aiClient;
}

async function loadUsers(): Promise<UsersDb> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(raw) as UsersDb;
  } catch {
    return {};
  }
}

async function saveUsers(users: UsersDb) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha256")
    .toString("hex");
}

function signToken(username: string): string {
  const payload = JSON.stringify({ username, ts: Date.now() });
  const body = Buffer.from(payload).toString("base64url");
  const sig = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token: string): string | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(body)
    .digest("base64url");

  const sigBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);

  // Timing safe equal throws an error if buffers have different lengths.
  // Compare lengths first to prevent crashes.
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf-8"),
    ) as { username?: string; ts?: number };
    if (!payload.username) return null;
    if (payload.ts && Date.now() - payload.ts > 7 * 24 * 60 * 60 * 1000) {
      return null; // Token expired after 7 days
    }
    return payload.username;
  } catch {
    return null;
  }
}

function cleanAndParseJson<T>(rawText: string, fallback: T): T {
  if (!rawText || !rawText.trim()) return fallback;
  let cleaned = rawText.trim();

  // Strip markdown code fences if present (e.g. ```json ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt extracting json block using regex
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        // ignore
      }
    }
    return fallback;
  }
}

function toError(err: unknown, fallback: string): ApiError {
  if (err instanceof Error) return err as ApiError;
  return Object.assign(new Error(fallback), { statusCode: 500 });
}

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "No token provided." });
    return;
  }

  const username = verifyToken(token);
  if (!username) {
    res.status(403).json({ error: "Invalid session token." });
    return;
  }

  req.username = username;
  next();
}

async function startServer() {
  validateEnvironment();

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10mb" }));
  app.use("/api", globalRateLimiter);

  app.post(
    "/api/auth/register",
    asyncHandler(async (req, res) => {
      const { username, password } = req.body as {
        username?: unknown;
        password?: unknown;
      };

      if (typeof username !== "string" || typeof password !== "string") {
        res.status(400).json({ error: "Username and password are required." });
        return;
      }

      const uClean = username.trim().toLowerCase();
      if (!USERNAME_REGEX.test(uClean) || password.length < 8) {
        res.status(400).json({
          error:
            "Username must be 3-32 alphanumeric characters, underscores, or hyphens; password at least 8 chars.",
        });
        return;
      }

      const users = await loadUsers();
      if (users[uClean]) {
        res.status(409).json({ error: "Username is already registered." });
        return;
      }

      const salt = crypto.randomBytes(16).toString("hex");
      users[uClean] = { passwordHash: hashPassword(password, salt), salt };
      await saveUsers(users);

      logStructured("info", `User registered successfully: ${uClean}`, {
        username: uClean,
      });
      res.json({ username: uClean, token: signToken(uClean) });
    }),
  );

  app.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      const { username, password } = req.body as {
        username?: unknown;
        password?: unknown;
      };

      if (typeof username !== "string" || typeof password !== "string") {
        res.status(400).json({ error: "Username and password are required." });
        return;
      }

      const uClean = username.trim().toLowerCase();
      const users = await loadUsers();
      const user = users[uClean];

      if (!user || hashPassword(password, user.salt) !== user.passwordHash) {
        logStructured(
          "warn",
          `Login failed for user '${uClean}': invalid credentials`,
          {
            username: uClean,
            ip: req.ip || req.socket.remoteAddress,
          },
        );
        res.status(401).json({ error: "Invalid username or password." });
        return;
      }

      logStructured("info", `User logged in successfully: ${uClean}`, {
        username: uClean,
      });
      res.json({ username: uClean, token: signToken(uClean) });
    }),
  );

  app.post(
    "/api/sync/save",
    authenticateToken,
    asyncHandler(async (req: AuthRequest, res) => {
      if (!req.username || !USERNAME_REGEX.test(req.username)) {
        res.status(400).json({ error: "Invalid username format." });
        return;
      }
      const syncFile = path.join(DATA_DIR, `sync_${req.username}.json`);
      if (!path.resolve(syncFile).startsWith(path.resolve(DATA_DIR))) {
        res.status(403).json({ error: "Forbidden file path access." });
        return;
      }

      await fs.writeFile(syncFile, JSON.stringify(req.body, null, 2), "utf-8");
      res.json({ success: true, timestamp: Date.now() });
    }),
  );

  app.get(
    "/api/sync/get",
    authenticateToken,
    asyncHandler(async (req: AuthRequest, res) => {
      if (!req.username || !USERNAME_REGEX.test(req.username)) {
        res.status(400).json({ error: "Invalid username format." });
        return;
      }
      const syncFile = path.join(DATA_DIR, `sync_${req.username}.json`);
      if (!path.resolve(syncFile).startsWith(path.resolve(DATA_DIR))) {
        res.status(403).json({ error: "Forbidden file path access." });
        return;
      }

      try {
        const data = JSON.parse(await fs.readFile(syncFile, "utf-8"));
        res.json(data);
      } catch {
        res.json({ empty: true });
      }
    }),
  );

  app.post(
    "/api/articles/extract",
    aiRouteRateLimiter,
    asyncHandler(async (req, res) => {
      const { url, preferences } = req.body as {
        url?: unknown;
        preferences?: Preferences;
      };

      if (typeof url !== "string" || !url.trim()) {
        res.status(400).json({ error: "Valid article URL is required." });
        return;
      }

      if (url.length > 2000) {
        res
          .status(400)
          .json({ error: "URL exceeds maximum length of 2000 characters." });
        return;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.trim());
      } catch {
        res.status(400).json({ error: "Invalid URL format." });
        return;
      }

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        res
          .status(400)
          .json({ error: "Only http and https protocols are supported." });
        return;
      }

      if (isPrivateOrInternalHost(parsedUrl.hostname)) {
        res.status(400).json({
          error: "Access to internal or private addresses is forbidden.",
        });
        return;
      }

      let html = "";
      try {
        const response = await fetch(parsedUrl.href, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(6000),
        });
        if (response.ok) {
          html = await response.text();
        }
      } catch {
        html = "";
      }

      const lengthText =
        preferences?.summaryLength === "detailed"
          ? "detailed, structured summary (around 300-400 words) with multiple bullet points"
          : preferences?.summaryLength === "short"
            ? "very concise summary (around 100 words)"
            : "standard executive summary (around 200 words)";

      const toneText =
        preferences?.summaryTone === "professional"
          ? "formal, objective, professional corporate newsletter"
          : preferences?.summaryTone === "engaging"
            ? "engaging, storytelling podcast style, using conversational speech patterns"
            : "straight-to-the-point, highly concise facts-only";

      const prompt = html
        ? `Extract the main article title, author, and body from this HTML, then summarize it in a ${lengthText} and ${toneText} style. Only extract factual content from the provided source HTML; do not invent or hallucinate unverified details.

Return strict JSON:
{"title":"...","author":"...","summary":"..."}

HTML:
${html.slice(0, 50000)}`
        : `Extract and summarize the article at ${url} in a ${lengthText} and ${toneText} style. Only extract factual content from the source article; do not invent or hallucinate unverified details.

Return strict JSON:
{"title":"...","author":"...","summary":"..."}`;

      const ai = getAI();
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: html ? [] : [{ googleSearch: {} }],
        },
      });

      const text = result.text?.trim() ?? "{}";
      const parsed = cleanAndParseJson<{
        title?: string;
        author?: string;
        summary?: string;
      }>(text, {
        title: "Extracted Article",
        summary: "Could not generate summary for this article.",
      });
      res.json({
        title: parsed.title || "Extracted Article",
        author: parsed.author || undefined,
        summary: parsed.summary || "Summary unavailable.",
      });
    }),
  );

  app.post(
    "/api/articles/summarize",
    aiRouteRateLimiter,
    asyncHandler(async (req, res) => {
      const { text, title, preferences } = req.body as {
        text?: unknown;
        title?: unknown;
        preferences?: Preferences;
      };

      if (typeof text !== "string" || !text.trim()) {
        res.status(400).json({ error: "Article text is required." });
        return;
      }

      if (text.length > 50000) {
        res.status(413).json({
          error: `Article text exceeds maximum length of 50000 characters. Received ${text.length} characters.`,
        });
        return;
      }

      const safeTitle =
        typeof title === "string" && title.trim() ? title.trim() : "Untitled";
      const lengthText =
        preferences?.summaryLength === "detailed"
          ? "detailed, structured summary (around 300-400 words) with multiple bullet points"
          : preferences?.summaryLength === "short"
            ? "very concise summary (around 100 words)"
            : "standard executive summary (around 200 words)";

      const toneText =
        preferences?.summaryTone === "professional"
          ? "formal, objective, professional corporate newsletter"
          : preferences?.summaryTone === "engaging"
            ? "engaging, storytelling podcast style, using conversational speech patterns"
            : "straight-to-the-point, highly concise facts-only";

      const prompt = `You are a professional audio script editor. Summarize the provided article text into a natural TTS-friendly audio briefing.

Article Title: ${safeTitle}

Requirements:
- Generate a ${lengthText}.
- Use a ${toneText} tone.
- Do not include markdown, HTML, or stage directions.

Return strict JSON object with fields "title" and "summary".

Article Content:
${text}`;

      const ai = getAI();
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const parsed = cleanAndParseJson<{ title?: string; summary?: string }>(
        result.text?.trim() ?? "{}",
        {
          title: safeTitle,
          summary: text.slice(0, 300) + "...",
        },
      );
      res.json({
        title: parsed.title || safeTitle,
        summary: parsed.summary || text.slice(0, 300),
      });
    }),
  );

  app.post(
    "/api/articles/search-news",
    aiRouteRateLimiter,
    asyncHandler(async (req, res) => {
      const { query, preferences } = req.body as {
        query?: unknown;
        preferences?: Preferences;
      };

      if (typeof query !== "string" || !query.trim()) {
        res.status(400).json({ error: "Search query is required." });
        return;
      }

      if (query.trim().length > 200) {
        res.status(400).json({
          error: "Search query exceeds maximum length of 200 characters.",
        });
        return;
      }

      const safeQuery = query.trim();
      const lengthText =
        preferences?.summaryLength === "detailed"
          ? "detailed, structured summary (around 300-400 words) with key takeaways"
          : preferences?.summaryLength === "short"
            ? "very concise brief (around 100 words)"
            : "standard executive brief (around 200 words)";

      const toneText =
        preferences?.summaryTone === "professional"
          ? "formal, objective, professional corporate news brief"
          : preferences?.summaryTone === "engaging"
            ? "engaging, storytelling podcast style, using conversational speech patterns"
            : "straight-to-the-point, highly concise facts-only";

      const prompt = `Search for the latest real-time news, updates, and developments regarding "${safeQuery}".
Summarize the most recent and relevant information into an audio-first commute news briefing.

Requirements:
- ${lengthText}.
- ${toneText} tone.
- Rely on fresh live search results.
- Do not include markdown code block formatting or stage directions in the summary text.

Return strict JSON:
{"title":"Headline describing the news summary","category":"Topic Category","summary":"Clear narrative text ready for audio narration"}`;

      const ai = getAI();
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        },
      });

      const text = result.text?.trim() ?? "{}";
      const parsed = cleanAndParseJson<{
        title?: string;
        category?: string;
        summary?: string;
      }>(text, {
        title: `Latest News: ${safeQuery}`,
        category: "Search Grounding",
        summary: "Summary generated from live search.",
      });

      type GroundingChunk = { web?: { uri?: string; title?: string } };
      const groundingChunks = (result.candidates?.[0]?.groundingMetadata
        ?.groundingChunks || []) as GroundingChunk[];
      const sources: Array<{ title: string; url: string }> = [];
      for (const chunk of groundingChunks) {
        if (chunk?.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
          });
        }
      }

      res.json({
        title: parsed.title || `Latest News: ${safeQuery}`,
        category: parsed.category || "Search Grounding",
        summary: parsed.summary || "Summary generated from live web search.",
        sources,
      });
    }),
  );

  app.post(
    "/api/articles/tts",
    aiRouteRateLimiter,
    asyncHandler(async (req, res) => {
      const { text, voiceName, speed } = req.body as {
        text?: unknown;
        voiceName?: unknown;
        speed?: unknown;
      };

      if (typeof text !== "string" || !text.trim()) {
        res.status(400).json({ error: "Text is required for TTS." });
        return;
      }

      const trimmedText = text.trim();
      if (trimmedText.length < 2) {
        res
          .status(400)
          .json({ error: "Text must be at least 2 characters long." });
        return;
      }

      if (trimmedText.length > 10000) {
        res.status(413).json({
          error: "TTS text exceeds maximum length of 10000 characters.",
        });
        return;
      }

      if (/<[^>]+>/.test(trimmedText)) {
        logStructured(
          "warn",
          "TTS text contains HTML/SSML tags; tags will be spoken verbatim or stripped",
          {
            sample: trimmedText.slice(0, 50),
          },
        );
      }

      const validVoices = [
        "Kore",
        "Puck",
        "Charon",
        "Fenrir",
        "Zephyr",
      ] as const;
      type VoiceName = (typeof validVoices)[number];
      const voice: VoiceName = validVoices.includes(voiceName as VoiceName)
        ? (voiceName as VoiceName)
        : "Kore";

      const numericSpeed =
        typeof speed === "number" && Number.isFinite(speed) ? speed : 1;

      const ai = getAI();
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ role: "user", parts: [{ text: trimmedText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
          temperature: 0.2,
        },
      });

      type PartWithInlineData = { inlineData?: { data?: string } };
      const parts = (result.candidates?.[0]?.content?.parts ||
        []) as PartWithInlineData[];
      const audioData = parts.find((part) => part.inlineData?.data)?.inlineData
        ?.data;

      if (!audioData) {
        res
          .status(500)
          .json({ error: "TTS model did not return any audio data." });
        return;
      }

      res.json({ audioBase64: audioData, speed: numericSpeed });
    }),
  );

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: ApiError, req: Request, res: Response, _next: NextFunction) => {
    const status =
      err.statusCode &&
      Number.isInteger(err.statusCode) &&
      err.statusCode >= 400 &&
      err.statusCode < 600
        ? err.statusCode
        : 500;
    const isOperational = status < 500;

    logStructured(
      status >= 500 ? "error" : "warn",
      err.message || "Request handling error",
      {
        path: req.path,
        method: req.method,
        status,
        stack: status >= 500 ? err.stack : undefined,
      },
    );

    res.status(status).json({
      error:
        isOperational || err.message?.startsWith("GEMINI_API_KEY")
          ? err.message
          : "An internal server error occurred.",
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    logStructured("info", `CommuteNews Server running on port ${PORT}`, {
      port: PORT,
    });
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    console.error(
      "Failed to start server:",
      toError(err, "Failed to start server"),
    );
    process.exit(1);
  });
}
