# Agenda de Virtudes — Project Rules

## Architecture

- **Stack:** TanStack Start + React 19 + Vite 7 + Tailwind 4 + shadcn/ui (Radix) + TypeScript
- **Database:** SQLite via `node:sqlite` (`DatabaseSync`, synchronous). All data in `virtudes.db`.
- **Auth:** Supabase (auth ONLY). All app data stays local in SQLite.
- **Server functions:** `createServerFn({ method: "POST" })` with JWT token validation via `getUserFromToken()`.
- **Domain language:** All UI text, validation messages, and error messages in PT-BR.

## Code Style

- **Immutability:** Always create new objects, never mutate existing ones.
- **KISS:** Prefer the simplest solution that works. Avoid premature optimization.
- **DRY:** Extract repeated logic into shared functions. Avoid copy-paste drift.
- **YAGNI:** Do not build features or abstractions before they are needed.
- **File size:** 200-400 lines typical, 800 max. Many small files > few large files.
- **Functions:** <50 lines. Split large functions into focused pieces.
- **Nesting:** Early returns over deep nesting (>4 levels).
- **Magic numbers:** Use named constants (e.g., `JANELA_EDICAO_MS`).

## Naming Conventions

- Variables/functions: `camelCase` with descriptive names
- Booleans: `is`, `has`, `should`, `can` prefixes
- Interfaces/types/components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Custom hooks: `use` prefix
- Server functions: verb + noun (e.g., `salvarRegistro`, `listarTodosAdmin`)

## Security

- **No hardcoded secrets.** All secrets in env vars.
- **Input validation:** Zod schemas at every server function boundary.
- **SQL injection:** Parameterized queries only. No string concatenation.
- **Auth:** Every server function validates JWT via `getUserFromToken()`.
- **Data isolation:** All queries scoped to `user_id` from authenticated token.
- **Admin:** Email-based auto-promotion via `isAdminEmail()`, role stored in `papeis` table.
- **Security headers:** CSP, X-Frame-Options, HSTS set in `src/server.ts`.

## Testing (TDD Workflow)

- **Framework:** Vitest (compatible with Vite 7, native ESM + TypeScript).
- **Coverage:** 80%+ minimum (unit + integration).
- **Test structure:** Arrange-Act-Assert (AAA) pattern.
- **Test naming:** Descriptive names explaining behavior under test.
- **Isolation:** Each test creates its own data. No shared state between tests.
- **Mocking:** Mock Supabase auth (`getUserFromToken`) for server function tests. Use real temp SQLite for DB tests.
- **Fake timers:** `vi.useFakeTimers()` for 5-minute window testing.
- **TDD steps:** RED (failing test) → GREEN (minimal implementation) → REFACTOR (improve).

## Error Handling

- Server functions return `{ ok: boolean; erro?: string }` pattern.
- Client-side: toast notifications via `sonner`.
- Never silently swallow errors.
- Provide user-friendly PT-BR messages in UI-facing code.

## Performance

- **React Query:** Use for server state caching and invalidation.
- **Lazy loading:** Dynamic imports for heavy components.
- **Memoization:** `useMemo` for expensive computations, `useCallback` for stable callbacks.
- **Code splitting:** Route-based splitting via TanStack Router.

## Git Workflow

- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- One logical change per commit.
- Run `bun run lint` and `bun run typecheck` before committing.

## File Organization

- Routes: `src/routes/` (file-based TanStack Router)
- Components: `src/components/` (shared UI components)
- UI primitives: `src/components/ui/` (shadcn/ui)
- Business logic: `src/lib/` (shared utilities, types, constants)
- Server-only: `src/lib/*.server.ts` (never imported in client code)
- API layer: `src/lib/api/` (server functions)
