# AGENTS.md

## Scope and status

- TanStack Start app (React 19, Vite 7, Tailwind 4, shadcn/Radix) for daily virtue tracking (`Registros das virtudes realizadas`).
- Requirements source of truth: `analise/requisitos.txt`; architecture plan: `analise/plano-arquitetura.md`; execution log: `docs/realizacoes.md`.
- Keep all domain terms in Portuguese.

## Architecture

- **Auth only via Supabase** (same project as Virtologia). No application data in Supabase.
- **All app data stays local in SQLite** (`virtudes.db`), created automatically on first access. Mirrors the microdoses pattern.
- **Records capture**: date + time, virtue, group vs individual, emotion, symptoms, free-text actions.
- **5-minute edit/delete window**: enforced in `src/lib/db.server.ts`.
- **Admin role**: local SQLite `papeis` table; first user whose email matches `VITE_INITIAL_ADMIN_EMAIL` gets admin automatically.

## Environment variables

Copy `.env.example` to `.env`. Required:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_INITIAL_ADMIN_EMAIL`
- `OPENAI_API_KEY` (server-side, used by the dashboard "Análise Inteligente")

All `VITE_*` vars are exposed to the browser bundle. Supabase here is auth-only, so no secrets are sent to Supabase.

## Commands

| Command                   | What it actually does                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `bun run dev`             | Dev server on `http://localhost:5003`                                                                    |
| `bun run build`           | Production build via Nitro, output to `.output/`                                                         |
| `bun run preview`         | Preview production build                                                                                 |
| `bun run lint`            | ESLint only (`eslint .`)                                                                                 |
| `bun run format`          | Prettier write (`prettier --write .`) — not included in `lint`                                           |
| `bun run typecheck`       | `tsc --noEmit`                                                                                           |
| `bun run test`            | Vitest: unit + integration (`tests/**/*.test.ts`), **excludes** `tests/**/*.test.tsx` and `tests/e2e/**` |
| `bun run test:watch`      | Vitest watch mode                                                                                        |
| `bun run test:coverage`   | Vitest with v8 coverage                                                                                  |
| `bun run test:e2e`        | Playwright E2E (`tests/e2e/`), expects dev server on port 5003                                           |
| `bun run test:e2e:ui`     | Playwright UI mode                                                                                       |
| `bun scripts/teste-db.ts` | Standalone SQLite smoke test; **deletes `virtudes.db`** in the working directory                         |

Verification order when it matters: `bun run lint` → `bun run typecheck` → `bun run test`.

## Toolchain gotchas

- `vite.config.ts` uses `@lovable.dev/vite-tanstack-config`, which already bundles `tanstackStart`, `viteReact`, `tailwindcss`, `tsConfigPaths`, Nitro, `VITE_*` env injection, and `@` alias. Do **not** add these plugins manually or the build will fail with duplicates.
- ESLint forbids importing the Next.js `server-only` package. Use the `*.server.ts` filename convention or `@tanstack/react-start/server-only` instead.
- Vitest globals are enabled; test files use `tests/**/*.test.ts`. React component tests (`.test.tsx`) are intentionally excluded from the default Vitest run.

## Deploy (Ubuntu 24.04 server)

- Build artifact: `.output/` via Nitro `node-server` preset.
- Server-side persistent data lives in `/var/lib/agenda/` (`virtudes.db`, `.env`, `current/` symlink to latest build).
- See `scripts/SETUP.md` for full server setup and `scripts/deploy.sh`, `scripts/update.sh`, `scripts/backup.sh` for operations.

## External references (outside this repo)

- **Registro de Microdoses**: `/home/renato/projetos/microdoses` — data/flow model to mirror (Flask + SQLite).
- **Virtologia**: `/home/renato/projetos/virtologia` — reference for Supabase auth (`@supabase/ssr`) and TanStack Start patterns.
- Do **not** modify those repos; changes belong in `agenda`.
