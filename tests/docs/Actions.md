# Action Plan — Test Suite for Agenda de Virtudes

## 1. Executive summary
- **What the project is:** A daily virtue tracking web app for Virtologia participants. Users log which virtue they practiced, the modality (group/individual), their current emotion, symptoms, and a description. Admins can view all records and export CSV. All app data lives in local SQLite; Supabase is used solely for authentication.
- **Architecture identified:** TanStack Start (React 19, Vite 7, Nitro) + TypeScript + Tailwind 4 + shadcn/Radix + SQLite (node:sqlite `DatabaseSync`) + Supabase auth-only. 5 routes, 7 server functions, 2 SQLite tables, 32 virtue definitions.
- **Current state of testing:** One standalone test script (`scripts/teste-db.ts`) covers DB CRUD + 5-min window + user isolation. No unit tests for business logic, no component tests, no integration tests, no test framework installed.
- **Main risks:** (1) Server functions contain all business rules but are untested — a regression in validation or auth could go undetected; (2) The 5-minute edit window is enforced at two levels (client + server) with duplicated constants; (3) CSV export logic (escaping, BOM, semicolon delimiter) is untested; (4) Admin authorization (email-based auto-promotion + role check) is duplicated across 3 functions; (5) No test framework means no CI gate.
- **Recommended strategy:** Install Vitest (already compatible with the Vite 7 + TypeScript stack), isolate tests in `/tests`, prioritize unit tests for the DB and server function layers (where all business rules live), then add component tests for forms, and a few integration tests for the critical auth + CRUD flow.

## 2. Technologies identified
- **Language:** TypeScript 5.8 (strict mode)
- **Framework:** TanStack Start 1.167+ (SSR, file-based router, `createServerFn`)
- **UI:** React 19, Tailwind CSS 4, shadcn/ui (Radix primitives)
- **Database:** SQLite via Node.js `node:sqlite` (`DatabaseSync`, synchronous)
- **Auth:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Validation:** Zod 3.24
- **Build:** Vite 7, Nitro
- **Package manager:** Bun
- **Recommended test framework:** Vitest (native Vite integration, compatible with the existing build pipeline, supports `node:sqlite` without additional mocks)
- **Additional test libraries:** `@testing-library/react` + `@testing-library/jest-dom` (for component tests), `msw` or manual mocks (for server function isolation where needed)

## 3. Architecture identified

### Modules / Layers
```
src/
├── routes/           → 5 page routes (file-based TanStack Router)
│   ├── __root.tsx        → Root layout, providers, error/404 handling
│   ├── index.tsx         → Create record form (ProtectedRoute)
│   ├── login.tsx         → Login form (public)
│   ├── auth.callback.tsx → Supabase OAuth callback
│   ├── meus-registros.tsx→ User's records list with inline edit/delete
│   └── admin.tsx         → Admin panel: all records, filters, CSV export
├── components/       → UI components
│   ├── auth-provider.tsx     → Supabase session React context
│   ├── protected-route.tsx   → Auth guard wrapper
│   ├── admin-route.tsx       → Auth + admin role guard wrapper
│   ├── site-chrome.tsx       → Header/footer layout
│   ├── aurora-background.tsx → Decorative animation
│   └── ui/                   → shadcn components (Button, Card, Input, etc.)
├── lib/              → Core business logic
│   ├── db.server.ts          → SQLite schema + CRUD (all business rules)
│   ├── auth.ts               → AuthContext type definitions
│   ├── admin-email.ts        → Admin email check utility
│   ├── virtues-list.ts       → 32 virtue definitions + lookup
│   ├── utils.ts              → cn() utility
│   ├── supabase/
│   │   ├── client.ts         → Browser Supabase client
│   │   ├── server.ts         → Server Supabase client (unused)
│   │   └── server-fn.ts      → Token-based auth for server functions
│   └── api/
│       ├── registros.server.ts   → User CRUD server functions
│       ├── admin.server.ts       → Admin list + CSV export
│       └── admin-users.server.ts → Admin role check
└── server.ts         → Nitro entry: security headers
```

