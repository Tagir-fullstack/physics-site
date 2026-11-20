# Physez: established interface

This records existing choices and the explicit reference supplied on 2026-11-13; it does not introduce a redesign.

- Audience: students and teachers of physics, Russian interface, responsive desktop/mobile, light and dark themes.
- Display typography: CCUltimatum; body: Radiant. Preserve the existing fonts and blue accents rather than introducing a new palette.
- Canonical lab-monitoring reference: `src/pages/ClementVariants.tsx`, rendered screenshot supplied by the user. Shared runtime styles are `src/styles/assessment-monitor.css`: monitor-page--narrow, monitor-header, monitor-panel, monitor-toolbar, monitor-search, monitor-table-tools, monitor-table and ob-variant-actions.
- Variants lists have a single panel containing explanation, live search, native group and order selects, count of filtered/all profiles, and a four-column table. Actions stack vertically and link to the relevant expected result. Use the same shared styles in electrostatics.
- The electrostatics API continues to enforce teacher scope and page size. The variants UI fetches its scoped pages sequentially and filters the completed profile list locally, matching Clement's live filters. It never preloads field diagrams or full submissions for all students.
- Native selects intentionally use the operating system popup. Tables keep the shared horizontal overflow wrapper on small screens. Keep filters and recovery errors readable in both themes.
- Reuse DeleteStudentButton and its named/typed confirmation; do not implement another deletion dialog. Recovery uses the existing private, one-time server-issued link. Never show an old account's recovery link after account switching.

Clement–Desormes and electrostatics share `monitor-page--variants`: stacked filter labels, equal 36px controls aligned at the bottom, compact rows and inline outline action icons. Icons retain accessible names, hover titles, keyboard focus and 44px targets on coarse pointers. `MonitorActionIcon` owns these symbols; `DeleteStudentButton` retains its existing confirmation through the optional icon-only variant.

Molecular physics assessment reuses `MechanicsAssessment`, `AssessmentSessionGate`, `AssessmentSessionManager` and their existing CSS, exactly like the midterm. No parallel assessment UI or altered brand. Eight numeric tasks use field units and visible fractional points; solutions appear in the existing submitted review after server-authorized release. New sessions and test templates default to 50 minutes; persisted deadlines remain authoritative.

Control assessments use the shared amber tokens in `src/styles/assessment-theme.css`: yellow solid controls with dark text, amber accents in dark mode and dark gold text in light mode. Apply this to exam entry, waiting room, runner, results and test monitoring. Laboratory accents remain blue; the mixed admin catalog scopes amber only to assessment cards. Red/green semantic statuses remain unchanged.

Exam code entry follows the existing account sign-in composition: a concise subject/release summary at left and a compact form card at right. Names share a row on desktop; stack the layout on narrow screens. Waiting/admission and active-test behavior remain in the shared gate and runner.


Electrostatics preserves the existing lab layout and analogue Basic meter. Calculate each selected field in a local Web Worker, then update probe readings immediately without measurement API requests. PRO retains local measurement processing. Student reference controls are absent; teacher references use the existing authorized monitor. The resident worker retains the numerical grid and sends scalar/measurement results only. Show initial calculation errors without blocking unrelated pages.
