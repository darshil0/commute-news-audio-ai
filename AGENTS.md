# AGENTS.md - Spec-Driven Development (SDD) Protocol v1.1

Welcome to **CommuteBrief / CommuteNews**. This project follows a **Spec-Driven Development (SDD)** workflow where documentation and specs are the authoritative source of truth for all software development, feature additions, and bug fixes.

All AI agents and human contributors **must** follow the SDD cycle outlined below.

---

## 🎯 SDD Core Protocol

### Phase 1: Spec Review & Validation

**Before writing any code**, execute this verification gate:

```
┌─────────────────────────────────────────────────────┐
│ 1. Spec Review & Validation                         │
│  ├─ Locate relevant spec (SYSTEM_SPEC.md)          │
│  ├─ Verify timestamp ≤7 days old                   │
│  ├─ Check for [NEEDS CLARIFICATION] tags           │
│  ├─ Confirm acceptance criteria (AC) defined       │
│  └─ If gaps: flag & escalate (see Escalation Gate) │
└─────────────────────────────────────────────────────┘
                    ↓ All gates pass
┌─────────────────────────────────────────────────────┐
│ 2. Implementation Plan & Breakdown                  │
│  ├─ Review IMPLEMENTATION_PLAN.md                  │
│  ├─ Map task to specific phase & AC                │
│  ├─ Identify code modules to modify                │
│  ├─ List assumptions & dependencies                │
│  └─ Update plan with task ID & agent               │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 3. Surgical Code Implementation                     │
│  ├─ Write minimal, focused changes                 │
│  ├─ Preserve existing build (npm run build)        │
│  ├─ Add test coverage (if applicable)              │
│  └─ Document non-obvious decisions                 │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 4. Validation & Verification Gate                  │
│  ├─ ✓ npm run lint (TypeScript + ESLint)           │
│  ├─ ✓ npm run build (no errors/warnings)           │
│  ├─ ✓ Cross-check VALIDATION_CHECKLIST.md          │
│  ├─ ✓ Update CHANGELOG.md                          │
│  └─ ✓ Update IMPLEMENTATION_PLAN.md (completion)   │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 5. Context Handoff & State Recording                │
│  ├─ Document completion in HANDOFF_LOG.md          │
│  ├─ List files modified + line counts              │
│  ├─ Flag any blockers for next agent               │
│  ├─ Link to related issues/PRs                     │
│  └─ State: Ready for Merge / Blocked / Review      │
└─────────────────────────────────────────────────────┘
```

**Cycle Result:** Each phase produces documented output. If any gate fails, escalate (see below).

---

## ❓ Ambiguity & Escalation Protocol

### Detecting Ambiguity

Ambiguity exists when:
- Task description lacks acceptance criteria (ACs)
- Spec contradicts code or other spec sections
- [NEEDS CLARIFICATION] tags present in spec
- User request differs from current spec
- Edge cases not addressed
- Dependencies unclear (which module owns this?)

### Escalation Decision Tree

```
┌─ Is the task in SYSTEM_SPEC.md? ─────────────┐
│                                                │
├─ YES: Does spec have acceptance criteria?   │
│   ├─ YES: Proceed to Implementation (Phase 2) │
│   └─ NO: Mark [NEEDS CLARIFICATION]          │
│       └─ → ESCALATE (see below)              │
│                                                │
└─ NO: Is this a bug fix or new feature?      │
    ├─ BUG FIX: Check IMPLEMENTATION_PLAN.md  │
    │   └─ Not found? → ESCALATE              │
    └─ NEW FEATURE: Spec must be created first │
        └─ → ESCALATE (add to SYSTEM_SPEC.md) │
```

### Escalation Action

When escalating, **stop work** and create an issue/message with:

```markdown
## [NEEDS CLARIFICATION] - [Feature/Bug Name]

**Context:** [What you're trying to do]

**Gap:** [Missing spec detail / conflicting info]

**Options:**
1. [Logical option A with implications]
2. [Logical option B with implications]
3. [Logical option C with implications]

**Recommended:** Option [X] because [reasoning]

**Blocker Status:** Cannot proceed without clarification

**Agent:** [Your name/AI model]
**Date:** YYYY-MM-DD
**Expected Resolution:** [Date by which you need answer]
```

**Owner Decision:** The repository owner (Darshil) or designated decision-maker must respond within **24 hours** with:
- Selected option + reasoning
- Updated spec section (SYSTEM_SPEC.md or IMPLEMENTATION_PLAN.md)
- New task ID for proceeding

