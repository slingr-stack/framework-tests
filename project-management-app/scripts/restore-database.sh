#!/bin/bash

# Project Management App - Database Restoration Script
# This script recreates the database, creates the schema, and loads data in the correct order
# Order: User → Project → Task (respects foreign key dependencies)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="project_management_app"
DB_USER="postgres"
CONTAINER_NAME="project-management-app-postgres-db-db-1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Project Management App - Database Restore${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}⚠  WARNING: This script drops and recreates the database.${NC}"
echo -e "${YELLOW}   If the application is running (drumr run), it will lose its${NC}"
echo -e "${YELLOW}   DB connection pool and crash. Restart the app after this script${NC}"
echo -e "${YELLOW}   finishes (run 'drumr run' again in the project directory).${NC}"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Step 1: Check if Docker container is running
echo -e "${YELLOW}[1/6] Checking Docker container...${NC}"
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Error: Container '${CONTAINER_NAME}' is not running${NC}"
    echo "Please start the container first"
    exit 1
fi
echo -e "${GREEN}✓ Container is running${NC}"
echo ""

# Step 2: Reset datasource (drops database, recreates it)
echo -e "${YELLOW}[2/6] Resetting datasource...${NC}"
npx drumr ds main.ds reset 

# Wait for PostgreSQL to be fully ready after restart
echo "Waiting for PostgreSQL to be ready..."
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec ${CONTAINER_NAME} pg_isready -U ${DB_USER} > /dev/null 2>&1; then
        echo "PostgreSQL is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 1
