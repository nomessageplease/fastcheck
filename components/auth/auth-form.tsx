"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")

  const validateForm = () => {
    if (!email || !password) {
      setMessage({ type: "error", text: "Пожалуйста, заполните все поля" })
      return false
    }

    if (password.length < 6) {
      setMessage({ type: "error", text: "Пароль должен содержать минимум 6 символов" })
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setMessage({ type: "error", text: "Пожалуйста, введите корректный email" })
      return false
    }

    return true
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!validateForm()) return

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      if (data.user && !data.user.email_confirmed_at) {
        setMessage({
          type: "success",
          text: "Регистрация успешна! Проверьте вашу почту для подтверждения.",
        })
      } else if (data.user) {
        setMessage({
          type: "success",
          text: "Добро пожаловать! Регистрация завершена успешно.",
        })
      }
    } catch (error: any) {
      console.error("SignUp error:", error)
      let errorMessage = "Произошла ошибка при регистрации"

      if (error.message?.includes("already registered")) {
        errorMessage = "Пользователь с таким email уже зарегистрирован"
      } else if (error.message?.includes("invalid email")) {
        errorMessage = "Некорректный email адрес"
      } else if (error.message?.includes("weak password")) {
        errorMessage = "Слишком слабый пароль"
      } else if (error.message) {
        errorMessage = error.message
      }

      setMessage({ type: "error", text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!validateForm()) return

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) throw error

      if (data.user) {
        setMessage({
          type: "success",
          text: "Добро пожаловать! Вы успешно вошли в систему.",
        })
        // Перенаправление произойдет автоматически через AuthProvider
      }
    } catch (error: any) {
      console.error("SignIn error:", error)
      let errorMessage = "Произошла ошибка при входе"

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Неверный email или пароль"
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Пожалуйста, подтвердите ваш email"
      } else if (error.message?.includes("Too many requests")) {
        errorMessage = "Слишком много попыток входа. Попробуйте позже"
      } else if (error.message) {
        errorMessage = error.message
      }

      setMessage({ type: "error", text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setMessage({ type: "error", text: "Введите email для восстановления" })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(resetEmail)) {
      setMessage({ type: "error", text: "Введите корректный email" })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setMessage({
        type: "success",
        text: "Ссылка для восстановления пароля отправлена на ваш email",
      })
      setShowForgotPassword(false)
      setResetEmail("")
    } catch (error: any) {
      console.error("Reset password error:", error)
      setMessage({
        type: "error",
        text: error.message || "Ошибка при отправке ссылки восстановления",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">FastCheck</CardTitle>
          <CardDescription>Минималистичный трекер задач</CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert
              className={`mb-4 ${message.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Вход</TabsTrigger>
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Вход...
                    </>
                  ) : (
                    "Войти"
                  )}
                </Button>
                <div className="text-center mt-4">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-gray-600 hover:text-gray-800"
                    onClick={() => setShowForgotPassword(!showForgotPassword)}
                    disabled={loading}
                  >
                    Забыли пароль?
                  </Button>
                </div>

                {showForgotPassword && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium mb-2">Восстановление пароля</h3>
                    <p className="text-xs text-gray-600 mb-3">Введите ваш email для получения ссылки восстановления</p>
                    <div className="space-y-3">
                      <Input
                        type="email"
                        placeholder="Ваш email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={loading}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleResetPassword}
                          disabled={loading || !resetEmail}
                          size="sm"
                          className="flex-1"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Отправка...
                            </>
                          ) : (
                            "Отправить"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowForgotPassword(false)}
                          disabled={loading}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                      placeholder="Минимум 6 символов"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Регистрация...
                    </>
                  ) : (
                    "Зарегистрироваться"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