**Resume Work:** Only after decision is documented and spec updated.

---

## 🛠️ Repository & System Constraints

### Critical Infrastructure

| Constraint | Value | Reason | Violation Impact |
|---|---|---|---|
| **Port** | `3000` (only externally accessible) | Load balancer, reverse proxy config | App won't start; deployment fails |
| **Host** | `0.0.0.0` (bind all interfaces) | Docker/container compatibility | Remote access blocked |
| **API Key Location** | Server-side only; never in client `.js` | Security: prevent key leakage to browser | CRITICAL: API key exposed in production |
| **Frontend Framework** | React 19 + TypeScript + Vite | Type safety, fast builds | Incompatible package versions, build failures |
| **Backend Runtime** | Node.js Express; CommonJS in prod (`.cjs`) | ESM/CommonJS interop issues | Module not found errors in production |
| **Fallback Audio** | `window.speechSynthesis` (browser native) | Graceful degradation when API fails | No audio generation when offline/API down |

### Architectural Boundaries

```
┌──────────────────────────────────────────────────────────────┐
│                      React 19 SPA (Vite)                      │
│  src/components/, src/hooks/, src/types.ts                   │
│  ├─ Client-side state: AudioPlayer, VoiceProfiles, etc.     │
│  └─ API calls: fetch → /api/* endpoints ONLY                │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP only
                       │ Port 3000
┌──────────────────────▼──────────────────────────────────────┐
│            Express Backend (server.ts → dist/server.cjs)     │
│  ├─ Routes: /api/search, /api/tts, /api/summarize           │
│  ├─ Secrets: GEMINI_API_KEY (env var only)                  │
│  ├─ Middleware: Error handling, rate limiting, CORS        │
│  └─ No database; stateless (scales horizontally)            │
└──────────────────────┬──────────────────────────────────────┘
                       │ gRPC/REST
                       │
┌──────────────────────▼──────────────────────────────────────┐
│          Google Cloud (Gemini API, Search, TTS)             │
│  ├─ Key managed: GEMINI_API_KEY (never shared)             │
│  └─ Rate limit: 60 req/min (handle gracefully)             │
└──────────────────────────────────────────────────────────────┘
```

**Violation Prevention:**
- **Never** move secrets to client (`.tsx` files)
- **Never** change port `3000` without updating deployment config
- **Never** introduce new database without updating IMPLEMENTATION_PLAN.md
- **Never** add external dependencies without npm audit check

---

## 📋 Phase Checklist & Verification Commands

### Pre-Implementation Checklist

- [ ] Spec reviewed; timestamp ≤7 days old
- [ ] Acceptance criteria clearly defined
- [ ] No [NEEDS CLARIFICATION] tags (or escalated + resolved)
- [ ] IMPLEMENTATION_PLAN.md updated with this task
- [ ] Dependencies identified (npm packages, modules)
- [ ] Assumptions documented in task description

### Implementation Checklist

- [ ] Code changes minimal & focused (single responsibility)
- [ ] TypeScript types strict; no `any` without justification
- [ ] Comments added for non-obvious logic
- [ ] Related tests added/updated (if applicable)
- [ ] CHANGELOG.md updated with brief description

### Verification Gate Commands

```bash
# 1. Lint check (TypeScript + ESLint)
npm run lint
# Expected: 0 errors, <5 warnings

# 2. Build check (Vite + server compilation)
npm run build
# Expected: dist/ folder created, no errors

# 3. Type safety
npx tsc --noEmit
# Expected: 0 errors

# 4. Run tests (if applicable)
npm run test
# Expected: all tests pass or documented skips

# 5. Manual verification (if applicable)
npm run dev
# Open http://localhost:5173 in browser
# Test feature end-to-end
```

**All gates must pass before handoff.** If any gate fails:
1. Document the error message
2. Attempt fix (max 3 attempts)
3. If unresolved, escalate with full error log + context

---

## 🔄 Handoff Protocol & State Machine

### Handoff Trigger

A task is ready for handoff when:
- ✅ All verification gates pass (`npm run lint`, `npm run build`)
- ✅ VALIDATION_CHECKLIST.md cross-checked
- ✅ CHANGELOG.md updated
- ✅ IMPLEMENTATION_PLAN.md marked "Complete"
- ✅ No blockers or regressions introduced
- ✅ Documentation updated (code comments, README if needed)

### Handoff State Machine

