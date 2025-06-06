"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Label } from "@/components/ui/label"

type ZoomLevel = "year" | "month" | "day" | "hour"

interface HierarchicalDateTimeSliderProps {
  globalMinDate: Date
  globalMaxDate: Date
  initialStart?: Date
  initialEnd?: Date
  startConstraint?: Date | null
  endConstraint?: Date | null
  blockedRanges?: Array<{ start: Date; end: Date }>
  minuteStep?: number
  onChange?: (start: Date, end: Date) => void
  className?: string
}

export default function HierarchicalDateTimeSlider({
  globalMinDate,
  globalMaxDate,
  initialStart,
  initialEnd,
  startConstraint,
  endConstraint,
  blockedRanges = [],
  minuteStep = 15,
  onChange,
  className,
}: HierarchicalDateTimeSliderProps) {
  // Состояния для межгодового режима
  const [crossYearMode, setCrossYearMode] = useState(false)
  const [endYear, setEndYear] = useState(2025)

  // Функция для получения доступных годов на основе ограничений
  const getAvailableYears = useCallback(() => {
    const minYear = startConstraint ? startConstraint.getFullYear() : globalMinDate.getFullYear()
    const maxYear = endConstraint ? endConstraint.getFullYear() : globalMaxDate.getFullYear()

    const years: number[] = []
    for (let year = minYear; year <= maxYear; year++) {
      years.push(year)
    }
    return years
  }, [startConstraint, endConstraint, globalMinDate, globalMaxDate])

  // Функция для проверки, позволяют ли ограничения межгодовой выбор
  const canSelectCrossYear = useCallback(() => {
    const minYear = startConstraint ? startConstraint.getFullYear() : globalMinDate.getFullYear()
    const maxYear = endConstraint ? endConstraint.getFullYear() : globalMaxDate.getFullYear()

    // Межгодовой режим доступен только если диапазон охватывает более одного года
    return maxYear > minYear
  }, [startConstraint, endConstraint, globalMinDate, globalMaxDate])

  // Функция для применения ограничений к дате
  const applyConstraints = useCallback(
    (date: Date): Date => {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return new Date(globalMinDate)
      }

      let constrainedDate = new Date(date)

      if (startConstraint && constrainedDate < startConstraint) {
        constrainedDate = new Date(startConstraint)
      }

      if (endConstraint && constrainedDate > endConstraint) {
        constrainedDate = new Date(endConstraint)
      }

      return constrainedDate
    },
    [startConstraint, endConstraint, globalMinDate],
  )

  // Функция для проверки, находится ли дата в заблокированном диапазоне
  const isDateBlocked = useCallback(
    (date: Date): boolean => {
      return blockedRanges.some((range) => date >= range.start && date <= range.end)
    },
    [blockedRanges],
  )

  // Применяем ограничения к начальным значениям
  const constrainedInitialStart = applyConstraints(initialStart || globalMinDate)
  const constrainedInitialEnd = crossYearMode
    ? applyConstraints(
        new Date(
          endYear,
          (initialEnd || globalMaxDate).getMonth(),
          (initialEnd || globalMaxDate).getDate(),
          (initialEnd || globalMaxDate).getHours(),
          (initialEnd || globalMaxDate).getMinutes(),
        ),
      )
    : applyConstraints(initialEnd || globalMaxDate)

  const [localStart, setLocalStart] = useState(constrainedInitialStart)
  const [localEnd, setLocalEnd] = useState(constrainedInitialEnd)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("year")
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null)
  const [hoveredHandle, setHoveredHandle] = useState<"start" | "end" | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const [activeHandle, setActiveHandle] = useState<"start" | "end" | null>(null)

  // Новые состояния для вертикального движения
  const [dragStartY, setDragStartY] = useState<number | null>(null)
  const [currentY, setCurrentY] = useState<number | null>(null)

  const sliderRef = useRef<HTMLDivElement>(null)
  const secondSliderRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const verticalThreshold = isMobile ? 40 : 25
  const zoneOffset = isMobile ? 25 : 20

  // Отключаем межгодовой режим если ограничения не позволяют его использовать
  useEffect(() => {
    if (!canSelectCrossYear() && crossYearMode) {
      setCrossYearMode(false)
    }
  }, [canSelectCrossYear, crossYearMode])

  // Обновляем endYear при изменении ограничений
  useEffect(() => {
    const availableYears = getAvailableYears()
    if (availableYears.length > 0 && !availableYears.includes(endYear)) {
      setEndYear(availableYears[availableYears.length - 1])
    }
  }, [getAvailableYears, endYear])

  // Обновляем конечную дату при изменении года в межгодовом режиме
  useEffect(() => {
    if (crossYearMode && localEnd) {
      const newEndDate = new Date(
        endYear,
        localEnd.getMonth(),
        localEnd.getDate(),
        localEnd.getHours(),
        localEnd.getMinutes(),
      )
      setLocalEnd(newEndDate)
    }
  }, [crossYearMode, endYear])

  // Обновляем даты при изменении ограничений
  useEffect(() => {
    if (localStart && localEnd) {
      const newStart = applyConstraints(localStart)
      const newEnd = crossYearMode ? localEnd : applyConstraints(localEnd)

      if (newStart.getTime() !== localStart.getTime()) {
        setLocalStart(newStart)
      }

      if (!crossYearMode && newEnd.getTime() !== localEnd.getTime()) {
        setLocalEnd(newEnd)
      }
    }
  }, [startConstraint, endConstraint, applyConstraints, localStart, localEnd, crossYearMode])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Предотвращение скролла страницы при взаимодействии со слайдером
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      if (isDragging && containerRef.current?.contains(e.target as Node)) {
        e.preventDefault()
      }
    }

    if (isDragging) {
      document.addEventListener("touchmove", preventScroll, { passive: false })

      return () => {
        document.removeEventListener("touchmove", preventScroll)
      }
    }
  }, [isDragging])

  // Получение эффективных границ с учетом ограничений
  const getEffectiveBounds = useCallback(() => {
    return { min: globalMinDate, max: globalMaxDate }
  }, [globalMinDate, globalMaxDate])

  // Получение границ для текущего уровня зума с учетом межгодового режима
  const getCurrentLevelBounds = useCallback(() => {
    const activeDate = isDragging === "start" ? localStart : localEnd
    if (!activeDate) return { min: globalMinDate, max: globalMaxDate }

    // Для шкалы всегда используем эффективные границы
    const { min: effectiveMin, max: effectiveMax } = getEffectiveBounds()
    const currentYear = crossYearMode && isDragging === "end" ? endYear : activeDate.getFullYear()

    switch (zoomLevel) {
      case "year":
        if (crossYearMode && isDragging === "end") {
          // Для конечного ползунка в межгодовом режиме показываем весь выбранный год
          return {
            min: new Date(endYear, 0, 1),
            max: new Date(endYear, 11, 31, 23, 59, 59, 999),
          }
        } else {
          // Для начального ползунка или в обычном режиме показываем текущий год
          const yearStart = new Date(activeDate.getFullYear(), 0, 1)
          const yearEnd = new Date(activeDate.getFullYear(), 11, 31, 23, 59, 59, 999)
          return { min: yearStart, max: yearEnd }
        }
      case "month":
        const monthStart = new Date(currentYear, activeDate.getMonth(), 1)
        const monthEnd = new Date(currentYear, activeDate.getMonth() + 1, 0, 23, 59, 59, 999)
        return { min: monthStart, max: monthEnd }
      case "day":
        const dayStart = new Date(currentYear, activeDate.getMonth(), activeDate.getDate())
        const dayEnd = new Date(currentYear, activeDate.getMonth(), activeDate.getDate(), 23, 59, 59, 999)
        return { min: dayStart, max: dayEnd }
      case "hour":
        const hourDate = isDragging ? (isDragging === "start" ? localStart : localEnd) : localStart
        if (!hourDate) return { min: globalMinDate, max: globalMaxDate }

        const hourStart = new Date(currentYear, hourDate.getMonth(), hourDate.getDate(), hourDate.getHours(), 0, 0, 0)
        const hourEnd = new Date(currentYear, hourDate.getMonth(), hourDate.getDate(), hourDate.getHours(), 59, 59, 999)
        return { min: hourStart, max: hourEnd }
      default:
        return { min: effectiveMin, max: effectiveMax }
    }
  }, [
    zoomLevel,
    localStart,
    localEnd,
    isDragging,
    getEffectiveBounds,
    crossYearMode,
    endYear,
    globalMinDate,
    globalMaxDate,
  ])

  // Генерация точек привязки для текущего уровня зума
  const generateSnapPoints = useCallback(() => {
    const { min, max } = getCurrentLevelBounds()
    if (!min || !max) return [globalMinDate]

    const snapPoints: Date[] = []

    try {
      switch (zoomLevel) {
        case "year":
          for (let month = 0; month < 12; month++) {
            const date = new Date(min.getFullYear(), month, 1)
            if (date >= min && date <= max && !isDateBlocked(date)) {
              snapPoints.push(date)
            }
          }
          break
        case "month":
          const daysInMonth = new Date(min.getFullYear(), min.getMonth() + 1, 0).getDate()
          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(min.getFullYear(), min.getMonth(), day)
            if (date >= min && date <= max && !isDateBlocked(date)) {
              snapPoints.push(date)
            }
          }
          break
        case "day":
          for (let hour = 0; hour < 24; hour++) {
            const date = new Date(min.getFullYear(), min.getMonth(), min.getDate(), hour)
            if (date >= min && date <= max && !isDateBlocked(date)) {
              snapPoints.push(date)
            }
          }
          break
        case "hour":
          const minuteSteps = [0, 15, 30, 45]
          const hourDate = isDragging ? (isDragging === "start" ? localStart : localEnd) : localStart
          if (hourDate) {
            minuteSteps.forEach((minute) => {
              const date = new Date(
                hourDate.getFullYear(),
                hourDate.getMonth(),
                hourDate.getDate(),
                hourDate.getHours(),
                minute,
                0,
                0,
              )
              if (date >= min && date <= max && !isDateBlocked(date)) {
                snapPoints.push(date)
              }
            })
          }
          break
      }
    } catch (error) {
      console.warn("Error generating snap points:", error)
      return [globalMinDate]
    }

    return snapPoints.length > 0 ? snapPoints : [min]
  }, [zoomLevel, getCurrentLevelBounds, isDragging, localStart, localEnd, globalMinDate, isDateBlocked])

  // Вычисление позиции в процентах для любой даты
  const getPositionPercent = useCallback(
    (date: Date) => {
      if (!date) return 0

      const { min, max } = getCurrentLevelBounds()
      if (!min || !max) return 0

      const totalMs = max.getTime() - min.getTime()
      if (totalMs <= 0) return 0

      const currentMs = Math.max(0, Math.min(totalMs, date.getTime() - min.getTime()))
      return (currentMs / totalMs) * 100
    },
    [getCurrentLevelBounds],
  )

  // Поиск ближайшей точки привязки
  const findNearestSnapPoint = useCallback(
    (percentage: number) => {
      const snapPoints = generateSnapPoints()
      if (!snapPoints || snapPoints.length === 0) {
        return crossYearMode && isDragging === "end" ? new Date(endYear, 0, 1) : applyConstraints(globalMinDate)
      }

      const { min, max } = getCurrentLevelBounds()
      if (!min || !max) return snapPoints[0]

      const totalMs = max.getTime() - min.getTime()
      if (totalMs <= 0) return snapPoints[0]

      const targetMs = min.getTime() + (totalMs * percentage) / 100
      const targetDate = new Date(targetMs)

      let nearestPoint = snapPoints[0]
      let minDistance = Math.abs(targetDate.getTime() - snapPoints[0].getTime())

      snapPoints.forEach((point) => {
        if (point) {
          const distance = Math.abs(targetDate.getTime() - point.getTime())
          if (distance < minDistance) {
            minDistance = distance
            nearestPoint = point
          }
        }
      })

      if (crossYearMode && isDragging === "end") {
        return nearestPoint
      }

      return applyConstraints(nearestPoint)
    },
    [generateSnapPoints, getCurrentLevelBounds, applyConstraints, globalMinDate, crossYearMode, isDragging, endYear],
  )

  // Генерация делений для отображения
  const generateTicks = useCallback(() => {
    const snapPoints = generateSnapPoints()
    const ticks: { position: number; label: string; isBlocked?: boolean }[] = []

    snapPoints.forEach((point) => {
      if (!point) return

      const position = getPositionPercent(point)
      const isBlocked = isDateBlocked(point)
      let label = ""

      try {
        switch (zoomLevel) {
          case "year":
            label = point.toLocaleDateString("ru-RU", { month: "short" })
            break
          case "month":
            label = point.getDate().toString()
            break
          case "day":
            label = point.getHours().toString().padStart(2, "0")
            break
          case "hour":
            label = point.getMinutes().toString().padStart(2, "0")
            break
        }
      } catch (error) {
        console.warn("Error formatting tick label:", error)
        label = "?"
      }

      ticks.push({ position, label, isBlocked })
    })

    return ticks
  }, [generateSnapPoints, getPositionPercent, zoomLevel, isDateBlocked])

  // Получение координат из события (мышь или тач)
  const getEventCoordinates = useCallback((event: MouseEvent | TouchEvent) => {
    if ("touches" in event) {
      return { clientX: event.touches[0].clientX, clientY: event.touches[0].clientY }
    }
    return { clientX: event.clientX, clientY: event.clientY }
  }, [])

  // Обновление уровня зума на основе вертикального движения
  const updateZoomLevelFromVerticalMovement = useCallback(
    (currentY: number) => {
      if (dragStartY === null) return

      const verticalDelta = currentY - dragStartY
      const adjustedDelta = Math.max(0, verticalDelta - zoneOffset)

      if (adjustedDelta >= 2 * verticalThreshold) {
        setZoomLevel("hour")
      } else if (adjustedDelta >= verticalThreshold) {
        setZoomLevel("day")
      } else if (adjustedDelta >= 10) {
        setZoomLevel("month")
      } else {
        setZoomLevel("year")
      }
    },
    [dragStartY, verticalThreshold, zoneOffset],
  )

  // Обработка начала перетаскивания (мышь и тач)
  const handlePointerDown = useCallback(
    (handle: "start" | "end", event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault()
      event.stopPropagation()

      setActiveHandle(handle)
      setIsDragging(handle)

      const { clientY } = getEventCoordinates(event as any)
      setDragStartY(clientY)
      setCurrentY(clientY)
    },
    [getEventCoordinates],
  )

  // Обработка перетаскивания
  const handlePointerMove = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isDragging) return

      const currentSliderRef = crossYearMode && isDragging === "end" ? secondSliderRef : sliderRef
      if (!currentSliderRef.current) return

      event.preventDefault()
      const { clientX, clientY } = getEventCoordinates(event)

      setCurrentY(clientY)

      if (dragStartY !== null) {
        updateZoomLevelFromVerticalMovement(clientY)
      }

      const rect = currentSliderRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))

      const snapDate = findNearestSnapPoint(percentage)

      // Проверяем, не заблокирована ли выбранная дата
      if (isDateBlocked(snapDate)) {
        return // Не позволяем выбрать заблокированную дату
      }

      if (isDragging === "start") {
        setLocalStart(snapDate)
        if (!crossYearMode) {
          const minEnd = new Date(snapDate.getTime() + 60000)
          if (localEnd < minEnd) {
            setLocalEnd(minEnd)
          }
        }
      } else {
        setLocalEnd(snapDate)
        if (!crossYearMode) {
          const maxStart = new Date(snapDate.getTime() - 60000)
          if (localStart > maxStart) {
            setLocalStart(maxStart)
          }
        }
      }
    },
    [
      isDragging,
      getEventCoordinates,
      findNearestSnapPoint,
      localStart,
      localEnd,
      dragStartY,
      updateZoomLevelFromVerticalMovement,
      crossYearMode,
      isDateBlocked,
    ],
  )

  // Обработка окончания перетаскивания
  const handlePointerUp = useCallback(() => {
    setIsDragging(null)
    setActiveHandle(null)
    setDragStartY(null)
    setCurrentY(null)
    setZoomLevel("year")

    if (onChange && localStart && localEnd) {
      onChange(localStart, localEnd)
    }
  }, [localStart, localEnd, onChange])

  // Обработка наведения на ручку
  const handlePointerEnter = useCallback(
    (handle: "start" | "end", event: React.MouseEvent | React.TouchEvent) => {
      if (!isMobile) {
        const { clientX, clientY } = getEventCoordinates(event as any)
        setHoveredHandle(handle)
        setTooltipPosition({ x: clientX, y: clientY })
      }
    },
    [getEventCoordinates, isMobile],
  )

  const handlePointerLeave = useCallback(() => {
    if (!isMobile) {
      setHoveredHandle(null)
    }
  }, [isMobile])

  // Подписка на события мыши и тач
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handlePointerMove(e)
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        handlePointerMove(e)
      }
      const handleMouseUp = () => handlePointerUp()
      const handleTouchEnd = () => handlePointerUp()

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("touchmove", handleTouchMove, { passive: false })
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("touchend", handleTouchEnd)

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.removeEventListener("touchend", handleTouchEnd)
      }
    }
  }, [isDragging, handlePointerMove, handlePointerUp])

  // Получение цветов для текущего уровня зума
  const getZoomLevelColors = useCallback(() => {
    switch (zoomLevel) {
      case "year":
        return {
          track: "bg-yellow-500/60",
          border: "border-yellow-500",
          text: "text-yellow-600",
        }
      case "month":
        return {
          track: "bg-orange-500/60",
          border: "border-orange-500",
          text: "text-orange-600",
        }
      case "day":
        return {
          track: "bg-red-500/60",
          border: "border-red-500",
          text: "text-red-600",
        }
      case "hour":
        return {
          track: "bg-red-800/60",
          border: "border-red-800",
          text: "text-red-800",
        }
    }
  }, [zoomLevel])

  const startPosition = localStart ? getPositionPercent(localStart) : 0
  const endPosition = localEnd ? getPositionPercent(localEnd) : 100
  const ticks = generateTicks()

  // Функция для получения видимых меток на мобильных
  const getVisibleTicksForMobile = useCallback(() => {
    if (!isMobile) return ticks

    const activeDate = isDragging === "start" ? localStart : isDragging === "end" ? localEnd : localStart
    if (!activeDate) return []

    let label = ""
    let prefix = ""
    const isVisible = isDragging !== null

    try {
      switch (zoomLevel) {
        case "year":
          prefix = "Месяц: "
          label = activeDate.toLocaleDateString("ru-RU", { month: "long" })
          break
        case "month":
          prefix = "День: "
          label = activeDate.getDate().toString()
          break
        case "day":
          prefix = "Час: "
          label = activeDate.getHours().toString().padStart(2, "0")
          break
        case "hour":
          prefix = "Минута: "
          label = activeDate.getMinutes().toString().padStart(2, "0")
          break
      }
    } catch (error) {
      console.warn("Error formatting mobile tick:", error)
      label = "?"
    }

    return [{ position: 50, label, prefix, isVisible }]
  }, [isMobile, zoomLevel, localStart, localEnd, isDragging, ticks])

  const formatDateTimeWithColors = (date: Date) => {
    if (!date) return { year: "0000", month: "00", day: "00", hour: "00", minute: "00" }

    try {
      const year = date.getFullYear()
      const month = date.toLocaleDateString("ru-RU", { month: "2-digit" })
      const day = date.toLocaleDateString("ru-RU", { day: "2-digit" })
      const hour = date.getHours().toString().padStart(2, "0")
      const minute = date.getMinutes().toString().padStart(2, "0")

      return { year, month, day, hour, minute }
    } catch (error) {
      console.warn("Error formatting date:", error)
      return { year: "0000", month: "00", day: "00", hour: "00", minute: "00" }
    }
  }

  // Функция для определения, какой компонент даты должен быть увеличен
  const getEnlargedComponent = () => {
    if (!isDragging) return null

    switch (zoomLevel) {
      case "year":
        return "month"
      case "month":
        return "day"
      case "day":
        return "hour"
      case "hour":
        return "minute"
      default:
        return null
    }
  }

  // Функция для рендеринга даты с увеличенным компонентом
  const renderDateWithEnlargedComponent = (date: Date, handle: "start" | "end") => {
    const colors = formatDateTimeWithColors(date)
    const enlargedComponent = getEnlargedComponent()
    const isActive = isDragging === handle

    return (
      <span className="inline-flex items-baseline whitespace-nowrap text-sm sm:text-base">
        <span className="text-black">{colors.year}</span>
        <span className="text-black">.</span>
        <span
          className={`text-yellow-600 ${isActive && enlargedComponent === "month" ? "text-2xl sm:text-3xl font-bold" : ""}`}
        >
          {colors.month}
        </span>
        <span className="text-black">.</span>
        <span
          className={`text-orange-600 ${isActive && enlargedComponent === "day" ? "text-2xl sm:text-3xl font-bold" : ""}`}
        >
          {colors.day}
        </span>
        <span className="text-black">, </span>
        <span
          className={`text-red-600 ${isActive && enlargedComponent === "hour" ? "text-2xl sm:text-3xl font-bold" : ""}`}
        >
          {colors.hour}
        </span>
        <span className="text-black">:</span>
        <span
          className={`text-red-800 ${isActive && enlargedComponent === "minute" ? "text-2xl sm:text-3xl font-bold" : ""}`}
        >
          {colors.minute}
        </span>
      </span>
    )
  }

  // Вычисление текущего вертикального смещения для индикатора
  const getCurrentVerticalOffset = () => {
    if (dragStartY === null || currentY === null) return 0
    return Math.max(0, currentY - dragStartY)
  }

  // Определение активной зоны на основе текущего вертикального смещения
  const getActiveZone = () => {
    const offset = getCurrentVerticalOffset()
    const adjustedOffset = Math.max(0, offset - zoneOffset)

    if (adjustedOffset >= 2 * verticalThreshold) return "hour"
    if (adjustedOffset >= verticalThreshold) return "day"
    if (adjustedOffset >= 10) return "month"
    return "year"
  }

  // Вычисление высоты компонента в зависимости от режима
  const componentHeight = isMobile ? (crossYearMode ? "480px" : "360px") : crossYearMode ? "520px" : "380px"

  // Проверяем, что у нас есть валидные даты
  if (!localStart || !localEnd) {
    return <div className="text-center text-gray-500 py-8">Загрузка...</div>
  }

  const availableYears = getAvailableYears()
  const showCrossYearOption = canSelectCrossYear()

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {/* Межгодовой режим - показываем только если ограничения позволяют */}
      {showCrossYearOption && (
        <div className="space-y-2 sm:space-y-3 border-t pt-2 sm:pt-3">
          <div className="flex items-center space-x-2">
            <input
              id="cross-year"
              type="checkbox"
              checked={crossYearMode}
              onChange={(e) => setCrossYearMode(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <Label htmlFor="cross-year" className="text-sm font-medium">
              Конец в другом году
            </Label>
          </div>

          {crossYearMode && (
            <div className="space-y-2">
              <Label htmlFor="end-year" className="text-sm">
                Год для конечной даты
              </Label>
              <select
                id="end-year"
                value={endYear}
                onChange={(e) => setEndYear(Number.parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Слайдер */}
      <div ref={containerRef} style={{ touchAction: "pan-y pinch-zoom" }}>
        <div className="relative bg-white rounded-lg border p-2 sm:p-4 lg:p-6" style={{ height: componentHeight }}>
          {/* Заголовок с текущим уровнем */}
          <div
            className="absolute top-2 sm:top-4 left-2 right-2 sm:left-4 sm:right-4 lg:left-6 lg:right-6 text-center"
            style={{ height: isMobile ? "60px" : "80px" }}
          >
            {!activeHandle ? (
              <>
                <div className="text-xs sm:text-sm font-medium mb-1 sm:mb-2">Выбранный период:</div>
                <div className="text-sm sm:text-base lg:text-xl font-mono whitespace-nowrap overflow-x-auto">
                  <span className="inline-flex items-baseline">
                    <span className="text-black">{formatDateTimeWithColors(localStart).year}</span>
                    <span className="text-black">.</span>
                    <span className="text-yellow-600">{formatDateTimeWithColors(localStart).month}</span>
                    <span className="text-black">.</span>
                    <span className="text-orange-600">{formatDateTimeWithColors(localStart).day}</span>
                    <span className="text-black">, </span>
                    <span className="text-red-600">{formatDateTimeWithColors(localStart).hour}</span>
                    <span className="text-black">:</span>
                    <span className="text-red-800">{formatDateTimeWithColors(localStart).minute}</span>
                    <span className="text-black mx-1 sm:mx-2">—</span>
                    <span className="text-black">{formatDateTimeWithColors(localEnd).year}</span>
                    <span className="text-black">.</span>
                    <span className="text-yellow-600">{formatDateTimeWithColors(localEnd).month}</span>
                    <span className="text-black">.</span>
                    <span className="text-orange-600">{formatDateTimeWithColors(localEnd).day}</span>
                    <span className="text-black">, </span>
                    <span className="text-red-600">{formatDateTimeWithColors(localEnd).hour}</span>
                    <span className="text-black">:</span>
                    <span className="text-red-800">{formatDateTimeWithColors(localEnd).minute}</span>
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                  {activeHandle === "start" ? "Начало периода:" : "Конец периода:"}
                  {crossYearMode && activeHandle === "end" && (
                    <span className="ml-2 text-blue-600">({endYear} год)</span>
                  )}
                </div>
                <div className="font-mono font-bold flex justify-center items-center h-6 sm:h-8">
                  {renderDateWithEnlargedComponent(activeHandle === "start" ? localStart : localEnd, activeHandle)}
                </div>
              </>
            )}
          </div>

          {/* Первая шкала */}
          <div
            className={`absolute ${isMobile ? "top-[70px]" : "top-[100px]"} left-2 right-2 sm:left-4 sm:right-4 lg:left-6 lg:right-6 h-6 sm:h-8`}
          >
            {(!crossYearMode || isDragging !== "end") &&
              (isMobile ? getVisibleTicksForMobile() : ticks).map((tick, index) => (
                <div key={index} className="absolute transform -translate-x-1/2" style={{ left: `${tick.position}%` }}>
                  {!isMobile && (
                    <div className={`w-px h-3 sm:h-4 ${tick.isBlocked ? "bg-red-400" : "bg-gray-400"}`}></div>
                  )}
                  <div
                    className={`${isMobile ? "text-xs sm:text-sm" : "text-xs mt-1"} font-medium whitespace-nowrap text-center transition-opacity duration-200 ${
                      isMobile && "isVisible" in tick && !tick.isVisible ? "opacity-0" : "opacity-100"
                    } ${tick.isBlocked ? "text-red-500" : getZoomLevelColors().text}`}
                  >
                    {isMobile ? (
                      <>
                        <span className="text-black">{tick.prefix}</span>
                        <span className={tick.isBlocked ? "text-red-500" : getZoomLevelColors().text}>
                          {tick.label}
                        </span>
                      </>
                    ) : (
                      <span className={tick.isBlocked ? "text-red-500" : getZoomLevelColors().text}>{tick.label}</span>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {/* Первый трек слайдера */}
          <div
            className={`absolute ${isMobile ? "top-[100px]" : "top-[130px]"} left-2 right-2 sm:left-4 sm:right-4 lg:left-6 lg:right-6`}
          >
            <div
              ref={sliderRef}
              className="relative w-full h-8 sm:h-6 lg:h-3 bg-gray-200 rounded cursor-pointer"
              style={{ touchAction: "none" }}
            >
              {/* Заблокированные диапазоны */}
              {blockedRanges.map((range, index) => {
                const startPos = getPositionPercent(range.start)
                const endPos = getPositionPercent(range.end)
                return (
                  <div
                    key={index}
                    className="absolute h-full bg-red-200 border border-red-400 rounded"
                    style={{
                      left: `${Math.min(startPos, endPos)}%`,
                      width: `${Math.abs(endPos - startPos)}%`,
                    }}
                  />
                )
              })}

              {!crossYearMode && (
                <div
                  className={`absolute h-full rounded ${getZoomLevelColors().track}`}
                  style={{
                    left: `${Math.min(startPosition, endPosition)}%`,
                    width: `${Math.abs(endPosition - startPosition)}%`,
                  }}
                />
              )}

              {/* Ручка начала */}
              <div
                className="absolute w-12 h-12 sm:w-8 sm:h-8 lg:w-5 lg:h-5 transform -translate-x-1/2 -translate-y-2 sm:-translate-y-1 lg:-translate-y-1 cursor-grab active:cursor-grabbing z-10"
                style={{ left: `${startPosition}%`, touchAction: "none" }}
                onMouseDown={(e) => handlePointerDown("start", e)}
                onTouchStart={(e) => handlePointerDown("start", e)}
                onMouseEnter={(e) => handlePointerEnter("start", e)}
                onMouseLeave={handlePointerLeave}
              >
                <div
                  className={`w-8 h-12 sm:w-6 sm:h-8 lg:w-3 lg:h-5 bg-white rounded shadow-lg border-2 ${getZoomLevelColors().border} mx-auto`}
                ></div>
              </div>

              {/* Ручка конца (только если не межгодовой режим) */}
              {!crossYearMode && (
                <div
                  className="absolute w-12 h-12 sm:w-8 sm:h-8 lg:w-5 lg:h-5 transform -translate-x-1/2 -translate-y-2 sm:-translate-y-1 lg:-translate-y-1 cursor-grab active:cursor-grabbing z-10"
                  style={{ left: `${endPosition}%`, touchAction: "none" }}
                  onMouseDown={(e) => handlePointerDown("end", e)}
                  onTouchStart={(e) => handlePointerDown("end", e)}
                  onMouseEnter={(e) => handlePointerEnter("end", e)}
                  onMouseLeave={handlePointerLeave}
                >
                  <div
                    className={`w-8 h-12 sm:w-6 sm:h-8 lg:w-3 lg:h-5 bg-white rounded shadow-lg border-2 ${getZoomLevelColors().border} mx-auto`}
                  ></div>
                </div>
              )}
            </div>

            {/* Зоны для мобильных */}
            {isMobile && isDragging && (
              <div
                className="absolute left-0 w-full z-20 pointer-events-none"
                style={{
                  top: crossYearMode && isDragging === "end" ? `${100 + zoneOffset}px` : `${zoneOffset}px`,
                }}
              >
                <div className="w-full text-center py-1 text-xs text-gray-500 bg-gray-50/95 border border-gray-300 rounded-t">
                  ↓ Сдвиньте вниз ↓
                </div>

                <div
                  className={`w-full bg-orange-100/95 border-x border-orange-500 flex items-center justify-center text-xs ${getActiveZone() === "month" ? "border-2 border-orange-600" : ""}`}
                  style={{ height: `${verticalThreshold}px` }}
                >
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-orange-500 rounded"></div>
                    <span className="text-orange-700 font-medium">Дни</span>
                  </div>
                </div>

                <div
                  className={`w-full bg-red-100/95 border-x border-red-500 flex items-center justify-center text-xs ${getActiveZone() === "day" ? "border-2 border-red-600" : ""}`}
                  style={{ height: `${verticalThreshold}px` }}
                >
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded"></div>
                    <span className="text-red-700 font-medium">Часы</span>
                  </div>
                </div>

                <div
                  className={`w-full bg-red-200/95 border-x border-red-800 flex items-center justify-center text-xs rounded-b ${getActiveZone() === "hour" ? "border-2 border-red-900" : ""}`}
                  style={{ height: `${verticalThreshold}px` }}
                >
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-800 rounded"></div>
                    <span className="text-red-900 font-medium">Минуты</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Z-образная связка и вторая шкала для межгодового режима */}
          {crossYearMode && (
            <>
              {/* Z-образная связка */}
              <div
                className={`absolute ${isMobile ? "top-[150px]" : "top-[180px]"} left-2 right-2 sm:left-4 sm:right-4 lg:left-6 lg:right-6 h-6 sm:h-8 flex items-center`}
              >
                <div className="w-full flex items-center">
                  <div className="w-1/4 h-px bg-gray-400"></div>
                  <div className="w-1/2 h-px bg-gray-400 transform rotate-12 origin-left"></div>
                  <div className="w-1/4 h-px bg-gray-400"></div>
                </div>
                <div className="absolute right-0 text-xs text-gray-500 bg-white px-2">{endYear} год</div>
              </div>

              {/* Вторая шкала */}
              <div
                className={`absolute ${isMobile ? "top-[180px]" : "top-[230px]"} left-2 right-2 sm:left-4 sm:right-4 lg:left-6 lg:right-6 h-6 sm:h-8`}
              >
                {isDragging === "end" &&
                  (isMobile ? getVisibleTicksForMobile() : ticks).map((tick, index) => (
                    <div
                      key={index}
                      className="absolute transform -translate-x-1/2"
                      style={{ left: `${tick.position}%` }}
                    >
                      {!isMobile && (
                        <div className={`w-px h-3 sm:h-4 ${tick.isBlocked ? "bg-red-400" : "bg-gray-400"}`}></div>
                      )}
                      <div
                        className={`${isMobile ? "text-xs sm:text-sm" : "text-xs mt-1"} font-medium whitespace-nowrap text-center transition-opacity duration-200 ${
                          isMobile && "isVisible" in tick && !tick.isVisible ? "opacity-0" : "opacity-100"
                        } ${tick.isBlocked ? "text-red-500" : getZoomLevelColors().text}`}
                      >
                        {isMobile ? (
                          <>
                            <span className="text-black">{tick.prefix}</span>
                            <span className={tick.isBlocked ? "text-red-500" : getZoomLevelColors().text}>
                              {tick.label}
                            </span>
                          </>
                        ) : (
                          <span className={tick.isBlocked ? "text-red-500" : getZoomLevelColors().text}>
                            {tick.label}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Второй трек слайдера */}
              <div
                className={`absolute ${isMobile ? "top-[210px]" : "top-[260px]"} left-2 right-2 sm:left-4 sm:right-4 lg:left-6 lg:right-6`}
              >
                <div
                  ref={secondSliderRef}
                  className="relative w-full h-8 sm:h-6 lg:h-3 bg-gray-200 rounded cursor-pointer"
                  style={{ touchAction: "none" }}
                >
                  <div
                    className="absolute w-12 h-12 sm:w-8 sm:h-8 lg:w-5 lg:h-5 transform -translate-x-1/2 -translate-y-2 sm:-translate-y-1 lg:-translate-y-1 cursor-grab active:cursor-grabbing z-10"
                    style={{ left: `${endPosition}%`, touchAction: "none" }}
                    onMouseDown={(e) => handlePointerDown("end", e)}
                    onTouchStart={(e) => handlePointerDown("end", e)}
                    onMouseEnter={(e) => handlePointerEnter("end", e)}
                    onMouseLeave={handlePointerLeave}
                  >
                    <div
                      className={`w-8 h-12 sm:w-6 sm:h-8 lg:w-3 lg:h-5 bg-white rounded shadow-lg border-2 ${getZoomLevelColors().border} mx-auto`}
                    ></div>
                  </div>
                </div>

                {/* Зоны для мобильных для второго слайдера */}
                {isMobile && isDragging === "end" && (
                  <div className="absolute left-0 w-full z-20 pointer-events-none" style={{ top: `${zoneOffset}px` }}>
                    <div className="w-full text-center py-1 text-xs text-gray-500 bg-gray-50/95 border border-gray-300 rounded-t">
                      ↓ Сдвиньте вниз ↓
                    </div>

                    <div
                      className={`w-full bg-orange-100/95 border-x border-orange-500 flex items-center justify-center text-xs ${getActiveZone() === "month" ? "border-2 border-orange-600" : ""}`}
                      style={{ height: `${verticalThreshold}px` }}
                    >
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-orange-500 rounded"></div>
                        <span className="text-orange-700 font-medium">Дни</span>
                      </div>
                    </div>

                    <div
                      className={`w-full bg-red-100/95 border-x border-red-500 flex items-center justify-center text-xs ${getActiveZone() === "day" ? "border-2 border-red-600" : ""}`}
                      style={{ height: `${verticalThreshold}px` }}
                    >
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded"></div>
                        <span className="text-red-700 font-medium">Часы</span>
                      </div>
                    </div>

                    <div
                      className={`w-full bg-red-200/95 border-x border-red-800 flex items-center justify-center text-xs rounded-b ${getActiveZone() === "hour" ? "border-2 border-red-900" : ""}`}
                      style={{ height: `${verticalThreshold}px` }}
                    >
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-800 rounded"></div>
                        <span className="text-red-900 font-medium">Минуты</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Tooltip только для десктопа */}
        {hoveredHandle && !isMobile && localStart && localEnd && (
          <div
            className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-xl pointer-events-none"
            style={{
              left: tooltipPosition.x - 60,
              top: tooltipPosition.y - 50,
            }}
          >
            {formatDateTimeWithColors(hoveredHandle === "start" ? localStart : localEnd).year}.
            {formatDateTimeWithColors(hoveredHandle === "start" ? localStart : localEnd).month}.
            {formatDateTimeWithColors(hoveredHandle === "start" ? localStart : localEnd).day},{" "}
            {formatDateTimeWithColors(hoveredHandle === "start" ? localStart : localEnd).hour}:
            {formatDateTimeWithColors(hoveredHandle === "start" ? localStart : localEnd).minute}
          </div>
        )}
      </div>

      {/* Информация о заблокированных диапазонах */}
      {blockedRanges.length > 0 && (
        <div className="text-xs text-gray-500 bg-red-50 p-2 rounded border border-red-200">
          <div className="font-medium text-red-700 mb-1">Заблокированные периоды:</div>
          {blockedRanges.map((range, index) => (
            <div key={index} className="text-red-600">
              {formatDateTimeWithColors(range.start).year}.{formatDateTimeWithColors(range.start).month}.
              {formatDateTimeWithColors(range.start).day} {formatDateTimeWithColors(range.start).hour}:
              {formatDateTimeWithColors(range.start).minute} — {formatDateTimeWithColors(range.end).year}.
              {formatDateTimeWithColors(range.end).month}.{formatDateTimeWithColors(range.end).day}{" "}
              {formatDateTimeWithColors(range.end).hour}:{formatDateTimeWithColors(range.end).minute}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
