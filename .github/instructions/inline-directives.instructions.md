---
applyTo: "**/*.{ts,tsx}"
description: "Inline Copilot Directive Comments for the Dean Machines RSC Project"
---
# Inline Copilot Directive Comments

When you (the Copilot Chat agent) see these directives in TypeScript or TSX files:

- `// copilot: FIX` - Fix whatever is broken in the next code block
- `// copilot: IMPLEMENT` - Complete the function/component implementation
- `// copilot: CREATE` - Generate new code based on the name/context
- `// copilot: REMOVE` - Delete unused imports, variables, functions
- `// copilot: OPTIMIZE` - Improve performance and clean up code
- `// copilot: TYPE` - Add proper TypeScript types
- `// copilot: TEST` - Generate tests for the next function/component
- `// copilot: Z` - Add Zod schema for type safety and validation
- `// copilot: DOC` - Add TSDoc comments and documentation
- `// copilot: HOOK` - Create or fix React hooks
- `// copilot: STYLE` - Add Tailwind/CSS styling
- `// copilot: ERROR` - Add proper error handling
- `// copilot: ASYNC` - Convert to async/await with proper error handling
- `// copilot: RENAME` - Suggest better variable/function names
- `// copilot: EXPLAIN` - Add explanatory comments for complex logic
- `// copilot: REFACTOR` - Restructure code for better readability
- `// copilot: VALIDATE` - Add input validation
- `// copilot: MOCK` - Generate mock data or test fixtures
- `// copilot: UTIL` - Create utility functions
- `// copilot: AUTH` - Add authentication/authorization
- `// copilot: LOG` - Add logging statements
- `// copilot: CACHE` - Add caching logic
- `// copilot: PERF` - Performance optimizations
- `// copilot: API` - Create API endpoint
- `// copilot: DB` - Database queries/operations
- `// copilot: SCHEMA` - Database schema/migrations
- `// copilot: A11Y` - Add accessibility features
- `// copilot: RESPONSIVE` - Make responsive design
- `// copilot: CONFIG` - Configuration setup
- `// copilot: ENV` - Environment variables
- `// copilot: SECURITY` - Add security measures
- `// copilot: TRACE` - Add tracing/telemetry
- `// copilot: CLEANUP` - Remove dead code/clean up

**File-level directives (put at top of file):**
- `// copilot: FILE_FIX` - Fix entire file
- `// copilot: FILE_Z` - Add Zod schemas for whole file

**Debugging trace directives:**
- `// copilot: trace1` - Start trace point 1
- `// copilot: trace2` - Trace point 2  
- `// copilot: trace3` - Trace point 3
- `// copilot: trace_` - Stop tracing

Examples:
```tsx
// copilot: FILE_FIX
// <entire file needs fixing>

// copilot: FILE_Z  
// <whole file needs Zod schemas>

// copilot: trace1
function processData() {
  // copilot: trace2
  const result = transform(data)
  // copilot: trace3
  return validate(result)
  // copilot: trace_
}

// copilot: FIX
export function BrokenCard({ user }) {
  return <div>{user.name}</div>  // TypeError: user is undefined
}

// copilot: IMPLEMENT
export function UserProfile() {
  // TODO: show avatar, name, email, status badge
}

// copilot: CREATE
// need a debounced search hook

// copilot: REMOVE
import { unused, alsoUnused } from 'lib'
import { React, useState } from 'react'  // React import not needed
const deadVariable = 'test'
let anotherUnused: string

// copilot: TYPE
const user = { name: 'john', age: 30, email: 'john@test.com' }
const apiResponse = { data: [], success: true, message: 'ok' }

// copilot: Z
interface UserData {
  name: string
  email: string
  age?: number
}

// copilot: DOC
export function calculateTax(income: number, rate: number) {
  return income * rate
}

// copilot: HOOK
function useUserData(userId: string) {
  // fetch user, handle loading/error states
}

// copilot: STYLE
<div className="p-4">
  <h1 className="text-lg">User Profile</h1>
  <p>Needs electric neon theme styling</p>
</div>

// copilot: ERROR
async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}

// copilot: ASYNC
function getUserData(id) {
  return fetch(`/api/users/${id}`)
    .then(r => r.json())
    .then(data => console.log(data))
    .catch(err => console.error(err))
}

// copilot: RENAME
const d = new Date()
const u = await getUser()
const tmp = processData()

// copilot: EXPLAIN
if ((user.role === 'admin' || user.permissions.includes('write')) && 
    !user.suspended && user.emailVerified) {
  // complex permission logic
}

// copilot: REFACTOR
function handleSubmit(formData) {
  // validate email
  if (!formData.email.includes('@')) return false
  // validate password
  if (formData.password.length < 8) return false
  // validate name
  if (!formData.name.trim()) return false
  // save to database
  database.users.create(formData)
  // send welcome email
  emailService.sendWelcome(formData.email)
  // log activity
  logger.log('User created: ' + formData.email)
}

// copilot: VALIDATE
function createUser(data) {
  const user = await User.create(data)  // no validation
  return user
}

// copilot: MOCK
const testUsers = []  // need realistic test data

// copilot: UTIL
// need formatDate, truncateText, generateSlug functions

// copilot: AUTH
function Dashboard() {
  return <div>Admin content</div>  // needs auth check
}

// copilot: LOG
async function processPayment(amount: number) {
  const result = await stripe.charges.create({ amount })
  return result  // needs proper logging
}

// copilot: CACHE
function getExpensiveData(userId: string) {
  return database.users.findMany({
    where: { id: userId },
    include: { posts: true, comments: true }
  })  // expensive query, needs caching
}

// copilot: PERF
function SearchResults({ items }: { items: Item[] }) {
  return (
    <div>
      {items.map(item => (
        <ExpensiveComponent key={item.id} data={item} />
      ))}
    </div>
  )  // re-renders on every search, needs memoization
}

// copilot: API
// need POST /api/users endpoint with validation

// copilot: DB
async function getUserStats(userId: string) {
  // need: user profile, post count, follower count, recent activity
}

// copilot: SCHEMA
// need User table with: id, email, name, avatar, createdAt, role

// copilot: A11Y
<form>
  <input type="email" placeholder="Email" />
  <button>Submit</button>
</form>

// copilot: RESPONSIVE
<div className="grid grid-cols-4 gap-4">
  <Card />
  <Card />
  <Card />
</div>

// copilot: CONFIG
// need app config: API_URL, DATABASE_URL, JWT_SECRET, RATE_LIMITS

// copilot: ENV
const config = {
  apiUrl: 'https://api.prod.com',
  dbUrl: 'postgres://prod-db'
}  // hardcoded values, needs env vars

// copilot: SECURITY
function processUserInput(input: string) {
  return database.query(`SELECT * FROM users WHERE name = ${input}`)  // SQL injection risk
}

// copilot: TRACE
async function criticalOperation() {
  const result = await performComplexTask()
  return result  // needs tracing/observability
}

// copilot: CLEANUP
import { unused, alsoUnused } from 'lib'
const deadCode = 'remove me'
function unusedFunction() { return 'dead code' }
const testUsers = []

// copilot: UTIL
// need helper functions for date formatting
```