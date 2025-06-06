"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Project, Executor } from "@/lib/supabase/types"
import { calculateTaskConstraints } from "@/lib/task-constraints"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import HierarchicalDateTimeSlider from "@/components/ui/hierarchical-datetime-slider"

// Функция для корректного форматирования даты для datetime-local input
const formatDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  project?: Project
  executors?: Executor[]
}

export function ProjectDialog({ open, onOpenChange, onSuccess, project, executors }: ProjectDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color_icon: "#3B82F6", // Default blue color
    start_date: "",
    planned_finish: "",
  })

  // Состояния для DateTimeRangeSlider
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())

  // Получаем ограничения для проекта
  const constraints = calculateTaskConstraints({
    type: "project",
    globalMinDate: new Date(new Date().getFullYear(), 0, 1),
    globalMaxDate: new Date(new Date().getFullYear() + 2, 11, 31),
  })

  useEffect(() => {
    if (open) {
      if (project) {
        const startDate = new Date(project.start_date)
        const endDate = new Date(project.planned_finish)

        setFormData({
          name: project.name,
          description: project.description || "",
          color_icon: project.color_icon,
          start_date: formatDateTimeLocal(startDate),
          planned_finish: formatDateTimeLocal(endDate),
        })

        setStartDate(startDate)
        setEndDate(endDate)
      } else {
        const now = new Date()
        // Дата начала - сегодня в 9:00
        const defaultStart = new Date(now)
        defaultStart.setHours(9, 0, 0, 0)

        // Дата конца - через месяц в 18:00
        const defaultEnd = new Date(now)
        defaultEnd.setMonth(defaultEnd.getMonth() + 1)
        defaultEnd.setHours(18, 0, 0, 0)

        setFormData({
          name: "",
          description: "",
          color_icon: "#3B82F6",
          start_date: formatDateTimeLocal(defaultStart),
          planned_finish: formatDateTimeLocal(defaultEnd),
        })

        setStartDate(defaultStart)
        setEndDate(defaultEnd)
      }
    }
  }, [project, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Синхронизируем даты с слайдером
    if (name === "start_date") {
      setStartDate(new Date(value))
    } else if (name === "planned_finish") {
      setEndDate(new Date(value))
    }
  }

  const handleRangeChange = (start: Date, end: Date) => {
    setStartDate(start)
    setEndDate(end)
    setFormData((prev) => ({
      ...prev,
      start_date: formatDateTimeLocal(start),
      planned_finish: formatDateTimeLocal(end),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        throw new Error("Пользователь не авторизован")
      }

      const projectData = {
        name: formData.name,
        description: formData.description || null,
        color_icon: formData.color_icon,
        start_date: new Date(formData.start_date).toISOString(),
        planned_finish: new Date(formData.planned_finish).toISOString(),
        user_id: userData.user.id,
      }

      if (project) {
        // Обновление существующего проекта
        const { error } = await supabase.from("projects").update(projectData).eq("id", project.id)

        if (error) throw error

        toast({
          title: "Проект обновлен",
          description: "Проект успешно обновлен",
        })
      } else {
        // Создание нового проекта
        const { error } = await supabase.from("projects").insert(projectData)

        if (error) throw error

        toast({
          title: "Проект создан",
          description: "Новый проект успешно создан",
        })
      }

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      console.error("Ошибка при сохранении проекта:", error)
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Редактировать проект" : "Создать новый проект"}</DialogTitle>
          <DialogDescription>
            {project ? "Внесите изменения в проект и нажмите Сохранить" : "Заполните информацию о новом проекте"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Название проекта</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Введите название проекта"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Описание проекта</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Подробное описание проекта"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="color_icon">Цвет проекта</Label>
              <Input
                type="color"
                id="color_icon"
                name="color_icon"
                value={formData.color_icon}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-2">
              <Label>Сроки проекта</Label>
              <HierarchicalDateTimeSlider
                globalMinDate={new Date(new Date().getFullYear(), 0, 1)}
                globalMaxDate={new Date(new Date().getFullYear() + 2, 11, 31)}
                initialStart={startDate}
                initialEnd={endDate}
                startConstraint={null}
                endConstraint={null}
                minuteStep={15}
                onChange={handleRangeChange}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto order-1 sm:order-2">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {project ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
