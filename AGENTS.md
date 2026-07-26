# AGENTS.md - Spec-Driven Development (SDD) Guidelines

Welcome to the **CommuteBrief / CommuteNews** repository. This project uses a **Spec-Driven Development (SDD)** workflow where documentation and specs serve as the absolute source of truth for all software development, feature additions, and bug fixes.

---

## 🎯 SDD Core Protocol

When working on this repository, all AI agents and human contributors **MUST** follow the Spec-Driven Development cycle:

```text
┌─────────────────┐     ┌───────────────────────┐     ┌────────────────────────┐
│ 1. Spec Review  │ ──► │ 2. Implementation     │ ──► │ 3. Code Implementation │
│    & Update     │     │    Plan (`specs/`)    │     │    & Verification      │
└─────────────────┘     └───────────────────────┘     └────────────────────────┘
                                                                   │
┌─────────────────┐     ┌───────────────────────┐                  │
│ 5. Agent        │ ◄── │ 4. Validation against │ ◄────────────────┘
│    Handoff      │     │    Checklist          │
└─────────────────┘     └───────────────────────┘
```

1. **Spec First**: Before modifying or writing code, consult `/specs/SYSTEM_SPEC.md`. If a requested feature or fix is not specified or differs from current specs, update the spec document first or mark ambiguous requirements as `[NEEDS-CLARIFICATION]`.
2. **Plan & Breakdown**: Review or update `/specs/IMPLEMENTATION_PLAN.md` to map proposed code changes to specific Acceptance Criteria (ACs).
3. **Surgical Implementation**: Execute code changes in precise, modular blocks. Never break existing builds or introduce unverified assumptions.
4. **Validation & Verification**: Run `npm run lint` and `npm run build` (or run `lint_applet` / `compile_applet`) to verify compilation and type safety. Cross-check against `/specs/VALIDATION_CHECKLIST.md`.
5. **Context Handoff**: Update `/specs/IMPLEMENTATION_PLAN.md` and `CHANGELOG.md` so future agents or developers can seamlessly resume work without context loss.

---

## 🛠️ Repository & System Constraints

- **Port & Host Constraints**: Port `3000` is the **only** externally accessible port. Server scripts bind to host `0.0.0.0` and port `3000`. Never change or attempt to override the port.
- **Architecture**:
  - **Client**: Single-Page Application (SPA) built with React 19, TypeScript, Vite, Tailwind CSS v4, and Framer Motion (`motion/react`).
  - **Server**: Express backend in `server.ts` running as CommonJS in production (`dist/server.cjs`) and via `tsx` in development.
  - **API Keys**: Secrets such as `GEMINI_API_KEY` are strictly managed server-side. Client components route requests to `/api/*` endpoints.
  - **Audio Fallback**: When offline or if Gemini API requests fail, the client gracefully falls back to browser-native `window.speechSynthesis`.
- **Type Safety & Immutability**:
  - Maintain strict TypeScript type definitions in `src/types.ts`.
  - Avoid raw `any` types; use explicit domain types/unions (`SummaryLength`, `SummaryTone`, `VoiceName`) and handle caught errors with `unknown` and type guards.
  - Use read-only arrays (`readonly string[]`) and immutable state patterns where appropriate.

---

## ❓ Handling Ambiguity (`[NEEDS-CLARIFICATION]`)

If a user request or task lacks explicit detail:
- **Do NOT guess or invent unrequested features.**
- Clearly flag the ambiguity using the `[NEEDS-CLARIFICATION]` tag in the relevant spec (`specs/SYSTEM_SPEC.md`) and in your final response.
- Provide a clear explanation of what information is missing and offer logical options to resolve it.

---

## 📋 Verification Commands

Before concluding any work, verify the codebase using:
- **Lint Check**: `npm run lint` (`tsc --noEmit`)
- **Build Check**: `npm run build` (`tsc --noEmit && vite build && esbuild ...`)
