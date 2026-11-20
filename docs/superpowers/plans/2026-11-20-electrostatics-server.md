# Electrostatics server calculation plan

Goal: keep the field grid, solver and reference drawings out of student browsers, preserving assigned geometry and rounded probe measurements.
Architecture: use the existing authenticated electrostatics API; derive the assigned variant from the current profile. Only monitor-authorized teachers/admin receive reference paths. A durable database quota limits automated point scanning across server instances. Do not send a grid even to teachers. Existing simulation equations and notebook geometry stay unchanged.
Tech stack: TypeScript, React, existing Clerk/Neon API. No new dependencies.

- [x] Add failing API tests for one-point readings, identity/variant spoofing, Basic/PRO reference denial, teacher scope and quotas.
- [x] Move solver/contours/field lines and contour-based measurement ordering into server-only modules; preserve physics tests.
- [x] Add cached server model, bounded API inputs, durable quotas, server-only reference paths, measurement connectivity and normal checks.
- [x] Replace every browser worker (student lab, expected drawing, archived preview) with authorized API results; debounce probe requests and ignore stale responses. Never record a pending/failed reading.
- [x] Check physics/security/API tests, native ESM, build/lint, production bundle exclusion and browser interactions. Initialize the additive quota table; no commits/push/deployment.

Review focus: forged student IDs and arbitrary geometry; stale responses after probe/variant change; PRO students requesting reference paths; oversized/batched probes and cross-instance scanning; server errors must not fall back to client calculations.
Ruling: the user's request implements the server approach already recommended and accepted in the conversation; continue without another approval cycle. Preserve other uncommitted assessment work.

Validation: API tests observed failing before implementation (instrument returned 400); physics/layout/neighbor/selection tests pass after move. Build/lint/type checks, native ESM and production bundle boundary checks completed. Browser checks use mocked authentication/API (no real student writes): Basic/PRO/teacher, pending/error/retry, no worker, desktop/mobile. PostgreSQL quota test uses a unique synthetic row, verifies one winner from 20 concurrent calls at the daily ceiling, burst denial/refill/day reset, then deletes that row. Additive quota table initialized in the configured DB. No deployment/commit/push.
Ruling: fixed presentation examples are precomputed JSON, so preserving /konkurs does not ship the solver or create an arbitrary public solve API. Client revalidates only changed measurement levels to avoid repeatedly charging the full notebook. Full manual work still requires network connectivity; visible geometry remains independently solvable.

Superseded later on 20.11.2026 at the owner's explicit request: restore the device-side Web Worker model because per-probe server latency disrupts measurements. The numerical grid is once again inspectable in DevTools. Existing authentication/monitor scopes and the 12-function deployment routing remain.
