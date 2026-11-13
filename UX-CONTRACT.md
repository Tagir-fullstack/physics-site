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
