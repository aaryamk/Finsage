# FinSage

A browser-only financial decision workspace for young Indian professionals.

## Run & Operate

- `pnpm --filter @workspace/finsage run dev` — managed FinSage web workflow
- `pnpm --filter @workspace/finsage test` — pure financial-engine tests
- `pnpm --filter @workspace/finsage run typecheck` — app TypeScript check
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- FinSage requires no secrets, API keys or database. The shared API server is unused.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

The user requires strict adherence to the supplied FinSage PRD: frontend only; all four tabs; pure, tested financial math under `src/engine/`; plain CSS, React, Recharts and Lucide; no backend, auth, database or LLM calls. Do not expand scope without a new request.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
