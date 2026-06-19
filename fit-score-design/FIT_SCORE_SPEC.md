# Slingr-Owned Fit Score (v2) — Spec

## Why
Today `slingrFitScore` is **not computed by the platform** — it's imported verbatim from
the third-party provider **Clarecast** (`lib/importer.ts` → `parseFloatSafe(row.slingr_fit_score)`).
Consequences in production:

- Only **124 / 8,972** contacts carry a score. Aurium (LinkedIn) and PE accounts get **null**.
- Scores cluster in **~60–90**; there are **zero** accounts below ~60, so no spread/ranking,
  no negative signal, and the metric is not refinable by us.
- It's a black box — we can't see or change Clarecast's weights.

## Goal
A **transparent, tunable, Slingr-owned** score (0–100) computed from data we already store,
covering **every** account. Keep Clarecast's number untouched as a second opinion.

## Design principles
- **Additive & explainable.** Each factor contributes points; we store the per-factor
  breakdown so any score can be explained ("why is this a 72?").
- **Config-driven weights.** All weights/thresholds live in one `WEIGHTS` object so
  "refining the metric" = edit config + recompute. No logic changes needed to retune.
- **Source-aware.** Clarecast firmographics are authoritative; enrichment (Vibe/Explorium)
  gap-fills Aurium/PE accounts so they finally get scored.
- **Non-destructive.** New fields; Clarecast's `slingrFitScore` is preserved (renamed
  `clarecastFitScore` going forward) for A/B comparison.

## Factors & weights (sum = 100)
| # | Factor | Max | Rationale |
|---|--------|-----|-----------|
| 1 | **Vertical / industry fit** (NAICS → ICP tiers) | 30 | Labs/life-sciences + manufacturing are the proven core; process-heavy verticals fit the build-vs-buy pitch. |
| 2 | **Headcount** (sweet spot 50–500) | 20 | High-fit Clarecast accounts cluster ~50–350 employees; big enough to have budget + custom needs, small enough to move. |
| 3 | **Revenue band** (sweet spot $10M–$250M) | 15 | Midmarket; matches observed high-fit revenue groups (06/07/08). |
| 4 | **Decision-maker access** (best contact title + email) | 15 | IT/Ops/Eng/C-suite with a reachable email = actionable. |
| 5 | **SaaS-fatigue / technographic signal** (vendor count + buying signals) | 15 | Core thesis: "stitched-together SaaS that almost fits." More disparate tools / explicit pain = better fit. |
| 6 | **Engagement / intent** (touchpoints, replies, page views) | 5 | Light recency/intent nudge; does not dominate firmographics. |

### Tiers
`A` ≥ 80 · `B` 60–79 · `C` 40–59 · `D` < 40

### Vertical tiers (factor 1)
- **Tier 1 (30):** Biotech/pharma R&D, pharmaceutical mfg, testing/medical labs, methods dev; manufacturing (process & discrete).
- **Tier 2 (22):** Healthcare delivery, insurance, engineering / professional services, logistics.
- **Tier 3 (12):** Other B2B services.
- **Tier 0 (0):** Out-of-ICP (consumer retail, etc.).

## Data flow / integration points (in `slingr-marketing-platform`)
1. **`prisma/schema.prisma`** — add to `Company`:
   - `fitScore Int?`, `fitTier String?`, `fitBreakdown Json?`
   - rename existing `slingrFitScore` comment → keep field, treat as `clarecastFitScore`.
2. **`lib/scoring.ts`** — pure `computeFit(account)` (provided). No I/O; trivially unit-testable.
3. **`lib/importer.ts`** — after upsert, call `computeFit` and persist score/tier/breakdown.
4. **`app/api/admin/ingest-enrichment/route.ts`** — recompute on enrichment ingest (so Aurium/PE
   accounts get scored once Vibe/Explorium fills firmographics).
5. **`app/api/search/route.ts` + `lib/mcp/tools.ts`** — add `fitScoreMin/Max` (v2) filter alongside
   the existing Clarecast `fitMin/Max`.
6. **UI** — show the breakdown chips on the company page; let it be sorted/filtered.

## How to refine going forward
- Tune numbers in `WEIGHTS` (e.g. raise headcount sweet-spot ceiling, add a vertical).
- Re-run a `npm run rescore` script (recompute over all accounts).
- Validate against outcomes: compare score distribution of **booked** accounts vs the rest;
  shift weights toward whatever separates them. (Today most bookings come from *unscored*
  Aurium accounts — v2 fixes that blind spot immediately.)

## Open question to calibrate with real outcomes
Bookings are concentrated in Grace's Aurium campaigns, and those accounts currently have **no**
fit score at all. Once v2 scores them, we should backtest: do booked accounts land in A/B?
If not, the weights move. That backtest is the first refinement loop.
