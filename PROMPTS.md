# Reverse Engineered Prompt Engineering Guide

This document presents the reverse engineered prompt configurations and instructions utilized inside the **CommuteBrief** server-side pipeline to coordinate high-quality AI summaries and optimal Gemini Text-to-Speech (TTS) narrations.

---

## 🔍 1. Article HTML Extraction & Parsing Prompt

When a user provides a web URL, the server first attempts to read the raw HTML content, slices it to safe context length boundaries (first 50,000 characters), and feeds it to `gemini-3.5-flash` with the following prompt.

### Prompt Template
```
Extract the main article title, author, and body from this HTML, then summarize it in a [SUMMARY_LENGTH_REQUIREMENT] and [SUMMARY_TONE_REQUIREMENT] style.

Return strict JSON:
{"title":"...","author":"...","summary":"..."}

HTML:
[HTML_CONTENT_BODY]
```

### Prompt Fallback (If fetch fails or is blocked)
```
Extract and summarize the article at [ARTICLE_URL] in a [SUMMARY_LENGTH_REQUIREMENT] and [SUMMARY_TONE_REQUIREMENT] style.

Return strict JSON:
{"title":"...","author":"...","summary":"..."}
```

---

## 📝 2. Text Summarization & Script Formatting Prompt

When raw news text is pasted, the script generator cleanses the layout to compile a natural-sounding audio script. It runs `gemini-3.5-flash` with this prompt:

### Prompt Template
```
You are a professional audio script editor. Summarize the article titled "[ARTICLE_TITLE]" into a natural TTS-friendly script.

Requirements:
- Generate a [SUMMARY_LENGTH_REQUIREMENT].
- Use a [SUMMARY_TONE_REQUIREMENT] tone.
- Do not include markdown, HTML, or stage directions.

Return strict JSON:
{"title":"[SANITIZED_ARTICLE_TITLE]","summary":"..."}

Article:
[PASTED_TEXT_CONTENT]
```

### Dynamic Preference Mapping Values

* **[SUMMARY_LENGTH_REQUIREMENT]**:
  - `detailed`: "detailed, structured summary (around 300-400 words) with multiple bullet points"
  - `short`: "very concise summary (around 100 words)"
  - `medium` / Default: "standard executive summary (around 200 words)"

* **[SUMMARY_TONE_REQUIREMENT]**:
  - `professional`: "formal, objective, professional corporate newsletter"
  - `engaging`: "engaging, storytelling podcast style, using conversational speech patterns"
  - `concise` / Default: "straight-to-the-point, highly concise facts-only"

---

## 🔊 3. Gemini TTS Steering & Style Integration Prompts

To synthesize high-fidelity voices through the native `gemini-3.1-flash-tts-preview` model, the server relies on the following structural directives:

```typescript
{
  model: "gemini-3.1-flash-tts-preview",
  contents: [{ role: "user", parts: [{ text }] }],
  config: {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: voice },
      },
    },
    temperature: 0.2,
  },
}
```

### Controlling Delivery Style with Audio Tags
Gemini Native Audio supports **inline audio tags** to control pitch, rate, and delivery style. The server formats synthesized scripts with optional inline tags to guide the narrator's emotion:

- **Enthusiastic Greeting**: `"[excitedly] Welcome back to your daily commute news stream!"`
- **Fact-Based Focus**: `"[serious] In the latest market brief today..."`
- **Pacing Control**: `"[very fast] Breaking update coming in..."` or `"[very slow] Moving to our final summary..."`
