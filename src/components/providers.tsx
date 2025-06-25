"use client";

import { ThemeProvider } from "next-themes";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Client-side providers wrapper component
 *
 * This component wraps all client-side providers that use React Context
 * to avoid the "React Context is unavailable in Server Components" error.
 *
 * @param children - The child components to wrap with providers
 * @returns JSX element with all necessary providers
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </ThemeProvider>
  );
}
