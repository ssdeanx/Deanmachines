---
trigger: glob
globs: src/components/landing/*.tsx
---

# Landing Page Development Rules

## 🎨 TAILWIND V4 CUTTING-EDGE REQUIREMENTS (MANDATORY)

### Modern CSS Architecture

- **CSS Cascade Layers**: MUST use `@layer theme, base, components, utilities` for style organization
- **OKLCH Color Space**: ALL colors MUST use OKLCH format for P3 wide gamut support
- **Container Queries**: MUST use `@container/name` instead of traditional breakpoints where applicable
- **3D Transforms**: MUST implement `perspective-*`, `rotate-x-*`, `rotate-y-*` for interactive elements
- **CSS-First Configuration**: Use CSS custom properties with `color-mix()` functions

### Required Utility Integration

```typescript
import { cn, glassVariants, transform3D, modernGradients, animations } from '@/lib/tailwind-v4-utils';
```

### Glass Morphism Standards

- **Subtle**: `glassVariants.subtle` for light transparency
- **Medium**: `glassVariants.medium` for standard glass effects
- **Strong**: `glassVariants.strong` for prominent glass elements
- **Ultra**: `glassVariants.ultra` for maximum glass effect with enhanced blur

### 3D Transform Patterns

- **Cards**: `transform3D.card` for hover perspective effects
- **Float**: `transform3D.float` for gentle floating animations
- **Tilt**: `transform3D.tilt` for dramatic perspective shifts
- **Flip**: `transform3D.flip` for 180-degree rotations

## ⚡ ELECTRIC NEON THEME REQUIREMENTS (VISUAL IDENTITY)

### Color Palette (OKLCH Format)

- **Primary Electric**: `oklch(0.7 0.25 105)` - Electric yellow-green
- **Accent Cyan**: `oklch(0.6 0.2 180)` - Electric cyan
- **Chart Colors**: Use `var(--color-chart-1)` through `var(--color-chart-5)`
- **Background**: `oklch(0.09 0.005 270)` - Deep space black

### Animation Requirements

- **Lightning Effects**: MUST use `lightning-flash`, `electric-pulse`, `storm-drift`
- **Neon Glows**: Apply `neon-glow`, `neon-glow-subtle`, `text-glow`
- **Energy Pulses**: Use `energy-pulse` for buttons and interactive elements
- **Holographic**: Apply `holographic` with `animations.hologram`

### Electric Effects Implementation

```css
/* Required CSS animations */
.electric-pulse { animation: electric-pulse 3s ease-in-out infinite; }
.lightning-flash { animation: lightning-flash 4s infinite; }
.storm-drift { animation: storm-drift 20s linear infinite; }
.energy-pulse { animation: energy-pulse 3s ease-in-out infinite; }
```

## 🏗️ COMPONENT ARCHITECTURE (LANDING SPECIFIC)

### Required Landing Components

1. **LandingPageSection**: Hero with lightning background and 3D typography
2. **FeaturesSection**: 3D cards with electric hover effects
3. **AboutSection**: Team cards with glass morphism and stats
4. **SolutionsSection**: Interactive solution cards with conic gradients
5. **TopNavbar**: Glass navigation with 3D logo and electric buttons

### Component Structure Pattern

```typescript
interface ComponentProps {
  className?: string;
}

export function ComponentName({ className }: ComponentProps) {
  return (
    <section className={cn(
      "py-24 relative overflow-hidden",
      "@container/component-name", // Container query support
      "gradient-mesh cyber-grid",
      className
    )}>
      {/* Modern background effects */}
      <div className={cn(
        "absolute inset-0 opacity-20",
        "holographic",
        animations.hologram
      )} />

      {/* Content with container queries */}
      <div className={cn(
        "container mx-auto px-4 sm:px-6 lg:px-8 relative z-10",
        "@container/content"
      )}>
        {/* Component content */}
      </div>
    </section>
  );
}
```

## 🎭 FRAMER MOTION INTEGRATION (ANIMATION STANDARDS)

### Required Motion Patterns

- **Initial States**: `{ opacity: 0, y: 50 }` for entrance animations
- **Viewport Triggers**: `viewport={{ once: true }}` for performance
- **3D Hover Effects**: Include `rotateX`, `rotateY`, `z` transforms
- **Stagger Animations**: Use `delay: index * 0.1` for sequential reveals

### Motion Component Template

```typescript
<motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, delay: index * 0.1 }}
  whileHover={{
    scale: 1.05,
    rotateY: 8,
    rotateX: 4,
    z: 20
  }}
  viewport={{ once: true }}
  className={cn("group", transform3D.card)}
