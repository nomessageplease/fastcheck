import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Серверный клиент для Server Components
export function createServerSupabaseClient() {
  return createServerComponentClient({
    cookies,
  })
}

// Функция для получения пользователя на сервере
export async function getServerUser() {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error("Server auth error:", error)
      return null
    }

    return session?.user ?? null
  } catch (error) {
    console.error("Error getting server user:", error)
    return null
  }
}
