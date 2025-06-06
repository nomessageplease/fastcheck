"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Calendar, CheckCircle, AlertTriangle, Users, FolderOpen } from "lucide-react"

interface UsageStatsProps {
  user: User
}

export function UsageStats({ user }: UsageStatsProps) {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    urgentTasks: 0,
    totalExecutors: 0,
    tasksThisWeek: 0,
    completionRate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [user.id])

  const loadStats = async () => {
    try {
      // Получаем статистику проектов
      const { count: projectsCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      // Получаем статистику задач
      const { data: tasks } = await supabase
        .from("tasks")
        .select("status, is_urgent, created_at")
        .eq("user_id", user.id)

      // Получаем статистику исполнителей
      const { count: executorsCount } = await supabase
        .from("executors")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      if (tasks) {
        const totalTasks = tasks.length
        const completedTasks = tasks.filter((task) => task.status === "completed").length
        const urgentTasks = tasks.filter((task) => task.is_urgent && task.status !== "completed").length

        // Задачи за эту неделю
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const tasksThisWeek = tasks.filter((task) => new Date(task.created_at) >= weekAgo).length

        // Процент выполнения
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        setStats({
          totalProjects: projectsCount || 0,
          totalTasks,
          completedTasks,
          urgentTasks,
          totalExecutors: executorsCount || 0,
          tasksThisWeek,
          completionRate,
        })
      }
    } catch (error) {
      console.error("Ошибка при загрузке статистики:", error)
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
        <CardTitle className="text-lg lg:text-xl">Статистика использования</CardTitle>
        <CardDescription className="text-sm">Обзор вашей активности в приложении</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 lg:space-y-6 pt-0">
        {/* Основные метрики */}
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg mx-auto mb-2">
              <FolderOpen className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
            </div>
            <div className="text-lg lg:text-2xl font-bold">{stats.totalProjects}</div>
            <div className="text-xs lg:text-sm text-gray-500">Проектов</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg mx-auto mb-2">
              <CheckCircle className="h-5 w-5 lg:h-6 lg:w-6 text-green-600" />
            </div>
            <div className="text-lg lg:text-2xl font-bold">{stats.totalTasks}</div>
            <div className="text-xs lg:text-sm text-gray-500">Задач</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-lg mx-auto mb-2">
              <Users className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600" />
            </div>
            <div className="text-lg lg:text-2xl font-bold">{stats.totalExecutors}</div>
            <div className="text-xs lg:text-sm text-gray-500">Исполнителей</div>
          </div>
        </div>

        {/* Прогресс выполнения */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Процент выполнения задач</span>
            <span>{stats.completionRate}%</span>
          </div>
          <Progress value={stats.completionRate} className="h-2" />
        </div>

        {/* Дополнительные метрики */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 pt-3 lg:pt-4 border-t">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-6 h-6 lg:w-8 lg:h-8 bg-yellow-100 rounded">
              <AlertTriangle className="h-3 w-3 lg:h-4 lg:w-4 text-yellow-600" />
            </div>
            <div>
              <div className="font-medium text-sm lg:text-base">{stats.urgentTasks}</div>
              <div className="text-xs lg:text-sm text-gray-500">Срочных задач</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-6 h-6 lg:w-8 lg:h-8 bg-blue-100 rounded">
              <Calendar className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-sm lg:text-base">{stats.tasksThisWeek}</div>
              <div className="text-xs lg:text-sm text-gray-500">Задач за неделю</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
