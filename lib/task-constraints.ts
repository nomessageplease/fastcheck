/**
 * Функция для вычисления ограничений дат задачи в зависимости от контекста
 */
export function calculateTaskConstraints(context: {
  type: "project" | "task" | "subtask"
  parentProject?: { startDate: Date; endDate: Date }
  parentTask?: { startDate: Date; endDate: Date }
  siblingTasks?: Array<{ id: string; startDate: Date; endDate: Date }>
  currentTaskId?: string
  globalMinDate: Date
  globalMaxDate: Date
}): { startConstraint: Date | null; endConstraint: Date | null; blockedRanges: Array<{ start: Date; end: Date }> } {
  let startConstraint: Date | null = null
  let endConstraint: Date | null = null
  const blockedRanges: Array<{ start: Date; end: Date }> = []

  switch (context.type) {
    case "project":
      // Для проекта используем глобальные ограничения
      startConstraint = context.globalMinDate
      endConstraint = context.globalMaxDate
      break

    case "task":
      // Для задачи используем сроки проекта
      if (context.parentProject) {
        startConstraint = context.parentProject.startDate
        endConstraint = context.parentProject.endDate
      }
      break

    case "subtask":
      // Для подзадачи используем сроки родительской задачи
      if (context.parentTask) {
        startConstraint = context.parentTask.startDate
        endConstraint = context.parentTask.endDate
      }
      break
  }

  // Учитываем соседние задачи на том же уровне
  if (context.siblingTasks && context.siblingTasks.length > 0) {
    // Фильтруем текущую задачу из списка соседних
    const otherTasks = context.siblingTasks.filter((task) => task.id !== context.currentTaskId)

    // Добавляем заблокированные диапазоны для каждой соседней задачи
    otherTasks.forEach((task) => {
      blockedRanges.push({
        start: task.startDate,
        end: task.endDate,
      })
    })

    // Находим самую раннюю дату начала среди соседних задач
    const earliestSiblingStart = Math.min(...otherTasks.map((task) => task.startDate.getTime()))

    // Находим самую позднюю дату окончания среди соседних задач
    const latestSiblingEnd = Math.max(...otherTasks.map((task) => task.endDate.getTime()))

    // Корректируем ограничения с учетом соседних задач только если они есть
    if (otherTasks.length > 0) {
      if (startConstraint) {
        startConstraint = new Date(Math.max(startConstraint.getTime(), earliestSiblingStart))
      } else {
        startConstraint = new Date(earliestSiblingStart)
      }

      if (endConstraint) {
        endConstraint = new Date(Math.min(endConstraint.getTime(), latestSiblingEnd))
      } else {
        endConstraint = new Date(latestSiblingEnd)
      }
    }
  }

  return { startConstraint, endConstraint, blockedRanges }
}

/**
 * Проверяет, пересекается ли новая задача с существующими
 */
export function checkTaskOverlap(
  newStart: Date,
  newEnd: Date,
  existingTasks: Array<{ id: string; startDate: Date; endDate: Date }>,
  currentTaskId?: string,
): { hasOverlap: boolean; conflictingTasks: Array<{ id: string; startDate: Date; endDate: Date }> } {
  const conflictingTasks = existingTasks.filter((task) => {
    // Исключаем текущую задачу из проверки
    if (task.id === currentTaskId) return false

    // Проверяем пересечение временных интервалов
    return (newStart < task.endDate && newEnd > task.startDate) || (task.startDate < newEnd && task.endDate > newStart)
  })

  return {
    hasOverlap: conflictingTasks.length > 0,
    conflictingTasks,
  }
}

/**
 * Находит ближайшие свободные временные слоты
 */
export function findAvailableTimeSlots(
  parentStart: Date,
  parentEnd: Date,
  existingTasks: Array<{ id: string; startDate: Date; endDate: Date }>,
  minDuration: number = 60 * 60 * 1000, // 1 час в миллисекундах
  currentTaskId?: string,
): Array<{ start: Date; end: Date }> {
  // Фильтруем текущую задачу
  const otherTasks = existingTasks.filter((task) => task.id !== currentTaskId)

  // Сортируем задачи по времени начала
  const sortedTasks = otherTasks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  const availableSlots: Array<{ start: Date; end: Date }> = []

  let currentTime = parentStart

  for (const task of sortedTasks) {
    // Если есть промежуток между текущим временем и началом задачи
    if (currentTime < task.startDate) {
      const slotDuration = task.startDate.getTime() - currentTime.getTime()
      if (slotDuration >= minDuration) {
        availableSlots.push({
          start: new Date(currentTime),
          end: new Date(task.startDate),
        })
      }
    }

    // Обновляем текущее время до конца задачи
    if (task.endDate > currentTime) {
      currentTime = task.endDate
    }
  }

  // Проверяем промежуток после последней задачи
  if (currentTime < parentEnd) {
    const slotDuration = parentEnd.getTime() - currentTime.getTime()
    if (slotDuration >= minDuration) {
      availableSlots.push({
        start: new Date(currentTime),
        end: new Date(parentEnd),
      })
    }
  }

  return availableSlots
}
