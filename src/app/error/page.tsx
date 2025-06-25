"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, Github, Shield, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Authentication Error Page
 * 
 * A cutting-edge error page with modern animations and effects
 * for handling NextAuth authentication errors with style.
 */
export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getErrorDetails = (errorType: string | null) => {
    switch (errorType) {
      case 'Configuration':
        return {
          title: 'Configuration Error',
          description: 'There is a problem with the server configuration.',
          icon: Shield,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20'
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          description: 'You do not have permission to sign in.',
          icon: Shield,
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/20'
        };
      case 'Verification':
        return {
          title: 'Verification Error',
          description: 'The verification token has expired or has already been used.',
          icon: AlertTriangle,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20'
        };
      case 'Default':
      default:
        return {
          title: 'Authentication Error',
          description: 'An unexpected error occurred during authentication.',
          icon: Zap,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20'
        };
    }
  };

  const errorDetails = getErrorDetails(error);
  const IconComponent = errorDetails.icon;

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Main error card */}
        <div className={`
          ${errorDetails.bgColor} ${errorDetails.borderColor}
          border backdrop-blur-xl rounded-2xl p-8 shadow-2xl
          transform transition-all duration-1000 ease-out
          ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
        `}>
          {/* Error icon with animation */}
          <div className="flex justify-center mb-6">
            <div className={`
              ${errorDetails.bgColor} ${errorDetails.borderColor}
              border rounded-full p-4 animate-bounce
            `}>
              <IconComponent className={`w-8 h-8 ${errorDetails.color}`} />
            </div>
          </div>

          {/* Error content */}
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-white neon-text">
              {errorDetails.title}
            </h1>
            
            <p className="text-gray-300 leading-relaxed">
              {errorDetails.description}
            </p>

            {error && (
              <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                <p className="text-sm text-gray-400 font-mono">
                  Error Code: <span className="text-red-400">{error}</span>
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-8 space-y-3">
            <Link
              href="/signin"
              className="
                w-full flex items-center justify-center gap-2 px-6 py-3
                bg-primary hover:bg-primary/80 text-black font-semibold
                rounded-xl transition-all duration-300 transform hover:scale-105
                shadow-lg hover:shadow-primary/25 neon-glow
              "
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Link>

            <Link
              href="/"
              className="
                w-full flex items-center justify-center gap-2 px-6 py-3
                bg-gray-800 hover:bg-gray-700 text-white font-semibold
                rounded-xl transition-all duration-300 transform hover:scale-105
                border border-gray-600 hover:border-gray-500
              "
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>

            <Link
              href="https://github.com/ssdean/dean-machines-rsc/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="
                w-full flex items-center justify-center gap-2 px-6 py-3
                bg-transparent hover:bg-gray-800/50 text-gray-400 hover:text-white
                rounded-xl transition-all duration-300 transform hover:scale-105
                border border-gray-700 hover:border-gray-600
              "
            >
              <Github className="w-4 h-4" />
              Report Issue
            </Link>
          </div>
        </div>

        {/* Additional help text */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            If this problem persists, please contact support or check our{' '}
            <Link href="/docs" className="text-primary hover:text-primary/80 underline">
              documentation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
