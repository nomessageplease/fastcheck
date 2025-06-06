"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, BellRing, Check, CheckCheck, Trash2, Calendar, AlertTriangle, FolderOpen, Settings } from "lucide-react"
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type NotificationData,
} from "@/lib/notification-utils"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface NotificationsPanelProps {
  user: User
}

export function NotificationsPanel({ user }: NotificationsPanelProps) {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadNotifications()

    // Обновляем уведомления каждые 30 секунд
    const interval = setInterval(loadNotifications, 30000)

    return () => clearInterval(interval)
  }, [user.id])

  const loadNotifications = async () => {
    try {
      const data = await getUserNotifications(user.id)
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.read).length)
    } catch (error) {
      console.error("Ошибка при загрузке уведомлений:", error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
      await loadNotifications()
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    setLoading(true)
    try {
      await markAllNotificationsAsRead(user.id)
      await loadNotifications()
      toast({
        title: "Готово",
        description: "Все уведомления отмечены как прочитанные",
      })
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId)
      await loadNotifications()
      toast({
        title: "Готово",
        description: "Уведомление удалено",
      })
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_reminder":
        return <Calendar className="h-4 w-4 text-blue-500" />
      case "task_overdue":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "daily_review":
        return <CheckCheck className="h-4 w-4 text-green-500" />
      case "project_deadline":
        return <FolderOpen className="h-4 w-4 text-orange-500" />
      case "system":
        return <Settings className="h-4 w-4 text-gray-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "task_reminder":
        return "Напоминание"
      case "task_overdue":
        return "Просрочка"
      case "daily_review":
        return "Проверка"
      case "project_deadline":
        return "Дедлайн"
      case "system":
        return "Система"
      default:
        return "Уведомление"
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return diffInMinutes < 1 ? "только что" : `${diffInMinutes} мин назад`
    } else if (diffInHours < 24) {
      return `${diffInHours} ч назад`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} дн назад`
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <div className="flex items-center justify-between p-4">
          <h4 className="font-semibold">Уведомления</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} disabled={loading}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Прочитать все
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Нет уведомлений</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 hover:bg-gray-50 transition-colors",
                    !notification.read && "bg-blue-50 border-l-2 border-blue-500",
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className="text-xs">
                            {getNotificationTypeLabel(notification.type)}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <span className="sr-only">Действия</span>
                                <span className="text-gray-400">⋮</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!notification.read && (
                                <DropdownMenuItem onClick={() => handleMarkAsRead(notification.id!)}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Отметить как прочитанное
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleDelete(notification.id!)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatTime(notification.created_at!)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
