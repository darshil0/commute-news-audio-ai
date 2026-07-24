# Spec-Driven Development (SDD) Workflow Guide

This document defines the **Spec-Driven Development (SDD)** process adopted in the CommuteBrief repository. Every developer, contributor, and AI agent must adhere strictly to these guidelines.

---

## 1. What is Spec-Driven Development?

Spec-Driven Development (SDD) is a methodology where **documentation is the absolute source of truth**. No development, coding, refactoring, or bug-fixing may begin without a clear, unambiguous specification of requirements, acceptance criteria, and validation plans.

This ensures that:
- Changes are minimal, exact, and highly targeted.
- Code matches customer expectations perfectly.
- AI agents and automated tools can operate independently and safely with minimal human oversight.

---

## 2. SDD Process Cycle (Start-to-Finish)

When a new feature, improvement, or bug fix is requested:

```
┌──────────────────────────────────────────────┐
│  Phase 1: Requirements & Spec Audit          │
│  - Audit existing docs and specs             │
│  - Identify ambiguities / mark [NEEDS CLAR]   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Phase 2: Establish the Spec First           │
│  - Write/Update specs in specs/              │
│  - Get human approval of the spec & criteria │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Phase 3: Formulate & Verify Plan            │
│  - Write action plan with testing steps      │
│  - Register plan via set_plan tools          │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Phase 4: Precise Implementation & Lint      │
│  - Implement minimum code required           │
│  - Run linter (tsc --noEmit) and build       │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Phase 5: Spec Validation & Review           │
│  - Run pre-commit checks                     │
│  - Verify with doc_validator.py              │
└──────────────────────────────────────────────┘
```

---

## 3. Core Developer Guardrails

1. **Specs before Code**: Never write source code until your corresponding specification inside `specs/` is fully written and approved.
2. **Handle Ambiguity Safely**: If any requirement or design detail is missing, do not make guesses. Mark the file or section with a bold **`[NEEDS-CLARIFICATION]`** tag and request clarification immediately.
3. **Minimize Diffs**: Write the smallest possible diff that satisfies the specification. Refactoring unrelated files, adding unrelated features, or rewriting large blocks of code unnecessarily is strictly prohibited.
4. **Edit Source, Not Artifacts**: Never directly edit built assets (e.g. inside `dist/`). Always edit files under `src/` or `server.ts` and regenerate artifacts by running `npm run build`.
5. **No Blind Dependency Installs**: Never install or uninstall npm packages without first analyzing package constraints or receiving explicit authorization from the specification.
6. **Deterministic Validation**: Every change must be validated by running reproducible tests and build suites.

---

## 4. Work Handoff Protocol

When handing off work to another team member or subsequent AI agent:
- Update `specs/implementation_notes.md` with your architectural decisions and the state of your work.
- Provide a clear, concise checklist of outstanding items in `specs/validation_checklist.md`.
- Ensure all automated checks pass cleanly.
