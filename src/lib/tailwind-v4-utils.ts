/**
 * Tailwind CSS v4 Cutting-Edge Utility Functions
 * 
 * Modern utility functions that leverage Tailwind v4's latest features:
 * - OKLCH color space manipulation
 * - Container queries
 * - 3D transforms
 * - Dynamic utilities
 * - CSS cascade layers
 * 
 * @author Dean Machines Team
 * @date 2025-06-20
 * @version 1.0.0
 * @model Claude Sonnet 4
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Enhanced cn function with Tailwind v4 optimizations
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Modern glass effect variants using Tailwind v4 features
 */
export const glassVariants = {
  subtle: 'glass-effect backdrop-blur-sm',
  medium: 'glass-effect-strong backdrop-blur-md',
  strong: 'glass-effect-strong backdrop-blur-xl',
  ultra: 'glass-effect-strong backdrop-blur-2xl saturate-150'
} as const;

/**
 * 3D transform utilities for modern interactions
 */
export const transform3D = {
  card: 'transform-3d perspective-normal hover:rotate-x-2 hover:rotate-y-2',
  float: 'transform-3d perspective-far hover:translate-z-4 hover:rotate-x-1',
  tilt: 'transform-3d perspective-near hover:rotate-x-12 hover:rotate-y-12',
  flip: 'transform-3d perspective-normal hover:rotate-y-180'
} as const;

/**
 * Container query responsive utilities
 */
export const containerQueries = {
  card: '@container/card',
  sidebar: '@container/sidebar',
  modal: '@container/modal',
  grid: '@container/grid',
  showcase: '@container/showcase'
} as const;

/**
 * Modern gradient combinations using OKLCH
 */
export const modernGradients = {
  electric: 'bg-gradient-to-r from-primary via-accent to-primary',
  neon: 'bg-gradient-to-br from-chart-1 via-chart-2 to-chart-3',
  holographic: 'bg-conic-gradient from-primary via-accent via-chart-3 to-primary',
  aurora: 'bg-radial-gradient from-chart-2 via-chart-4 to-chart-5',
  cyber: 'bg-linear-45 from-primary/20 via-accent/30 to-chart-1/20'
} as const;

/**
 * Enhanced animation utilities
 */
export const animations = {
  float: 'floating',
  glow: 'pulse-glow',
  sweep: 'lightning-sweep',
  hologram: 'holographic-shift',
  electric: 'electric-pulse',
  storm: 'storm-drift'
} as const;

/**
 * Modern shadow combinations
 */
export const shadows = {
  neon: 'neon-glow',
  subtle: 'neon-glow-subtle',
  electric: 'electric-pulse',
  glass: 'shadow-lg shadow-primary/10',
  deep: 'shadow-2xl shadow-black/25'
} as const;

/**
 * Generate dynamic spacing utilities
 */
export function spacing(multiplier: number): string {
  return `calc(var(--spacing) * ${multiplier})`;
}

/**
 * Generate container query classes
 */
export function containerQuery(size: string, styles: string): string {
  return `@${size}:${styles}`;
}

/**
 * Create 3D transform combinations
 */
export function create3DTransform(
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  translateZ = 0
): string {
  const transforms = [];
  if (rotateX) transforms.push(`rotate-x-${rotateX}`);
  if (rotateY) transforms.push(`rotate-y-${rotateY}`);
  if (rotateZ) transforms.push(`rotate-z-${rotateZ}`);
  if (translateZ) transforms.push(`translate-z-${translateZ}`);
  
  return cn('transform-3d', ...transforms);
}

/**
 * Modern color mixing utilities
 */
export function colorMix(color: string, opacity: number): string {
  return `color-mix(in oklch, ${color} ${opacity}%, transparent)`;
}

/**
 * Enhanced responsive utilities with container queries
 */
export const responsive = {
  // Traditional breakpoints
  mobile: 'sm:',
  tablet: 'md:',
  desktop: 'lg:',
  wide: 'xl:',
  ultra: '2xl:',
  
  // Container queries
  cardSm: '@sm:',
  cardMd: '@md:',
  cardLg: '@lg:',
  cardXl: '@xl:',
  
  // Max-width variants
  maxMobile: '@max-sm:',
  maxTablet: '@max-md:',
  maxDesktop: '@max-lg:'
} as const;

/**
 * Modern focus and interaction states
 */
export const interactions = {
  focus: 'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  hover: 'hover:scale-105 hover:shadow-lg transition-all duration-300',
  active: 'active:scale-95 active:shadow-sm',
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
} as const;

/**
 * Accessibility utilities
 */
export const a11y = {
  screenReader: 'sr-only',
  focusable: 'not-sr-only focus:not-sr-only',
  reducedMotion: 'motion-reduce:animate-none motion-reduce:transition-none',
  highContrast: 'contrast-more:border-2 contrast-more:border-current'
} as const;

/**
 * Modern layout utilities
 */
export const layouts = {
  center: 'flex items-center justify-center',
  stack: 'flex flex-col space-y-4',
  spread: 'flex items-center justify-between',
  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
  masonry: 'columns-1 md:columns-2 lg:columns-3 gap-6'
} as const;

/**
 * Component composition utilities
 */
export function createComponent(
  base: string,
  variants?: Record<string, string>,
  defaultVariant?: string
) {
  return function(variant?: string, additional?: string) {
    const variantClass = variants?.[variant || defaultVariant || ''] || '';
    return cn(base, variantClass, additional);
  };
}

/**
 * Modern button component factory
 */
export const buttonStyles = createComponent(
  'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-primary text-primary hover:bg-primary hover:text-primary-foreground',
    ghost: 'text-primary hover:bg-primary/10',
    neon: 'bg-primary text-primary-foreground neon-glow hover:neon-glow-subtle',
    glass: 'glass-effect text-foreground hover:glass-effect-strong'
  },
  'primary'
);

/**
 * Modern card component factory
 */
export const cardStyles = createComponent(
  'rounded-xl border bg-card text-card-foreground shadow-sm',
  {
    default: '',
    glass: 'glass-effect border-primary/20',
    neon: 'glass-effect-strong neon-border',
    electric: 'glass-effect-strong electric-pulse',
    floating: 'glass-effect hover:glass-effect-strong floating'
  },
  'default'
);
