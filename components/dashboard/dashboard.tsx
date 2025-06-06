"use client"

import { useState, useEffect } from "react"
import { Header } from "./header"
import { ProjectsPage } from "./projects-page"
import { SettingsPage } from "./settings-page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, CheckCircle, Clock, Plus, TrendingUp } from "lucide-react"
import { MonthView } from "./calendar-views/month-view"
import { DayView } from "./calendar-views/day-view"
import { WeekView } from "./calendar-views/week-view"
import { TaskDialog } from "./task-dialog"
import { NotificationManager } from "./notification-manager"
import { supabase } from "@/lib/supabase/client"
import type { Project, Task } from "@/lib/supabase/types"

export function Dashboard() {
  const [currentView, setCurrentView] = useState("dashboard")
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("month")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })

      if (projectsError) throw projectsError
      setProjects(projectsData || [])

      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*, project:projects(*)")
        .order("created_at", { ascending: false })

      if (tasksError) throw tasksError
      setTasks(tasksData || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const completedTasks = tasks.filter((task) => task.status === "completed").length
  const pendingTasks = tasks.filter((task) => task.status === "pending").length
  const todayTasks = tasks.filter((task) => {
    const taskDate = new Date(task.start_date)
    const today = new Date()
    return taskDate.toDateString() === today.toDateString()
  }).length

  const renderMainContent = () => {
    switch (currentView) {
      case "projects":
        return <ProjectsPage />
      case "settings":
        return <SettingsPage />
      default:
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Всего задач</CardTitle>
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold">{tasks.length}</div>
                  <p className="text-xs text-muted-foreground">активных проектов: {projects.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Выполнено</CardTitle>
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold">{completedTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}% от общего
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">В ожидании</CardTitle>
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold">{pendingTasks}</div>
                  <p className="text-xs text-muted-foreground">требуют внимания</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Сегодня</CardTitle>
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold">{todayTasks}</div>
                  <p className="text-xs text-muted-foreground">запланировано</p>
                </CardContent>
              </Card>
            </div>

            {/* Calendar View Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex space-x-2">
                {(["day", "week", "month"] as const).map((view) => (
                  <Button
                    key={view}
                    variant={calendarView === view ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCalendarView(view)}
                    className="text-xs sm:text-sm"
                  >
                    {view === "day" ? "День" : view === "week" ? "Неделя" : "Месяц"}
                  </Button>
                ))}
              </div>
              <Button onClick={() => setShowTaskDialog(true)} size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="sm:inline">Новая задача</span>
              </Button>
            </div>

            {/* Calendar View */}
            <Card>
              <CardContent className="p-3 sm:p-6">
                {calendarView === "month" && (
                  <MonthView selectedDate={selectedDate} onDateSelect={setSelectedDate} tasks={tasks} />
                )}
                {calendarView === "week" && (
                  <WeekView selectedDate={selectedDate} onDateSelect={setSelectedDate} tasks={tasks} />
                )}
                {calendarView === "day" && (
                  <DayView selectedDate={selectedDate} onDateSelect={setSelectedDate} tasks={tasks} />
                )}
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Загрузка...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      <main className="container mx-auto px-4 py-4 sm:py-6 max-w-7xl">{renderMainContent()}</main>

      <TaskDialog open={showTaskDialog} onOpenChange={setShowTaskDialog} onTaskCreated={loadData} />

      <NotificationManager />
    </div>
  )
}
