/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
const TOKEN_SECRET = process.env.TOKEN_SECRET || "dev-only-change-me";

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
      throw Object.assign(new Error("GEMINI_API_KEY is not configured."), { statusCode: 500 });
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
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");
}

function signToken(username: string): string {
  const payload = JSON.stringify({ username, ts: Date.now() });
  const body = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token: string): string | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest("base64url");
  
  const sigBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  
  // Timing safe equal throws an error if buffers have different lengths.
  // Compare lengths first to prevent crashes.
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as { username?: string };
    return payload.username || null;
  } catch {
    return null;
  }
}

function cleanAndParseJson<T>(rawText: string, fallback: T): T {
  if (!rawText || !rawText.trim()) return fallback;
  let cleaned = rawText.trim();

  // Strip markdown code fences if present (e.g. ```json ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
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
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
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
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10mb" }));

  app.post(
    "/api/auth/register",
    asyncHandler(async (req, res) => {
      const { username, password } = req.body as { username?: unknown; password?: unknown };

      if (typeof username !== "string" || typeof password !== "string") {
        res.status(400).json({ error: "Username and password are required." });
        return;
      }

      const uClean = username.trim().toLowerCase();
      if (uClean.length < 3 || password.length < 8) {
        res.status(400).json({ error: "Username must be at least 3 chars; password at least 8 chars." });
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

      res.json({ username: uClean, token: signToken(uClean) });
    })
  );

  app.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      const { username, password } = req.body as { username?: unknown; password?: unknown };

      if (typeof username !== "string" || typeof password !== "string") {
        res.status(400).json({ error: "Username and password are required." });
        return;
      }

      const uClean = username.trim().toLowerCase();
      const users = await loadUsers();
      const user = users[uClean];

      if (!user || hashPassword(password, user.salt) !== user.passwordHash) {
        res.status(401).json({ error: "Invalid username or password." });
        return;
      }

      res.json({ username: uClean, token: signToken(uClean) });
    })
  );

  app.post(
    "/api/sync/save",
    authenticateToken,
    asyncHandler(async (req: AuthRequest, res) => {
      const syncFile = path.join(DATA_DIR, `sync_${req.username}.json`);
      await fs.writeFile(syncFile, JSON.stringify(req.body, null, 2), "utf-8");
      res.json({ success: true, timestamp: Date.now() });
    })
  );

  app.get(
    "/api/sync/get",
    authenticateToken,
    asyncHandler(async (req: AuthRequest, res) => {
      const syncFile = path.join(DATA_DIR, `sync_${req.username}.json`);
      try {
        const data = JSON.parse(await fs.readFile(syncFile, "utf-8"));
        res.json(data);
      } catch {
        res.json({ empty: true });
      }
    })
  );

  app.post(
    "/api/articles/extract",
    asyncHandler(async (req, res) => {
      const { url, preferences } = req.body as { url?: unknown; preferences?: Preferences };

      if (typeof url !== "string" || !url.trim()) {
        res.status(400).json({ error: "Valid article URL is required." });
        return;
      }

      let html = "";
      try {
        const response = await fetch(url, {
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
        ? `Extract the main article title, author, and body from this HTML, then summarize it in a ${lengthText} and ${toneText} style.

Return strict JSON:
{"title":"...","author":"...","summary":"..."}

HTML:
${html.slice(0, 50000)}`
        : `Extract and summarize the article at ${url} in a ${lengthText} and ${toneText} style.

Return strict JSON:
{"title":"...","author":"...","summary":"..."}`;

      const ai = getAI();
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: html ? [] : [{ googleSearch: {} }],
        },
      });

      const text = result.text?.trim() ?? "{}";
      const parsed = cleanAndParseJson<{ title?: string; author?: string; summary?: string }>(text, {
        title: "Extracted Article",
        summary: "Could not generate summary for this article.",
      });
      res.json({
        title: parsed.title || "Extracted Article",
        author: parsed.author || undefined,
        summary: parsed.summary || "Summary unavailable.",
      });
    })
  );

  app.post(
    "/api/articles/summarize",
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

      const safeTitle = typeof title === "string" && title.trim() ? title.trim() : "Untitled";
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

      const prompt = `You are a professional audio script editor. Summarize the article titled "${safeTitle}" into a natural TTS-friendly script.

Requirements:
- Generate a ${lengthText}.
- Use a ${toneText} tone.
- Do not include markdown, HTML, or stage directions.

Return strict JSON:
{"title":"${safeTitle.replace(/"/g, '\\"')}","summary":"..."}

Article:
${text}`;

      const ai = getAI();
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const parsed = cleanAndParseJson<{ title?: string; summary?: string }>(result.text?.trim() ?? "{}", {
        title: safeTitle,
        summary: text.slice(0, 300) + "...",
      });
      res.json({
        title: parsed.title || safeTitle,
        summary: parsed.summary || text.slice(0, 300),
      });
    })
  );

  app.post(
    "/api/articles/tts",
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

      const validVoices = ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"] as const;
      const voice = validVoices.includes(voiceName as any) ? (voiceName as string) : "Kore";

      const numericSpeed = typeof speed === "number" && Number.isFinite(speed) ? speed : 1;

      const ai = getAI();
      const result = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ role: "user", parts: [{ text }] }],
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

      const audioData = result.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData?.data
      )?.inlineData?.data;

      if (!audioData) {
        res.status(500).json({ error: "TTS model did not return any audio data." });
        return;
      }

      res.json({ audioBase64: audioData, speed: numericSpeed });
    })
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

  app.use((err: ApiError, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Internal server error",
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CommuteNews Server] running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", toError(err, "Failed to start server"));
  process.exit(1);
});
