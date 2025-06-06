"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, FolderOpen, Calendar, CheckCircle, Clock } from "lucide-react"
import { ProjectDialog } from "./project-dialog"
import { supabase } from "@/lib/supabase/client"
import type { Project, Task } from "@/lib/supabase/types"

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })

      if (projectsError) throw projectsError
      setProjects(projectsData || [])

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })

      if (tasksError) throw tasksError
      setTasks(tasksData || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getProjectStats = (projectId: string) => {
    const projectTasks = tasks.filter((task) => task.project_id === projectId)
    const completed = projectTasks.filter((task) => task.status === "completed").length
    const pending = projectTasks.filter((task) => task.status === "pending").length
    const total = projectTasks.length

    return { completed, pending, total }
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Загрузка проектов...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Проекты</h1>
          <p className="text-sm text-gray-600 mt-1">Управление вашими проектами и задачами</p>
        </div>
        <Button onClick={() => setShowProjectDialog(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Новый проект
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет проектов</h3>
            <p className="text-sm text-gray-600 text-center mb-4">Создайте свой первый проект для организации задач</p>
            <Button onClick={() => setShowProjectDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать проект
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {projects.map((project) => {
            const stats = getProjectStats(project.id)
            const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{project.name}</CardTitle>
                      {project.description && (
                        <CardDescription className="mt-1 text-sm line-clamp-2">{project.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={project.status === "active" ? "default" : "secondary"} className="ml-2 text-xs">
                      {project.status === "active" ? "Активный" : "Завершен"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Прогресс</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="flex flex-col items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-600">Всего</span>
                        <span className="text-sm font-medium">{stats.total}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mb-1" />
                        <span className="text-xs text-gray-600">Готово</span>
                        <span className="text-sm font-medium">{stats.completed}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Clock className="h-4 w-4 text-orange-500 mb-1" />
                        <span className="text-xs text-gray-600">В работе</span>
                        <span className="text-sm font-medium">{stats.pending}</span>
                      </div>
                    </div>

                    {/* Created Date */}
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Создан: {new Date(project.created_at).toLocaleDateString("ru-RU")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ProjectDialog open={showProjectDialog} onOpenChange={setShowProjectDialog} onProjectCreated={loadData} />
    </div>
  )
}