### Data flow
```
Browser (React)
  → AuthProvider (Supabase browser client, JWT in session)
  → Route components (TanStack Router)
    → createServerFn (POST, token in body)
      → getUserFromToken(token) [Supabase JWT validation]
      → SQLite CRUD (db.server.ts, node:sqlite)
  → TanStack React Query (caching, invalidation)
```

### External services
- **Supabase:** Auth only (signUp, signIn, getUser, session management). Shared project with Virtologia. No app data in Supabase.
- **SQLite:** `virtudes.db` at project root. Two tables, WAL mode, singleton connection.

## 4. Features identified

| ID | Feature | Module | Criticality | Dependencies | Tests needed |
|----|---------|--------|-------------|--------------|--------------|
| F1 | Create virtue record | `registros.server.ts`, `db.server.ts`, `index.tsx` | Critical | Auth, SQLite, Zod | Unit + Component + Integration |
| F2 | List my records | `registros.server.ts`, `db.server.ts`, `meus-registros.tsx` | High | Auth, SQLite | Unit + Component |
| F3 | Edit record (5-min window) | `registros.server.ts`, `db.server.ts`, `meus-registros.tsx` | Critical | Auth, SQLite, time logic | Unit + Component |
| F4 | Delete record (5-min window) | `registros.server.ts`, `db.server.ts`, `meus-registros.tsx` | Critical | Auth, SQLite, time logic | Unit + Component |
| F5 | Admin: list all records | `admin.server.ts`, `db.server.ts`, `admin.tsx` | High | Auth, admin role, SQLite | Unit + Component |
| F6 | Admin: CSV export | `admin.server.ts`, `admin.tsx` | Medium | Auth, admin role, SQLite | Unit |
| F7 | Admin: date range filter | `admin.server.ts`, `db.server.ts`, `admin.tsx` | Medium | SQLite | Unit |
| F8 | Auth: login | `auth-provider.tsx`, `login.tsx`, Supabase | High | Supabase | Integration (mocked) |
| F9 | Auth: admin auto-promotion | `admin-users.server.ts`, `admin-email.ts`, `db.server.ts` | High | Auth, SQLite | Unit |
| F10 | Virtue list + lookup | `virtues-list.ts` | Low | None | Unit |
| F11 | Date formatting (PT-BR) | `meus-registros.tsx` | Low | None | Unit |
| F12 | CSV escaping | `admin.server.ts` | Medium | None | Unit |
| F13 | Form validation (Zod) | `registros.server.ts`, `index.tsx`, `meus-registros.tsx` | High | Zod | Unit |
| F14 | Security headers | `server.ts` | Medium | Nitro | Integration |
| F15 | User data isolation | `db.server.ts`, all server fns | Critical | SQLite, Auth | Unit + Integration |

## 5. Critical flows

| ID | Flow | Risk | Impact | Priority |
|----|------|------|--------|----------|
| C1 | Create record: form → Zod → server fn → auth → SQLite INSERT | Data loss if validation fails silently | High | P0 |
| C2 | Edit record: form → Zod → server fn → auth → 5-min check → SQLite UPDATE | Window bypass = data integrity breach | Critical | P0 |
| C3 | Delete record: confirm → server fn → auth → 5-min check → SQLite DELETE | Window bypass = unintended data loss | Critical | P0 |
| C4 | Auth: login → Supabase JWT → session → server fn token validation | Auth bypass = full data exposure | Critical | P0 |
| C5 | Admin: admin email check → papeis INSERT OR IGNORE → role query → data access | Privilege escalation = data leak | High | P0 |
| C6 | Admin: CSV export → semicolon escaping → BOM → download | Incorrect CSV = broken analysis | Medium | P1 |
| C7 | List records: server fn → auth → SQLite SELECT WHERE user_id | User sees other user's data | Critical | P0 |
| C8 | Date filtering: dynamic WHERE clause construction | SQL injection via date params | High | P1 |

