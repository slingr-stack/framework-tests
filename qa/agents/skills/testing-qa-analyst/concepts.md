# Concepts: QA Requirements Analysis

> How testable behaviors are extracted from natural-language requirements and how ambiguities are detected.

---

## Testable Behavior

A testable behavior is a single, independently verifiable unit of expected system behavior derived from one acceptance criterion.

Each behavior has:

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (`TB-<n>`) |
| `title` | Human-readable description of the behavior |
| `type` | Classification (see below) |
| `flowSteps` | Ordered steps an actor takes to trigger the behavior |
| `expectedOutcomes` | Observable results that confirm the behavior passes |

---

## Behavior Classification

Behaviors are classified in priority order. The first matching keyword wins.

| Type | Keywords | Example |
|------|----------|---------|
| `permission` | admin, role, unauthorized, authorized, restricted, access | "Only admins can delete projects" |
| `boundary` | limit, maximum, minimum, empty, zero, length, exceed | "Title must not exceed 255 characters" |
| `negative` | should not, cannot, invalid, error, fail, reject | "Invalid email should show validation error" |
| `positive` | (default) | "User can create a new task" |

---

## Behavior Extraction Process

For each acceptance criterion:

1. **Identify the verb** — determines the action step sequence (create, edit, delete, assign, search, etc.)
2. **Map to flow steps** — each verb maps to a standard sequence of UI steps
3. **Extract outcomes** — `should/must/shall` clauses become assertion statements
4. **Classify the type** — scan for classification keywords in priority order

### Verb-to-step mapping (examples)

| Verb | Steps |
|------|-------|
| create | Navigate → Click Create → Fill form → Submit |
| edit/update | Navigate → Find record → Click Edit → Modify → Save |
| delete/remove | Navigate → Find record → Click Delete → Confirm |
| search/filter | Navigate → Enter term → Observe results |
| assign | Open record → Click Assign → Select assignee → Confirm |

---

## Ambiguity Detection

Ambiguities are reported when analysis cannot proceed with confidence.

| Severity | Meaning | Action |
|----------|---------|--------|
| `blocker` | Analysis cannot continue without clarification | Suspend flow, interview the QA lead |
| `warning` | Behavior may be incomplete or contradictory | Flag in report, proceed with assumption |
| `info` | Minor gap or unverifiable assumption | Note in report |

### Common ambiguity triggers

- A non-CRUD verb (assign, archive, export) with no matching action in app metadata
- A field referenced in a criterion that does not exist on the target model
- A status transition requested on a model with no state/status field
- Vague quantifiers ("many", "some", "a lot") in boundary criteria
- Missing actor specification ("the system" vs "the admin user")

---

## Entity Extraction

When app metadata is not provided, entities are extracted from text using mid-sentence capitalized noun scanning. This is a heuristic — it produces false positives. Dual mode with app metadata is always more reliable.

Common false positives to filter: `I`, `The`, `A`, `An`, `This`, `That`, `These`, `Those`, `It`, `We`, `You`, `They`, `He`, `She`, and common English conjunctions.
