// Enhanced with Tailwind v4 Features - June 20, 2025
'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BookOpen, Users, Zap, Github, ExternalLink } from 'lucide-react';
import { cn, glassVariants, transform3D, modernGradients, animations } from '@/lib/tailwind-v4-utils';

interface AboutSectionProps {
  className?: string;
}

/**
 * AboutSection component with cutting-edge 2025 animations
 *
 * Showcases company information and team details with modern design
 * Dark theme with yellow neon accents
 */
export function AboutSection({ className }: AboutSectionProps) {
  const stats = [
    { number: "10k+", label: "Active Users", icon: Users },
    { number: "99.9%", label: "Uptime", icon: Zap },
    { number: "24/7", label: "Support", icon: BookOpen },
    { number: "Open", label: "Source", icon: Github }
  ];

  const team = [
    {
      name: "AI Research Team",
      role: "Core Development",
      description: "Leading experts in AI agent development and machine learning.",
      badge: "Research"
    },
    {
      name: "Engineering Team",
      role: "Platform Architecture",
      description: "Building scalable and robust infrastructure for AI applications.",
      badge: "Engineering"
    },
    {
      name: "DevX Team",
      role: "Developer Experience",
      description: "Creating intuitive tools and documentation for developers.",
      badge: "DevX"
    }
  ];

  return (
    <section className={cn(
      "py-24 relative overflow-hidden",
      "@container/about", // Container query support
      "gradient-mesh cyber-grid",
      className
    )}>
      {/* Modern Background Effects with Tailwind v4 */}
      <div className={cn(
        "absolute inset-0 opacity-10",
        "holographic",
        animations.hologram
      )} />

      {/* Enhanced Electric Orbs with OKLCH Colors */}
      <div className={cn(
        "absolute top-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl",
        "bg-[color-mix(in_oklch,var(--color-primary)_3%,transparent)]",
        "animate-pulse"
      )} />

      <div className={cn(
        "absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full blur-3xl",
        "bg-[color-mix(in_oklch,var(--color-accent)_3%,transparent)]",
        "animate-pulse",
        "animation-delay-2000"
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
            About <motion.span
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
              DeanMachines
            </motion.span>
          </h2>
          <p className={cn(
            "text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed",
            "@sm:text-xl @lg:text-2xl" // Container query responsive
          )}>
            We&apos;re pioneering the future of AI-driven applications with cutting-edge technology,
            autonomous agents, and developer-first approach. Our mission is to democratize AI
            and make intelligent applications accessible to everyone.
          </p>
        </motion.div>

        {/* Enhanced Stats Section with 3D Effects */}
        <motion.div
          className={cn(
            "grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16",
            "@sm:gap-8 @lg:gap-10", // Container query responsive gaps
            "@container/stats"
          )}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className={cn("text-center", transform3D.card)}
              whileHover={{
                scale: 1.05,
                rotateY: 8,
                rotateX: 4,
                z: 20
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className={cn(
                glassVariants.strong,
                "neon-border hover:electric-pulse transition-all duration-300",
                "hover:text-glow perspective-normal transform-3d",
                "@sm:p-6", // Container query responsive padding
                "relative overflow-hidden"
              )}>
                <CardContent className="pt-6 relative z-10">
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
                    <stat.icon className="w-6 h-6 text-primary" />
                  </motion.div>
                  <div className={cn(
                    "text-2xl font-bold text-primary text-glow mb-1",
                    "@sm:text-3xl" // Container query responsive
                  )}>
                    {stat.number}
                  </div>
                  <div className={cn(
                    "text-sm text-muted-foreground",
                    "@sm:text-base" // Container query responsive
                  )}>
                    {stat.label}
                  </div>
                </CardContent>

                {/* Modern Gradient Overlay */}
                <div className={cn(
                  "absolute inset-0 opacity-5 pointer-events-none",
                  "bg-radial-gradient from-primary via-accent to-transparent",
                  "hover:opacity-10 transition-opacity duration-300"
                )} />
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced Team Section with 3D Cards */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <h3 className={cn(
            "text-2xl font-semibold text-foreground text-center mb-8",
            "@sm:text-3xl @lg:text-4xl", // Container query responsive
            "perspective-normal transform-3d"
          )}>
            Our <motion.span
              className={cn(
                "text-primary inline-block",
                transform3D.tilt
              )}
              whileHover={{
                scale: 1.05,
                rotateY: -5,
                rotateX: -2
              }}
            >
              Team
            </motion.span>
          </h3>
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-3 gap-8",
            "@sm:gap-10 @lg:gap-12", // Container query responsive gaps
            "@container/team"
          )}>
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{
                  scale: 1.02,
                  rotateY: 8,
                  rotateX: 4,
                  z: 15
                }}
                viewport={{ once: true }}
                className={cn("group", transform3D.card)}
              >
                <Card className={cn(
                  glassVariants.strong,
                  "neon-border hover:electric-pulse transition-all duration-300 h-full",
                  "group-hover:text-glow perspective-normal transform-3d",
                  "@sm:p-6", // Container query responsive padding
                  modernGradients.cyber,
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
                        {member.badge}
                      </Badge>
                    </div>
                    <CardTitle className={cn(
                      "text-lg font-semibold text-foreground",
                      "group-hover:text-primary transition-colors",
                      "@sm:text-xl" // Container query responsive
                    )}>
                      {member.name}
                    </CardTitle>
                    <CardDescription className="text-primary font-medium">
                      {member.role}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className={cn(
                      "text-muted-foreground text-sm leading-relaxed",
                      "@sm:text-base" // Container query responsive
                    )}>
                      {member.description}
                    </p>
                  </CardContent>

                  {/* Modern Conic Gradient Overlay */}
                  <div className={cn(
                    "absolute inset-0 opacity-5 pointer-events-none",
                    "bg-conic-gradient from-primary via-accent via-chart-3 to-primary",
                    "group-hover:opacity-10 transition-opacity duration-300"
                  )} />
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Enhanced CTA Section with 3D Effects */}
        <motion.div
          className={cn(
            "text-center rounded-2xl p-12 neon-border electric-pulse",
            glassVariants.ultra,
            "perspective-normal transform-3d",
            "@sm:p-16", // Container query responsive padding
            "relative overflow-hidden"
          )}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          whileHover={{
            rotateX: 2,
            rotateY: 2,
            scale: 1.01
          }}
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
              Join the AI Revolution
            </motion.span>
          </h3>
          <p className={cn(
            "text-muted-foreground mb-8 max-w-2xl mx-auto",
            "@sm:text-lg @lg:text-xl" // Container query responsive
          )}>
            Be part of the community building the future of intelligent applications.
            Contribute to our open-source projects or start building your own AI solutions.
          </p>
          <div className={cn(
            "flex flex-col sm:flex-row justify-center items-center gap-4",
            "@sm:gap-6" // Container query responsive gaps
          )}>
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
                  "electric-pulse perspective-normal transform-3d",
                  "transition-all duration-300",
                  "@sm:px-8 @sm:py-4 @sm:text-lg" // Container query responsive
                )}
              >
                <Link href="/docs">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Read Documentation
                </Link>
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
                  "lightning-trail neon-border hover:electric-pulse",
                  "perspective-normal transform-3d",
                  "transition-all duration-300",
                  "hover:shadow-[0_0_30px_var(--color-primary)]",
                  "@sm:px-8 @sm:py-4 @sm:text-lg" // Container query responsive
                )}
              >
                <Link href="https://github.com/ssdeanx/deanmachines-rsc" target="_blank">
                  <Github className="w-4 h-4 mr-2" />
                  View on GitHub
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Modern Background Gradient */}
          <div className={cn(
            "absolute inset-0 opacity-10 pointer-events-none",
            "bg-radial-gradient from-primary via-accent to-transparent",
            "animate-[holographic-shift_15s_ease-in-out_infinite]"
          )} />
        </motion.div>
      </div>
    </section>
  );
}
