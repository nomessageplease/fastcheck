"use client"

import { useState } from "react"
import type { Task, Project, Executor } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Plus, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { getWeekStart, getWeekEnd, getTasksForDate, formatDateShort, isSameDay } from "@/lib/date-utils"
import { TaskDialog } from "../task-dialog"
import { cn } from "@/lib/utils"

interface WeekViewProps {
  tasks: Task[]
  projects: Project[]
  executors: Executor[]
  onTasksChange: () => void
}

export function WeekView({ tasks, projects, executors, onTasksChange }: WeekViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const weekStart = getWeekStart(currentDate)
  const weekEnd = getWeekEnd(currentDate)
  const today = new Date()

  // Создаем массив дней недели
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    weekDays.push(date)
  }

  const navigatePrev = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  const getWeekRange = () => {
    return `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setTaskDialogOpen(true)
  }

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "in_progress":
        return <Clock className="h-3 w-3 text-blue-500" />
      case "pending_review":
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      case "waiting":
        return <Clock className="h-3 w-3 text-gray-500" />
      case "extended":
        return <Clock className="h-3 w-3 text-purple-500" />
      case "cancelled":
        return <AlertTriangle className="h-3 w-3 text-red-500" />
      default:
        return <Clock className="h-3 w-3 text-gray-500" />
    }
  }

  // Названия дней недели
  const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

  return (
    <div>
      {/* Заголовок недели */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">{getWeekRange()}</h2>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={navigateToday}>
            Сегодня
          </Button>
        </div>
        <Button onClick={() => setTaskDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новая задача
        </Button>
      </div>

      {/* Сетка дней недели */}
      <div className="grid grid-cols-7 gap-2">
        {/* Заголовки дней недели */}
        {dayNames.map((name, index) => (
          <div key={`header-${index}`} className="text-center font-medium text-sm text-gray-500 py-2">
            {name}
          </div>
        ))}

        {/* Ячейки дней */}
        {weekDays.map((date) => {
          const dayTasks = getTasksForDate(tasks, date)
          const isToday = isSameDay(date, today)
          const dayOfMonth = date.getDate()

          return (
            <Card
              key={date.toISOString()}
              className={cn("min-h-[150px] flex flex-col", isToday && "ring-2 ring-blue-500")}
            >
              <CardContent className="p-2 flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className={cn("text-lg font-medium", isToday && "text-blue-600")}>{dayOfMonth}</span>
                    {isToday && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">Сегодня</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDateClick(date)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {dayTasks.length === 0 ? (
                    <p className="text-xs text-gray-400">Нет задач</p>
                  ) : (
                    <div className="space-y-1">
                      {dayTasks.map((task) => {
                        const project = projects.find((p) => p.id === task.project_id)
                        const executor = executors.find((e) => e.id === task.executor_id)

                        return (
                          <div
                            key={task.id}
                            className="flex items-center p-1 rounded-md border-l-2 bg-gray-50 text-xs"
                            style={{ borderLeftColor: project?.color_icon }}
                          >
                            {getStatusIcon(task.status)}
                            <div className="ml-1 truncate">
                              {task.title}
                              {task.is_urgent && (
                                <span className="ml-1 inline-block bg-red-100 text-red-800 px-1 rounded text-[10px]">
                                  !
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <TaskDialog
        open={taskDialogOpen && selectedDate !== null}
        onOpenChange={(open) => {
          setTaskDialogOpen(open)
          if (!open) setSelectedDate(null)
        }}
        onSuccess={() => {
          onTasksChange()
          setSelectedDate(null)
        }}
        projects={projects}
        executors={executors}
      />
    </div>
  )
}
