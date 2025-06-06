"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Clock, AlertTriangle, Calendar } from "lucide-react"

interface ReviewStatsProps {
  user: User
}

export function ReviewStats({ user }: ReviewStatsProps) {
  const [stats, setStats] = useState({
    totalReviews: 0,
    reviewsThisWeek: 0,
    completedTasks: 0,
    extendedTasks: 0,
    cancelledTasks: 0,
    avgReviewTime: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReviewStats()
  }, [user.id])

  const loadReviewStats = async () => {
    try {
      // Получаем все логи проверок пользователя
      const { data: reviewLogs } = await supabase
        .from("review_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (reviewLogs) {
        const totalReviews = reviewLogs.length

        // Проверки за эту неделю
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const reviewsThisWeek = reviewLogs.filter((log) => new Date(log.created_at) >= weekAgo).length

        // Статистика по результатам
        const completedTasks = reviewLogs.filter((log) => log.result === "completed").length
        const extendedTasks = reviewLogs.filter((log) => log.result === "extended").length
        const cancelledTasks = reviewLogs.filter((log) => log.result === "cancelled").length

        setStats({
          totalReviews,
          reviewsThisWeek,
          completedTasks,
          extendedTasks,
          cancelledTasks,
          avgReviewTime: 0, // Можно добавить расчет среднего времени проверки
        })
      }
    } catch (error) {
      console.error("Ошибка при загрузке статистики проверок:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg lg:text-xl">Статистика проверок</CardTitle>
        <CardDescription className="text-sm">Обзор ваших проверок задач</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 lg:space-y-6 pt-0">
        {/* Основные метрики */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg mx-auto mb-2">
              <Calendar className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
            </div>
            <div className="text-lg lg:text-2xl font-bold">{stats.totalReviews}</div>
            <div className="text-xs lg:text-sm text-gray-500">Всего проверок</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg mx-auto mb-2">
              <CheckCircle className="h-5 w-5 lg:h-6 lg:w-6 text-green-600" />
            </div>
            <div className="text-lg lg:text-2xl font-bold">{stats.completedTasks}</div>
            <div className="text-xs lg:text-sm text-gray-500">Выполнено</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-yellow-100 rounded-lg mx-auto mb-2">
              <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-yellow-600" />
            </div>
            <div className="text-lg lg:text-2xl font-bold">{stats.extendedTasks}</div>
            <div className="text-xs lg:text-sm text-gray-500">Продлено</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-red-100 rounded-lg mx-auto mb-2">
              <AlertTriangle className="h-5 w-5 lg:h-6 lg:w-6 text-red-600" />
            </div>
            <div className="text-lg lg:text-2xl font-bold">{stats.cancelledTasks}</div>
            <div className="text-xs lg:text-sm text-gray-500">Отменено</div>
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="pt-3 lg:pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Проверок за неделю</span>
            <span className="font-medium text-sm lg:text-base">{stats.reviewsThisWeek}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
