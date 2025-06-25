// Enhanced with Tailwind v4 Features - June 20, 2025
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ThemeSwitch } from '@/components/ui/theme-switch';
import { useState } from 'react';
import React from 'react';
import { LogOut, User } from 'lucide-react';
import { cn, glassVariants, transform3D } from '@/lib/tailwind-v4-utils';

interface TopNavbarProps {
  className?: string;
}

/**
 * Enhanced TopNavbar component with Tailwind v4 cutting-edge features
 *
 * Features:
 * - Modern glass morphism with OKLCH colors
 * - 3D transform interactions
 * - Container query responsive design
 * - Electric neon effects with CSS animations
 * - Performance optimized scroll detection
 *
 * @author Dean Machines Team
 * @date 2025-06-20
 * @version 2.0.0
 * @model Claude Sonnet 4
 */
export function TopNavbar({ className }: TopNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  // Enhanced scroll listener with performance optimization
  React.useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    console.log('Sign out disabled');
  };

  return (
    <motion.nav
      className={cn(
        glassVariants.ultra,
        "sticky top-0 z-50 border-b",
        "border-[color-mix(in_oklch,var(--color-primary)_20%,transparent)]",
        "bg-[color-mix(in_oklch,var(--color-background)_80%,transparent)]",
        "supports-[backdrop-filter]:bg-[color-mix(in_oklch,var(--color-background)_60%,transparent)]",
        isScrolled && "neon-glow electric-pulse",
        "@container/navbar", // Container query support
        "perspective-normal transform-3d",
        className
      )}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      whileHover={{
        rotateX: 1,
        scale: 1.001
      }}
    >      <div className={cn(
        "container mx-auto px-4 sm:px-6 lg:px-8",
        "@container/nav-content"
      )}>
        <div className={cn(
          "flex items-center justify-between h-16",
          "@sm:h-18 @lg:h-20" // Container query responsive height
        )}>
          <motion.div
            className={cn(
              "flex items-center",
              transform3D.float
            )}
            whileHover={{
              scale: 1.05,
              rotateY: 5,
              rotateX: 2
            }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Link
              href="/"
              className={cn(
                "text-2xl font-bold text-primary neon-text floating",
                "@sm:text-3xl", // Container query responsive
                "perspective-near transform-3d"
              )}
            >
              <motion.span
                className="inline-block"
                whileHover={{ rotateY: 10 }}
              >
                Dean
              </motion.span>
              <motion.span
                className="text-foreground inline-block"
                whileHover={{ rotateY: -10 }}
              >
                Machines
              </motion.span>
            </Link>
          </motion.div>

          <div className={cn(
            "hidden md:flex items-center space-x-8",
            "@lg:space-x-10" // Container query responsive spacing
          )}>
            {['Features', 'Solutions', 'About', 'Docs'].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className={transform3D.tilt}
                whileHover={{
                  rotateY: 5,
                  rotateX: 2,
                  scale: 1.05
                }}
              >
                <Link
                  href={`/${item.toLowerCase()}`}
                  className={cn(
                    "relative text-foreground hover:text-primary transition-all duration-300 group",
                    "perspective-near transform-3d",
                    "@lg:text-lg" // Container query responsive
                  )}
                >
                  {item}
                  <span className={cn(
                    "absolute -bottom-1 left-0 w-0 h-0.5 bg-primary",
                    "group-hover:w-full transition-all duration-300 neon-glow",
                    "group-hover:shadow-[0_0_10px_var(--color-primary)]"
                  )}></span>
                </Link>
              </motion.div>
            ))}

            {/* Enhanced Playground Button */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className={transform3D.card}
              whileHover={{
                scale: 1.05,
                rotateY: 8,
                rotateX: 4
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="default"
                size="sm"
                asChild
                className={cn(
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "neon-glow energy-pulse",
                  "perspective-normal transform-3d",
                  "transition-all duration-300",
                  "hover:shadow-[0_0_20px_var(--color-primary)]",
                  "@lg:px-6 @lg:py-3" // Container query responsive
                )}
              >
                <Link href="/p">🚀 Playground</Link>
              </Button>
            </motion.div>
          </div>
          <div className={cn(
            "flex items-center space-x-4",
            "@lg:space-x-6" // Container query responsive spacing
          )}>
            {/* Enhanced Theme Switch */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className={transform3D.float}
              whileHover={{
                rotateY: 10,
                rotateX: 5,
                scale: 1.05
              }}
            >
              <ThemeSwitch />
            </motion.div>

            {/* Authentication Buttons */}
            {false ? (
              // Loading state (disabled)
              <div className="hidden sm:flex items-center space-x-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : false ? (
              // Authenticated state (disabled)
              <div className="hidden sm:flex items-center space-x-2">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="glass-effect border-primary/30 hover:border-primary/60"
                  >
                    <User className="w-4 h-4 mr-2" />
                    User
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="glass-effect border-primary/30 hover:border-primary/60"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </motion.div>
              </div>
            ) : (
              // Enhanced Unauthenticated state with 3D effects
              <div className={cn(
                "hidden sm:flex items-center space-x-2",
                "@lg:space-x-3" // Container query responsive spacing
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
                    variant="outline"
                    size="sm"
                    asChild
                    className={cn(
                      glassVariants.medium,
                      "border-[color-mix(in_oklch,var(--color-primary)_30%,transparent)]",
                      "hover:border-[color-mix(in_oklch,var(--color-primary)_60%,transparent)]",
                      "perspective-normal transform-3d",
                      "transition-all duration-300",
                      "hover:shadow-[0_0_15px_var(--color-primary)]"
                    )}
                  >
                    <Link href="/login">Sign In</Link>
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
                    variant="default"
                    size="sm"
                    asChild
                    className={cn(
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                      "neon-glow energy-pulse",
                      "perspective-normal transform-3d",
                      "transition-all duration-300",
                      "hover:shadow-[0_0_20px_var(--color-primary)]"
                    )}
                  >
                    <Link href="/login">Sign Up</Link>
                  </Button>
                </motion.div>
              </div>
            )}

            {/* Enhanced Mobile Menu Button */}
            <motion.div
              className="md:hidden ml-2"
              whileHover={{
                scale: 1.05,
                rotateY: 10,
                rotateX: 5
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  glassVariants.medium,
                  "border-[color-mix(in_oklch,var(--color-primary)_30%,transparent)]",
                  "perspective-normal transform-3d",
                  "transition-all duration-300",
                  "hover:shadow-[0_0_15px_var(--color-primary)]"
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