## 6. Test pyramid strategy

### Unit (majority — ~70% of suite)
**What to test:**
- `db.server.ts`: `createRegistro`, `getRegistroById`, `listRegistrosByUser`, `updateRegistro`, `deleteRegistro`, `listTodosRegistros`, `podeModificar` — all business logic at the data layer
- `admin-email.ts`: `isAdminEmail()` — positive, negative, case-insensitive
- `virtues-list.ts`: `nomeVirtude()` — existing slug, unknown slug
- `admin.server.ts`: `escapeCsv()` — various edge cases (semicolons, newlines, nulls, quotes)
- Zod schemas: valid input, missing required fields, boundary values, invalid enums
- Server function input validation: `salvarRegistro`, `atualizarRegistro`, `excluirRegistro` schemas
- Date formatting utilities
- 5-minute window calculation logic (independent of DB)

**Characteristics:** Fast, deterministic, no Supabase calls, no real DB (use in-memory or temp SQLite per test).

### Component (~20% of suite)
**What to test:**
- `FormularioRegistro` (index.tsx): renders all fields, shows validation errors, submits with correct data
- `MeusRegistrosConteudo` (meus-registros.tsx): renders record list, edit/delete buttons enabled/disabled based on 5-min window
- `FormularioEdicao` (meus-registros.tsx): pre-populates fields, submit sends correct payload
- `AdminPanel` (admin.tsx): renders table, filters, CSV download trigger
- `ProtectedRoute`: shows spinner while loading, redirects when not auth'd, renders children when auth'd
- `AdminRoute`: checks admin role, shows "Sem permissao" for non-admins
- `SiteHeader`: shows correct nav links based on auth state, mobile menu toggle

**Characteristics:** Mock server functions, render with QueryClient + AuthProvider wrappers, test user interactions.

### Integration (~10% of suite)
**What to test:**
- Full CRUD flow: auth → create → list → edit → delete (with real temp SQLite, mocked Supabase)
- Admin flow: auth → admin check → list all → CSV export (with real temp SQLite, mocked Supabase)
- User isolation: user A creates record, user B cannot see or modify it
- 5-min window end-to-end: create record, attempt edit after 5 min → denied

**Characteristics:** Real SQLite (temp file), mocked Supabase (returns fake users/tokens), tests the actual server function → DB path.

## 7. GAPs identified

| ID | GAP | Severity | Evidence | Impact | Recommendation |
|----|-----|----------|----------|--------|----------------|
| G1 | No test framework installed | High | `package.json` has no vitest/jest dependency; `scripts/teste-db.ts` is a standalone script, not a test runner | No CI gate, no structured test execution | Install Vitest + configure |
| G2 | `scripts/teste-db.ts` is not a proper test suite | Medium | Uses raw `assert` + `process.exit()`, not a test runner; no describe/it blocks; cleanup deletes real DB | Fragile, no parallel execution, no reporting | Migrate to Vitest or keep as smoke test |
| G3 | Server functions tightly coupled to Supabase | High | `getUserFromToken()` makes real HTTP call to Supabase; cannot test server functions in isolation | Integration tests require network/mocked Supabase | Create a thin auth abstraction or mock at module level |
| G4 | `db.server.ts` singleton pattern hard to reset | Medium | `getDb()` uses module-level `let dbInstance`; no `closeDb()` or `resetDb()` | Tests share state; difficult to get clean DB per test | Add `closeDb()` function or use `vi.resetModules()` |
| G5 | `date-fns` installed but unused | Low | Listed in `package.json` but never imported; all date handling is manual | Dead dependency, potential confusion | Remove from dependencies |
| G6 | `JANELA_EDICAO_MS` duplicated in 2 files | Medium | `db.server.ts:69` and `meus-registros.tsx:38` — if one changes, the other may not | Client/server mismatch risk | Extract to shared constant in `lib/constants.ts` |
| G7 | `signUp` function in AuthProvider is dead code | Low | `auth-provider.tsx:68-84` exposes signUp, but no route uses it (signup done via Virtologia) | Unused code path, potential confusion | Remove or document as intentional |
| G8 | `email_participante` field never populated | Low | `listTodosRegistros()` return type includes `email_participante?` but the SQL has no such column | Type lies about runtime shape | Remove from return type or implement the join |
| G9 | `ensureColumn()` dead code with SQL interpolation | Low | `db.server.ts:15-20` — defined but never called; uses string interpolation | Minor security advisory if ever enabled | Delete or add allowlist |
| G10 | No pagination for record lists | Medium | `listRegistrosByUser()` and `listTodosRegistros()` return all rows | Performance degrades with large datasets | Not a test issue, but note for future |

