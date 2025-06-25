// Enhanced with Tailwind v4 Features - June 20, 2025
'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Zap, Shield, Cpu, Globe, Rocket } from 'lucide-react';
import { cn, glassVariants, transform3D, modernGradients, animations } from '@/lib/tailwind-v4-utils';

interface FeaturesSectionProps {
  className?: string;
}

/**
 * FeaturesSection component with cutting-edge 2025 animations
 *
 * Showcases key features with neon glow effects and 3D transforms
 * Dark theme with yellow neon accents
 */
export function FeaturesSection({ className }: FeaturesSectionProps) {
  const features = [
    {
      icon: Brain,
      title: "Intelligent Agents",
      description: "Autonomous AI agents that understand context and execute complex tasks with precision."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized performance with sub-100ms response times and efficient memory management."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Built-in security measures with input validation and prompt injection protection."
    },
    {
      icon: Cpu,
      title: "Advanced Memory",
      description: "Sophisticated memory management with vector storage and semantic search capabilities."
    },
    {
      icon: Globe,
      title: "Seamless Integration",
      description: "Easy integration with existing systems and third-party APIs."
    },
    {
      icon: Rocket,
      title: "Production Ready",
      description: "Scalable architecture with comprehensive observability and monitoring."
    }
  ];

  return (
    <section className={cn(
      "py-24 relative overflow-hidden",
      "@container/features", // Container query support
      "gradient-mesh cyber-grid",
      className
    )}>
      {/* Modern Background Effects with Tailwind v4 */}
      <div className={cn(
        "absolute inset-0 opacity-20",
        "holographic",
        animations.hologram
      )} />

      {/* Enhanced Electric Orbs with OKLCH Colors */}
      <div className={cn(
        "absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl",
        "bg-[color-mix(in_oklch,var(--color-primary)_5%,transparent)]",
        "animate-pulse"
      )} />

      <div className={cn(
        "absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl",
        "bg-[color-mix(in_oklch,var(--color-accent)_5%,transparent)]",
        "animate-pulse",
        "animation-delay-1000"
      )} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Cutting-Edge <span className="text-primary text-glow">Features</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Harness the power of next-generation AI technology with features designed for modern applications.
          </p>
        </motion.div>

        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8",
          "@sm:gap-10 @lg:gap-12", // Container query responsive gaps
          "@container/grid"
        )}>
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{
                scale: 1.05,
                rotateY: 8,
                rotateX: 4,
                z: 20
              }}
              viewport={{ once: true }}
              className={cn("group", transform3D.card)}
            >
              <Card className={cn(
                glassVariants.strong,
                "neon-border hover:electric-pulse transition-all duration-300 h-full",
                "group-hover:text-glow",
                "perspective-normal transform-3d",
                "@sm:p-6 @lg:p-8", // Container query responsive padding
                modernGradients.cyber,
                "relative overflow-hidden"
              )}>
                <CardHeader className="text-center relative z-10">
                  <motion.div
                    className={cn(
                      "mx-auto mb-4 p-3 rounded-full w-fit neon-glow-subtle",
                      "bg-[color-mix(in_oklch,var(--color-primary)_20%,transparent)]",
                      "perspective-near transform-3d"
                    )}
                    whileHover={{
                      rotate: 360,
                      scale: 1.1,
                      rotateX: 15,
                      rotateY: 15
                    }}
                    transition={{ duration: 0.6 }}
                  >
                    <feature.icon className="w-8 h-8 text-primary" />
                  </motion.div>
                  <CardTitle className={cn(
                    "text-xl font-semibold text-foreground",
                    "group-hover:text-primary transition-colors",
                    "@sm:text-2xl" // Container query responsive text
                  )}>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <CardDescription className={cn(
                    "text-muted-foreground text-center leading-relaxed",
                    "@sm:text-lg" // Container query responsive text
                  )}>
                    {feature.description}
                  </CardDescription>
                </CardContent>

                {/* Modern Gradient Overlay */}
                <div className={cn(
                  "absolute inset-0 opacity-5 pointer-events-none",
                  "bg-conic-gradient from-primary via-accent to-chart-3",
                  "group-hover:opacity-10 transition-opacity duration-300"
                )} />
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
