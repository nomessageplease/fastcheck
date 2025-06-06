"use client"

import type React from "react"

import { useState, useCallback } from "react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Project, Executor, Task } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectDialog } from "./project-dialog"
import { TaskDialog } from "./task-dialog"
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Calendar, User, Clock } from "lucide-react"
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

    return (
      <div className={`${level > 0 ? "ml-4 sm:ml-6 border-l-2 border-gray-200 pl-3 sm:pl-4" : ""}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {hasSubtasks && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleTask(task.id)}
                className="p-1 h-6 w-6 flex-shrink-0"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            {!hasSubtasks && <div className="w-6 flex-shrink-0" />}

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm leading-tight truncate">{task.title}</h4>
              {task.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>}
              <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {formatDate(task.start_date)} - {formatDate(task.due_date)}
                  </span>
                </div>
                {task.executor && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{task.executor.name}</span>
                  </div>
                )}
                {task.is_urgent && (
                  <div className="flex items-center gap-1 text-red-500">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span>Срочно</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusBadge(task.status)}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleCreateTask(e, project, task)}
              className="h-7 px-2 text-xs whitespace-nowrap"
            >
              <Plus className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Подзадача</span>
              <span className="sm:hidden">+</span>
            </Button>
          </div>
        </div>

        {hasSubtasks && isExpanded && (
          <div className="ml-2 sm:ml-4 space-y-1">
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
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Проекты</h1>
            <p className="text-sm text-muted-foreground">Управление проектами и их настройками</p>
          </div>

          <Button
            onClick={() => {
              setSelectedProject(null)
              setProjectDialogOpen(true)
            }}
            className="w-full sm:w-auto flex items-center gap-2 h-10"
          >
            <Plus className="h-4 w-4" />
            Новый проект
          </Button>
        </div>

        <div className="w-full sm:max-w-md">
          <Input
            placeholder="Поиск проектов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{searchTerm ? "Проекты не найдены" : "У вас пока нет проектов"}</p>
          {!searchTerm && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedProject(null)
                setProjectDialogOpen(true)
              }}
              className="h-10"
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

            return (
              <Card key={project.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleProject(project.id)}>
                  <CardHeader className="cursor-pointer pb-3" onClick={() => toggleProject(project.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="p-1 h-6 w-6 flex items-center justify-center flex-shrink-0">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                          <CardTitle className="text-base sm:text-lg truncate">{project.name}</CardTitle>
                        </div>
                        {project.description && (
                          <CardDescription className="mt-1 ml-8 text-sm line-clamp-2">
                            {project.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 ml-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => handleEditProject(e, project)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => handleDeleteProject(e, project)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="text-sm mb-4 ml-8 space-y-1">
                      <p className="flex flex-col sm:flex-row sm:items-center">
                        <span className="font-medium mr-2">Дата начала:</span>
                        <span>{formatDate(project.start_date)}</span>
                      </p>
                      <p className="flex flex-col sm:flex-row sm:items-center">
                        <span className="font-medium mr-2">Дата окончания:</span>
                        <span>{formatDate(project.planned_finish)}</span>
                      </p>
                    </div>

                    <CollapsibleContent>
                      <div className="border-t pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                          <h4 className="font-medium">Задачи проекта</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleCreateTask(e, project)}
                            className="w-full sm:w-auto flex items-center gap-2 h-9"
                          >
                            <Plus className="h-4 w-4" />
                            Создать задачу
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
                              className="flex items-center gap-2 h-9"
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
                    </CollapsibleContent>
                  </CardContent>
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
