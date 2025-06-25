// Enhanced with Tailwind v4 Features - June 20, 2025
'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { cn, glassVariants, transform3D, modernGradients, animations } from '@/lib/tailwind-v4-utils';

interface SolutionsSectionProps {
  className?: string;
}

/**
 * Enhanced SolutionsSection component with Tailwind v4 cutting-edge features
 *
 * Features:
 * - Modern glass morphism with OKLCH colors
 * - 3D transform interactions and perspective effects
 * - Container query responsive design
 * - Electric neon effects with CSS animations
 * - Conic gradient overlays and modern styling
 *
 * @author Dean Machines Team
 * @date 2025-06-20
 * @version 2.0.0
 * @model Claude Sonnet 4
 */
export function SolutionsSection({ className }: SolutionsSectionProps) {
  const solutions = [
    {
      title: "AI Chatbots",
      description: "Build intelligent conversational agents with advanced memory and context understanding.",
      features: ["Natural Language Processing", "Context Retention", "Multi-turn Conversations", "Custom Training"],
      badge: "Popular",
      gradient: modernGradients.electric,
      colorMix: "var(--color-primary)"
    },
    {
      title: "Data Analysis",
      description: "Automated data processing and insights generation with AI-powered analytics.",
      features: ["Real-time Processing", "Pattern Recognition", "Predictive Analytics", "Custom Reports"],
      badge: "Enterprise",
      gradient: modernGradients.cyber,
      colorMix: "var(--color-chart-4)"
    },
    {
      title: "Content Generation",
      description: "Create high-quality content at scale with AI-driven writing and editing tools.",
      features: ["SEO Optimization", "Multiple Formats", "Brand Voice", "Quality Control"],
      badge: "Creative",
      gradient: modernGradients.aurora,
      colorMix: "var(--color-chart-5)"
    }
  ];

  return (
    <section className={cn(
      "py-24 relative overflow-hidden",
      "@container/solutions", // Container query support
      "gradient-mesh cyber-grid",
      className
    )}>
      {/* Modern Background Effects with Tailwind v4 */}
      <div className={cn(
        "absolute inset-0 opacity-15",
        "holographic",
        animations.hologram
      )} />

      {/* Enhanced Gradient Background with OKLCH */}
      <div className={cn(
        "absolute top-0 left-0 w-full h-full",
        "bg-gradient-to-br from-[color-mix(in_oklch,var(--color-accent)_5%,transparent)]",
        "via-transparent to-[color-mix(in_oklch,var(--color-primary)_5%,transparent)]"
      )} />

      <div className={cn(
        "container mx-auto px-4 sm:px-6 lg:px-8 relative z-10",
        "@container/content"
      )}>
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className={cn(
            "text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4",
            "@sm:text-4xl @md:text-5xl @lg:text-6xl", // Container query responsive
            "perspective-normal transform-3d"
          )}>
            Powerful <motion.span
              className={cn(
                "text-primary text-glow inline-block",
                transform3D.float
              )}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                rotateX: 2
              }}
            >
              Solutions
            </motion.span>
          </h2>
          <p className={cn(
            "text-lg text-muted-foreground max-w-2xl mx-auto",
            "@sm:text-xl @lg:text-2xl" // Container query responsive
          )}>
            Transform your business with AI-powered solutions designed for maximum impact and efficiency.
          </p>
        </motion.div>

        <div className={cn(
          "grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16",
          "@sm:gap-10 @lg:gap-12", // Container query responsive gaps
          "@container/grid"
        )}>
          {solutions.map((solution, index) => (
            <motion.div
              key={solution.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              whileHover={{
                scale: 1.02,
                rotateX: 8,
                rotateY: 4,
                z: 20
              }}
              viewport={{ once: true }}
              className={cn("group", transform3D.card)}
            >
              <Card className={cn(
                glassVariants.strong,
                "neon-border hover:electric-pulse transition-all duration-300 h-full",
                "group-hover:text-glow perspective-normal transform-3d",
                solution.gradient,
                "@sm:p-6", // Container query responsive padding
                "relative overflow-hidden"
              )}>
                <CardHeader className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "bg-[color-mix(in_oklch,var(--color-primary)_20%,transparent)]",
                        "text-primary border-[color-mix(in_oklch,var(--color-primary)_30%,transparent)]"
                      )}
                    >
                      {solution.badge}
                    </Badge>
                    <motion.div
                      className={cn(
                        "perspective-near transform-3d",
                        "p-2 rounded-full",
                        "bg-[color-mix(in_oklch,var(--color-primary)_10%,transparent)]"
                      )}
                      whileHover={{
                        rotate: 45,
                        rotateX: 15,
                        rotateY: 15,
                        scale: 1.1
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowRight className="w-5 h-5 text-primary" />
                    </motion.div>
                  </div>
                  <CardTitle className={cn(
                    "text-xl font-semibold text-foreground",
                    "group-hover:text-primary transition-colors",
                    "@sm:text-2xl" // Container query responsive
                  )}>
                    {solution.title}
                  </CardTitle>
                  <CardDescription className={cn(
                    "text-muted-foreground",
                    "@sm:text-lg" // Container query responsive
                  )}>
                    {solution.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <ul className={cn(
                    "space-y-2 mb-6",
                    "@sm:space-y-3" // Container query responsive spacing
                  )}>
                    {solution.features.map((feature, featureIndex) => (
                      <motion.li
                        key={feature}
                        className={cn(
                          "flex items-center text-sm text-muted-foreground",
                          "@sm:text-base" // Container query responsive
                        )}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: featureIndex * 0.1 }}
                        viewport={{ once: true }}
                        whileHover={{ x: 5 }}
                      >
                        <motion.div
                          whileHover={{
                            rotate: 360,
                            scale: 1.2
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <CheckCircle className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                        </motion.div>
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                  <motion.div
                    whileHover={{
                      scale: 1.02,
                      rotateX: 2,
                      rotateY: 2
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full lightning-trail neon-border hover:electric-pulse",
                        glassVariants.strong,
                        "perspective-normal transform-3d",
                        "transition-all duration-300",
                        "hover:shadow-[0_0_20px_var(--color-primary)]",
                        "@sm:py-3 @sm:text-lg" // Container query responsive
                      )}
                    >
                      Learn More
                    </Button>
                  </motion.div>
                </CardContent>

                {/* Modern Conic Gradient Overlay */}
                <div className={cn(
                  "absolute inset-0 opacity-5 pointer-events-none",
                  `bg-conic-gradient from-[${solution.colorMix}] via-accent via-chart-3 to-[${solution.colorMix}]`,
                  "group-hover:opacity-10 transition-opacity duration-300"
                )} />
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Enhanced CTA Section with 3D Effects */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <h3 className={cn(
            "text-2xl font-semibold text-foreground mb-4",
            "@sm:text-3xl @lg:text-4xl", // Container query responsive
            "perspective-normal transform-3d"
          )}>
            <motion.span
              className={cn("inline-block", transform3D.float)}
              whileHover={{
                scale: 1.05,
                rotateY: 5,
                rotateX: 2
              }}
            >
              Ready to Transform Your Business?
            </motion.span>
          </h3>
          <p className={cn(
            "text-muted-foreground mb-8 max-w-xl mx-auto",
            "@sm:text-lg @lg:text-xl" // Container query responsive
          )}>
            Get started with our cutting-edge AI solutions and see the difference in your productivity.
          </p>
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
              size="lg"
              asChild
              className={cn(
                "bg-primary text-primary-foreground hover:bg-primary/90",
                glassVariants.strong,
                "electric-pulse px-8 py-4",
                "perspective-normal transform-3d",
                "transition-all duration-300",
                "hover:shadow-[0_0_30px_var(--color-primary)]",
                "@sm:px-10 @sm:py-5 @sm:text-xl" // Container query responsive
              )}
            >
              <Link href="/contact">Start Your Journey</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