```
┌──────────────┐
│   Assigned   │  Agent claims task
│              │  Task ID: [e.g., FEAT-001]
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  Spec Review         │  Agent reviews SYSTEM_SPEC.md
│  ✓ Verified          │  Checks acceptance criteria
└──────┬───────────────┘  Flags ambiguities
       │                   Time: ~15 min
       ▼
┌──────────────────────┐
│  Implementation      │  Code written
│  In Progress         │  Tests added
└──────┬───────────────┘  Lint + build passing
       │                   Time: ~2-8 hours
       ▼
┌──────────────────────┐
│  Verification        │  Validation gates run
│  Running             │  VALIDATION_CHECKLIST reviewed
└──────┬───────────────┘  Edge cases tested
       │                   Time: ~30 min
       ▼
   Pass? ─────NO─────→ [Fix Issues] ──→ (loop back)
       │
      YES
       │
       ▼
┌──────────────────────┐
│  Handoff Ready       │  State recorded in HANDOFF_LOG.md
│  Documentation       │  Blocker flags (if any)
│  Updated             │  Next agent identified
└──────┬───────────────┘  Time: ~10 min
       │
       ▼
┌──────────────────────┐
│  Blocked             │  Requires unresolved escalation
│  (if applicable)     │  or external decision
└──────┬───────────────┘
       │
       ▼
   [Human Review/Merge]
```

### Handoff Output (HANDOFF_LOG.md)

Every completed task generates an entry:

```markdown
## Task: [FEAT-001 or BUG-042] - [Brief Description]

**Agent:** [AI model or human name]
**Date Completed:** YYYY-MM-DD HH:MM UTC
**Duration:** ~X hours

### Changes Summary
- **Files Modified:** src/components/AudioPlayer.tsx, src/types.ts (+120 lines, -45 lines)
- **Tests Added:** src/components/__tests__/AudioPlayer.test.tsx (8 new test cases)
- **Spec Updated:** IMPLEMENTATION_PLAN.md Phase 3 → Complete

### Verification Results
```
✅ npm run lint: PASS (0 errors)
✅ npm run build: PASS (dist/ generated)
✅ VALIDATION_CHECKLIST.md: 15/15 criteria met
✅ Manual QA: Audio playback speed 0.5x-2.0x verified
```

### Blockers / Notes
- None; ready for merge

### Next Steps
- [ ] Code review by maintainer
- [ ] Merge to main
- [ ] Deploy to staging

---

**Related Issues:** #123, #124
**Related PRs:** #456
```

---

## 📌 Working Rules & Type Safety

### Code Standards

1. **No `any` types** — Use `unknown` + type guards:
   ```typescript
   // ❌ Bad
   const data: any = JSON.parse(response);
   
   // ✅ Good
   const data: unknown = JSON.parse(response);
   if (typeof data === 'object' && data !== null && 'id' in data) {
     console.log(data.id); // TypeScript knows 'id' exists
   }
   ```

2. **Explicit domain types** (`src/types.ts`):
   ```typescript
   export interface Briefing {
     id: string;
     title: string;
     summary: string;
     voiceProfile: VoiceProfile;
     audioUrl: string | null;
     createdAt: Date;
     isOffline: boolean;
   }
   
   export type VoiceProfile = 'zephyr' | 'kore' | 'charon' | 'puck' | 'fenrir';
   ```

3. **Immutable patterns**:
   ```typescript
   // ✅ Use const for collections
   const briefings: readonly Briefing[] = [...state.briefings];
   
   // ✅ Use Object.freeze for state objects
   const config = Object.freeze({ port: 3000, host: '0.0.0.0' });
   ```

4. **Comments for non-obvious logic**:
   ```typescript
   // Rate limit: Gemini API allows 60 req/min.
   // We queue requests if limit exceeded, retry after 60s delay.
   if (requestCount > 60 && timeSinceMinute < 60000) {
     queue.push(() => search(query)); // defer execution
   }
   ```

5. **Error handling**:
   ```typescript
   // ✅ Catch + narrow error type
   try {
     const response = await fetch('/api/search', { signal: controller.signal });
   } catch (error) {
     if (error instanceof DOMException && error.name === 'AbortError') {
       console.log('Request cancelled');
     } else if (error instanceof Error) {
       console.error('Fetch failed:', error.message);
     }
   }
   ```

---

## 📐 Spec Document Lifecycle

### Spec Freshness Guarantee

**Before implementation, verify:**
```bash
# Check SYSTEM_SPEC.md last modified date
stat -f %Sm -t "%Y-%m-%d" specs/SYSTEM_SPEC.md
# Expected: within 7 days of today's date
```

If spec is >7 days old, **stop and escalate**:
- Requirements may have changed
- New edge cases discovered
- Dependencies updated

