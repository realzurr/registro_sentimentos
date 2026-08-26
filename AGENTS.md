# AGENTS.md

## Repo status
- Greenfield → implemented (Fases 0–6 concluídas). Projeto funcional com stack TanStack Start.
- Requirements doc is the source of truth for scope; keep domain terms in Portuguese.
- Architecture + execution plan: `analise/plano-arquitetura.md`.
- Execution log: `docs/realizacoes.md` (cronológico, por agente e data/hora).

## What to build / what exists (per `analise/requisitos.txt`)
- Daily-tracking system ("Registros das virtudes realizadas") structurally identical to the Registro de Microdoses app, but WITHOUT ml/microdose-consumption tracking.
- Each record captures: date + time, which virtue was worked, group vs individual, current emotion, current symptoms, free-text description of actions.
- Must reuse Virtologia's authentication (Supabase-based, same Supabase project). Supabase is auth-only: ALL application data stays local in SQLite (`virtudes.db`), mirroring the microdoses pattern.
- Purpose: participant day-to-day follow-up data for later analysis.

## Commands
- `bun run dev` → dev server on port 5003
- `bun run lint` → eslint + prettier
- `bun run typecheck` → tsc --noEmit
- `bun run build` → production build (nitro)
- `bun scripts/teste-db.ts` → unit tests for SQLite layer

## Local reference systems (OUTSIDE this repo)
- Registro de Microdoses: `/home/renato/projetos/microdoses` — single-file Flask app (`server_ok.py`), SQLite DB (`emocional.db`), session auth, Jinja templates. This defines the data/flow model to copy.
- Virtologia: `/home/renato/projetos/virtologia` — TanStack Start (React 19, Vite, Tailwind 4, shadcn/Radix) with Supabase auth (`@supabase/ssr`). This is where to copy auth from.
- These are separate projects; changes belong in `agenda`, not there.
