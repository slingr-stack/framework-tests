// lib/scoring.ts
//
// Slingr-owned fit score (v2). Pure, transparent, config-driven.
// Replaces reliance on the imported Clarecast `slingrFitScore` (which only covers
// ~124 accounts and has no spread below ~60). This scores EVERY account from data
// we already store, and records a per-factor breakdown so any score is explainable.
//
// "Refining the metric" = edit WEIGHTS / the tier maps below, then re-run the rescore
// script. No control-flow changes required.

// ───────────────────────────── Tunable config ─────────────────────────────

export const WEIGHTS = {
  vertical: 30,
  headcount: 20,
  revenue: 15,
  decisionMaker: 15,
  saasFatigue: 15,
  engagement: 5,
} as const;

// NAICS description → vertical tier. Matched case-insensitively as substrings, in order.
// Tier value is the fraction of WEIGHTS.vertical awarded.
const VERTICAL_TIERS: { tier: number; needles: string[] }[] = [
  {
    tier: 1.0, // core ICP
    needles: [
      "biotechnolog", "pharmaceutical", "laborator", "medical laborat",
      "testing laborat", "research and development", "methods dev",
      "manufactur", "factory", "industrial",
    ],
  },
  {
    tier: 0.73, // strong adjacent (22/30)
    needles: [
      "health", "hospital", "clinic", "insurance", "broker",
      "engineering services", "professional", "consulting", "logistics", "transportation",
    ],
  },
  {
    tier: 0.4, // other B2B services (12/30)
    needles: ["services", "offices of", "wholesale", "distribut"],
  },
];

// Headcount → fraction of WEIGHTS.headcount. Sweet spot 50–500.
function headcountFraction(hc: number | null | undefined): number {
  if (hc == null) return 0.3; // unknown: neutral-low, not zero
  if (hc >= 50 && hc <= 500) return 1.0;
  if ((hc >= 25 && hc < 50) || (hc > 500 && hc <= 1000)) return 0.6;
  if ((hc >= 10 && hc < 25) || (hc > 1000 && hc <= 2500)) return 0.3;
  return 0.1; // micro (<10) or enterprise (>2500)
}

// Revenue group label → fraction of WEIGHTS.revenue. Sweet spot $10M–$250M.
// Labels look like "06: $50M-$100M". We score by the bracket, robust to label drift.
function revenueFraction(group: string | null | undefined): number {
  if (!group) return 0.3;
  const g = group.toLowerCase();
  const inSweet = ["$10m", "$25m", "$50m", "$100m"]; // $10M–$250M-ish
  const adjacent = ["$250m", "$5m"];
  if (inSweet.some((s) => g.includes(s))) return 1.0;
  if (adjacent.some((s) => g.includes(s))) return 0.67;
  if (g.includes("$500m") || g.includes("$1b")) return 0.4;
  return 0.2; // <$5M or >$1B
}

// Job titles that indicate a reachable decision-maker for a custom-software deal.
const DM_TITLE_NEEDLES = [
  "cto", "chief technology", "cio", "chief information", "ceo", "chief executive",
  "coo", "chief operating", "vp of engineering", "vp of it", "head of it",
  "director of operations", "director of it", "vp operations", "it manager",
];

// ───────────────────────────── Input shape ─────────────────────────────
// Deliberately loose so it works straight off the Prisma `Company` include used in
// get_company (industry, headcount, revenueGroup, vendors, contacts, touchpoints…).

export interface ScorableContact {
  jobTitle?: string | null;
  email?: string | null;
  hasContent?: boolean | null;
}
export interface ScorableSignal {
  // any buying-signal row associated with the account
  kind?: string | null;
}
export interface ScorableTouchpoint {
  type?: string | null; // "aurium" | "reply" | "booked" | …
}
export interface ScorableAccount {
  industry?: string | null;
  headcount?: number | null;
  revenueGroup?: string | null;
  vendors?: string[] | null;
  contacts?: ScorableContact[] | null;
  signals?: ScorableSignal[] | null;
  touchpoints?: ScorableTouchpoint[] | null;
  repliedCount?: number | null;
  pageViews?: number | null;
}

export interface FitBreakdown {
  vertical: number;
  headcount: number;
  revenue: number;
  decisionMaker: number;
  saasFatigue: number;
  engagement: number;
}
export interface FitResult {
  score: number; // 0–100, rounded
  tier: "A" | "B" | "C" | "D";
  breakdown: FitBreakdown;
}

// ───────────────────────────── Factor scorers ─────────────────────────────

function verticalPoints(industry?: string | null): number {
  if (!industry) return WEIGHTS.vertical * 0.3;
  const s = industry.toLowerCase();
  for (const { tier, needles } of VERTICAL_TIERS) {
    if (needles.some((n) => s.includes(n))) return WEIGHTS.vertical * tier;
  }
  return 0; // out of ICP
}

function decisionMakerPoints(contacts?: ScorableContact[] | null): number {
  if (!contacts?.length) return 0;
  let best = 0;
  for (const c of contacts) {
    const title = (c.jobTitle ?? "").toLowerCase();
    const isDM = DM_TITLE_NEEDLES.some((n) => title.includes(n));
    const reachable = Boolean(c.email);
    let p = 0;
    if (isDM && reachable) p = WEIGHTS.decisionMaker; // 15
    else if (isDM) p = WEIGHTS.decisionMaker * 0.53; // 8
    else if (reachable) p = WEIGHTS.decisionMaker * 0.27; // 4
    best = Math.max(best, p);
  }
  return best;
}

function saasFatiguePoints(acct: ScorableAccount): number {
  const vendors = acct.vendors?.length ?? 0;
  const hasSignal = (acct.signals?.length ?? 0) > 0;
  if (hasSignal || vendors >= 3) return WEIGHTS.saasFatigue; // 15
  if (vendors >= 1) return WEIGHTS.saasFatigue * 0.53; // 8
  return WEIGHTS.saasFatigue * 0.27; // 4 baseline
}

function engagementPoints(acct: ScorableAccount): number {
  const replied = (acct.repliedCount ?? 0) > 0;
  const booked = acct.touchpoints?.some((t) => t.type === "booked") ?? false;
  const touched = (acct.touchpoints?.length ?? 0) > 0 || (acct.pageViews ?? 0) > 0;
  if (booked || replied) return WEIGHTS.engagement; // 5
  if (touched) return WEIGHTS.engagement * 0.6; // 3
  return 0;
}

// ───────────────────────────── Public API ─────────────────────────────

export function computeFit(acct: ScorableAccount): FitResult {
  const breakdown: FitBreakdown = {
    vertical: round1(verticalPoints(acct.industry)),
    headcount: round1(WEIGHTS.headcount * headcountFraction(acct.headcount)),
    revenue: round1(WEIGHTS.revenue * revenueFraction(acct.revenueGroup)),
    decisionMaker: round1(decisionMakerPoints(acct.contacts)),
    saasFatigue: round1(saasFatiguePoints(acct)),
    engagement: round1(engagementPoints(acct)),
  };
  const score = Math.round(
    breakdown.vertical +
      breakdown.headcount +
      breakdown.revenue +
      breakdown.decisionMaker +
      breakdown.saasFatigue +
      breakdown.engagement,
  );
  return { score, tier: tierFor(score), breakdown };
}

function tierFor(score: number): FitResult["tier"] {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
