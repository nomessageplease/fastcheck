"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import type { Project, Task, Executor } from "@/lib/supabase/types"
import { Header } from "./header"
import { TaskView } from "./task-view"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, CalendarDays, CalendarRange } from "lucide-react"
import { SettingsPage } from "./settings-page"
import { NotificationManager } from "./notification-manager"
import { ReviewDialog } from "./review-dialog"
import { ProjectsPage } from "./projects-page"
import { cn } from "@/lib/utils"

interface DashboardProps {
  user: User
}

const VIEW_TYPES = ["month", "week", "day"] as const
type ViewType = (typeof VIEW_TYPES)[number]

export function Dashboard({ user }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [executors, setExecutors] = useState<Executor[]>([])
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<ViewType>("day")
  const [currentPage, setCurrentPage] = useState<"dashboard" | "settings" | "projects">("dashboard")
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewTaskId, setReviewTaskId] = useState<string | undefined>(undefined)

  // Состояния для свайпов
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchCurrent, setTouchCurrent] = useState<{ x: number; y: number } | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Минимальное расстояние свайпа
  const minSwipeDistance = 80
  const maxSwipeDistance = 200

  useEffect(() => {
    loadData()
    setupRealtimeSubscriptions()
  }, [user.id])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash === "settings") {
        setCurrentPage("settings")
      } else if (hash === "projects") {
        setCurrentPage("projects")
      } else {
        setCurrentPage("dashboard")
      }
    }

    handleHashChange()
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  const loadData = async () => {
    try {
      const [projectsData, tasksData, executorsData] = await Promise.all([
        supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("executors").select("*").eq("user_id", user.id).order("name"),
      ])

      if (projectsData.data) setProjects(projectsData.data)
      if (tasksData.data) setTasks(tasksData.data)
      if (executorsData.data) setExecutors(executorsData.data)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscriptions = () => {
    // Подписка на изменения проектов
    const projectsSubscription = supabase
      .channel("projects-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadData()
        },
      )
      .subscribe()

    // Подписка на изменения задач
    const tasksSubscription = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadData()
        },
      )
      .subscribe()

    // Подписка на изменения исполнителей
    const executorsSubscription = supabase
      .channel("executors-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "executors",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadData()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(projectsSubscription)
      supabase.removeChannel(tasksSubscription)
      supabase.removeChannel(executorsSubscription)
    }
  }

  const handleOpenReview = (taskId?: string) => {
    setReviewTaskId(taskId)
    setReviewDialogOpen(true)
  }

  // Обработчики свайпов
  const onTouchStart = (e: React.TouchEvent) => {
    if (currentPage !== "dashboard" || isTransitioning) return

    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
    setTouchCurrent({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
    setIsDragging(false)
    setSwipeOffset(0)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || currentPage !== "dashboard" || isTransitioning) return

    const currentTouch = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    }

    setTouchCurrent(currentTouch)

    const distanceX = currentTouch.x - touchStart.x
    const distanceY = currentTouch.y - touchStart.y

    // Проверяем, что это горизонтальный свайп
    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > 10) {
      setIsDragging(true)

      // Ограничиваем offset
      const clampedOffset = Math.max(-maxSwipeDistance, Math.min(maxSwipeDistance, distanceX))
      setSwipeOffset(clampedOffset)

      // Предотвращаем скролл страницы
      e.preventDefault()
    }
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchCurrent || currentPage !== "dashboard" || isTransitioning) return

    const distanceX = touchCurrent.x - touchStart.x
    const distanceY = touchCurrent.y - touchStart.y
    const isLeftSwipe = distanceX < -minSwipeDistance
    const isRightSwipe = distanceX > minSwipeDistance

    // Проверяем, что горизонтальный свайп больше вертикального
    if (Math.abs(distanceX) > Math.abs(distanceY) && isDragging) {
      const currentIndex = VIEW_TYPES.indexOf(viewType)

      if (isLeftSwipe && currentIndex < VIEW_TYPES.length - 1) {
        // Свайп влево - следующий вид
        changeViewWithAnimation(VIEW_TYPES[currentIndex + 1])
      } else if (isRightSwipe && currentIndex > 0) {
        // Свайп вправо - предыдущий вид
        changeViewWithAnimation(VIEW_TYPES[currentIndex - 1])
      }
    }

    // Сброс состояний
    setTouchStart(null)
    setTouchCurrent(null)
    setSwipeOffset(0)
    setIsDragging(false)
  }

  const changeViewWithAnimation = (newViewType: ViewType) => {
    if (isTransitioning) return

    setIsTransitioning(true)
    setViewType(newViewType)

    // Добавляем вибрацию для обратной связи
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    // Убираем состояние анимации через короткое время
    setTimeout(() => {
      setIsTransitioning(false)
    }, 400)
  }

  const handleTabChange = (value: string) => {
    if (!isTransitioning) {
      changeViewWithAnimation(value as ViewType)
    }
  }

  // Вычисляем стили для свайп-анимации
  const getSwipeStyles = () => {
    if (!isDragging || swipeOffset === 0) return {}

    const opacity = 1 - (Math.abs(swipeOffset) / maxSwipeDistance) * 0.3
    const scale = 1 - (Math.abs(swipeOffset) / maxSwipeDistance) * 0.05

    return {
      transform: `translateX(${swipeOffset}px) scale(${scale})`,
      opacity,
      transition: isTransitioning ? "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} currentPage={currentPage} loadData={loadData} />

      {/* Менеджер уведомлений */}
      <NotificationManager user={user} tasks={tasks} projects={projects} onOpenReview={handleOpenReview} />

      {currentPage === "settings" ? (
        <div className="p-6 flex-1 overflow-y-auto">
          <SettingsPage user={user} projects={projects} executors={executors} onDataChange={loadData} />
        </div>
      ) : currentPage === "projects" ? (
        <div className="p-6 flex-1 overflow-y-auto">
          <ProjectsPage user={user} projects={projects} executors={executors} onDataChange={loadData} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 lg:p-6 pb-0">
            <Tabs value={viewType} onValueChange={handleTabChange} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger
                  value="month"
                  className={cn(
                    "flex items-center gap-2 transition-all duration-300",
                    isTransitioning && viewType === "month" && "scale-105",
                  )}
                >
                  <CalendarRange className="h-4 w-4" />
                  Месяц
                </TabsTrigger>
                <TabsTrigger
                  value="week"
                  className={cn(
                    "flex items-center gap-2 transition-all duration-300",
                    isTransitioning && viewType === "week" && "scale-105",
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                  Неделя
                </TabsTrigger>
                <TabsTrigger
                  value="day"
                  className={cn(
                    "flex items-center gap-2 transition-all duration-300",
                    isTransitioning && viewType === "day" && "scale-105",
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  День
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Контейнер календаря с фиксированной высотой */}
          <div
            className="flex-1 min-h-0 px-3 lg:px-6 pb-3 lg:pb-6"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={getSwipeStyles()}
          >
            <div className="h-full overflow-y-auto">
              {viewType === "month" && (
                <TaskView
                  tasks={tasks}
                  projects={projects}
                  executors={executors}
                  user={user}
                  viewType="month"
                  onTasksChange={loadData}
                />
              )}
              {viewType === "week" && (
                <TaskView
                  tasks={tasks}
                  projects={projects}
                  executors={executors}
                  user={user}
                  viewType="week"
                  onTasksChange={loadData}
                />
              )}
              {viewType === "day" && (
                <TaskView
                  tasks={tasks}
                  projects={projects}
                  executors={executors}
                  user={user}
                  viewType="day"
                  onTasksChange={loadData}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Глобальный диалог проверки */}
      <ReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        user={user}
        onReviewComplete={loadData}
        specificTaskId={reviewTaskId}
      />
    </div>
  )
}
