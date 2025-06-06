"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { AuthForm } from "@/components/auth/auth-form"
import { Dashboard } from "@/components/dashboard/dashboard"

export default function Home() {
  const { user, loading } = useAuth()

  // Показываем загрузку
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  // Показываем соответствующий компонент
  return user ? <Dashboard user={user} /> : <AuthForm />
}
