# Weavova

Weavova captures a business's real, consented customer proof and reshapes it into post-ready social
content — short vertical clips, carousels, and embeddable proof blocks — with no video editor.

## Stack

Locked stack (do not deviate without approval):

- **Framework:** Next.js 15 (App Router), React 19, TypeScript (strict) — deployed on Vercel
- **Styling:** Tailwind v4 + the Pressroom design tokens; fonts via `next/font/google`
- **Auth:** Auth.js / NextAuth v5 (Drizzle adapter)
- **Database:** Neon Postgres + Drizzle ORM
- **Object storage:** Cloudflare R2
- **Jobs:** Inngest · **Email:** Resend
- **Render worker (FFmpeg + Revideo):** later (tier T8); rendering is stubbed for the demo

See `CLAUDE.md` and `.specify/memory/constitution.md` for the full project contract.

## Commands

```bash
npm run dev        # local dev at http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (strict)
```

## Status

Tier T0 — foundations. Current slice: **T0.1 Walking Skeleton** (scaffold, CI, themed landing).
Specs live under `specs/`.
