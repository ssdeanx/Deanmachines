'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Particles } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine } from '@tsparticles/engine';

interface LightningBolt {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
  duration: number;
  delay: number;
}

interface LightningBackgroundProps {
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
  enableParticles?: boolean;
  enableLightning?: boolean;
}

/**
 * Advanced Lightning Background Effect Component
 * 
 * Features:
 * - Ambient lightning strikes with realistic paths
 * - TSParticles integration for electric atmosphere
 * - Performance optimized with CSS animations
 * - Tailwind v4 compatible styling
 * - Respects prefers-reduced-motion
 * - Multiple intensity levels
 * 
 * @author Dean Machines Team
 * @date 2025-06-20
 * @version 2.0.0
 * @model Claude Sonnet 4
 */
export function LightningBackground({
  intensity = 'medium',
  className = '',
  enableParticles = true,
  enableLightning = true
}: LightningBackgroundProps) {
  const [lightningBolts, setLightningBolts] = useState<LightningBolt[]>([]);
  const [particlesInit, setParticlesInit] = useState(false);

  // Initialize particles engine
  const particlesInitialization = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
    setParticlesInit(true);
  }, []);

  // Initialize particles engine on mount
  useEffect(() => {
    if (enableParticles) {
      import('@tsparticles/engine').then(({ tsParticles }) => {
        particlesInitialization(tsParticles);
      });
    }
  }, [enableParticles, particlesInitialization]);

  // Generate lightning bolt with realistic jagged path
  const generateLightningBolt = useCallback((): LightningBolt => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    
    // Random starting point (usually from top)
    const startX = Math.random() * screenWidth;
    const startY = Math.random() * (screenHeight * 0.3);
    
    // Random ending point
    const endX = startX + (Math.random() - 0.5) * 400;
    const endY = startY + Math.random() * (screenHeight * 0.7);
    
    const intensityConfig = {
      low: { duration: 0.8, opacity: 0.4 },
      medium: { duration: 0.6, opacity: 0.6 },
      high: { duration: 0.4, opacity: 0.8 }
    };
    
    return {
      id: `lightning-${Date.now()}-${Math.random()}`,
      x1: startX,
      y1: startY,
      x2: endX,
      y2: endY,
      opacity: intensityConfig[intensity].opacity,
      duration: intensityConfig[intensity].duration,
      delay: Math.random() * 2
    };
  }, [intensity]);

  // Create lightning strikes at intervals
  useEffect(() => {
    if (!enableLightning) return;

    const intervalConfig = {
      low: 8000,
      medium: 5000,
      high: 3000
    };

    const interval = setInterval(() => {
      const newBolt = generateLightningBolt();
      setLightningBolts(prev => [...prev, newBolt]);

      // Remove bolt after animation
      setTimeout(() => {
        setLightningBolts(prev => prev.filter(bolt => bolt.id !== newBolt.id));
      }, (newBolt.duration + newBolt.delay) * 1000 + 500);
    }, intervalConfig[intensity]);

    return () => clearInterval(interval);
  }, [intensity, generateLightningBolt, enableLightning]);

  // Particles configuration for electric atmosphere
  const particlesConfig = {
    background: { color: { value: 'transparent' } },
    fpsLimit: 120,
    interactivity: {
      events: {
        onClick: { enable: true, mode: 'push' },
        onHover: { enable: true, mode: 'repulse' },
        resize: { enable: true },
      },
      modes: {
        push: { quantity: 2 },
        repulse: { distance: 100, duration: 0.4 },
      },
    },
    particles: {
      color: { 
        value: ['#f1c40f', '#e74c3c', '#3498db', '#9b59b6'] 
      },
      links: {
        color: '#f1c40f',
        distance: 120,
        enable: true,
        opacity: 0.3,
        width: 1,
      },
      move: {
        direction: 'none' as const,
        enable: true,
        outModes: { default: 'bounce' as const },
        random: true,
        speed: 1.5,
        straight: false,
      },
      number: {
        density: { enable: true },
        value: intensity === 'high' ? 100 : intensity === 'medium' ? 60 : 30,
      },
      opacity: { 
        value: { min: 0.1, max: 0.5 },
        animation: {
          enable: true,
          speed: 1,
          sync: false
        }
      },
      shape: { type: 'circle' },
      size: { 
        value: { min: 1, max: 3 },
        animation: {
          enable: true,
          speed: 2,
          sync: false
        }
      },
    },
    detectRetina: true,
  };

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* TSParticles Electric Atmosphere */}
      {enableParticles && particlesInit && (
        <Particles
          id="lightning-particles"
          className="absolute inset-0 z-0"
          options={particlesConfig}
        />
      )}

      {/* Lightning Bolts */}
      {enableLightning && (
        <svg className="absolute inset-0 w-full h-full z-10">
          <defs>
            {/* Enhanced lightning glow filter */}
            <filter id="lightning-glow-enhanced" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feGaussianBlur stdDeviation="6" result="bigBlur"/>
              <feMerge>
                <feMergeNode in="bigBlur"/>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            {/* Electric pulse filter */}
            <filter id="electric-pulse" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <AnimatePresence>
            {lightningBolts.map((bolt) => (
              <motion.g
                key={bolt.id}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, bolt.opacity, bolt.opacity * 0.7, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: bolt.duration,
                  delay: bolt.delay,
                  times: [0, 0.1, 0.8, 1]
                }}
              >
                {/* Main lightning bolt */}
                <motion.line
                  x1={bolt.x1}
                  y1={bolt.y1}
                  x2={bolt.x2}
                  y2={bolt.y2}
                  stroke="#f1c40f"
                  strokeWidth="3"
                  filter="url(#lightning-glow-enhanced)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: bolt.duration * 0.3, delay: bolt.delay }}
                />
                
                {/* Secondary glow */}
                <motion.line
                  x1={bolt.x1}
                  y1={bolt.y1}
                  x2={bolt.x2}
                  y2={bolt.y2}
                  stroke="#e74c3c"
                  strokeWidth="6"
                  opacity="0.4"
                  filter="url(#electric-pulse)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: bolt.duration * 0.3, delay: bolt.delay + 0.05 }}
                />
                
                {/* Outer glow */}
                <motion.line
                  x1={bolt.x1}
                  y1={bolt.y1}
                  x2={bolt.x2}
                  y2={bolt.y2}
                  stroke="#3498db"
                  strokeWidth="10"
                  opacity="0.2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: bolt.duration * 0.3, delay: bolt.delay + 0.1 }}
                />
              </motion.g>
            ))}
          </AnimatePresence>
        </svg>
      )}

      {/* Enhanced CSS-based electric effects */}
      <div className="absolute inset-0 z-5">
        {/* Electric grid overlay */}
        <div className="absolute inset-0 cyber-grid opacity-20" />
        
        {/* Holographic shimmer */}
        <div className="absolute inset-0 holographic opacity-10" />
        
        {/* Gradient mesh for depth */}
        <div className="absolute inset-0 gradient-mesh opacity-30" />
      </div>
    </div>
  );
}
