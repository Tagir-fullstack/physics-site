# Monitoring variants: behavior contract

Scope: laboratory variant lists and expected-result/archive links. This captures existing Clement behavior and the explicitly requested electrostatics alignment, not a change to permissions or submission policy.

| Capability | Canonical owner / source | Allowed behavior | Verification |
| --- | --- | --- | --- |
| List styling | assessment-monitor.css; ClementVariants.tsx | Narrow container, one panel, shared toolbar/table/actions | Browser desktop, mobile and themes |
| Search and sorting | Clement variants list + server-scoped electrostatics API | Local immediate filtering of loaded scoped profiles; clear returns focus; name/variant order | Browser multi-page fixture; filters combine |
| Group select | Native select, group values from scoped profiles | All groups or one existing group | Browser keyboard/change |
| Result links | ElectrostaticsExpected and ElectroResultsPreview | Open expected result for any assigned profile; archive link only for existing submission | Browser link targets |
| Destructive action | DeleteStudentButton + student-profile deleteStudent API | Admin only, explicit typed confirmation, pessimistic server mutation | Existing server authorization tests; browser cancel only |
| Recovery | student-profile issueRecovery API, existing Clement workflow | Admin-only, short-lived one-time link, pending disables duplicate calls, error and copy fallback | Browser mocked mutation; server access tests |
| Async scope | useApiClient; AbortController | Cancel stale list requests on account/route changes; never display another account's profiles or recovery token | Browser aborted/late request fixture |
| Review | Existing electrostatics detail/reviewVersion | Preserve history, status/comment editing and version conflict protection | Existing API tests |

Only list display and controls are aligned. New submissions remain disabled. Teacher routes retain their scoped list and do not expose admin recovery/deletion controls.

Molecular assessment: the shared assessment/session APIs own admission, deadlines, autosave, weighted grading and scheduled release. Public tasks must never contain computed expected answers or solutions. Submitted-but-sealed payloads contain aggregate grades only; admin review remains privileged. The molecular period has 4 maximum points; score storage uses integer hundredths. Generated full-task fingerprints are globally unique in the existing database index. Basic/PRO never changes exam admission or grants preview privileges.


Electrostatics instrument: the device owns the numerical field grid. Solve once per selected variant in a Web Worker; probe readings, measured-point connectivity, normal checks and PRO reference lines run locally without instrument API calls. Basic keeps its analogue meter. Preserve authenticated profile access, teacher ownership checks and existing drafts. The local grid is inspectable in DevTools; do not describe it as protected from extraction.
