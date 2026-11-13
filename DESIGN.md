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
