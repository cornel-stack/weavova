# Weavova Railway worker (T7.4 normalize host; T8 renderer = a future 2nd service).
#
# IMPORTANT — BUILD CONTEXT = REPO ROOT (not worker/). In Railway: Build → Dockerfile Path
# = worker/Dockerfile, Root Directory = repo root. The repo-root context is REQUIRED so the
# worker can import the single shared schema at ../src/db/schema.ts (the D9 no-drift decision).
#
# ffmpeg is installed into THIS image (a worker/host dependency) — it is NEVER an app
# dependency; the Vercel app stays at 11 runtime deps.

FROM node:22-slim AS base
# ffmpeg = the system binary the normalize function shells out to (child_process).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- deps: install the WORKER package's deps (host-side; separate from the app) ---
COPY worker/package.json worker/package-lock.json* ./worker/
RUN cd worker && npm install --no-audit --no-fund

# --- source: the worker + the shared schema it imports (repo-root context) ---
# Only what the worker compiles is copied: worker/ + src/db/schema.ts (the D9 shared file).
COPY worker/tsconfig.json ./worker/
COPY worker/src ./worker/src
COPY src/db/schema.ts ./src/db/schema.ts

# --- build: tsc emits dist/worker/src/*.js + dist/src/db/schema.js ---
RUN cd worker && npm run build

WORKDIR /app/worker
ENV NODE_ENV=production
# Railway injects PORT; the server defaults to 3000 otherwise.
EXPOSE 3000
CMD ["node", "dist/worker/src/index.js"]
