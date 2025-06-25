import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Server-side sign out utility function
 * Handles user sign out and redirects to home page
 *
 * @throws {Error} If sign out fails
 * @returns {Promise<never>} Redirects to home page, never returns
 */
export async function signOut(): Promise<never> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Error signing out:', error.message)
      throw new Error('Failed to sign out')
    }
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
  redirect('/')
}

/**
 * Server-side GitHub OAuth sign-in utility function
 * Initiates GitHub OAuth sign-in flow with redirect to GitHub
 *
 * @throws {Error} If GitHub OAuth initiation fails
 * @returns {Promise<never>} Redirects to GitHub OAuth, never returns
 */
export async function signInWithGitHub(): Promise<never> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: process.env.NEXT_PUBLIC_SUPABASE_GITHUB_CALLBACK_URL
      }
    })

    if (error) {
      console.error('Error initiating GitHub OAuth:', error.message)
      throw new Error('Failed to initiate GitHub OAuth')
    }

    if (data.url) {
      redirect(data.url)
    } else {
      throw new Error('No redirect URL received from GitHub OAuth')
    }
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    throw error
  }
}
