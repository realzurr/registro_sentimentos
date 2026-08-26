# Security Review Skill

Use when adding authentication, handling user input, creating server functions, or implementing admin features.

## When to Activate

- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new server functions
- Working with Supabase tokens
- Implementing admin features
- Storing or transmitting sensitive data

## Security Checklist

### 1. Secrets Management
- [ ] No hardcoded API keys, tokens, or passwords
- [ ] All secrets in environment variables
- [ ] `.env` in `.gitignore`
- [ ] No secrets in git history

### 2. Input Validation
- [ ] All user inputs validated with Zod schemas
- [ ] Server function inputs validated before processing
- [ ] Whitelist validation (not blacklist)
- [ ] Error messages don't leak sensitive info

### 3. SQL Injection Prevention
- [ ] All database queries use parameterized queries (`?` placeholders)
- [ ] No string concatenation in SQL
- [ ] `ensureColumn()` dead code not exposed publicly

### 4. Authentication & Authorization
- [ ] Every server function validates JWT via `getUserFromToken()`
- [ ] Authorization checks before sensitive operations
- [ ] User isolation enforced via `user_id` in all queries
- [ ] Admin role verified before admin operations
- [ ] Token passed in POST body (not logged)

### 5. Data Isolation
- [ ] All user queries scoped to authenticated `user_id`
- [ ] Admin queries require admin role check
- [ ] No cross-user data leakage possible
- [ ] 5-minute window enforced server-side (not just client)

### 6. Error Handling
- [ ] No stack traces exposed to users
- [ ] Generic error messages in UI
- [ ] Detailed errors only in server logs
- [ ] No sensitive data in error responses

### 7. Security Headers
- [ ] CSP configured in `src/server.ts`
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] HSTS enabled (when HTTPS)

### 8. Dependencies
- [ ] No known vulnerabilities (`npm audit`)
- [ ] Lock files committed
- [ ] Dependencies up to date

## Common Vulnerabilities to Check

### SQL Injection
```typescript
// ✅ SAFE: Parameterized query
const stmt = db.prepare('SELECT * FROM registros WHERE id = ? AND user_id = ?')
const row = stmt.get(id, userId)

// ❌ DANGEROUS: String concatenation
const query = `SELECT * FROM registros WHERE id = ${id}`
```

### Auth Bypass
```typescript
// ✅ SAFE: Server-side auth check
const user = await getUserFromToken(token)
if (!user) return { ok: false, erro: 'Não autenticado.' }

// ❌ DANGEROUS: Client-side only auth
if (!user) return <Redirect to="/login" />
```

### Data Leakage
```typescript
// ✅ SAFE: User-scoped query
const registros = db.prepare('SELECT * FROM registros WHERE user_id = ?').all(userId)

// ❌ DANGEROUS: Unscoped query
const registros = db.prepare('SELECT * FROM registros').all()
```

### Privilege Escalation
```typescript
// ✅ SAFE: Admin role verification
const role = db.prepare('SELECT role FROM papeis WHERE user_id = ?').get(userId)
if (role?.role !== 'admin') return { ok: false, erro: 'Sem permissão.' }

// ❌ DANGEROUS: Email-only check without DB verification
if (email === adminEmail) return true
```

## Security Testing

### Test Authentication
```typescript
test('rejects unauthenticated requests', async () => {
  const result = await salvarRegistro({ token: 'invalid-token', ... })
  expect(result.ok).toBe(false)
  expect(result.erro).toContain('autenticado')
})
```

### Test Authorization
```typescript
test('prevents non-admin from accessing admin functions', async () => {
  const result = await listarTodosAdmin({ token: userToken })
  expect(result.ok).toBe(false)
  expect(result.erro).toContain('permissão')
})
```

### Test Input Validation
```typescript
test('rejects invalid modalidade', () => {
  const result = registroSchema.safeParse({ modalidade: 'invalid' })
  expect(result.success).toBe(false)
})
```

### Test Data Isolation
```typescript
test('user A cannot see user B records', async () => {
  const db = createTestDb()
  createRegistro(db, { user_id: 'user-a', ... })
  
  const result = listRegistrosByUser(db, 'user-b')
  expect(result).toHaveLength(0)
})
```

## Pre-Deployment Checklist

- [ ] No hardcoded secrets
- [ ] All inputs validated
- [ ] All queries parameterized
- [ ] Auth checks on all server functions
- [ ] Admin checks on admin functions
- [ ] User isolation enforced
- [ ] Security headers configured
- [ ] Error messages generic
- [ ] No sensitive data in logs
- [ ] Dependencies updated