## 8. Testability risks

| Area | Assessment | Classification |
|------|------------|----------------|
| `db.server.ts` uses `node:sqlite` `DatabaseSync` (synchronous, file-based) | Easy to test with temp SQLite files; no async complexity | Doesn't block testing |
| `getUserFromToken()` makes real HTTP call to Supabase API | Cannot test server functions without mocking Supabase or using a test token | Makes testing harder — needs mock strategy |
| `createServerFn()` from TanStack Start is framework-specific | Component tests need the framework; unit tests can bypass by testing the underlying functions directly | Doesn't block testing (test DB functions + Zod schemas directly) |
| `AuthProvider` uses dynamic `import()` for Supabase client | Component tests need to mock the import or wrap in a test provider | Makes testing harder — needs test wrapper |
| Module-level singleton `dbInstance` in `db.server.ts` | Tests share the same connection; cleanup between tests requires `vi.resetModules()` or explicit close | Makes testing harder — needs teardown strategy |
| `site-chrome.tsx` depends on `useLocation()` from TanStack Router | Component tests need router context wrapper | Doesn't block testing (standard router mocking) |
| `meus-registros.tsx` has `setInterval` for 5-min countdown | Tests need fake timers (`vi.useFakeTimers()`) | Doesn't block testing (Vitest supports this) |
| All env vars use `VITE_` prefix (client-exposed) | Tests can use `process.env` or `vi.stubEnv()` | Doesn't block testing |
| No dependency injection for DB or auth | Must mock at module level or use real implementations with temp DB | Makes testing harder but manageable |

## 9. Proposed structure for the test folder

```
tests/
├── docs/
│   └── Actions.md              ← this file
├── unit/
│   ├── db.server.test.ts       ← SQLite CRUD + 5-min window + user isolation
│   ├── admin-email.test.ts     ← isAdminEmail() logic
│   ├── virtues-list.test.ts    ← nomeVirtude() lookup
│   ├── csv-export.test.ts      ← escapeCsv() + CSV generation
│   ├── zod-schemas.test.ts     ← validation rules for all forms
│   ├── date-utils.test.ts      ← date formatting + 5-min window calculation
│   └── constants.test.ts       ← shared constants validation
├── component/
│   ├── formulario-registro.test.tsx  ← create form rendering + validation
│   ├── meus-registros.test.tsx       ← record list + edit/delete buttons
│   ├── admin-panel.test.tsx          ← admin table + filters
│   ├── protected-route.test.tsx      ← auth guard behavior
│   ├── admin-route.test.tsx          ← admin guard behavior
│   └── site-header.test.tsx          ← nav links + auth state
├── integration/
│   ├── crud-flow.test.ts       ← create → list → edit → delete end-to-end
│   ├── admin-flow.test.ts      ← admin auth → list → CSV
│   └── user-isolation.test.ts  ← cross-user access denied
├── fixtures/
│   ├── registros.ts            ← sample record data
│   ├── users.ts                ← sample user IDs + tokens
│   └── virtues.ts              ← sample virtue data
├── helpers/
│   ├── setup.ts                ← test DB setup/teardown
│   ├── supabase-mock.ts        ← mock Supabase auth responses
│   └── server-fn-mock.ts       ← helpers for testing server functions
└── config/
    └── vitest.config.ts        ← Vitest configuration
```

