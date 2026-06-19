# Tasky app - Scripts

This directory contains utility scripts for managing the project management application.

## benchmark-indexes.ts

A standalone script that demonstrates the real-world performance difference between
querying a column decorated with `@Index()` versus a plain, non-indexed column.

### What it does

1. Connects directly to the PostgreSQL instance used by the app (no framework boot).
2. Creates two isolated scratch tables:
   - `bm_users_indexed` — `email` column has a **B-tree index** (`@Index({ unique: true })` equivalent)
   - `bm_users_no_index` — identical layout, but **no index** on `email`
3. Bulk-inserts **150 000 rows** into both tables.
4. Prints `EXPLAIN (ANALYZE, BUFFERS)` output for each table so you can see
   *Index Scan* vs *Seq Scan* in the query planner output.
5. Runs **100 timed queries** against each table and compares wall-clock totals.
6. Prints a colour-coded summary including the speedup ratio.
7. Drops the scratch tables before exiting (pass `--keep` to skip cleanup).

### Usage

```bash
# From the project-management-app directory:
npx tsx scripts/benchmark-indexes.ts

# Keep scratch tables for manual inspection:
npx tsx scripts/benchmark-indexes.ts --keep

# Override row count / iteration count:
ROWS=200000 ITERATIONS=200 npx tsx scripts/benchmark-indexes.ts
```

### Prerequisites

- Docker container must be running (`docker compose up -d`)
- Database must already exist (run `restore-database.ts` first if needed)
- `tsx` is available via `npx` (included in `devDependencies`)

### Example output (abridged)

```
╔══════════════════════════════════════════════════════════╗
║          @Index Decorator — Performance Benchmark        ║
╚══════════════════════════════════════════════════════════╝

── Query plans (EXPLAIN ANALYZE) ───────────────────────────
  ► Table WITH index  (bm_users_indexed)
     Index Scan using bm_idx_users_indexed_email on bm_users_indexed  (cost=…)

  ► Table WITHOUT index  (bm_users_no_index)
     Seq Scan on bm_users_no_index  (cost=…)

── Results ─────────────────────────────────────────────────
  ┌────────────────────────────┬──────────────┬──────────────┐
  │ Metric                     │  With @Index │  No index    │
  ├────────────────────────────┼──────────────┼──────────────┤
  │ Total time (100 queries)   │      12.4 ms │     138.7 ms │
  │ Avg time per query         │       0.1 ms │       1.4 ms │
  └────────────────────────────┴──────────────┴──────────────┘

  🚀  Indexed queries are 11.2× faster (91 % time saved).
```

---

## restore-database.sh

A comprehensive script to restore the database with proper data loading order.

### What it does

1. **Checks Docker container** - Verifies the PostgreSQL container is running
2. **Resets datasource** - Drops and recreates the database
3. **Compiles code** - Ensures TypeScript is compiled
4. **Creates schema** - Runs the app with `DB_SYNCHRONIZE=true` to create tables
5. **Loads data** - Inserts data in the correct order: **User → Project → Task**
6. **Verifies data** - Confirms all records were loaded successfully

### Why this order matters

The data must be loaded in dependency order due to foreign key constraints:

- **User** has no dependencies (must be loaded first)
- **Project** depends on User (manager, teamMembers)
- **Task** depends on both Project and User (project, assignee, reporter)

### Usage

```bash
# From the project root directory
./scripts/restore-database.sh
```

Or:

```bash
# From anywhere
/path/to/project-management-app/scripts/restore-database.sh
```

### Prerequisites

- Docker must be running
- PostgreSQL container must be running (`project-management-app-mainDs-db-1`)
- Node.js and npm must be installed
- Project dependencies must be installed (`npm install`)

### Output

The script provides colored output showing progress through each step:

```
========================================
Project Management App - Database Restore
========================================

[1/6] Checking Docker container...
✓ Container is running

[2/6] Resetting datasource...
✓ Database reset

[3/6] Compiling TypeScript code...
✓ Code compiled

[4/6] Creating database schema...
✓ Schema created

[5/6] Loading data in correct order...
✓ All data loaded successfully

[6/6] Verifying data...
  Users:    7
  Projects: 4
  Tasks:    10

========================================
Database restoration completed!
========================================
```

### Troubleshooting

**Container not running:**

```bash
docker compose up -d
```

**Permission denied:**

```bash
chmod +x scripts/restore-database.sh
```

**Port 3000 already in use:** Stop any running instances of the app before running the script.

## restore-database.ts

TypeScript version of the restore script (work in progress).

### Usage

```bash
npx ts-node scripts/restore-database.ts
```

## Dataset Files

The script reads data from:

- `backend/src/dataSets/mainDs/default/User.jsonl` - 7 users (system, admin, managers, developers)
- `backend/src/dataSets/mainDs/default/Project.jsonl` - 4 projects
- `backend/src/dataSets/mainDs/default/Task.jsonl` - 10 tasks

### Sample Data

**Users:**

- admin@projectmanagement.com (system)
- admin@company.com (admin)
- manager1@company.com, manager2@company.com (managers)
- dev1@company.com, dev2@company.com, dev3@company.com (developers)

**Default password for all users:** `admin123`

**Projects:**

- Website Redesign (WEB-001)
- Mobile App Development (MOB-001)
- API Integration (API-001)
- Database Migration (DB-001)

**Tasks:**

- 10 tasks distributed across projects with various statuses
