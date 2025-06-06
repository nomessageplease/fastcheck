"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Обрабатываем callback от Supabase
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Error in auth callback:", error)
          router.push("/?error=auth_callback_error")
          return
        }

        if (data.session) {
          console.log("Auth callback successful, redirecting to dashboard")
          router.push("/")
        } else {
          console.log("No session found, redirecting to login")
          router.push("/")
        }
      } catch (error) {
        console.error("Unexpected error in auth callback:", error)
        router.push("/?error=unexpected_error")
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Завершение входа...</p>
      </div>
    </div>
  )
}