## 10. Initial suite configuration

- **Framework:** Vitest 3.x (compatible with Vite 7, native ESM, TypeScript support)
- **Config:** `tests/config/vitest.config.ts` — project-level Vitest config, extends Vite config
- **Test database:** Temporary SQLite file per test suite (`tests/fixtures/test-virtudes.db`), cleaned up in `afterAll`
- **Fixtures:** Static sample data in `tests/fixtures/` — records, users, virtues
- **Mocks:** Supabase `getUserFromToken()` mocked at module level via `vi.mock()` to return fake users
- **Factories:** Helper functions to create test records with sensible defaults
- **Fake timers:** `vi.useFakeTimers()` for 5-minute window testing
- **Environment:** Node (for `node:sqlite` support), not jsdom (unit/integration tests); jsdom only for component tests

## 11. Prioritized backlog

### P0 — Foundation
1. Install Vitest + configure (`vitest.config.ts`, `package.json` scripts)
2. Create test folder structure (`tests/unit/`, `tests/component/`, `tests/integration/`, etc.)
3. Create test helpers (`tests/helpers/setup.ts`, `tests/helpers/supabase-mock.ts`)
4. Create fixtures (`tests/fixtures/registros.ts`, `tests/fixtures/users.ts`)
5. Add `closeDb()` function to `db.server.ts` (or `vi.resetModules()` strategy)
6. Write first smoke test to verify Vitest + SQLite integration works

### P1 — Critical flows (highest-risk)
7. Unit tests for `podeModificar()` — 5-min window logic (various timestamps, edge cases)
8. Unit tests for `createRegistro()` — valid input, missing fields, CHECK constraint violation
9. Unit tests for `updateRegistro()` — within window, outside window, wrong user, valid changes
10. Unit tests for `deleteRegistro()` — within window, outside window, wrong user
11. Unit tests for `listRegistrosByUser()` — empty, multiple records, ordering
12. Unit tests for `listTodosRegistros()` — no filter, date range, user filter, combined

### P2 — Business rules / unit
13. Unit tests for `isAdminEmail()` — match, no match, case insensitive, undefined
14. Unit tests for `nomeVirtude()` — valid slug, unknown slug
15. Unit tests for `escapeCsv()` — null, semicolons, newlines, quotes, long strings
16. Unit tests for Zod schemas — `registroSchema` valid/invalid for each field
17. Unit tests for date formatting — `formatarDataPtBr()`, `hojeLocal()`
18. Unit tests for CSV full generation — header, rows, BOM, line endings

### P3 — Components
19. Component test for `FormularioRegistro` — renders all fields, submit behavior
20. Component test for `MeusRegistrosConteudo` — renders records, edit/delete button states
21. Component test for `ProtectedRoute` — loading, unauth'd, auth'd states
22. Component test for `AdminRoute` — admin, non-admin, loading states
23. Component test for `SiteHeader` — desktop/mobile nav, auth-dependent links

### P4 — Integration
24. Integration test: full CRUD flow (auth mock → create → list → edit → delete)
25. Integration test: admin flow (auth mock → admin check → list all → CSV export)
26. Integration test: user isolation (user A creates, user B denied)
27. Integration test: 5-min window end-to-end (create → wait → denied)

### P5 — Robustness
28. Edge case: empty database (all list operations return empty)
29. Edge case: concurrent edits to same record
30. Edge case: extremely long text fields (max length boundaries)
31. Edge case: special characters in emotion/symptoms/description (unicode, emoji)
32. Edge case: date边界 — records at exactly midnight, timezone edge cases

## 12. Step-by-step for the next agent

