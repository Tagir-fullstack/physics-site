# Molecular physics assessment

User-approved scope: «Молекулярная физика», individual variants required, eight numeric-only tasks worth 0.3/0.3/0.5/0.5/0.5/0.5/0.7/0.7 (4 total). The first two select different templates from six elementary types. Based on supplied textbook sections 8 and 9. Reuse the midterm runner, waiting room, monitoring, server deadlines, autosave and scheduled reveal. All new test defaults are 50 minutes; existing attempts and scheduled sessions keep stored deadlines.

Architecture: add a server-only molecular engine and endpoint to the existing assessment handler; a new catalog entry and route reuse current UI and session management. Store expected values only through private variant computation. Return worked solutions only after submission and scheduled release (or authorized admin review). Add an idempotent period/setup script; never change existing periods or attempts.

Implementation:
- [x] Test and implement generator, six simple templates, eight increasing tasks, RU/KK, physics formula checks, grading, numeric parser, no public answer leakage, uniqueness.
- [x] Extend shared handler/session policy/catalog/periods for molecular; preserve old mechanics/midterm scoring and enforce admin-only preview/restart.
- [x] Reuse existing runner and styles, add molecular copy, units/constants and released solutions; set new-test defaults to 50 minutes.
- [ ] Initialize only the new period; verify unauthenticated requests, waiting/start/submit/sealed/released lifecycle in an isolated test period, persistence and weighted scores.
- [ ] Build/lint/regression and desktop/mobile browser checks; no commit/push unless requested.

Verification: 1000 engine variants and isolated real-handler fixtures pass; midterm/penalty/archive regressions pass. Build and lint pass. Real period initialization is blocked by unavailable Neon network; escalation was rejected by environment policy. Browser launch is blocked by the sandbox. The additive setup script and exact follow-up checks are documented in docs/assessments/molecular.md. No publication or commit performed.

Follow-up: molecular-cut-v1 is now initialized in the real DB. The real entry API returns 200/session/code with solutions still sealed; only browser and full transactional lifecycle QA remain unverified.