done
echo ""

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}Error: PostgreSQL did not become ready in time${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database reset${NC}"
echo ""

# Step 3: Compile TypeScript code
echo -e "${YELLOW}[3/6] Compiling TypeScript code...${NC}"
cd backend
npm run build > /dev/null 2>&1
cd ..
echo -e "${GREEN}✓ Code compiled${NC}"
echo ""

# Step 4: Create schema (run app with synchronize enabled)
echo -e "${YELLOW}[4/6] Creating database schema...${NC}"
echo "Running application with schema synchronization..."
cd backend

# Run the compiled version for faster startup
DB_SYNCHRONIZE=true node dist/src/App.js > /tmp/schema-creation.log 2>&1 &
SCHEMA_PID=$!

# Wait for schema creation (check for tables)
echo "Waiting for schema creation..."
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    sleep 1
    WAITED=$((WAITED + 1))
    TABLE_COUNT=$(docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    # Ensure TABLE_COUNT is numeric
    if [ -z "$TABLE_COUNT" ]; then
        TABLE_COUNT=0
    fi
    if [ "$TABLE_COUNT" -gt 0 ] 2>/dev/null; then
        echo "Schema created after ${WAITED} seconds"
        break
    fi
    echo -n "."
done
echo ""

# Kill the app process
kill $SCHEMA_PID 2>/dev/null || true
wait $SCHEMA_PID 2>/dev/null || true

cd ..

# Verify schema was created
if [ "$TABLE_COUNT" -gt 0 ] 2>/dev/null; then
    echo -e "${GREEN}✓ Schema created successfully with $TABLE_COUNT tables${NC}"
else
    echo -e "${RED}Error: Schema was not created after ${MAX_WAIT} seconds.${NC}"
    echo "Check /tmp/schema-creation.log for details"
    cat /tmp/schema-creation.log
    exit 1
fi
echo ""

# Step 5: Load data in correct order (one model at a time)
echo -e "${YELLOW}[5/6] Loading data in correct order...${NC}"
DATASET_DIR=""
DATASET_DIR_CANDIDATES=()
while IFS= read -r candidate; do
    DATASET_DIR_CANDIDATES+=("$candidate")
    if [ -z "$DATASET_DIR" ] && [ -d "$candidate" ] && [ -f "$candidate/User.jsonl" ]; then
        DATASET_DIR="$candidate"
    fi
done < <(find backend/src \( -path "*/datasets/default" -o -path "*/datasets/*/default" -o -path "*/dataSets/default" -o -path "*/dataSets/*/default" \) -type d 2>/dev/null)

if [ -z "$DATASET_DIR" ]; then
    echo -e "${RED}Error: Could not find default dataset directory${NC}"
    if [ ${#DATASET_DIR_CANDIDATES[@]} -gt 0 ]; then
        echo "Checked: ${DATASET_DIR_CANDIDATES[*]}"
    else
        echo "No datasets/default directories were found under backend/src"
    fi
    exit 1
fi
echo "Using dataset directory: $DATASET_DIR"

# Create temporary single-model datasets
echo "Creating temporary datasets for ordered loading..."

# drumr ds <datasource> load <dataset> resolves datasets under the datasource
# directory. Reuse the discovered datasource folder (e.g. backend/src/datasets/postgres-db).
TEMP_DATASET_GROUP_DIR="$(dirname "$DATASET_DIR")"
mkdir -p "$TEMP_DATASET_GROUP_DIR"

# Load User first
echo "  Loading Users..."
TEMP_USER_DIR="$TEMP_DATASET_GROUP_DIR/user-only"
TEMP_PROJECT_DIR="$TEMP_DATASET_GROUP_DIR/project-only"
TEMP_TASK_DIR="$TEMP_DATASET_GROUP_DIR/task-only"

mkdir -p "$TEMP_USER_DIR"
cp "$DATASET_DIR/User.jsonl" "$TEMP_USER_DIR/"
if npx drumr ds main.ds load user-only > /tmp/load-user.log 2>&1; then
    echo -e "    ${GREEN}✓ Users loaded${NC}"
else
    echo -e "    ${RED}✗ Failed to load users${NC}"
    echo "    Check /tmp/load-user.log for details"
    cat /tmp/load-user.log
    rm -rf "$TEMP_USER_DIR"
    exit 1
fi
rm -rf "$TEMP_USER_DIR"

# Load Project second
echo "  Loading Projects..."
mkdir -p "$TEMP_PROJECT_DIR"
cp "$DATASET_DIR/Project.jsonl" "$TEMP_PROJECT_DIR/"
if npx drumr ds main.ds load project-only > /tmp/load-project.log 2>&1; then
    echo -e "    ${GREEN}✓ Projects loaded${NC}"
else
    echo -e "    ${RED}✗ Failed to load projects${NC}"
    echo "    Check /tmp/load-project.log for details"
    cat /tmp/load-project.log
    rm -rf "$TEMP_PROJECT_DIR"
    exit 1
fi
rm -rf "$TEMP_PROJECT_DIR"

# Load Task third
echo "  Loading Tasks..."
mkdir -p "$TEMP_TASK_DIR"
cp "$DATASET_DIR/Task.jsonl" "$TEMP_TASK_DIR/"
if npx drumr ds main.ds load task-only > /tmp/load-task.log 2>&1; then
    echo -e "    ${GREEN}✓ Tasks loaded${NC}"
else
    echo -e "    ${RED}✗ Failed to load tasks${NC}"
    echo "    Check /tmp/load-task.log for details"
    cat /tmp/load-task.log
    rm -rf "$TEMP_TASK_DIR"
    exit 1
fi
rm -rf "$TEMP_TASK_DIR"

echo -e "${GREEN}✓ All data loaded successfully${NC}"
echo ""

# Ensure deterministic E2E user credentials exist.
#
# The dataset loader runs records through fromJSON() which respects the
# `available: false` flag on AppUser.password — under some Class-Transformer
# code paths the password ends up null/undefined on the persisted entity even
# though the seed file specifies a bcrypt hash. To make the E2E run
# deterministic on every OS we explicitly (re-)set each test account's
# password here so the test kit's expectations always hold.
#
# Test kit defaults (qa/drumr-test-kit.ts):
#   - DEFAULT_ADMIN   → sys@app.com / 12345678
#   - DEFAULT_MANAGER → brian.lee@example.com / 12345678
# alice.johnson@example.com is also referenced from summary-view and is used
# as a fallback admin via E2E_ADMIN_EMAIL.
echo -e "${YELLOW}[5.5/6] Ensuring E2E user credentials...${NC}"

ensure_password() {
    local email="$1"
    local password="$2"
    local log_file="/tmp/set-password-${email//[^a-zA-Z0-9]/_}.log"
    if npx drumr users set-password "$email" --new-password "$password" --datasource postgres-db > "$log_file" 2>&1; then
        echo -e "${GREEN}✓ Password set for ${email}${NC}"
    else
        echo -e "${RED}✗ Failed to set password for ${email}${NC}"
        cat "$log_file" || true
        exit 1
    fi
}

ensure_password "alice.johnson@example.com" "password123"
ensure_password "sys@app.com" "12345678"
ensure_password "brian.lee@example.com" "12345678"
echo ""

# Step 6: Verify data
echo -e "${YELLOW}[6/6] Verifying data...${NC}"
USER_COUNT=$(docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM \"user\";")
PROJECT_COUNT=$(docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM project;")
TASK_COUNT=$(docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM task;")

echo -e "  Users:    ${GREEN}${USER_COUNT}${NC}"
echo -e "  Projects: ${GREEN}${PROJECT_COUNT}${NC}"
echo -e "  Tasks:    ${GREEN}${TASK_COUNT}${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Database restoration completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "You can now start the application with: npm run dev"