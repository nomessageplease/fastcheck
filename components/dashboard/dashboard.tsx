"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import type { Project, Task, Executor } from "@/lib/supabase/types"
import { Header } from "./header"
import { TaskView } from "./task-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, CalendarDays, CalendarRange } from "lucide-react"
import { SettingsPage } from "./settings-page"
import { NotificationManager } from "./notification-manager"
import { ReviewDialog } from "./review-dialog"
import { ProjectsPage } from "./projects-page"

interface DashboardProps {
  user: User
}

export function Dashboard({ user }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [executors, setExecutors] = useState<Executor[]>([])
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<"month" | "week" | "day">("day")
  const [currentPage, setCurrentPage] = useState<"dashboard" | "settings" | "projects">("dashboard")
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewTaskId, setReviewTaskId] = useState<string | undefined>(undefined)

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} currentPage={currentPage} loadData={loadData} />

      {/* Менеджер уведомлений */}
      <NotificationManager user={user} tasks={tasks} projects={projects} onOpenReview={handleOpenReview} />

      {currentPage === "settings" ? (
        <div className="p-6">
          <SettingsPage user={user} projects={projects} executors={executors} onDataChange={loadData} />
        </div>
      ) : currentPage === "projects" ? (
        <div className="p-6">
          <ProjectsPage user={user} projects={projects} executors={executors} onDataChange={loadData} />
        </div>
      ) : (
        <div className="p-3 lg:p-6">
          <Tabs defaultValue="day" className="w-full" onValueChange={(value) => setViewType(value as any)}>
            <TabsList>
              <TabsTrigger value="month" className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4" />
                Месяц
              </TabsTrigger>
              <TabsTrigger value="week" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Неделя
              </TabsTrigger>
              <TabsTrigger value="day" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                День
              </TabsTrigger>
            </TabsList>

            <TabsContent value="month" className="mt-6">
              <TaskView
                tasks={tasks}
                projects={projects}
                executors={executors}
                user={user}
                viewType="month"
                onTasksChange={loadData}
              />
            </TabsContent>

            <TabsContent value="week" className="mt-6">
              <TaskView
                tasks={tasks}
                projects={projects}
                executors={executors}
                user={user}
                viewType="week"
                onTasksChange={loadData}
              />
            </TabsContent>

            <TabsContent value="day" className="mt-6">
              <TaskView
                tasks={tasks}
                projects={projects}
                executors={executors}
                user={user}
                viewType="day"
                onTasksChange={loadData}
              />
            </TabsContent>
          </Tabs>
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
