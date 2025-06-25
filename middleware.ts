import { type NextRequest } from 'next/server'
import { updateSession } from './src/utility/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - auth/error (error page)
     * - auth/confirm (confirm page)
     * - any static image files (svg, png, jpg, jpeg, gif, webp)
     * This pattern allows you to protect all other routes in your application
     * while still allowing access to static files and specific pages.
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)|login|auth/error$|auth/confirm$).*)',
  ],
}