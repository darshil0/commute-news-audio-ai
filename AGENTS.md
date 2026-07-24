# Instructions for AI Agents & Developers

Welcome to the CommuteBrief repository! You are working in a highly optimized codebase structured for **Spec-Driven Development (SDD)**.

To ensure consistency, security, and predictability, you must strictly follow these instructions.

---

## 1. Absolute Directives

1. **Specs Take Precedence**: Never begin coding or modifying functionality without first reading and checking the specifications under [specs/](specs/).
2. **Follow SDD Workflows**: All tasks must follow the start-to-finish process documented in [specs/sdd_workflow.md](specs/sdd_workflow.md).
3. **No Unclear Assumptions**: If you encounter missing details or ambiguous prompts, mark the section clearly using the **`[NEEDS CLARIFICATION]`** placeholder and request guidance. Do not make guesses.
4. **Clean Builds Only**: All of your code changes must compile perfectly. Always run `npm run lint` and `npm run build` to verify there are no compilation errors.
5. **Durable Handoffs**: Before finishing, verify your documentation references using the custom Python tool in `/home/jules/self_created_tools/doc_validator.py`. Update documentation so future developers or agents can continue without losing context.

---

## 2. Core Documentation Links

- [System Specifications & Acceptance Criteria](specs/commute_brief_spec.md)
- [SDD Methodology & Process Cycle](specs/sdd_workflow.md)
- [Architecture & Technical Notes](specs/implementation_notes.md)
- [Validation Checklists & Testing Guidelines](specs/validation_checklist.md)