| Order | ID | Priority | Action | Type | Files | Acceptance criteria |
|-------|----|----------|--------|------|-------|---------------------|
| 1 | S1 | P0 | Install Vitest and @testing-library/react + @testing-library/jest-dom as dev dependencies | Setup | `package.json` | `bun add -D vitest @testing-library/react @testing-library/jest-dom` succeeds; `bunx vitest --version` prints version |
| 2 | S2 | P0 | Create Vitest config file at `tests/config/vitest.config.ts` with environment: "node" for unit/integration, "jsdom" for component tests, path aliases matching tsconfig | Config | `tests/config/vitest.config.ts` | `bunx vitest run --config tests/config/vitest.config.ts` starts without errors |
| 3 | S3 | P0 | Add `"test"` and `"test:ui"` scripts to `package.json` pointing to Vitest | Config | `package.json` | `bun run test` executes (even with 0 tests) |
| 4 | S4 | P0 | Create test folder structure: `tests/unit/`, `tests/component/`, `tests/integration/`, `tests/fixtures/`, `tests/helpers/`, `tests/config/`, `tests/docs/` | Setup | Directory tree | All directories exist |
| 5 | S5 | P0 | Create `tests/helpers/setup.ts` with functions: `createTestDb()` (creates temp SQLite, runs initDb, returns connection + path), `closeTestDb(conn, path)` (closes + deletes file) | Helper | `tests/helpers/setup.ts` | Import and call `createTestDb()` in a test — returns a working `DatabaseSync` |
| 6 | S6 | P0 | Create `tests/helpers/supabase-mock.ts` with: `mockGetUserFromToken(user)` that returns a mock function returning `{ id, email }`, and `mockGetUserFromTokenUnauth()` returning null | Helper | `tests/helpers/supabase-mock.ts` | Import and call in a test — returns expected mock object |
| 7 | S7 | P0 | Create `tests/fixtures/registros.ts` with factory function `createSampleRegistro(overrides?)` returning a valid `NovoRegistro` with defaults | Fixture | `tests/fixtures/registros.ts` | Import and call — returns object matching `NovoRegistro` type |
| 8 | S8 | P0 | Create `tests/fixtures/users.ts` with `USER_A = { id: "test-user-a", email: "a@test.com" }` and `USER_B = { id: "test-user-b", email: "b@test.com" }` and `ADMIN_USER = { id: "test-admin", email: "rlpeixoto@gmail.com" }` | Fixture | `tests/fixtures/users.ts` | Constants exported and importable |
| 9 | S9 | P0 | Write smoke test `tests/unit/smoke.test.ts` — create temp DB, insert a record, query it back, verify fields match | Unit | `tests/unit/smoke.test.ts` | `bun run test tests/unit/smoke.test.ts` passes |
| 10 | S10 | P1 | Write unit tests for `podeModificar()` in `tests/unit/db-window.test.ts` — test: within window returns true, outside window returns false, `atualizado_em` takes priority over `criado_em`, exact boundary (5 min exactly) | Unit | `tests/unit/db-window.test.ts` | All assertions pass; use `vi.useFakeTimers()` to control `Date.now()` |
| 11 | S11 | P1 | Write unit tests for `createRegistro()` in `tests/unit/db-crud.test.ts` — test: valid input returns record with id + timestamps, missing required field throws, invalid modalidade violates CHECK, `criado_em` is auto-set | Unit | `tests/unit/db-crud.test.ts` | All assertions pass |
| 12 | S12 | P1 | Write unit tests for `updateRegistro()` in `tests/unit/db-crud.test.ts` — test: within window succeeds + sets `atualizado_em`, outside window returns error, wrong userId returns error, partial update only changes specified fields | Unit | `tests/unit/db-crud.test.ts` | All assertions pass |
| 13 | S13 | P1 | Write unit tests for `deleteRegistro()` in `tests/unit/db-crud.test.ts` — test: within window succeeds + record gone, outside window returns error, wrong userId returns error, record count decreases | Unit | `tests/unit/db-crud.test.ts` | All assertions pass |
| 14 | S14 | P1 | Write unit tests for `listRegistrosByUser()` in `tests/unit/db-crud.test.ts` — test: empty user returns [], multiple records ordered by date DESC, other user's records not included | Unit | `tests/unit/db-crud.test.ts` | All assertions pass |
| 15 | S15 | P1 | Write unit tests for `listTodosRegistros()` in `tests/unit/db-admin.test.ts` — test: no filter returns all, date range filter works, userId filter works, combined filters work, empty result returns [] | Unit | `tests/unit/db-admin.test.ts` | All assertions pass |
| 16 | S16 | P2 | Write unit tests for `isAdminEmail()` in `tests/unit/admin-email.test.ts` — test: exact match, case insensitive, no match, undefined email, custom env override | Unit | `tests/unit/admin-email.test.ts` | All assertions pass |
| 17 | S17 | P2 | Write unit tests for `nomeVirtude()` in `tests/unit/virtues-list.test.ts` — test: all 32 slugs return correct names, unknown slug returns the slug itself | Unit | `tests/unit/virtues-list.test.ts` | All assertions pass |
| 18 | S18 | P2 | Write unit tests for `escapeCsv()` and CSV generation in `tests/unit/csv-export.test.ts` — test: null→empty, semicolon→quoted, newline→quoted, quote→doubled, normal→raw, full CSV output has BOM + header + correct line endings | Unit | `tests/unit/csv-export.test.ts` | All assertions pass |
| 19 | S19 | P2 | Write unit tests for Zod schemas in `tests/unit/zod-schemas.test.ts` — test `registroSchema`: valid input passes, missing `data_registro` fails, invalid date format fails, missing `virtude` fails, invalid `modalidade` fails, `emocao_atual` > 500 chars fails, `descricao_acoes` > 5000 chars fails, `sintomas_atuais` optional (null/undefined passes) | Unit | `tests/unit/zod-schemas.test.ts` | All assertions pass |
| 20 | S20 | P2 | Write unit tests for date formatting in `tests/unit/date-utils.test.ts` — test `formatarDataPtBr()`: "2026-08-26"→"26/08/2026", `hojeLocal()`: returns today's YYYY-MM-DD | Unit | `tests/unit/date-utils.test.ts` | All assertions pass |
| 21 | S21 | P3 | Write component test for `FormularioRegistro` in `tests/component/formulario-registro.test.tsx` — test: renders virtue select, modalidade select, emotion input, symptoms textarea, description textarea, date input; submitting empty form shows validation errors; submitting valid form calls mock server function | Component | `tests/component/formulario-registro.test.tsx` | All assertions pass; render with QueryClient + AuthProvider wrapper |
| 22 | S22 | P3 | Write component test for `MeusRegistrosConteudo` in `tests/component/meus-registros.test.tsx` — test: renders record cards, edit/delete buttons disabled after 5 min (use fake timers), edit form pre-populates correctly | Component | `tests/component/meus-registros.test.tsx` | All assertions pass |
| 23 | S23 | P3 | Write component test for `ProtectedRoute` in `tests/component/protected-route.test.tsx` — test: shows spinner while loading, redirects to /login when not auth'd, renders children when auth'd | Component | `tests/component/protected-route.test.tsx` | All assertions pass |
| 24 | S24 | P3 | Write component test for `AdminRoute` in `tests/component/admin-route.test.tsx` — test: shows spinner while loading, shows "Sem permissao" for non-admin, renders children for admin | Component | `tests/component/admin-route.test.tsx` | All assertions pass |
| 25 | S25 | P3 | Write component test for `SiteHeader` in `tests/component/site-header.test.tsx` — test: shows login button when not auth'd, shows nav links + logout when auth'd, mobile menu toggles | Component | `tests/component/site-header.test.tsx` | All assertions pass |
| 26 | S26 | P4 | Write integration test for full CRUD flow in `tests/integration/crud-flow.test.ts` — mock Supabase, create record via server fn, list records, edit within window, verify `atualizado_em` set, delete within window, verify empty list after delete | Integration | `tests/integration/crud-flow.test.ts` | All assertions pass; uses real temp SQLite + mocked auth |
| 27 | S27 | P4 | Write integration test for admin flow in `tests/integration/admin-flow.test.ts` — mock admin user, create records for multiple users, call `listarTodosAdmin`, verify all returned; call `exportarCsvAdmin`, verify CSV has correct format (BOM, header, semicolons) | Integration | `tests/integration/admin-flow.test.ts` | All assertions pass |
| 28 | S28 | P4 | Write integration test for user isolation in `tests/integration/user-isolation.test.ts` — user A creates record, user B calls `getRegistroById` for A's record → null, user B calls `updateRegistro` on A's record → error, user B calls `deleteRegistro` on A's record → error | Integration | `tests/integration/user-isolation.test.ts` | All assertions pass |
| 29 | S29 | P4 | Write integration test for 5-min window end-to-end in `tests/integration/crud-flow.test.ts` — create record, advance fake timers by 5 min + 1 sec, attempt edit → error, attempt delete → error | Integration | `tests/integration/crud-flow.test.ts` | All assertions pass |
| 30 | S30 | P5 | Write edge case tests in `tests/unit/edge-cases.test.ts` — empty database queries return [], max-length text fields (500/2000/5000 chars), unicode/emoji in text fields, record at midnight boundary | Unit | `tests/unit/edge-cases.test.ts` | All assertions pass |
| 31 | S31 | P5 | Write robustness tests in `tests/integration/robustness.test.ts` — concurrent updates to same record (second should fail window check), extremely large result sets (1000+ records performance check) | Integration | `tests/integration/robustness.test.ts` | All assertions pass |
| 32 | S32 | P0 | Run full test suite: `bun run test` — all tests pass; add coverage report config | Verification | `package.json`, `tests/config/vitest.config.ts` | `bun run test` shows all green; `bun run test --coverage` generates report |

