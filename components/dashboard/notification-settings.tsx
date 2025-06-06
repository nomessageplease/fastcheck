"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Bell, BellOff, Check, X, AlertTriangle, ExternalLink } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { requestNotificationPermission, isNotificationSupported } from "@/lib/notification-utils"
import { useToast } from "@/hooks/use-toast"

interface NotificationSettingsProps {
  user: User
}

export function NotificationSettings({ user }: NotificationSettingsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>("default")
  const [settings, setSettings] = useState({
    push_notifications: true,
    review_time: "09:00",
    task_reminders: true,
    daily_review_notifications: true,
    project_deadline_notifications: true,
    overdue_task_notifications: true,
  })

  useEffect(() => {
    checkBrowserPermission()
    loadSettings()
  }, [user.id])

  const checkBrowserPermission = () => {
    if (isNotificationSupported()) {
      setBrowserPermission(Notification.permission)
    }
  }

  const loadSettings = async () => {
    try {
      console.log("Загружаем настройки для пользователя:", user.id)

      const { data, error } = await supabase.from("settings").select("*").eq("user_id", user.id).maybeSingle()

      if (error) {
        console.error("Ошибка при загрузке настроек:", error.message, error.details)
        return
      }

      if (!data) {
        console.log("Настройки не найдены, создаем дефолтные")

        const defaultSettings = {
          user_id: user.id,
          push_notifications: true,
          review_time: "09:00",
        }

        const { error: insertErr, data: insertedData } = await supabase
          .from("settings")
          .insert(defaultSettings)
          .select()
          .single()

        if (insertErr) {
          console.error("Не удалось создать дефолтные настройки:", insertErr.message, insertErr.details)
          toast({
            title: "Ошибка",
            description: "Не удалось создать настройки пользователя",
            variant: "destructive",
          })
        } else {
          console.log("Дефолтные настройки созданы:", insertedData)
          setSettings({
            push_notifications: defaultSettings.push_notifications,
            review_time: defaultSettings.review_time,
            task_reminders: true,
            daily_review_notifications: true,
            project_deadline_notifications: true,
            overdue_task_notifications: true,
          })
          toast({
            title: "Настройки созданы",
            description: "Созданы настройки по умолчанию",
          })
        }
      } else {
        console.log("Настройки загружены:", data)
        setSettings({
          push_notifications: data.push_notifications ?? true,
          review_time: data.review_time ?? "09:00",
          task_reminders: true,
          daily_review_notifications: true,
          project_deadline_notifications: true,
          overdue_task_notifications: true,
        })
      }
    } catch (error: any) {
      console.error("Неожиданная ошибка при загрузке настроек:", error)
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при загрузке настроек",
        variant: "destructive",
      })
    }
  }

  const handleRequestPermission = async () => {
    setLoading(true)
    try {
      if (browserPermission === "denied") {
        // Показываем инструкции для ручной настройки
        toast({
          title: "Настройка уведомлений",
          description: "Откройте настройки сайта в браузере и разрешите уведомления",
        })

        // Показываем инструкции пользователю
        alert(`Для включения уведомлений:

1. Нажмите на иконку замка/щита в адресной строке
2. Найдите "Уведомления" 
3. Выберите "Разрешить"
4. Обновите страницу

Или зайдите в настройки браузера → Конфиденциальность и безопасность → Настройки сайта → Уведомления`)

        return
      }

      const permission = await requestNotificationPermission()
      setBrowserPermission(permission)

      if (permission === "granted") {
        toast({
          title: "Разрешение получено",
          description: "Теперь вы будете получать мгновенные уведомления",
        })

        // Отправляем тестовое уведомление
        if (isNotificationSupported()) {
          new Notification("FastCheck", {
            body: "Уведомления настроены успешно!",
            icon: "/favicon.ico",
          })
        }
      } else {
        toast({
          title: "Разрешение отклонено",
          description: "Вы можете изменить это в настройках браузера",
          variant: "destructive",
        })
      }
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

  const handleSettingChange = async (key: keyof typeof settings, value: boolean | string) => {
    console.log(`Изменяем настройку ${key} на:`, value)

    setSettings((prev) => ({ ...prev, [key]: value }))

    try {
      const payload = {
        user_id: user.id,
        push_notifications: key === "push_notifications" ? (value as boolean) : settings.push_notifications,
        review_time: key === "review_time" ? (value as string) : settings.review_time,
      }

      console.log("Отправляем payload:", payload)

      const { error, data } = await supabase.from("settings").upsert(payload, { onConflict: "user_id" }).select()

      if (error) {
        console.error("Ошибка при сохранении настроек:", error.message, error.details)
        throw error
      }

      console.log("Настройки сохранены:", data)

      toast({
        title: "Настройки сохранены",
        description: "Настройки уведомлений обновлены",
      })
    } catch (error: any) {
      console.error("Ошибка при сохранении:", error)
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить настройки",
        variant: "destructive",
      })

      setSettings((prev) => ({
        ...prev,
        [key]: typeof value === "boolean" ? !value : prev[key as keyof typeof prev],
      }))
    }
  }

  const getPermissionStatus = () => {
    switch (browserPermission) {
      case "granted":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            Разрешено
          </Badge>
        )
      case "denied":
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Запрещено
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            <Bell className="h-3 w-3 mr-1" />
            Не запрошено
          </Badge>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg lg:text-xl">Настройки уведомлений</CardTitle>
        <CardDescription className="text-sm">Управление мгновенными браузерными уведомлениями</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 lg:space-y-6 pt-0">
        {/* Статус разрешений браузера */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-lg space-y-3 lg:space-y-0">
          <div className="flex-1">
            <h4 className="font-medium text-sm lg:text-base">Разрешения браузера</h4>
            <p className="text-xs lg:text-sm text-gray-500 mt-1">Статус разрешений на отправку уведомлений</p>
          </div>
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-2 lg:space-y-0 lg:space-x-3">
            {getPermissionStatus()}
            {browserPermission !== "granted" && (
              <Button size="sm" onClick={handleRequestPermission} disabled={loading} className="w-full lg:w-auto">
                {browserPermission === "denied" ? (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Настроить в браузере
                  </>
                ) : (
                  "Разрешить"
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Время ежедневной проверки */}
        <div className="space-y-3 lg:space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-2 lg:space-y-0">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="review-time" className="text-sm lg:text-base">
                Время ежедневной проверки
              </Label>
              <p className="text-xs lg:text-sm text-gray-500">В это время вы получите уведомление о проверке задач</p>
            </div>
            <input
              id="review-time"
              type="time"
              value={settings.review_time}
              onChange={(e) => handleSettingChange("review_time", e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full lg:w-auto"
            />
          </div>
        </div>

        {/* Основные настройки */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-2 lg:space-y-0">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="push-notifications" className="text-sm lg:text-base">
                Мгновенные уведомления
              </Label>
              <p className="text-xs lg:text-sm text-gray-500">Получать уведомления в браузере в реальном времени</p>
            </div>
            <Switch
              id="push-notifications"
              checked={settings.push_notifications}
              onCheckedChange={(checked) => handleSettingChange("push_notifications", checked)}
              disabled={browserPermission !== "granted"}
            />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-2 lg:space-y-0">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="task-completion" className="text-sm lg:text-base">
                Завершение задач
              </Label>
              <p className="text-xs lg:text-sm text-gray-500">Уведомления когда задача требует проверки</p>
            </div>
            <Switch
              id="task-completion"
              checked={settings.overdue_task_notifications}
              onCheckedChange={(checked) => handleSettingChange("overdue_task_notifications", checked)}
              disabled={!settings.push_notifications}
            />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-2 lg:space-y-0">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="daily-review" className="text-sm lg:text-base">
                Ежедневные проверки
              </Label>
              <p className="text-xs lg:text-sm text-gray-500">Напоминания в назначенное время ежедневной проверки</p>
            </div>
            <Switch
              id="daily-review"
              checked={settings.daily_review_notifications}
              onCheckedChange={(checked) => handleSettingChange("daily_review_notifications", checked)}
              disabled={!settings.push_notifications}
            />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-2 lg:space-y-0">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="project-deadlines" className="text-sm lg:text-base">
                Дедлайны проектов
              </Label>
              <p className="text-xs lg:text-sm text-gray-500">
                Уведомления о приближающихся дедлайнах (за 7, 3, 1 день)
              </p>
            </div>
            <Switch
              id="project-deadlines"
              checked={settings.project_deadline_notifications}
              onCheckedChange={(checked) => handleSettingChange("project_deadline_notifications", checked)}
              disabled={!settings.push_notifications}
            />
          </div>
        </div>

        {/* Информация */}
        {!isNotificationSupported() && (
          <div className="p-3 lg:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <BellOff className="h-4 w-4 lg:h-5 lg:w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs lg:text-sm text-yellow-800">
                Ваш браузер не поддерживает push-уведомления или вы используете приватный режим.
              </p>
            </div>
          </div>
        )}

        {browserPermission === "denied" && (
          <div className="p-3 lg:p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 lg:h-5 lg:w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs lg:text-sm text-red-800 font-medium">Уведомления заблокированы</p>
                <p className="text-xs lg:text-sm text-red-700 mt-1">
                  Нажмите кнопку "Настроить в браузере" для получения инструкций по включению уведомлений.
                </p>
              </div>
            </div>
          </div>
        )}

        {browserPermission === "granted" && (
          <div className="p-3 lg:p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Check className="h-4 w-4 lg:h-5 lg:w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs lg:text-sm text-green-800">
                Уведомления настроены! Вы будете получать уведомления о завершении задач и в назначенное время проверки.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
