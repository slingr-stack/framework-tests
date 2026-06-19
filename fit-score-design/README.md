# Fit Score (v2) — design artifacts

> **Heads up:** these files are a **safety-net copy**. Their real home is the
> **`slingr-stack/slingr-marketing-platform`** repo. They were authored in a
> Claude Code session that was scoped to `framework-tests`, so they were committed
> here to avoid losing them. Move them into `slingr-marketing-platform` to implement.

## Context
Today the marketing platform does **not** compute a fit score — it imports
`slingr_fit_score` verbatim from the third-party provider **Clarecast**. Only ~124 of
~9,000 accounts get a score, with no spread below ~60 and no visibility into the weights.

This is a design for a **Slingr-owned, transparent, tunable** fit score (v2) that covers
every account and is refinable by editing config.

## Files
- `FIT_SCORE_SPEC.md` — factors, weights, tiers, integration points in the platform, and the refinement loop.
- `scoring.ts` — drop-in `lib/scoring.ts`: pure `computeFit(account)` → `{ score, tier, breakdown }`.

## Next step
Start a Claude Code session scoped to `slingr-marketing-platform` to wire this in
(schema migration, importer + enrichment hooks, search filter, `rescore` script, tests).