## Files analyzed
- `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `components.json`
- `src/server.ts`, `src/router.tsx`
- `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/login.tsx`, `src/routes/auth.callback.tsx`, `src/routes/meus-registros.tsx`, `src/routes/admin.tsx`
- `src/lib/db.server.ts`, `src/lib/auth.ts`, `src/lib/admin-email.ts`, `src/lib/virtues-list.ts`, `src/lib/utils.ts`
- `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/server-fn.ts`
- `src/lib/api/registros.server.ts`, `src/lib/api/admin.server.ts`, `src/lib/api/admin-users.server.ts`
- `src/components/auth-provider.tsx`, `src/components/protected-route.tsx`, `src/components/admin-route.tsx`, `src/components/site-chrome.tsx`
- `scripts/teste-db.ts`

## Key findings
1. All business rules live in `db.server.ts` (SQLite CRUD + 5-min window) and `api/*.server.ts` (auth + validation) — these are the highest-value test targets.
2. No test framework is installed; the existing `teste-db.ts` is a standalone script that will need migration or coexistence.
3. `getUserFromToken()` makes real HTTP calls to Supabase — integration tests need this mocked.
4. The `node:sqlite` `DatabaseSync` is synchronous, which simplifies testing (no async/await needed for DB operations).
5. The 5-minute window is the most complex business rule — it spans client (UI disabling), server (enforcement), and has a reset-on-edit behavior.

## Main risks
1. **Auth mocking complexity:** Server functions depend on Supabase for token validation. Without mocking, integration tests require real Supabase credentials.
2. **Singleton DB state:** The module-level `dbInstance` means tests can interfere with each other unless properly isolated.
3. **TanStack Start `createServerFn`:** These are framework-specific and may be hard to unit-test directly. Testing the underlying DB functions is more practical.

## Recommended first action
**S1:** Install Vitest and test dependencies (`bun add -D vitest @testing-library/react @testing-library/jest-dom`), then S2-S9 to establish the foundation (config, helpers, fixtures, smoke test).
