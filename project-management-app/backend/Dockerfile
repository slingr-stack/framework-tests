# syntax=docker/dockerfile:1
# Build context: this app's root directory (the folder containing backend/ and frontend/).
# Usage: docker build -f backend/Dockerfile --secret id=npm_token,env=NPM_TOKEN -t <image> .

# ── Stage 1: compile ──────────────────────────────────────────────────────────
# Install ALL dependencies (dev + prod) so tsc is available, then compile.
FROM node:20-alpine AS builder
WORKDIR /app

COPY backend/package*.json ./
RUN --mount=type=secret,id=npm_token \
    echo "@drumr:registry=https://us-central1-npm.pkg.dev/future-name-492914-n5/drumr-npm-virtual/" >> /root/.npmrc \
    && echo "//us-central1-npm.pkg.dev/future-name-492914-n5/drumr-npm-virtual/:_authToken=$(cat /run/secrets/npm_token)" >> /root/.npmrc \
    && npm install --no-package-lock \
    && rm /root/.npmrc

COPY --exclude=node_modules --exclude=.env --exclude=.env.example --exclude=package.json --exclude=package-lock.json backend/ ./
RUN npm run build

# ── Stage 2: production dependencies ──────────────────────────────────────────
# Fresh install with --omit=dev avoids the npm-prune "changed packages" issue
# where npm re-reifies file: dependencies and strips their dist/ content.
FROM node:20-alpine AS prod-deps
WORKDIR /app

COPY backend/package*.json ./
RUN --mount=type=secret,id=npm_token \
    echo "@drumr:registry=https://us-central1-npm.pkg.dev/future-name-492914-n5/drumr-npm-virtual/" >> /root/.npmrc \
    && echo "//us-central1-npm.pkg.dev/future-name-492914-n5/drumr-npm-virtual/:_authToken=$(cat /run/secrets/npm_token)" >> /root/.npmrc \
    && npm install --omit=dev --no-package-lock \
    && rm /root/.npmrc

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/dist/ dist/
COPY --from=prod-deps /app/node_modules/ node_modules/
COPY backend/package.json ./
COPY backend/config/ config/
# Copy pre-built frontend assets for simple mode.
# DrumrApp auto-detects dist/ui/ and serves it; set DRUMR_SKIP_UI=true on
# Cloud Run to disable serving when using prod frontend hosting.
COPY frontend/dist/ dist/ui/

ENV NODE_ENV=production
# Cloud Run injects $PORT; 8080 is the default there.
EXPOSE 8080

CMD ["node", "dist/src/App.js"]
