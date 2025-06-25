'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LightningCursorProps {
  enabled?: boolean;
  className?: string;
}

/**
 * Simple Lightning Cursor component with electric glow effect
 *
 * Features:
 * - Lightweight cursor glow effect
 * - No mouse tracking dependencies
 * - Performance optimized
 * - Theme-aware electric styling
 *
 * @author Dean Machines Team
 * @date 2025-06-20
 * @version 2.0.0
 * @model Claude Sonnet 4
 */
export function LightningCursor({ enabled = true, className = '' }: LightningCursorProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled]);

  if (!enabled || !isVisible) return null;

  return (
    <motion.div
      className={`fixed pointer-events-none z-50 ${className}`}
      style={{
        left: mousePosition.x - 16,
        top: mousePosition.y - 16,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 0.6, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Electric cursor glow */}
      <div className="w-8 h-8 relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm animate-pulse" />
        <div className="absolute inset-1 bg-primary/30 rounded-full blur-xs" />
        <div className="absolute inset-2 bg-primary/40 rounded-full" />
      </div>
    </motion.div>
  );
}
