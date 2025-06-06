"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

// Типы масштаба
type ScaleType = "hourly" | "daily" | "weekly" | "monthly"

// Интерфейс для компонента
interface DateTimeRangeSliderProps {
  startDateTime: Date
  endDateTime: Date
  onChange: (start: Date, end: Date) => void
  className?: string
}

// Функция для определения масштаба на основе длительности
const determineScale = (start: Date, end: Date): ScaleType => {
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

  if (durationHours <= 24) return "hourly"
  if (durationHours <= 24 * 7) return "daily"
  if (durationHours <= 24 * 30) return "weekly"
  return "monthly"
}

// Функция для форматирования метки в зависимости от масштаба
const formatTick = (date: Date, scale: ScaleType): string => {
  switch (scale) {
    case "hourly":
      return date.getHours().toString().padStart(2, "0") + ":00"
    case "daily":
      return date.getDate().toString()
    case "weekly":
      return `${date.getDate()}.${(date.getMonth() + 1).toString().padStart(2, "0")}`
    case "monthly":
      const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
      return months[date.getMonth()]
    default:
      return ""
  }
}

// Функция для генерации меток шкалы
const generateTicks = (start: Date, end: Date, scale: ScaleType): Date[] => {
  const ticks: Date[] = []
  const current = new Date(start)

  // Устанавливаем начальную точку в зависимости от масштаба
  switch (scale) {
    case "hourly":
      current.setMinutes(0, 0, 0)
      break
    case "daily":
      current.setHours(0, 0, 0, 0)
      break
    case "weekly":
      const day = current.getDay() || 7 // Преобразуем 0 (воскресенье) в 7
      current.setDate(current.getDate() - day + 1) // Начало недели (понедельник)
      current.setHours(0, 0, 0, 0)
      break
    case "monthly":
      current.setDate(1) // Начало месяца
      current.setHours(0, 0, 0, 0)
      break
  }

  // Генерируем метки до конечной даты
  while (current <= end) {
    ticks.push(new Date(current))

    switch (scale) {
      case "hourly":
        current.setHours(current.getHours() + 1)
        break
      case "daily":
        current.setDate(current.getDate() + 1)
        break
      case "weekly":
        current.setDate(current.getDate() + 7)
        break
      case "monthly":
        current.setMonth(current.getMonth() + 1)
        break
    }
  }

  return ticks
}

export function DateTimeRangeSlider({ startDateTime, endDateTime, onChange, className }: DateTimeRangeSliderProps) {
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState<"start" | "end" | null>(null)
  const [scale, setScale] = useState<ScaleType>("hourly")
  const [ticks, setTicks] = useState<Date[]>([])

  // Обновляем масштаб и метки при изменении диапазона
  useEffect(() => {
    const newScale = determineScale(startDateTime, endDateTime)
    setScale(newScale)
    setTicks(generateTicks(startDateTime, endDateTime, newScale))
  }, [startDateTime, endDateTime])

  // Вычисляем позицию маркера на шкале
  const getPositionPercent = (date: Date) => {
    const totalMs = endDateTime.getTime() - startDateTime.getTime()
    if (totalMs === 0) return 0
    const offsetMs = date.getTime() - startDateTime.getTime()
    return Math.max(0, Math.min(100, (offsetMs / totalMs) * 100))
  }

  // Обработчик перетаскивания
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !sliderRef.current) return

      const rect = sliderRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
      const percent = (x / rect.width) * 100

      const totalDuration = endDateTime.getTime() - startDateTime.getTime()
      const viewStart = startDateTime.getTime()
      const newTime = viewStart + (percent / 100) * totalDuration

      const minGap = 60 * 60 * 1000 // Минимальный зазор 1 час

      if (dragging === "start") {
        const maxStartTime = endDateTime.getTime() - minGap
        const clampedTime = Math.min(newTime, maxStartTime)
        onChange(new Date(clampedTime), endDateTime)
      } else if (dragging === "end") {
        const minEndTime = startDateTime.getTime() + minGap
        const clampedTime = Math.max(newTime, minEndTime)
        onChange(startDateTime, new Date(clampedTime))
      }
    },
    [dragging, startDateTime, endDateTime, onChange],
  )

  // Обработчик окончания перетаскивания
  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setDragging(null)
    }
  }, [dragging])

  // Обработчик начала перетаскивания
  const handleMouseDown = useCallback(
    (handle: "start" | "end") => (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragging(handle)
    },
    [],
  )

  // Добавляем и удаляем глобальные слушатели событий
  useEffect(() => {
    if (dragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  // Форматирование даты и времени для отображения
  const formatDateTime = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")

    return `${day}.${month} ${hours}:${minutes}`
  }

  return (
    <div className={cn("w-full select-none", className)}>
      <div className="flex justify-between mb-2 text-sm">
        <div>{formatDateTime(startDateTime)}</div>
        <div>{formatDateTime(endDateTime)}</div>
      </div>

      <div ref={sliderRef} className="relative h-10 bg-gray-100 rounded-md" style={{ userSelect: "none" }}>
        {/* Шкала с метками */}
        <div className="absolute inset-0 flex items-end pb-1 pointer-events-none">
          {ticks.map((tick, index) => (
            <div
              key={index}
              className="absolute h-2 border-l border-gray-300"
              style={{ left: `${getPositionPercent(tick)}%` }}
            >
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                {formatTick(tick, scale)}
              </span>
            </div>
          ))}
        </div>

        {/* Выбранный диапазон */}
        <div
          className="absolute top-0 h-full bg-blue-200 opacity-50 pointer-events-none"
          style={{
            left: `${getPositionPercent(startDateTime)}%`,
            width: `${getPositionPercent(endDateTime) - getPositionPercent(startDateTime)}%`,
          }}
        />

        {/* Маркер начала */}
        <div
          className={cn(
            "absolute top-0 w-4 h-full cursor-pointer bg-blue-500 rounded-md flex items-center justify-center z-10 transform -translate-x-1/2",
            dragging === "start" && "ring-2 ring-blue-300 scale-110",
          )}
          style={{ left: `${getPositionPercent(startDateTime)}%` }}
          onMouseDown={handleMouseDown("start")}
        >
          <div className="w-1 h-4 bg-white rounded-full pointer-events-none" />
        </div>

        {/* Маркер конца */}
        <div
          className={cn(
            "absolute top-0 w-4 h-full cursor-pointer bg-blue-500 rounded-md flex items-center justify-center z-10 transform -translate-x-1/2",
            dragging === "end" && "ring-2 ring-blue-300 scale-110",
          )}
          style={{ left: `${getPositionPercent(endDateTime)}%` }}
          onMouseDown={handleMouseDown("end")}
        >
          <div className="w-1 h-4 bg-white rounded-full pointer-events-none" />
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500 text-center">
        Масштаб: {scale === "hourly" ? "часы" : scale === "daily" ? "дни" : scale === "weekly" ? "недели" : "месяцы"}
      </div>
    </div>
  )
}
