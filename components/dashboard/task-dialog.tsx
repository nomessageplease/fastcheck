"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Task, Project, Executor } from "@/lib/supabase/types"
import { TaskStatusManager } from "@/lib/task-status-manager"
import { calculateTaskConstraints, checkTaskOverlap } from "@/lib/task-constraints"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Calendar, AlertTriangle } from "lucide-react"
import { ExecutorDialog } from "./executor-dialog"
import { ProjectDialog } from "./project-dialog"
import SimpleDateTimePicker from "@/components/ui/simple-datetime-picker"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  task?: Task
  projects: Project[]
  executors: Executor[]
  parentTask?: Task
  initialProjectId?: string
}

export function TaskDialog({
  open,
  onOpenChange,
  onSuccess,
  task,
  projects,
  executors,
  parentTask,
  initialProjectId,
}: TaskDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [executorDialogOpen, setExecutorDialogOpen] = useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [parentTasks, setParentTasks] = useState<Task[]>([])
  const [siblingTasks, setSiblingTasks] = useState<Task[]>([])

  // Инициализируем formData с initialProjectId
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project_id: initialProjectId || "",
    parent_id: parentTask?.id || null,
    executor_id: null as string | null,
    is_urgent: false,
  })

  // Состояния для дат
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())

  // Состояния для ограничений дат
  const [dateConstraints, setDateConstraints] = useState<{
    startConstraint: Date | null
    endConstraint: Date | null
    blockedRanges: Array<{ start: Date; end: Date }>
  }>({
    startConstraint: null,
    endConstraint: null,
    blockedRanges: [],
  })

  // Состояние для предупреждений о пересечениях
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)

  // Загружаем соседние задачи при изменении проекта или родительской задачи
  useEffect(() => {
    const fetchSiblingTasks = async () => {
      if (!formData.project_id) return

      try {
        let query = supabase
          .from("tasks")
          .select("id, title, start_date, due_date")
          .eq("project_id", formData.project_id)

        // Если есть родительская задача, ищем задачи с тем же родителем
        if (parentTask) {
          query = query.eq("parent_id", parentTask.id)
        } else {
          // Иначе ищем задачи верхнего уровня
          query = query.is("parent_id", null)
        }

        const { data } = await query

        if (data) {
          const siblings = data.map((t) => ({
            id: t.id,
            startDate: new Date(t.start_date),
            endDate: new Date(t.due_date),
          }))
          setSiblingTasks(siblings)
        }
      } catch (error) {
        console.error("Ошибка при загрузке соседних задач:", error)
      }
    }

    fetchSiblingTasks()
  }, [formData.project_id, parentTask])

  // Вычисляем ограничения дат при изменении контекста
  useEffect(() => {
    // Находим выбранный проект
    const selectedProject = projects.find((p) => p.id === formData.project_id)

    // Определяем тип задачи
    const taskType = parentTask ? "subtask" : "task"

    // Получаем ограничения
    const constraints = calculateTaskConstraints({
      type: taskType,
      parentProject: selectedProject
        ? {
            startDate: new Date(selectedProject.start_date),
            endDate: new Date(selectedProject.planned_finish),
          }
        : undefined,
      parentTask: parentTask
        ? {
            startDate: new Date(parentTask.start_date),
            endDate: new Date(parentTask.due_date),
          }
        : undefined,
      siblingTasks: siblingTasks,
      currentTaskId: task?.id,
      globalMinDate: new Date(new Date().getFullYear(), 0, 1),
      globalMaxDate: new Date(new Date().getFullYear() + 1, 11, 31),
    })

    setDateConstraints(constraints)
  }, [formData.project_id, parentTask, projects, siblingTasks, task])

  // Проверяем пересечения при изменении дат
  useEffect(() => {
    if (startDate && endDate && siblingTasks.length > 0) {
      const overlap = checkTaskOverlap(startDate, endDate, siblingTasks, task?.id)

      if (overlap.hasOverlap) {
        const conflictNames = overlap.conflictingTasks.map((t) => `Задача ${t.id}`).join(", ")
        setOverlapWarning(`Время пересекается с: ${conflictNames}`)
      } else {
        setOverlapWarning(null)
      }
    } else {
      setOverlapWarning(null)
    }
  }, [startDate, endDate, siblingTasks, task])

  // Инициализация формы при открытии диалога
  useEffect(() => {
    if (open) {
      if (task) {
        // Редактирование существующей задачи
        const taskStartDate = new Date(task.start_date)
        const taskDueDate = new Date(task.due_date)

        // Проверяем валидность дат
        const validStartDate = !isNaN(taskStartDate.getTime()) ? taskStartDate : new Date()
        const validDueDate = !isNaN(taskDueDate.getTime()) ? taskDueDate : new Date()

        setFormData({
          title: task.title,
          description: task.description || "",
          project_id: task.project_id,
          parent_id: task.parent_id,
          executor_id: task.executor_id,
          is_urgent: task.is_urgent,
        })

        // Устанавливаем даты
        setStartDate(validStartDate)
        setEndDate(validDueDate)

        if (task.project_id) {
          fetchParentTasks(task.project_id)
        }
      } else {
        // Создание новой задачи
        // Определяем проект по умолчанию
        const defaultProjectId =
          initialProjectId || parentTask?.project_id || (projects.length > 0 ? projects[0].id : "")

        const now = new Date()
        // Дата начала - сегодня в 9:00
        const defaultStart = new Date(now)
        defaultStart.setHours(9, 0, 0, 0)

        // Дата конца - через неделю в 17:30
        const defaultDue = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        defaultDue.setHours(17, 30, 0, 0)

        setFormData({
          title: "",
          description: "",
          project_id: defaultProjectId,
          parent_id: parentTask?.id || null,
          executor_id: null,
          is_urgent: false,
        })

        // Устанавливаем даты
        setStartDate(defaultStart)
        setEndDate(defaultDue)

        if (defaultProjectId) {
          fetchParentTasks(defaultProjectId)
        }
      }
    }
  }, [task, parentTask, projects, open, initialProjectId])

  const fetchParentTasks = async (projectId: string) => {
    try {
      // Получаем только задачи верхнего уровня (без родителя)
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .is("parent_id", null)
        .order("title")

      if (data) {
        // Если редактируем задачу, исключаем её саму и её потомков из списка возможных родителей
        const filteredTasks = task ? data.filter((t) => t.id !== task.id) : data
        setParentTasks(filteredTasks)
      }
    } catch (error) {
      console.error("Ошибка при загрузке родительских задач:", error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string | null) => {
    let processedValue = value

    // Handle special "none" values
    if (value === "none" || value === "no-executor") {
      processedValue = null
    }

    // Handle special "new-project" and "new-executor" values
    if (value === "new-project") {
      setProjectDialogOpen(true)
      return
    }

    if (value === "new-executor") {
      setExecutorDialogOpen(true)
      return
    }

    setFormData((prev) => ({ ...prev, [name]: processedValue }))

    // Если изменился проект, обновляем список родительских задач
    if (name === "project_id" && processedValue) {
      fetchParentTasks(processedValue)
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_urgent: checked }))
  }

  const handleDateTimeChange = (start: Date, end: Date) => {
    // Проверяем валидность дат
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return
    }

    setStartDate(start)
    setEndDate(end)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        throw new Error("Пользователь не авторизован")
      }

      // Проверяем, что проект выбран
      if (!formData.project_id) {
        toast({
          title: "Ошибка",
          description: "Необходимо выбрать проект",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Дополнительная проверка данных перед отправкой
      if (!formData.title.trim()) {
        toast({
          title: "Ошибка",
          description: "Название задачи не может быть пустым",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Проверяем валидность дат
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        toast({
          title: "Ошибка",
          description: "Некорректные даты",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (startDate >= endDate) {
        toast({
          title: "Ошибка",
          description: "Дата начала должна быть раньше даты окончания",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Проверяем пересечения с другими задачами
      if (overlapWarning) {
        toast({
          title: "Предупреждение",
          description: overlapWarning + ". Продолжить?",
          variant: "destructive",
        })
        // Можно добавить подтверждение пользователя здесь
      }

      // Проверяем, что даты задачи находятся в рамках дат проекта
      const { data: projectData } = await supabase
        .from("projects")
        .select("start_date, planned_finish")
        .eq("id", formData.project_id)
        .single()

      if (projectData) {
        const projectStart = new Date(projectData.start_date)
        const projectEnd = new Date(projectData.planned_finish)

        if (startDate < projectStart || endDate > projectEnd) {
          toast({
            title: "Ошибка",
            description: "Даты задачи должны находиться в рамках дат проекта",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
      }

      // Создаем объект задачи для вставки
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        project_id: formData.project_id,
        parent_id: formData.parent_id,
        executor_id: formData.executor_id,
        start_date: startDate.toISOString(),
        due_date: endDate.toISOString(),
        is_urgent: formData.is_urgent,
        user_id: userData.user.id,
        status: "waiting",
      }

      if (task) {
        // Обновление существующей задачи
        const { error } = await supabase.from("tasks").update(taskData).eq("id", task.id)

        if (error) {
          throw error
        }

        // Обновляем статус задачи
        await TaskStatusManager.updateTaskStatus(task.id)

        toast({
          title: "Успех",
          description: "Задача обновлена",
        })
      } else {
        // Создание новой задачи
        const { error } = await supabase.from("tasks").insert([taskData])

        if (error) {
          throw error
        }

        toast({
          title: "Успех",
          description: "Задача создана",
        })
      }

      // Вызываем onSuccess только после успешного сохранения
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Ошибка при сохранении задачи:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось сохранить задачу",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{task ? "Редактировать задачу" : "Создать задачу"}</DialogTitle>
            <DialogDescription>
              {task ? "Внесите изменения в задачу" : "Заполните информацию о новой задаче"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Название задачи</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Введите название задачи"
                  required
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_id">Проект</Label>
                <Select value={formData.project_id} onValueChange={(value) => handleSelectChange("project_id", value)}>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Выберите проект" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new-project">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Создать новый проект
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Введите описание задачи"
                rows={3}
                className="text-base resize-none"
              />
            </div>

            <div className="grid gap-4">
              {!parentTask && (
                <div className="space-y-2">
                  <Label htmlFor="parent_id">Родительская задача</Label>
                  <Select
                    value={formData.parent_id || "none"}
                    onValueChange={(value) => handleSelectChange("parent_id", value)}
                  >
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Выберите родительскую задачу" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без родительской задачи</SelectItem>
                      {parentTasks.map((parentTask) => (
                        <SelectItem key={parentTask.id} value={parentTask.id}>
                          {parentTask.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="executor_id">Исполнитель</Label>
                <Select
                  value={formData.executor_id || "no-executor"}
                  onValueChange={(value) => handleSelectChange("executor_id", value)}
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Выберите исполнителя" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-executor">Без исполнителя</SelectItem>
                    {executors.map((executor) => (
                      <SelectItem key={executor.id} value={executor.id}>
                        {executor.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new-executor">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Добавить исполнителя
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Предупреждение о пересечениях */}
            {overlapWarning && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <span className="text-sm text-yellow-800">{overlapWarning}</span>
              </div>
            )}

            {/* Выбор даты и времени */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <Label className="text-base font-medium">Период выполнения</Label>
              </div>

              <SimpleDateTimePicker
                initialStart={startDate}
                initialEnd={endDate}
                onChange={handleDateTimeChange}
                minDate={dateConstraints.startConstraint || undefined}
                maxDate={dateConstraints.endConstraint || undefined}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="is_urgent" checked={formData.is_urgent} onCheckedChange={handleCheckboxChange} />
              <Label htmlFor="is_urgent" className="text-base">
                Срочная задача
              </Label>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2 pt-4 sticky bottom-0 bg-white border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto order-2 sm:order-1 h-11 text-base"
              >
                Отмена
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto order-1 sm:order-2 h-11 text-base">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {task ? "Обновить" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ExecutorDialog
        open={executorDialogOpen}
        onOpenChange={setExecutorDialogOpen}
        onSuccess={() => {
          setExecutorDialogOpen(false)
          // Здесь можно добавить логику для обновления списка исполнителей
        }}
      />

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSuccess={() => {
          setProjectDialogOpen(false)
          // Здесь можно добавить логику для обновления списка проектов
        }}
        executors={executors}
      />
    </>
  )
}
