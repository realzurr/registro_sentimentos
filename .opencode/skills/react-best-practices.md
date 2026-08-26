# React Best Practices Skill

Use when writing, reviewing, or refactoring React components.

## When to Apply

- Writing new React components
- Implementing data fetching
- Reviewing code for performance issues
- Refactoring existing components
- Optimizing bundle size or load times

## Rule Categories by Priority

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Eliminating Waterfalls | CRITICAL |
| 2 | Bundle Size Optimization | CRITICAL |
| 3 | Server-Side Performance | HIGH |
| 4 | Client-Side Data Fetching | MEDIUM-HIGH |
| 5 | Re-render Optimization | MEDIUM |
| 6 | Rendering Performance | MEDIUM |
| 7 | JavaScript Performance | LOW-MEDIUM |

## Critical Rules

### 1. Eliminating Waterfalls

- **Check cheap sync conditions before awaiting** remote values
- **Use `Promise.all()`** for independent operations
- **Use Suspense** to stream content

```typescript
// ❌ BAD: Sequential awaits
const user = await getUser()
const records = await getRecords(user.id)

// ✅ GOOD: Parallel independent operations
const [user, settings] = await Promise.all([getUser(), getSettings()])
```

### 2. Bundle Size Optimization

- **Import directly**, avoid barrel files
- **Use dynamic imports** for heavy components
- **Defer third-party scripts** (analytics, logging)

```typescript
// ❌ BAD: Barrel import
import { Button, Card, Input } from '@/components'

// ✅ GOOD: Direct import
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
```

### 3. Client-Side Data Fetching

- **Use TanStack React Query** for server state
- **Deduplicate requests** automatically
- **Cache responses** appropriately

```typescript
// ✅ GOOD: Using React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['meus-registros', user?.id],
  queryFn: () => meusRegistros({ token })
})
```

### 4. Re-render Optimization

- **Use primitive dependencies** in effects
- **Derive state during render**, not effects
- **Use functional setState** for stable callbacks
- **Don't define components** inside components

```typescript
// ❌ BAD: Object dependency causes re-render
useEffect(() => {
  fetchData(filters)
}, [filters]) // filters object changes every render

// ✅ GOOD: Primitive dependencies
useEffect(() => {
  fetchData(filters)
}, [filters.dateFrom, filters.dateTo])
```

### 5. Rendering Performance

- **Use `content-visibility`** for long lists
- **Extract static JSX** outside components
- **Use ternary, not `&&`** for conditionals

```typescript
// ❌ BAD: Falsy rendering issue
{items && items.map(item => <Item key={item.id} />)}

// ✅ GOOD: Explicit conditional
{items ? items.map(item => <Item key={item.id} />) : null}
```

## Component Patterns

### Composition Over Inheritance

```typescript
// ✅ GOOD: Component composition
<Card>
  <CardHeader>Title</CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Custom Hooks

```typescript
// ✅ GOOD: Custom hook for reusable logic
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  
  return debouncedValue
}
```

### Memoization

```typescript
// ✅ GOOD: Memoize expensive computations
const sortedRecords = useMemo(() => {
  return records.sort((a, b) => b.data_registro.localeCompare(a.data_registro))
}, [records])

// ✅ GOOD: Memoize callbacks passed to children
const handleEdit = useCallback((id: number) => {
  setEditingId(id)
}, [])
```

## Form Patterns

### Controlled Form with Zod

```typescript
// ✅ GOOD: Zod validation at boundary
const schema = z.object({
  virtude: z.string().min(1, 'Informe a virtude trabalhada.'),
  modalidade: z.enum(['grupo', 'individual']),
})

function handleSubmit(data: unknown) {
  const result = schema.safeParse(data)
  if (!result.success) {
    // Handle validation errors
    return
  }
  // Proceed with validated data
}
```

## Error Handling

### Error Boundary

```typescript
// ✅ GOOD: Error boundary for critical sections
<ErrorBoundary fallback={<ErrorFallback />}>
  <CriticalComponent />
</ErrorBoundary>
```

### Graceful Degradation

```typescript
// ✅ GOOD: Handle loading, error, and empty states
if (isLoading) return <Skeleton />
if (error) return <ErrorMessage error={error} />
if (!data?.length) return <EmptyState />
return <DataList data={data} />
```

## Accessibility

### Keyboard Navigation

```typescript
// ✅ GOOD: Keyboard support
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  Click me
</button>
```

### ARIA Labels

```typescript
// ✅ GOOD: Descriptive ARIA labels
<nav aria-label="Menu principal">
  <Link to="/">Registro do dia</Link>
</nav>

<button aria-label="Toggle password visibility">
  <Eye />
</button>
```

## Performance Checklist

- [ ] No barrel imports
- [ ] Dynamic imports for heavy components
- [ ] Primitive dependencies in effects
- [ ] Memoize expensive computations
- [ ] Memoize callbacks passed to children
- [ ] No inline component definitions
- [ ] Use ternary, not `&&` for conditionals
- [ ] Lazy load non-critical components
