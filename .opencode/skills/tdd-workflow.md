# TDD Workflow Skill

Use when writing new features, fixing bugs, or refactoring code.

## When to Activate

- Writing new features or functionality
- Fixing bugs or issues
- Refactoring existing code
- Adding server functions
- Creating new components

## Core Principles

1. **Tests BEFORE Code** — Always write tests first.
2. **Coverage:** 80%+ minimum (unit + integration).
3. **Isolation:** Each test creates its own data. No shared state.

## TDD Steps

### Step 1: Write Failing Test (RED)
```typescript
test('returns error when 5-minute window expires', () => {
  const db = createTestDb()
  const record = createRegistro(db, { user_id: 'user-1' })
  // Backdate to outside window
  db.exec(`UPDATE registros_virtudes SET criado_em = '2020-01-01T00:00:00.000Z' WHERE id = ${record.id}`)
  
  const result = updateRegistro(db, record.id, 'user-1', { emocao_atual: 'alterado' })
  
  expect(result.ok).toBe(false)
  expect(result.erro).toContain('expirou')
})
```

Run: `bun run test` — test should FAIL.

### Step 2: Implement Minimal Code (GREEN)
Write the minimum code to make the test pass. No extra features.

### Step 3: Run Tests Again
Run: `bun run test` — test should PASS.

### Step 4: Refactor
Improve code quality while keeping tests green:
- Remove duplication
- Improve naming
- Optimize performance
- Enhance readability

### Step 5: Verify Coverage
Run: `bun run test --coverage` — verify 80%+ achieved.

## Test Structure (AAA)

```typescript
test('description of behavior', () => {
  // Arrange
  const db = createTestDb()
  const input = { /* ... */ }
  
  // Act
  const result = functionUnderTest(db, input)
  
  // Assert
  expect(result).toEqual(expected)
})
```

## Test Naming

Use descriptive names that explain the behavior:
- ✅ `'returns error when 5-minute window expires'`
- ✅ `'creates record with auto-set timestamps'`
- ✅ `'prevents cross-user record modification'`
- ❌ `'test update'`
- ❌ `'should work'`

## Mocking Strategy

### Supabase Auth Mock
```typescript
vi.mock('@/lib/supabase/server-fn', () => ({
  getUserFromToken: vi.fn().mockResolvedValue({
    id: 'test-user-id',
    email: 'test@example.com'
  })
}))
```

### Unauthenticated Mock
```typescript
vi.mock('@/lib/supabase/server-fn', () => ({
  getUserFromToken: vi.fn().mockResolvedValue(null)
}))
```

### Real SQLite (for DB tests)
```typescript
function createTestDb() {
  const db = new DatabaseSync(':memory:')
  initDb(db)
  return db
}
```

## Test Organization

```
tests/
├── unit/           ← Pure functions, business logic, utilities
├── component/      ← React component rendering and interaction
├── integration/    ← Full flows with real DB + mocked auth
├── fixtures/       ← Sample data factories
├── helpers/        ← Setup, teardown, mocks
└── config/         ← Vitest configuration
```

## Common Patterns

### 5-Minute Window Test
```typescript
test('allows edit within 5-minute window', () => {
  vi.useFakeTimers()
  const db = createTestDb()
  const record = createRegistro(db, { user_id: 'user-1' })
  
  // Advance 4 minutes (still within window)
  vi.advanceTimersByTime(4 * 60 * 1000)
  
  const result = updateRegistro(db, record.id, 'user-1', { emocao_atual: 'alterado' })
  expect(result.ok).toBe(true)
  
  vi.useRealTimers()
})
```

### User Isolation Test
```typescript
test('prevents user B from modifying user A record', () => {
  const db = createTestDb()
  const record = createRegistro(db, { user_id: 'user-a' })
  
  const result = updateRegistro(db, record.id, 'user-b', { emocao_atual: 'hack' })
  expect(result.ok).toBe(false)
})
```

## Pre-Commit Checklist

- [ ] All tests pass (`bun run test`)
- [ ] Coverage >= 80%
- [ ] Lint clean (`bun run lint`)
- [ ] Typecheck clean (`bun run typecheck`)
- [ ] Build succeeds (`bun run build`)
