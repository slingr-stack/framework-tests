# Skill Conformance — Agent System

Automated generation and maintenance of `.skill-conformance.spec.ts` files for every Drumr framework skill.

## Agent roles

There are two types of agents in this folder:

| Agent | Role |
|---|---|
| `skill-conformance-generator` | **Base template.** Generates a new spec for any skill that doesn't have one yet. Contains the full SR-* scaffold workflow and the master skill coverage index. Use once per skill. |
| `<skill-name>-conformance` | **Per-skill agent.** Owns one skill forever. Knows exactly which spec, fixtures, and run command belong to that skill. Delegates all workflow logic to the base template. Use whenever that skill's spec needs updating. |

Files in this folder:
```
skill-conformance-generator.agent.md   ← base template + coverage index
README.md                              ← this file
backend-actions-conformance.agent.md   ← per-skill: backend-actions
backend-datamodels-conformance.agent.md← per-skill: backend-datamodels
backend-services-conformance.agent.md  ← per-skill: backend-services
backend-workflows-conformance.agent.md ← per-skill: backend-workflows
```

## Complete walkthrough — adding a new skill from scratch

This is the exact sequence you follow in a fresh Copilot Chat conversation.
No prior context needed — everything the agent needs is in the repo.

### What you type (2 messages total)

**Message 1 — Generate everything:**
```
@skill-conformance-generator generate spec for backend-datasources
```
The agent will do all of the following automatically:
- Read `core/skills/backend-datasources/SKILL.md` and extract the SR-* contracts
- Search `apps/project-management-app/backend/src/` for real fixture files
- Create `backend-datasources.skill-conformance.spec.ts` with all SR-* describe blocks
- Compute the SkillScore and append it to `qa/conformance/skill-scores.json`
- Create `backend-datasources-conformance.agent.md` in this folder
- Update the coverage index row in `skill-conformance-generator.agent.md`

**Message 2 — Run the spec to verify it passes (the only manual step):**
```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts \
  --testPathPatterns='backend-datasources.skill-conformance' --no-coverage --verbose
```
All tests should be green. If any fail, paste the output back to the agent — it will diagnose and fix.

That's the full cycle. The next time `backend-datasources/SKILL.md` changes, you type:
```
@backend-datasources-conformance update spec for backend-datasources
```
and the per-skill agent handles everything.

---



### A skill spec already exists → use the per-skill agent

```
@backend-actions-conformance update spec for backend-actions
@backend-datamodels-conformance update spec for backend-datamodels
@backend-services-conformance update spec for backend-services
```

The per-skill agent reads the base template's § 7 update workflow and runs it scoped to that one skill. Nothing else is touched.

### A skill has no spec yet → use the base generator, then create the per-skill agent

**Step 1 — Generate the spec:**
```
@skill-conformance-generator generate spec for backend-workflows
```

**Step 2 — Verify it passes:**
```bash
cd apps/project-management-app/backend
TS_NODE_PROJECT=tsconfig.test.json npx jest --config config/jest.config.ts \
  --testPathPatterns='backend-workflows.skill-conformance' --no-coverage --verbose
```

**Step 3 — Create the per-skill agent.**
Copy any existing `*-conformance.agent.md` and update the 5 rows in the Fixed scope table:
- Skill path
- Spec path
- Fixture paths (1–3 files from `src/`)
- Jest `--testPathPatterns` value

**Step 4 — Update the coverage index.**
In `skill-conformance-generator.agent.md`, find the skill's row in the index table and flip both cells to ✅.

After step 4, you never use `@skill-conformance-generator` for that skill again.

---

## Mental model

```
@skill-conformance-generator   ← used ONCE per skill (generate mode)
        │
        └─ creates the spec file
        └─ you create the per-skill agent (copy + 5 line edits)
        └─ you update the index table (2 cell flips)

@backend-actions-conformance    ← used FOREVER after (update mode)
@backend-datamodels-conformance
@backend-services-conformance
@backend-workflows-conformance  ← (example of what you create next)
```

The base template never grows. Per-skill agents stay tiny — a scope declaration and a pointer. Workflow logic lives in exactly one place.

---

## Output location

All generated specs go in:
```
apps/project-management-app/backend/tests/unit/skill-conformance/<skill-name>.skill-conformance.spec.ts
```

App-scoped by design. See `qa/docs/process-manual.md § 6` for the rationale.

## Reference

- **Current scores (all skills):** `qa/conformance/skill-scores.json`
- Base template + coverage index: `skill-conformance-generator.agent.md`
- Process manual: `qa/docs/process-manual.md`
- PoC example: `apps/project-management-app/backend/tests/unit/skill-conformance/backend-datamodels.skill-conformance.spec.ts`
- Conformance backlog: `qa/docs/qa-action-points.md § Full skill conformance coverage target`
- SkillScore formula: `qa/docs/qa-action-points.md § How SR-* tests feed the SkillScore`