>
  {/* Content */}
</motion.div>
```

## 🖼️ VISUAL EFFECTS REQUIREMENTS (BACKGROUND LAYERS)

### Required Background Stack (Z-Index Order)

1. **Z-0**: `LightningBackground` with TSParticles integration
2. **Z-5**: `storm-clouds` with drift animation
3. **Z-10**: `electric-field` with pulse animation
4. **Z-15**: `gradient-mesh` with modern gradients
5. **Z-20**: `cyber-grid` with container query opacity
6. **Z-25**: `holographic` with shift animation
7. **Z-30**: Content layer

### Lightning Background Integration

```typescript
<LightningBackground
  intensity="high"
  enableParticles={true}
  enableLightning={true}
  className="z-0"
/>
```

### Electric Orb Effects

```typescript
<div className={cn(
  "absolute top-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl",
  "bg-[color-mix(in_oklch,var(--color-primary)_5%,transparent)]",
  "animate-pulse"
)} />
```

## 📱 RESPONSIVE DESIGN (CONTAINER QUERIES)

### Container Query Implementation

- **Hero Section**: `@container/hero` with responsive text sizing
- **Content Areas**: `@container/content` for adaptive layouts
- **Grid Systems**: `@container/grid` for responsive card layouts
- **Navigation**: `@container/navbar` for adaptive spacing

### Responsive Patterns

```typescript
// Container query responsive text
"@sm:text-lg @md:text-xl @lg:text-2xl"

// Container query responsive spacing
"@sm:gap-8 @lg:gap-12"

// Container query responsive padding
"@sm:p-6 @lg:p-8"
```

## 🎯 PERFORMANCE REQUIREMENTS (OPTIMIZATION)

### Animation Performance

- **Hardware Acceleration**: MUST use `transform-3d` for GPU rendering
- **Reduced Motion**: MUST respect `prefers-reduced-motion` settings
- **Passive Listeners**: Use `{ passive: true }` for scroll events
- **RequestAnimationFrame**: Use for smooth scroll detection

### Image Optimization

- **Next.js Image**: MUST use `next/image` for all images
- **Priority Loading**: Set `priority={true}` for above-fold images
- **Responsive Images**: Provide multiple sizes for different viewports
- **WebP Format**: Prefer modern image formats

### Code Splitting

- **Dynamic Imports**: Use for non-critical components
- **Lazy Loading**: Implement for below-fold content
- **Bundle Analysis**: Monitor bundle size impact

## 🔧 ACCESSIBILITY REQUIREMENTS (A11Y)

### Focus Management

- **Focus Visible**: Use modern `:focus-visible` styles
- **Tab Order**: Ensure logical keyboard navigation
- **Skip Links**: Provide skip-to-content functionality
- **Focus Trapping**: Implement for modals and overlays

### Screen Reader Support

- **Semantic HTML**: Use proper heading hierarchy
- **ARIA Labels**: Provide descriptive labels for interactive elements
- **Alt Text**: Comprehensive image descriptions
- **Live Regions**: Use for dynamic content updates

### Color Accessibility

- **Contrast Ratios**: Ensure WCAG AA compliance
- **Color Independence**: Don't rely solely on color for information
- **High Contrast**: Support high contrast mode
- **Color Blind**: Test with color blindness simulators

## 🚀 DEPLOYMENT CONSIDERATIONS (PRODUCTION)

### Environment Variables

```bash
# Required for landing pages
NEXT_PUBLIC_SITE_URL=https://deanmachines.com
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL=https://api.deanmachines.com/copilotkit
```

### SEO Requirements

- **Meta Tags**: Comprehensive meta descriptions and titles
- **Open Graph**: Social media preview optimization
- **Schema Markup**: Structured data for search engines
- **Sitemap**: Auto-generated XML sitemap

### Performance Monitoring

- **Core Web Vitals**: Monitor LCP, FID, CLS metrics
- **Bundle Size**: Track JavaScript bundle impact
- **Image Loading**: Monitor image optimization effectiveness
- **Animation Performance**: Track frame rates and jank
