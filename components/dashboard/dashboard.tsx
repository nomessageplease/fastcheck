"use client"

import { useState, useEffect } from "react"
import { Header } from "./header"
import { ProjectsPage } from "./projects-page"
import { SettingsPage } from "./settings-page"
import { MonthView } from "./calendar-views/month-view"
import { DayView } from "./calendar-views/day-view"
import { WeekView } from "./calendar-views/week-view"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, BarChart3, Clock, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Project, Task } from "@/lib/supabase/types"

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month")
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [projectsResult, tasksResult] = await Promise.all([
        supabase.from("projects").select("*"),
        supabase.from("tasks").select("*"),
      ])

      if (projectsResult.data) setProjects(projectsResult.data)
      if (tasksResult.data) setTasks(tasksResult.data)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const renderCalendarView = () => {
    const commonProps = { tasks, projects, onTaskUpdate: loadData }

    switch (calendarView) {
      case "day":
        return <DayView {...commonProps} />
      case "week":
        return <WeekView {...commonProps} />
      default:
        return <MonthView {...commonProps} />
    }
  }

  const renderDashboardContent = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <CardContent className="p-0">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Проекты</p>
                <p className="text-lg sm:text-xl font-bold">{projects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-3 sm:p-4">
          <CardContent className="p-0">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Задачи</p>
                <p className="text-lg sm:text-xl font-bold">{tasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-3 sm:p-4">
          <CardContent className="p-0">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">В работе</p>
                <p className="text-lg sm:text-xl font-bold">{tasks.filter((t) => t.status === "in_progress").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-3 sm:p-4">
          <CardContent className="p-0">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Сегодня</p>
                <p className="text-lg sm:text-xl font-bold">
                  {
                    tasks.filter((t) => {
                      const today = new Date().toDateString()
                      return new Date(t.start_date).toDateString() === today
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <CardTitle className="text-lg sm:text-xl">Календарь задач</CardTitle>
            <div className="flex space-x-1">
              {(["month", "week", "day"] as const).map((view) => (
                <Button
                  key={view}
                  variant={calendarView === view ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView(view)}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  {view === "month" ? "Месяц" : view === "week" ? "Неделя" : "День"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">{renderCalendarView()}</CardContent>
      </Card>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {activeTab === "dashboard" && renderDashboardContent()}
        {activeTab === "projects" && <ProjectsPage />}
        {activeTab === "settings" && <SettingsPage />}
      </main>
    </div>
  )
}