### Spec Update Trigger

Update specs immediately when:
- User requests feature not in SYSTEM_SPEC.md
- Acceptance criteria discovered during implementation differ from spec
- Edge case discovered not addressed in spec
- Architecture decision changes (port, dependencies, runtime)

**Update process:**
1. Edit relevant section in `specs/SYSTEM_SPEC.md`
2. Add `[UPDATED] YYYY-MM-DD` tag at end of section
3. Document rationale in git commit message
4. Notify team of spec change (if multi-agent project)

---

## 🚨 Common Violation Patterns & Prevention

| Violation | Prevention | Consequence |
|---|---|---|
| **Spec not checked before code** | Add Phase 1 review to task checklist | Implementation misaligned; wasted effort |
| **Code changes exceed scope** | Keep changes focused; 1 task = 1 focused PR | Context loss for next agent; hard to revert |
| **Secrets in client `.tsx`** | grep for GEMINI_API_KEY in src/components/ | API key exposed; potential cost, data breach |
| **Port `3000` changed** | grep "3000" in code before modifying | Deployment fails; load balancer points wrong |
| **Build fails silently** | Run `npm run build` before handoff | Merge breaks production |
| **Lint errors ignored** | Make lint pass; 0 errors required | Code quality drift; harder to review |
| **Handoff without state record** | Always update HANDOFF_LOG.md | Next agent loses context; duplicates work |
| **Tests not updated** | If code changes, review test impact | Regressions go undetected |

---

## 📋 Validation Checklist Template

For each completed feature, verify:

```markdown
## VALIDATION_CHECKLIST.md - [Feature Name]

### Requirement Traceability
- [ ] AC-001: [Acceptance criterion] → src/components/[File].tsx ✓
- [ ] AC-002: [Acceptance criterion] → src/server.ts ✓
- [ ] AC-003: [Acceptance criterion] → [Test file] ✓

### Code Quality
- [ ] TypeScript: strict mode enabled, 0 errors
- [ ] ESLint: 0 errors, warnings documented
- [ ] No `any` types; all `unknown` handled with type guards

### Test Coverage
- [ ] Unit tests: >80% coverage for utilities
- [ ] Integration tests: API endpoints tested
- [ ] E2E (if applicable): User workflow tested

### Security & Constraints
- [ ] No secrets in client-side code
- [ ] API rate limiting respected
- [ ] CORS headers correct
- [ ] Port 3000 not changed

### Deployment Readiness
- [ ] npm run build: ✓ Pass
- [ ] npm run lint: ✓ Pass
- [ ] CHANGELOG.md: ✓ Updated
- [ ] IMPLEMENTATION_PLAN.md: ✓ Phase marked "Complete"
```

---

## 🔗 Document Relationships

```
AGENTS.md (this file)
  ↓ Governs
specs/SYSTEM_SPEC.md (Acceptance Criteria)
  ↓ Implements
specs/IMPLEMENTATION_PLAN.md (Phase Breakdown)
  ↓ Tracked by
HANDOFF_LOG.md (State Recording)
  ↓ References
CHANGELOG.md (Version History)
  ↓ Validates
specs/VALIDATION_CHECKLIST.md (QA Criteria)
```

---

## ✅ Quick Reference Checklist

| Phase | Action | Time | Verify |
|---|---|---|---|
| **Spec Review** | Read SYSTEM_SPEC.md, check ACs | 15 min | No ambiguities; escalate if found |
| **Plan** | Update IMPLEMENTATION_PLAN.md with task | 10 min | Task ID assigned, dependencies clear |
| **Implement** | Write code, tests, comments | 2–8 hrs | Focused changes; minimal scope |
| **Verify** | Run lint/build; cross-check validation | 30 min | 0 errors; gates pass |
| **Handoff** | Update HANDOFF_LOG.md, flag blockers | 10 min | State recorded; next agent informed |

---

## 📞 Support & Escalation

**Escalation Path:**
1. Agent flags [NEEDS CLARIFICATION]
2. Message sent to repository owner (Darshil)
3. Owner responds with spec update + decision within 24 hours
4. Agent resumes work with updated spec

**Questions:**
- Spec ambiguity → Add [NEEDS CLARIFICATION] tag
- Code decision → Check IMPLEMENTATION_PLAN.md for architecture docs
- Test approach → Review VALIDATION_CHECKLIST.md for QA criteria
- Deployment → See README.md "Running the Application"

---

**Version:** 1.1  
**Last Updated:** 2026-07-25  
**Maintainer:** Darshil
