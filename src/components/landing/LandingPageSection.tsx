// Enhanced with Tailwind v4 Cutting-Edge Features - June 20, 2025
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LightningBackground } from '@/components/effects/LightningBackground';
import { LightningCursor } from '@/components/effects/lightning-cursor';
import { cn, glassVariants, transform3D, modernGradients, animations } from '@/lib/tailwind-v4-utils';

interface LandingPageSectionProps {
  className?: string;
}

/**
 * Enhanced LandingPageSection component with advanced lightning effects
 *
 * Features:
 * - Advanced lightning background with TSParticles integration
 * - Electric field effects and storm atmosphere
 * - 3D transforms and neon glow effects
 * - Tailwind v4 optimized styling
 * - Performance optimized animations
 *
 * @author Dean Machines Team
 * @date 2025-06-20
 * @version 2.0.0
 * @model Claude Sonnet 4
 */
export function LandingPageSection({ className }: LandingPageSectionProps) {

  return (
    <section className={cn(
      "relative min-h-screen py-16 md:py-24 overflow-hidden",
      "@container/hero", // Container query support
      className
    )}>
      {/* Advanced Lightning Background with Modern Layering */}
      <LightningBackground
        intensity="high"
        enableParticles={true}
        enableLightning={true}
        className="z-0"
      />

      {/* Lightning Cursor Effect */}
      <LightningCursor enabled={true} />

      {/* Modern Background Layers with Tailwind v4 Features */}
      <div className={cn(
        "absolute inset-0 z-5",
        "storm-clouds",
        "animate-[storm-drift_20s_linear_infinite]"
      )} />

      <div className={cn(
        "absolute inset-0 z-10",
        "electric-field",
        "animate-[electric-field-pulse_6s_ease-in-out_infinite]"
      )} />

      {/* Enhanced Gradient Mesh with OKLCH Colors */}
      <div className={cn(
        "absolute inset-0 z-15 opacity-40",
        "gradient-mesh",
        modernGradients.aurora
      )} />

      {/* Cyber Grid with Container Queries */}
      <div className={cn(
        "absolute inset-0 z-20 opacity-25",
        "cyber-grid",
        "@sm:opacity-30 @lg:opacity-35" // Container query responsive
      )} />

      {/* Holographic Effect with Modern CSS */}
      <div className={cn(
        "absolute inset-0 z-25 opacity-20",
        "holographic",
        animations.hologram
      )} />

      <div className={cn(
        "container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-30",
        "@container/content" // Container query for content
      )}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className={cn(
            "text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight",
            "@sm:text-5xl @md:text-6xl @lg:text-8xl", // Container query responsive
            "perspective-normal transform-3d" // 3D transform support
          )}>
            Build <motion.span
              className={cn(
                "text-primary text-glow lightning-flash",
                "inline-block", // For 3D transforms
                transform3D.float
              )}
              animate={{
                textShadow: [
                  "0 0 10px var(--color-primary), 0 0 20px var(--color-primary), 0 0 30px var(--color-primary)",
                  "0 0 15px var(--color-accent), 0 0 30px var(--color-accent), 0 0 45px var(--color-accent)",
                  "0 0 20px var(--color-chart-4), 0 0 40px var(--color-chart-4), 0 0 60px var(--color-chart-4)",
                  "0 0 10px var(--color-primary), 0 0 20px var(--color-primary), 0 0 30px var(--color-primary)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                rotateX: 2
              }}
            >
              Intelligent
            </motion.span>
            <br />Applications, <motion.span
              className={cn(
                "text-primary text-glow",
                "inline-block",
                transform3D.tilt
              )}
              animate={{
                textShadow: [
                  "0 0 8px var(--color-chart-5), 0 0 16px var(--color-chart-5), 0 0 24px var(--color-chart-5)",
                  "0 0 12px var(--color-accent), 0 0 24px var(--color-accent), 0 0 36px var(--color-accent)",
                  "0 0 8px var(--color-chart-5), 0 0 16px var(--color-chart-5), 0 0 24px var(--color-chart-5)"
                ]
              }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
              whileHover={{
                scale: 1.05,
                rotateY: -5,
                rotateX: -2
              }}
            >
              Faster
            </motion.span>.
          </h1>
        </motion.div>

        <motion.p
          className="max-w-3xl mx-auto text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.span
            className="text-foreground font-medium"
            animate={{
              textShadow: [
                "0 0 5px rgba(241, 196, 15, 0.3)",
                "0 0 10px rgba(241, 196, 15, 0.5)",
                "0 0 5px rgba(241, 196, 15, 0.3)"
              ]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            DeanMachines RSC
          </motion.span> empowers you to create sophisticated AI-driven solutions with autonomous agents, advanced memory, and seamless integration.
        </motion.p>

        <motion.div
          className={cn(
            "flex flex-col sm:flex-row justify-center items-center gap-6 mb-16",
            "@sm:gap-8 @lg:gap-10" // Container query responsive gaps
          )}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <motion.div
            className={transform3D.card}
            whileHover={{
              scale: 1.05,
              rotateY: 5,
              rotateX: 2
            }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="default"
              size="lg"
              asChild
              className={cn(
                "bg-primary text-primary-foreground hover:bg-primary/90",
                glassVariants.strong,
                "energy-pulse px-8 py-4 text-lg font-semibold neon-border",
                "perspective-normal transform-3d",
                "transition-all duration-300 ease-out",
                "@sm:px-10 @sm:py-5 @sm:text-xl" // Container query responsive
              )}
            >
              <Link href="/docs/get-started">Get Started</Link>
            </Button>
          </motion.div>

          <motion.div
            className={transform3D.card}
            whileHover={{
              scale: 1.05,
              rotateY: -5,
              rotateX: -2
            }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="outline"
              size="lg"
              asChild
              className={cn(
                glassVariants.strong,
                "border-primary/40 hover:border-primary/80",
                "lightning-trail px-8 py-4 text-lg font-semibold electric-pulse",
                "perspective-normal transform-3d",
                "transition-all duration-300 ease-out",
                "hover:shadow-[0_0_30px_var(--color-primary)]",
                "@sm:px-10 @sm:py-5 @sm:text-xl" // Container query responsive
              )}
            >
              <Link href="https://github.com/ssdeanx/deanmachines-rsc" target="_blank">
                View on GitHub
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className={cn(
            "relative mt-16 max-w-6xl mx-auto",
            "@container/showcase" // Container query for showcase
          )}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          {/* Enhanced 3D Card Effect with Modern Tailwind v4 Features */}
          <motion.div
            className={cn(
              "relative",
              transform3D.card,
              "perspective-normal"
            )}
            whileHover={{
              rotateX: 8,
              rotateY: 8,
              scale: 1.02,
              z: 50
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className={cn(
              glassVariants.ultra,
              "rounded-2xl p-8 energy-pulse neon-border",
              "relative overflow-hidden",
              "@sm:p-10 @lg:p-12", // Container query responsive padding
              "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-accent/5 before:rounded-2xl"
            )}>
              <Image
                src="/logo-main.jpg"
                alt="DeanMachines Platform - AI Agent Architecture"
                width={1200}
                height={700}
                className={cn(
                  "rounded-xl shadow-2xl floating relative z-10",
                  "transition-all duration-500",
                  "@sm:rounded-2xl @lg:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
                )}
                priority
              />

              {/* Modern Electric Orbs with OKLCH Colors */}
              <motion.div
                className={cn(
                  "absolute -top-6 -right-6 w-20 h-20 rounded-full blur-xl",
                  "bg-gradient-to-r from-[color-mix(in_oklch,var(--color-primary)_30%,transparent)] to-[color-mix(in_oklch,var(--color-chart-4)_30%,transparent)]"
                )}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0.8, 0.4],
                  rotate: [0, 180, 360]
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />

              <motion.div
                className={cn(
                  "absolute -bottom-8 -left-8 w-24 h-24 rounded-full blur-2xl",
                  "bg-gradient-to-r from-[color-mix(in_oklch,var(--color-chart-5)_20%,transparent)] to-[color-mix(in_oklch,var(--color-primary)_20%,transparent)]"
                )}
                animate={{
                  scale: [1, 1.6, 1],
                  opacity: [0.2, 0.6, 0.2],
                  rotate: [360, 180, 0]
                }}
                transition={{ duration: 5, repeat: Infinity, delay: 1.5 }}
              />

              {/* Additional Modern Electric Elements */}
              <motion.div
                className={cn(
                  "absolute top-1/4 -left-4 w-12 h-12 rounded-full blur-lg",
                  "bg-[color-mix(in_oklch,var(--color-accent)_25%,transparent)]"
                )}
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.3, 0.7, 0.3],
                  x: [0, 10, 0]
                }}
                transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
              />

              <motion.div
                className={cn(
                  "absolute bottom-1/3 -right-2 w-14 h-14 rounded-full blur-lg",
                  "bg-[color-mix(in_oklch,var(--color-chart-1)_25%,transparent)]"
                )}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.8, 0.4],
                  y: [0, -15, 0]
                }}
                transition={{ duration: 2.8, repeat: Infinity, delay: 2 }}
              />

              {/* Modern Conic Gradient Overlay */}
              <div className={cn(
                "absolute inset-0 rounded-2xl opacity-10 pointer-events-none",
                "bg-conic-gradient from-primary via-accent via-chart-3 to-primary",
                "animate-[holographic-shift_12s_ease-in-out_infinite]"
              )} />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
