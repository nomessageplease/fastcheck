"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"

type ZoomLevel = "year" | "month" | "day" | "hour"

interface DateTimeTrimSliderProps {
  startDateTime: Date
  endDateTime: Date
  onChange: (newStart: Date, newEnd: Date) => void
  globalMinDate: Date
  globalMaxDate: Date
  minuteStep?: 15 | 30 | 45 | 0
  className?: string
}

export default function DateTimeTrimSlider({
  startDateTime,
  endDateTime,
  onChange,
  globalMinDate,
  globalMaxDate,
  minuteStep = 15,
  className,
}: DateTimeTrimSliderProps) {
  // === 1. Локальные состояния ===
  const [localStart, setLocalStart] = useState<Date>(startDateTime)
  const [localEnd, setLocalEnd] = useState<Date>(endDateTime)
  const [activeHandle, setActiveHandle] = useState<"start" | "end" | null>(null)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("year")

  // === 2. Рефы для drag/hold ===
  const initialZoomRef = useRef<ZoomLevel>("year")
  const dragStartX = useRef<number>(0)
  const dragBaseTime = useRef<number>(0)
  const holdTimeoutId = useRef<number | null>(null)
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const [hoverHandle, setHoverHandle] = useState<"start" | "end" | null>(null)

  // Проверяем валидность входных дат
  const validStartDate = startDateTime instanceof Date && !isNaN(startDateTime.getTime()) ? startDateTime : new Date()
  const validEndDate = endDateTime instanceof Date && !isNaN(endDateTime.getTime()) ? endDateTime : new Date()

  // === 3. Синхронизация с пропсами ===
  useEffect(() => {
    setLocalStart(validStartDate)
  }, [validStartDate])
  useEffect(() => {
    setLocalEnd(validEndDate)
  }, [validEndDate])

  // === 4. Вспомогательные функции ===

  // 4.1. Дата → процент (0…100) внутри [minDate, maxDate]
  const getPositionPercent = (date: Date, minDate: Date, maxDate: Date) => {
    const minMs = minDate.getTime()
    const maxMs = maxDate.getTime()
    const total = maxMs - minMs

    if (total <= 0) return 0

    const offset = date.getTime() - minMs
    const percent = (offset / total) * 100
    return Math.max(0, Math.min(100, percent))
  }

  // 4.2. Генерация ticks
  const generateYearTicks = (year: number): Date[] => {
    const arr: Date[] = []
    for (let m = 0; m < 12; m++) {
      arr.push(new Date(year, m, 1, 0, 0, 0))
    }
    return arr
  }

  const generateMonthTicks = (year: number, month: number): Date[] => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const arr: Date[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(new Date(year, month, d, 0, 0, 0))
    }
    return arr
  }

  const generateDayTicks = (year: number, month: number, day: number) => {
    const arr: Date[] = []
    for (let h = 0; h < 24; h++) {
      arr.push(new Date(year, month, day, h, 0, 0))
    }
    return arr
  }

  const generateHourTicks = (year: number, month: number, day: number, hour: number, minuteStep: number): Date[] => {
    const arr: Date[] = []
    if (minuteStep > 0) {
      for (let m = 0; m < 60; m += minuteStep) {
        arr.push(new Date(year, month, day, hour, m, 0))
      }
    } else {
      arr.push(new Date(year, month, day, hour, 0, 0))
    }
    return arr
  }

  // 4.3. Кешированный массив ticks
  const ticks = useMemo(() => {
    if (zoomLevel === "year") {
      const year = localStart.getFullYear()
      return generateYearTicks(year)
    }
    if (zoomLevel === "month") {
      const base = activeHandle === "end" ? localEnd : localStart
      return generateMonthTicks(base.getFullYear(), base.getMonth())
    }
    if (zoomLevel === "day") {
      const base = activeHandle === "end" ? localEnd : localStart
      return generateDayTicks(base.getFullYear(), base.getMonth(), base.getDate())
    }
    // zoomLevel === "hour"
    const base = activeHandle === "end" ? localEnd : localStart
    return generateHourTicks(base.getFullYear(), base.getMonth(), base.getDate(), base.getHours(), minuteStep)
  }, [zoomLevel, localStart, localEnd, activeHandle, minuteStep])

  // === 5. Обработчики мыши и удержания ===

  // 5.1. Задержка удержания (ms)
  const HOLD_DELAY = 400

  // 5.2. handleMouseMove: двигаем ручку внутри [minDate, maxDate]
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!activeHandle || !sliderRef.current) return

      const rect = sliderRef.current.getBoundingClientRect()
      const currentX = e.clientX - rect.left
      const deltaX = currentX - dragStartX.current
      const width = rect.width

      let minDate: Date, maxDate: Date

      switch (zoomLevel) {
        case "year":
          minDate = globalMinDate
          maxDate = globalMaxDate
          break
        case "month": {
          const base = activeHandle === "end" ? localEnd : localStart
          minDate = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0)
          const dim = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
          maxDate = new Date(base.getFullYear(), base.getMonth(), dim, 23, 59, 59)
          break
        }
        case "day": {
          const base = activeHandle === "end" ? localEnd : localStart
          minDate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0)
          maxDate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59)
          break
        }
        case "hour": {
          const base = activeHandle === "end" ? localEnd : localStart
          minDate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), base.getHours(), 0, 0)
          maxDate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), base.getHours(), 59, 59)
          break
        }
      }

      const minMs = minDate.getTime()
      const maxMs = maxDate.getTime()
      const fullDuration = maxMs - minMs

      let newTime = dragBaseTime.current + (deltaX / width) * fullDuration
      if (newTime < minMs) newTime = minMs
      if (newTime > maxMs) newTime = maxMs

      if (activeHandle === "start") {
        const newDate = new Date(newTime)
        setLocalStart(newDate)
        if (newDate.getTime() >= localEnd.getTime()) {
          const oneMinute = 1000 * 60
          setLocalEnd(new Date(newDate.getTime() + oneMinute))
        }
      } else {
        const newDate = new Date(newTime)
        setLocalEnd(newDate)
        if (newDate.getTime() <= localStart.getTime()) {
          const oneMinute = 1000 * 60
          setLocalStart(new Date(newDate.getTime() - oneMinute))
        }
      }
    },
    [activeHandle, zoomLevel, globalMinDate, globalMaxDate, localStart, localEnd],
  )

  // 5.3. handleMouseUp: отпустили кнопку — сброс hold, сброс zoomLevel, onChange
  const handleMouseUp = useCallback(() => {
    if (holdTimeoutId.current) {
      clearTimeout(holdTimeoutId.current)
      holdTimeoutId.current = null
    }
    if (zoomLevel !== initialZoomRef.current) {
      setZoomLevel(initialZoomRef.current)
    }
    onChange(localStart, localEnd)
    setActiveHandle(null)
    window.removeEventListener("mousemove", handleMouseMove as any)
    window.removeEventListener("mouseup", handleMouseUp as any)
  }, [zoomLevel, localStart, localEnd, onChange])

  // 5.4. handleMouseDown: начало drag / запуск hold-таймера
  const handleMouseDown = useCallback(
    (handle: "start" | "end") => (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (!sliderRef.current) return

      setActiveHandle(handle)
      initialZoomRef.current = zoomLevel

      if (holdTimeoutId.current) clearTimeout(holdTimeoutId.current)
      holdTimeoutId.current = window.setTimeout(() => {
        setZoomLevel((prev) => {
          if (prev === "year") return "month"
          if (prev === "month") return "day"
          if (prev === "day") return "hour"
          return "hour"
        })
      }, HOLD_DELAY)

      const rect = sliderRef.current.getBoundingClientRect()
      dragStartX.current = e.clientX - rect.left
      dragBaseTime.current = handle === "start" ? localStart.getTime() : localEnd.getTime()

      window.addEventListener("mousemove", handleMouseMove as any)
      window.addEventListener("mouseup", handleMouseUp as any)
    },
    [zoomLevel, localStart, localEnd, handleMouseMove, handleMouseUp],
  )

  // 5.5. Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (holdTimeoutId.current) {
        clearTimeout(holdTimeoutId.current)
      }
      window.removeEventListener("mousemove", handleMouseMove as any)
      window.removeEventListener("mouseup", handleMouseUp as any)
    }
  }, [handleMouseMove, handleMouseUp])

  // === 6. JSX-разметка ===
  return (
    <div className={cn("w-full select-none", className)}>
      {/* 6.1. Контейнер слайдера */}
      <div ref={sliderRef} className="relative w-full h-8 bg-gray-200 rounded overflow-visible">
        {/* 6.2. Деления (ticks) */}
        <div className="absolute inset-0 pointer-events-none">
          {zoomLevel === "year" &&
            generateYearTicks(globalMinDate.getFullYear()).map((date) => {
              const leftPercent = getPositionPercent(date, globalMinDate, globalMaxDate)
              const label = date.toLocaleString("default", { month: "short" })
              return (
                <div
                  key={date.toString()}
                  className="absolute top-0 h-8 border-l border-gray-400"
                  style={{ left: `${leftPercent}%` }}
                >
                  <span className="absolute top-8 -translate-x-1/2 text-xs text-gray-600 pointer-events-none whitespace-nowrap">
                    {label}
                  </span>
                </div>
              )
            })}

          {zoomLevel === "month" &&
            (() => {
              const base = activeHandle === "end" ? localEnd : localStart
              const year = base.getFullYear()
              const month = base.getMonth()
              const monthStart = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0)
              const daysInMonth = new Date(year, month + 1, 0).getDate()
              const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59)
              return generateMonthTicks(year, month).map((date) => {
                const leftPercent = getPositionPercent(date, monthStart, monthEnd)
                const label = date.getDate().toString()
                return (
                  <div
                    key={date.toString()}
                    className="absolute top-0 h-8 border-l border-gray-400"
                    style={{ left: `${leftPercent}%` }}
                  >
                    <span className="absolute top-8 -translate-x-1/2 text-xs text-gray-600 pointer-events-none">
                      {label}
                    </span>
                  </div>
                )
              })
            })()}

          {zoomLevel === "day" &&
            (() => {
              const base = activeHandle === "end" ? localEnd : localStart
              const year = base.getFullYear()
              const month = base.getMonth()
              const day = base.getDate()
              const dayStart = new Date(year, month, day, 0, 0, 0)
              const dayEnd = new Date(year, month, day, 23, 59, 59)
              return generateDayTicks(year, month, day).map((date) => {
                const leftPercent = getPositionPercent(date, dayStart, dayEnd)
                const label = date.getHours().toString().padStart(2, "0")
                return (
                  <div
                    key={date.toString()}
                    className="absolute top-0 h-8 border-l border-gray-400"
                    style={{ left: `${leftPercent}%` }}
                  >
                    <span className="absolute top-8 -translate-x-1/2 text-xs text-gray-600 pointer-events-none">
                      {label}
                    </span>
                  </div>
                )
              })
            })()}

          {zoomLevel === "hour" &&
            (() => {
              const base = activeHandle === "end" ? localEnd : localStart
              const year = base.getFullYear()
              const month = base.getMonth()
              const day = base.getDate()
              const hour = base.getHours()
              const hourStart = new Date(year, month, day, hour, 0, 0)
              const hourEnd = new Date(year, month, day, hour, 59, 59)
              return generateHourTicks(year, month, day, hour, minuteStep).map((date) => {
                const leftPercent = getPositionPercent(date, hourStart, hourEnd)
                const label = date.getMinutes().toString().padStart(2, "0")
                return (
                  <div
                    key={date.toString()}
                    className="absolute top-0 h-8 border-l border-gray-400"
                    style={{ left: `${leftPercent}%` }}
                  >
                    <span className="absolute top-8 -translate-x-1/2 text-xs text-gray-600 pointer-events-none">
                      {label}
                    </span>
                  </div>
                )
              })
            })()}
        </div>

        {/* 6.3. Заливка выбранного диапазона */}
        <div
          className="absolute top-0 bottom-0 bg-blue-500/30 pointer-events-none rounded"
          style={{
            left: `${
              zoomLevel === "year"
                ? getPositionPercent(localStart, globalMinDate, globalMaxDate)
                : zoomLevel === "month"
                  ? (() => {
                      const base = activeHandle === "end" ? localEnd : localStart
                      const monthStart = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0)
                      const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59)
                      return getPositionPercent(localStart, monthStart, monthEnd)
                    })()
                  : zoomLevel === "day"
                    ? getPositionPercent(
                        localStart,
                        new Date(localStart.getFullYear(), localStart.getMonth(), localStart.getDate(), 0, 0, 0),
                        new Date(localStart.getFullYear(), localStart.getMonth(), localStart.getDate(), 23, 59, 59),
                      )
                    : // hour
                      getPositionPercent(
                        localStart,
                        new Date(
                          localStart.getFullYear(),
                          localStart.getMonth(),
                          localStart.getDate(),
                          localStart.getHours(),
                          0,
                          0,
                        ),
                        new Date(
                          localStart.getFullYear(),
                          localStart.getMonth(),
                          localStart.getDate(),
                          localStart.getHours(),
                          59,
                          59,
                        ),
                      )
            }%`,
            width: `${
              zoomLevel === "year"
                ? getPositionPercent(localEnd, globalMinDate, globalMaxDate) -
                  getPositionPercent(localStart, globalMinDate, globalMaxDate)
                : zoomLevel === "month"
                  ? (() => {
                      const base = activeHandle === "end" ? localEnd : localStart
                      const monthStart = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0)
                      const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59)
                      return (
                        getPositionPercent(localEnd, monthStart, monthEnd) -
                        getPositionPercent(localStart, monthStart, monthEnd)
                      )
                    })()
                  : zoomLevel === "day"
                    ? getPositionPercent(
                        localEnd,
                        new Date(localEnd.getFullYear(), localEnd.getMonth(), localEnd.getDate(), 0, 0, 0),
                        new Date(localEnd.getFullYear(), localEnd.getMonth(), localEnd.getDate(), 23, 59, 59),
                      ) -
                      getPositionPercent(
                        localStart,
                        new Date(localStart.getFullYear(), localStart.getMonth(), localStart.getDate(), 0, 0, 0),
                        new Date(localStart.getFullYear(), localStart.getMonth(), localStart.getDate(), 23, 59, 59),
                      )
                    : // hour
                      getPositionPercent(
                        localEnd,
                        new Date(
                          localEnd.getFullYear(),
                          localEnd.getMonth(),
                          localEnd.getDate(),
                          localEnd.getHours(),
                          0,
                          0,
                        ),
                        new Date(
                          localEnd.getFullYear(),
                          localEnd.getMonth(),
                          localEnd.getDate(),
                          localEnd.getHours(),
                          59,
                          59,
                        ),
                      ) -
                      getPositionPercent(
                        localStart,
                        new Date(
                          localStart.getFullYear(),
                          localStart.getMonth(),
                          localStart.getDate(),
                          localStart.getHours(),
                          0,
                          0,
                        ),
                        new Date(
                          localStart.getFullYear(),
                          localStart.getMonth(),
                          localStart.getDate(),
                          localStart.getHours(),
                          59,
                          59,
                        ),
                      )
            }%`,
          }}
        />

        {/* 6.4. Левая ручка (start) */}
        <div
          className="absolute top-1/2 w-8 h-8 -translate-y-1/2 -translate-x-1/2 cursor-grab z-10 flex items-center justify-center"
          style={{
            left: `${
              zoomLevel === "year"
                ? getPositionPercent(localStart, globalMinDate, globalMaxDate)
                : zoomLevel === "month"
                  ? (() => {
                      const base = activeHandle === "end" ? localEnd : localStart
                      const monthStart = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0)
                      const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59)
                      return getPositionPercent(localStart, monthStart, monthEnd)
                    })()
                  : zoomLevel === "day"
                    ? getPositionPercent(
                        localStart,
                        new Date(localStart.getFullYear(), localStart.getMonth(), localStart.getDate(), 0, 0, 0),
                        new Date(localStart.getFullYear(), localStart.getMonth(), localStart.getDate(), 23, 59, 59),
                      )
                    : // hour
                      getPositionPercent(
                        localStart,
                        new Date(
                          localStart.getFullYear(),
                          localStart.getMonth(),
                          localStart.getDate(),
                          localStart.getHours(),
                          0,
                          0,
                        ),
                        new Date(
                          localStart.getFullYear(),
                          localStart.getMonth(),
                          localStart.getDate(),
                          localStart.getHours(),
                          59,
                          59,
                        ),
                      )
            }%`,
          }}
          onMouseDown={handleMouseDown("start")}
          onMouseEnter={() => setHoverHandle("start")}
          onMouseLeave={() => setHoverHandle(null)}
        >
          {/* Визуальная ручка */}
          <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg pointer-events-none" />

          {hoverHandle === "start" && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-20">
              {localStart.toLocaleString("default", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>

        {/* 6.5. Правая ручка (end) */}
        <div
          className="absolute top-1/2 w-8 h-8 -translate-y-1/2 -translate-x-1/2 cursor-grab z-10 flex items-center justify-center"
          style={{
            left: `${
              zoomLevel === "year"
                ? getPositionPercent(localEnd, globalMinDate, globalMaxDate)
                : zoomLevel === "month"
                  ? (() => {
                      const base = activeHandle === "end" ? localEnd : localStart
                      const monthStart = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0)
                      const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59)
                      return getPositionPercent(localEnd, monthStart, monthEnd)
                    })()
                  : zoomLevel === "day"
                    ? getPositionPercent(
                        localEnd,
                        new Date(localEnd.getFullYear(), localEnd.getMonth(), localEnd.getDate(), 0, 0, 0),
                        new Date(localEnd.getFullYear(), localEnd.getMonth(), localEnd.getDate(), 23, 59, 59),
                      )
                    : // hour
                      getPositionPercent(
                        localEnd,
                        new Date(
                          localEnd.getFullYear(),
                          localEnd.getMonth(),
                          localEnd.getDate(),
                          localEnd.getHours(),
                          0,
                          0,
                        ),
                        new Date(
                          localEnd.getFullYear(),
                          localEnd.getMonth(),
                          localEnd.getDate(),
                          localEnd.getHours(),
                          59,
                          59,
                        ),
                      )
            }%`,
          }}
          onMouseDown={handleMouseDown("end")}
          onMouseEnter={() => setHoverHandle("end")}
          onMouseLeave={() => setHoverHandle(null)}
        >
          {/* Визуальная ручка */}
          <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg pointer-events-none" />

          {hoverHandle === "end" && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-20">
              {localEnd.toLocaleString("default", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      </div>

      {/* 6.6. Отображение текущего диапазона и уровня зума */}
      <div className="mt-6 space-y-2">
        <div className="text-sm text-gray-700 text-center">
          {localStart.toLocaleString("default", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" — "}
          {localEnd.toLocaleString("default", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div className="text-xs text-gray-500 text-center">
          Масштаб:{" "}
          {zoomLevel === "year" ? "год" : zoomLevel === "month" ? "месяц" : zoomLevel === "day" ? "день" : "час"}
          {zoomLevel !== "year" && " (удерживайте ручку для углубления)"}
        </div>
      </div>
    </div>
  )
}
