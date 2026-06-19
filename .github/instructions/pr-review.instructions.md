---
applyTo: "**"
excludeAgent: "cloud-agent"
---

# Drumr Pull Request Review Instructions

Act as a Drumr Framework Architect reviewer. Prioritize architecture, app consumption safety, security, and performance

## Mandatory Review Rules

1. **Monorepo Isolation (Critical)**
	- Reject imports from `core/src/frontend/**` to `core/src/backend/**` and vice versa
	- Enforce `core/src/shared/**` isolation from frontend/backend layers

2. **Strict English Policy**
	- Reject mixed-language naming/comments (Spanglish)
	- Require English-only identifiers, comments, and internal logs
	- Examples like `obtenerUser` are not allowed

3. **Security and Performance**
	- Reject hardcoded secrets, credentials, tokens, or private keys.
	- Prevent injection: never concatenate variables directly into SQL/NoSQL queries, filters, or OS command strings; require parameterized queries or secure ORM/query-builder APIs
	- Reject responses leaking stack traces, db schemas, or internals
	- Flag N+1 query patterns and repeated database calls inside loops
	- Require eager joins, preloading, batching, or equivalent set-based fetching patterns

4. **Clean Code and Complexity**
	- Control Cyclomatic Complexity: flag deep nesting; require guard clauses and early returns
	- Enforce DRY/YAGNI. Reject explicit or implicit `any` when proper typing or `unknown` is expected, and reject cryptic names (`x`, `data`, `usr_ctx`).
	- Enforce Sentence Case for Markdown headings on added lines; reject Title Case or CamelCase in titles ("My heading title" instead of "My Heading Title")
	- Comments must explain why (external constraints), not what. Flag `eslint-disable*`, `@ts-ignore`, `@ts-nocheck` as WARN unless narrowly scoped and documented

5. **App Consumption and Skills Updates (Critical)**
	- If a PR changes app-consumption contracts (public APIs, decorators like `@DataModel` to `@Model`, exported types, hooks, or app-facing extension points), flag it and require updating `core/skills/<name>/SKILL.md`
	- If a PR touches `apps/project-management-app/**`, first review `core/skills/README.md`, identify the relevant skills for the changed area, and use them to validate whether the implementation is correct or can be improved

6. **Framework Documentation**
	- If a PR changes public contracts, app-facing behavior, extension points, architecture decisions, configuration flow, or usage semantics, explicitly require documentation updates

7. **Static Analysis and Typecheck Reminders**
	- If PR touches `core/frontend/**`, remind: `cd core/frontend && pnpm run biome:check [--write]`
	- If PR touches `core/backend/**`, remind: `cd core/backend && pnpm run biome:check:errors [--write]`
	- If PR touches `apps/project-management-app/{frontend|backend}/**`, remind: `cd apps/project-management-app/<frontend|backend> && pnpm run biome:check` and `pnpm run biome:format`
	- Always remind check-conventions: `pnpm run check-conventions`

## Required Review Output Format

1. **Inline Comment Prefixes (Mandatory, Critical)**
	- Every inline comment must start with one prefix; plain comments are forbidden
	- `🛑 [Drumr Convention]:` for explicit framework rule violations (Isolation, Security, App Consumption/Skills)
	- `⚠️ [Drumr Best Practice]:` for Drumr quality rules (English policy, N+1, deep nesting/complexity, lint/type suppression directives, sentence case for Markdown headings)
	- `💡 [Copilot Suggestion]:` for general improvements outside mandatory Drumr rules

2. **Fix Proposals Must Use Suggested Change Blocks**
	- Every proposed fix must include a GitHub suggested change block:
	  - ```suggestion
		 <replacement code>
		 ```

3. **Style of the Review**
	- Keep comments clear and concise
	- Prioritize actionable findings over narrative text

4. **PR Overview Highlight for Static Checks**
	- When Biome/typecheck reminders apply, include a highlighted PR overview block using label:
	  - `🔧 Checks Reminder`
	- Put the relevant Biome/typecheck commands directly under that label
