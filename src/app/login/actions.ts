'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient, signOut as serverSignOut, signInWithGitHub as serverSignInWithGitHub } from '@/utility/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

/**
 * Server action for GitHub OAuth sign-in
 * Uses the server-side signInWithGitHub utility function
 */
export async function signInWithGithub() {
  await serverSignInWithGitHub()
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

/**
 * Server action for signing out the current user
 * Uses the server-side signOut utility function
 */
export async function signOut() {
  await serverSignOut()
}