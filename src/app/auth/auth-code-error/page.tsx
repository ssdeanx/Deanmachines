import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Authentication error page
 * Displayed when OAuth authentication fails
 * Generated on 2024-12-28
 */
export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Authentication Error
          </h1>
          <p className="mt-4 text-muted-foreground">
            There was an error during the authentication process. This could be due to:
          </p>
          <ul className="mt-4 list-disc text-left text-sm text-muted-foreground">
            <li>The authentication request was cancelled</li>
            <li>An invalid authorization code was received</li>
            <li>A network error occurred</li>
          </ul>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/login">
              Try Again
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link href="/">
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
