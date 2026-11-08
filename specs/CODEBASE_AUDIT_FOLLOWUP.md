# Codebase audit follow-up

## Scope and status

This audit follows the supplied repository snapshot at commit `392e6cfc5375ba60646d204a4432fa15e091dcd2`. It records specific findings confirmed during inspection and distinguishes changes made in this branch from issues that still require implementation and verification. It is not a claim that every possible defect in the repository has been found.

## Change made in this branch

- `src/utils/search.test.ts`: removed an explicit `any` cast from the invalid-input test, replacing it with an `unknown`-mediated type assertion. The mock article factory now uses deterministic sequential IDs when fixtures do not supply IDs, making test output reproducible.

## Findings requiring follow-up

- **SSRF and DNS resolution:** `server.ts` validates URL hostnames against literals and local suffixes before calling `fetch`, but the inspected code does not resolve hostnames and verify their resulting IP addresses. Public-looking hostnames resolving to private or link-local addresses therefore need a defense-in-depth review. Redirect handling should also be checked so a redirect cannot bypass the destination checks.
- **Sync response validation and conflict handling:** `src/lib/api.ts` casts the JSON sync response to `SyncData` without runtime schema validation. `src/context/AppContext.tsx` then consumes its arrays. The merge logic also replaces existing playlists with remote versions unconditionally, while article merging compares `createdAt`; this is not a complete last-write-wins policy for edits or deletions. Define a version/timestamp and deletion/tombstone policy before changing sync semantics.
- **Verification:** Repository tools available in this task can read and write GitHub files but cannot run the package scripts. `npm run lint`, `npm test`, and `npm run build` have not been run for this branch. The documentation and validation checklist must not claim these checks passed until they are executed in a suitable environment.

## Next validation steps

1. Run `npm ci`, `npm run lint`, `npm test`, and `npm run build` on this branch.
2. Add server tests for URL parsing, hostname resolution, redirects, IPv4/IPv6 special-use ranges, and DNS lookup failures before changing extraction behavior.
3. Add runtime schema validation for sync payloads and tests for malformed payloads, local/remote edits, and deletion propagation.
4. Update the system specification and acceptance checklist alongside any resulting behavior changes.
