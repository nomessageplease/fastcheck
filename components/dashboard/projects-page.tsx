"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Project, Executor, Task } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ProjectDialog } from "./project-dialog"
import { TaskDialog } from "./task-dialog"
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Calendar, User, Clock, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { getTaskUrgencyStatus } from "@/lib/task-urgency-utils"
import { cn } from "@/lib/utils"

interface ProjectsPageProps {
  user: SupabaseUser | null
  projects: Project[]
  executors: Executor[]
  onDataChange: () => void
}

export function ProjectsPage({ user, projects, executors, onDataChange }: ProjectsPageProps) {
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedTaskProject, setSelectedTaskProject] = useState<Project | null>(null)
  const [selectedParentTask, setSelectedParentTask] = useState<Task | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [projectTasks, setProjectTasks] = useState<Record<string, Task[]>>({})
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set())
  const [taskKey, setTaskKey] = useState(0) // Ключ для принудительного пересоздания TaskDialog
  const [taskUrgencyStatuses, setTaskUrgencyStatuses] = useState<Record<string, any>>({})

  // Обновляем статусы срочности задач
  useEffect(() => {
    const updateTaskUrgencyStatuses = async () => {
      if (!user) return

      const statuses: Record<string, any> = {}
      const allTasks = Object.values(projectTasks).flat()

      for (const task of allTasks) {
        statuses[task.id] = await getTaskUrgencyStatus(task, user.id)
      }
      setTaskUrgencyStatuses(statuses)
    }

    const allTasks = Object.values(projectTasks).flat()
    if (allTasks.length > 0 && user) {
      updateTaskUrgencyStatuses()
    }
  }, [projectTasks, user])

  // Функция для расчета прогресса проекта
  const calculateProjectProgress = (projectId: string) => {
    const tasks = projectTasks[projectId] || []
    if (tasks.length === 0) return 0

    const completedTasks = tasks.filter((task) => task.status === "completed").length
    return Math.round((completedTasks / tasks.length) * 100)
  }

  // Функция для получения статистики проекта
  const getProjectStats = (projectId: string) => {
    const tasks = projectTasks[projectId] || []
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((task) => task.status === "completed").length
    const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length
    const pendingTasks = tasks.filter((task) => task.status === "waiting").length

    return {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      pending: pendingTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    }
  }

  const handleEditProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    setSelectedProject(project)
    setProjectDialogOpen(true)
  }

  const handleDeleteProject = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }

  const handleProjectHeaderClick = (project: Project) => {
    setSelectedProject(project)
    setProjectDialogOpen(true)
  }

  const handleCreateTask = useCallback((e: React.MouseEvent, project: Project, parentTask?: Task) => {
    e.stopPropagation()
    console.log("Creating task for project:", project.name, "with ID:", project.id)
    setSelectedTaskProject(project)
    setSelectedParentTask(parentTask || null)
    setTaskKey((prev) => prev + 1) // Увеличиваем ключ для пересоздания компонента
    setTimeout(() => {
      setTaskDialogOpen(true)
    }, 0)
  }, [])

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      // Сначала удаляем все задачи, связанные с проектом
      await supabase.from("tasks").delete().eq("project_id", projectToDelete.id)

      // Затем удаляем сам проект
      await supabase.from("projects").delete().eq("id", projectToDelete.id)

      onDataChange()
    } catch (error) {
      console.error("Error deleting project:", error)
    } finally {
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    }
  }

  const loadProjectTasks = async (projectId: string) => {
    if (projectTasks[projectId] || loadingTasks.has(projectId)) return

    setLoadingTasks((prev) => new Set(prev).add(projectId))

    try {
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select(`
          *,
          executor:executors(*)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })

      if (error) throw error

      setProjectTasks((prev) => ({
        ...prev,
        [projectId]: tasks || [],
      }))
    } catch (error) {
      console.error("Error loading project tasks:", error)
    } finally {
      setLoadingTasks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(projectId)
        return newSet
      })
    }
  }

  const refreshProjectTasks = async (projectId: string) => {
    // Принудительно перезагружаем задачи проекта
    setLoadingTasks((prev) => new Set(prev).add(projectId))

    try {
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select(`
          *,
          executor:executors(*)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })

      if (error) throw error

      setProjectTasks((prev) => ({
        ...prev,
        [projectId]: tasks || [],
      }))
    } catch (error) {
      console.error("Error refreshing project tasks:", error)
    } finally {
      setLoadingTasks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(projectId)
        return newSet
      })
    }
  }

  const toggleProject = async (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
      await loadProjectTasks(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "Некорректная дата"
      }
      return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (error) {
      return "Некорректная дата"
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      waiting: { label: "Ожидание", variant: "secondary" as const },
      in_progress: { label: "В работе", variant: "default" as const },
      pending_review: { label: "На проверке", variant: "outline" as const },
      completed: { label: "Завершено", variant: "default" as const },
      extended: { label: "Продлено", variant: "secondary" as const },
      cancelled: { label: "Отменено", variant: "destructive" as const },
    }

    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const getMainTasks = (tasks: Task[]) => {
    return tasks.filter((task) => !task.parent_id)
  }

  const getSubtasks = (tasks: Task[], parentId: string) => {
    return tasks.filter((task) => task.parent_id === parentId)
  }

  const TaskItem = ({
    task,
    tasks,
    level = 0,
    project,
  }: { task: Task; tasks: Task[]; level?: number; project: Project }) => {
    const subtasks = getSubtasks(tasks, task.id)
    const hasSubtasks = subtasks.length > 0
    const isExpanded = expandedTasks.has(task.id)
    const urgencyStatus = taskUrgencyStatuses[task.id]
    const shouldHighlight = urgencyStatus?.shouldHighlight || false

    return (
      <div className={`${level > 0 ? "ml-6 border-l-2 border-gray-200 pl-4" : ""}`}>
        <div
          className={cn(
            "flex flex-col p-3 rounded-lg mb-2 gap-3",
            shouldHighlight ? "bg-red-50 border-2 border-red-300" : "bg-gray-50",
          )}
        >
          <div className="flex items-center gap-3 flex-1">
            {hasSubtasks && (
              <Button variant="ghost" size="sm" onClick={() => toggleTask(task.id)} className="p-1 h-6 w-6">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            {!hasSubtasks && <div className="w-6" />}

            <div className="flex-1 text-left">
              <div className="font-medium text-sm text-left">{task.title}</div>
              {task.description && <div className="text-xs text-gray-600 mt-1 text-left">{task.description}</div>}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 text-left">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(task.start_date)} - {formatDate(task.due_date)}
                </div>
                {task.executor && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {task.executor.name}
                  </div>
                )}
                {task.is_urgent && (
                  <div className="flex items-center gap-1 text-red-500">
                    <Clock className="h-3 w-3" />
                    Срочно
                  </div>
                )}
                {urgencyStatus?.isOverdue && urgencyStatus?.hoursOverdue > 0 && (
                  <div className={`flex items-center gap-1 ${shouldHighlight ? "text-red-700" : "text-orange-600"}`}>
                    <AlertTriangle className="h-3 w-3" />
                    Просрочено на {urgencyStatus.hoursOverdue}ч
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(task.status)}
              {shouldHighlight && (
                <Badge variant="destructive" className="text-white bg-red-600">
                  Критично просрочено
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleCreateTask(e, project, task)}
              className="h-8 px-3 text-xs w-full sm:w-auto min-w-0"
            >
              <Plus className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">Подзадача</span>
            </Button>
          </div>
        </div>

        {hasSubtasks && isExpanded && (
          <div className="ml-4 space-y-1">
            {subtasks.map((subtask) => (
              <TaskItem key={subtask.id} task={subtask} tasks={tasks} level={level + 1} project={project} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const handleTaskDialogSuccess = () => {
    console.log("Task created successfully, refreshing tasks for project:", selectedTaskProject?.id)
    if (selectedTaskProject) {
      refreshProjectTasks(selectedTaskProject.id)
    }
    onDataChange()
  }

  const handleCloseTaskDialog = (open: boolean) => {
    if (!open) {
      console.log("Task dialog closed")
    }
    setTaskDialogOpen(open)
  }

  return (
    <div className="space-y-6 px-2 sm:px-0 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Проекты</h1>
          <p className="text-muted-foreground">Управление проектами и их настройками</p>
        </div>

        <Button
          onClick={() => {
            setSelectedProject(null)
            setProjectDialogOpen(true)
          }}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Новый проект
        </Button>
      </div>

      <div className="w-full max-w-full">
        <Input
          placeholder="Поиск проектов..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4 w-full"
        />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{searchTerm ? "Проекты не найдены" : "У вас пока нет проектов"}</p>
          {!searchTerm && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSelectedProject(null)
                setProjectDialogOpen(true)
              }}
            >
              Создать первый проект
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const isExpanded = expandedProjects.has(project.id)
            const tasks = projectTasks[project.id] || []
            const mainTasks = getMainTasks(tasks)
            const isLoading = loadingTasks.has(project.id)
            const stats = getProjectStats(project.id)

            return (
              <Card key={project.id} className="overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleProject(project.id)}>
                  <CardHeader
                    className="cursor-pointer px-4 py-3 sm:px-6 hover:bg-gray-50 transition-colors"
                    onClick={() => handleProjectHeaderClick(project)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div
                            className="p-1 h-6 w-6 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 rounded"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleProject(project.id)
                            }}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                          <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                        </div>
                        <CardDescription className="mt-1 ml-8 line-clamp-2">{project.description}</CardDescription>

                        {/* Прогресс-бар проекта - всегда видимый */}
                        <div className="ml-8 mt-2 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Прогресс выполнения</span>
                            <span className="font-medium">{stats.progress}%</span>
                          </div>
                          <Progress value={stats.progress} className="h-2" />
                        </div>

                        {/* Детальная статистика - только при развернутом состоянии */}
                        {isExpanded && (
                          <div className="ml-8 mt-1">
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-3 gap-y-0 text-xs text-gray-500">
                              <span>Всего: {stats.total}</span>
                              <span>Завершено: {stats.completed}</span>
                              <span>В работе: {stats.inProgress}</span>
                              <span>Ожидание: {stats.pending}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => handleEditProject(e, project)}
                          className="h-8 w-8 touch-manipulation"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive touch-manipulation"
                          onClick={(e) => handleDeleteProject(e, project)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="px-4 pb-3 sm:px-6">
                      {/* Даты проекта - только при развернутом состоянии */}
                      <div className="text-sm mb-4 ml-8 space-y-1">
                        <p>
                          <strong>Дата начала:</strong> {formatDate(project.start_date)}
                        </p>
                        <p>
                          <strong>Дата окончания:</strong> {formatDate(project.planned_finish)}
                        </p>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Задачи проекта</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleCreateTask(e, project)}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Создать задачу</span>
                            <span className="sm:hidden">Задача</span>
                          </Button>
                        </div>
                        {isLoading ? (
                          <div className="text-center py-4 text-gray-500">Загрузка задач...</div>
                        ) : mainTasks.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            <p className="mb-2">У проекта пока нет задач</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleCreateTask(e, project)}
                              className="flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Создать первую задачу
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {mainTasks.map((task) => (
                              <TaskItem key={task.id} task={task} tasks={tasks} project={project} />
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>
      )}

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSuccess={onDataChange}
        project={selectedProject || undefined}
        executors={executors}
      />

      {taskDialogOpen && (
        <TaskDialog
          key={taskKey} // Используем ключ для принудительного пересоздания компонента
          open={taskDialogOpen}
          onOpenChange={handleCloseTaskDialog}
          onSuccess={handleTaskDialogSuccess}
          projects={projects}
          executors={executors}
          parentTask={selectedParentTask || undefined}
          initialProjectId={selectedTaskProject?.id}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Проект будет удален вместе со всеми связанными задачами.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
