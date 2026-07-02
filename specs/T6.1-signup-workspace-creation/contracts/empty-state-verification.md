# Contract — New-workspace empty-state verification (VERIFY, not build)

For a genuinely empty (never-seeded) workspace, every surface a new user first reaches MUST render an
honest empty state or honest defaults — no error, no broken layout, no seeded-looking or fabricated
data (FR-010, FR-011; P-XIII, P-XIV). All artifacts below were confirmed present at spec time; this
slice **verifies** them against an empty workspace and does **not** port new designs.

## Verification matrix

| # | Route | Component / branch (present) | Expected honest state | Pass criteria |
|---|---|---|---|---|
| E1 | `/app` (dashboard) | `dashboard-body.tsx`: `summary.totalProof === 0` → `DashboardEmpty` | Greeting (session name) + KPIs at 0 + persimmon "Request proof"; "No proof yet" panel pointing to Request proof | No error; KPIs read 0 (not blank/NaN); no seeded proof; one primary action only (P-IV) |
| E2 | `/app/proof` (inbox) | `inbox-data.tsx`: `proofs.length === 0` → `InboxEmpty` | Honest no-proof empty state | No error; empty state shown; no seeded rows |
| E3 | `/app/requests` | `requests-grid.tsx`: `templates.length === 0` | "No requests yet." | No error; honest empty; any "connect a source" copy is an honest coming/empty state, not a dead control |
| E4 | `/app/library` | `library-data.tsx` → `LibraryEmpty` | Honest empty (consent-filtered zero reads identically) | No error; empty state; no oracle implying withheld clips exist |
| E5 | `/app/showcase` | `showcase-data.tsx`: `items.length === 0` → `ShowcaseEmpty` | Honest empty | No error; empty state |
| E6 | `/app/consent` | `consent-empty.tsx` / ledger empty branch | Honest empty ledger | No error; no fabricated counts |
| E7 | `/app/brand` | `brand-kit-data.tsx`: `kit ?? { defaults }` | Fresh kit at Pressroom defaults (persimmon + default fonts, no logo) | No error; "No logo yet" honest; not a fabricated kit |

## How to verify (see quickstart.md for setup)

Sign in as a brand-new user (zero memberships) → bootstrap runs → visit E1–E7 in turn. Also confirm the
top-bar/workspace switcher shows the derived workspace name (`"{firstName}'s workspace"` / email-derived)
and not "Lumen".

## Flag-and-surface rule

If any surface errors, renders seeded-looking data, or shows a dead control for an empty workspace, that
is a **P-XIII flag** — stop and surface it as a defect to fix within this slice's honest-empty-state
scope. Do **not** invent a new layout or port onboarding screens 15/17 (those belong to the later
onboarding-wizard slice).
