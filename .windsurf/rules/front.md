---
trigger: glob
globs: ./src/app/**/*.tsx ./src/components/**/*.tsx ./src/hooks/**/*.ts ./src/lib/**/*.ts
---

# Frontend Development Rules

## 🎨 NEXT.JS 15 APP ROUTER REQUIREMENTS (ARCHITECTURE)

### App Router Structure

- **MUST** use App Router with proper route grouping: `(playground)`, `(public)`
- **MUST** implement proper layout composition: root → group → page
- **MUST** use server components by default, mark client with `'use client'`
- **MUST** follow loading.tsx, error.tsx, not-found.tsx patterns

### Route Organization

```bash
src/app/
├── (playground)/          # Protected playground features
│   ├── layout.tsx         # CopilotKit provider setup
│   ├── page.tsx           # Main agent chat
│   ├── multi-agent/       # Multi-agent workflows
│   ├── codegraph/         # Code analysis
│   └── settings/          # Configuration
├── (public)/              # Public marketing pages
│   ├── about/             # About page
│   ├── docs/              # Documentation
│   └── features/          # Features page
├── api/                   # API routes
│   └── copilotkit/        # CopilotKit endpoints
├── auth/                  # Authentication pages
└── layout.tsx             # Root layout
```

### Layout Composition Pattern

```typescript
// Root layout - global providers
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={cn(fontSans.variable, "antialiased")}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

// Group layout - specific providers
export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKitProvider runtimeUrl={process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL}>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </CopilotKitProvider>
  );
}
```

## 🎯 REACT 19 PATTERNS (MODERN REACT)

### Component Architecture

- **MUST** use functional components with hooks
- **MUST** implement proper TypeScript interfaces for all props
- **MUST** use React.memo for expensive components
- **MUST** implement proper error boundaries

### State Management Patterns

```typescript
// Local state with TypeScript
const [state, setState] = useState<StateType>(initialState);

// Complex state with useReducer
const [state, dispatch] = useReducer(reducer, initialState);

// Context for shared state
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hooks for reusable logic
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Implementation
}
```

### Performance Optimization

- **MUST** use useCallback for event handlers passed as props
- **MUST** use useMemo for expensive computations
- **MUST** implement proper dependency arrays
- **MUST** use React.lazy for code splitting

## 🎨 TAILWIND V4 INTEGRATION (STYLING SYSTEM)

### Required Imports

```typescript
import { cn, glassVariants, transform3D, modernGradients, animations } from '@/lib/tailwind-v4-utils';
```

### Styling Patterns

- **MUST** use `cn()` function for className composition
- **MUST** implement container queries: `@container/name`
- **MUST** use OKLCH colors: `oklch(0.7 0.25 105)`
- **MUST** apply 3D transforms: `perspective-normal rotate-x-5`

### Component Styling Template

```typescript
export function Component({ className, ...props }: ComponentProps) {
  return (
    <div className={cn(
      // Base styles
      "relative overflow-hidden",
      // Container queries
      "@container/component",
      // Glass effects
      glassVariants.strong,
      // 3D transforms
      transform3D.card,
      // Electric theme
      "neon-border electric-pulse",
      // Custom className
      className
    )}>
      {/* Content */}
    </div>
  );
}
```

## 🎭 FRAMER MOTION INTEGRATION (ANIMATIONS)

### Required Animation Patterns

- **MUST** use viewport triggers: `viewport={{ once: true }}`
- **MUST** implement stagger animations for lists
- **MUST** include 3D hover effects
- **MUST** respect reduced motion preferences

### Animation Templates

```typescript
// Page entrance animation
<motion.div
  initial={{ opacity: 0, y: 50 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8 }}
>

// List stagger animation
<motion.div
  variants={{
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }}
  initial="hidden"
  animate="show"
>

// 3D hover effect
<motion.div
  whileHover={{
    scale: 1.05,
    rotateY: 8,
    rotateX: 4,
    z: 20
  }}
  className={transform3D.card}
>
```

## 🧩 COMPONENT DEVELOPMENT (REUSABILITY)

### Component Structure

```typescript
interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Component description
 *
 * @param props - Component props
 * @returns JSX element
 *
 * @example
 * ```tsx
 * <Component variant="primary" size="lg">
 *   Content
 * </Component>
 * ```
 *
 * @author Dean Machines Team
 * @date 2025-06-20
 * @model Claude Sonnet 4
 */
export function Component({
  children,
  className,
  variant = 'default',
  size = 'md'
}: ComponentProps) {
  return (
    <div className={cn(
      // Base styles
      "component-base",
      // Variants
      {
        'variant-default': variant === 'default',
        'variant-primary': variant === 'primary',
        'variant-secondary': variant === 'secondary',
      },
      // Sizes
      {
        'size-sm': size === 'sm',
        'size-md': size === 'md',
        'size-lg': size === 'lg',
      },
      className
    )}>
      {children}
    </div>
  );
}
```

## 🔧 CUSTOM HOOKS DEVELOPMENT (REUSABLE LOGIC)

### Hook Development Pattern

```typescript
interface UseHookOptions {
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useCustomHook(options: UseHookOptions = {}) {
  const [state, setState] = useState<StateType>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { enabled = true, onSuccess, onError } = options;

  useEffect(() => {
    if (!enabled) return;

    const performAction = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiCall();
        setState(result);
        onSuccess?.(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        onError?.(error);
      } finally {
        setLoading(false);
      }
    };

    performAction();
  }, [enabled, onSuccess, onError]);

  return { state, loading, error };
}
```

## 📱 RESPONSIVE DESIGN (MOBILE-FIRST)

### Container Query Implementation

```typescript
const ResponsiveComponent = () => (
  <div className={cn(
    "@container/responsive",
    "grid grid-cols-1",
    "@sm:grid-cols-2 @lg:grid-cols-3"
  )}>
    <div className="@sm:p-6 @lg:p-8">Content</div>
  </div>
);
```

## 🔐 AUTHENTICATION INTEGRATION (SUPABASE)

### Auth Utilities Usage

```typescript
import { createClient } from '@/utility/supabase/client';

const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
```

## 🎯 PERFORMANCE OPTIMIZATION (EFFICIENCY)

### Code Splitting Strategies

```typescript
const PlaygroundPage = dynamic(() => import('./playground/page'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});
```

## 🧪 TESTING REQUIREMENTS (QUALITY ASSURANCE)

### Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

test('renders component correctly', () => {
  render(<Component />);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```
