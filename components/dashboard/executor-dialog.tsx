"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Executor } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface ExecutorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  executor?: Executor
}

export function ExecutorDialog({ open, onOpenChange, onSuccess, executor }: ExecutorDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    color_icon: "#3B82F6",
  })

  useEffect(() => {
    if (executor) {
      setFormData({
        name: executor.name,
        color_icon: executor.color_icon,
      })
    } else {
      // Сбрасываем форму при открытии для создания нового исполнителя
      setFormData({
        name: "",
        color_icon: "#3B82F6",
      })
    }
  }, [executor, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        throw new Error("Пользователь не авторизован")
      }

      const executorData = {
        name: formData.name,
        color_icon: formData.color_icon,
        user_id: userData.user.id,
      }

      if (executor) {
        // Обновление существующего исполнителя
        const { error } = await supabase.from("executors").update(executorData).eq("id", executor.id)

        if (error) throw error

        toast({
          title: "Исполнитель обновлен",
          description: "Исполнитель успешно обновлен",
        })
      } else {
        // Создание нового исполнителя
        const { error } = await supabase.from("executors").insert(executorData)

        if (error) throw error

        toast({
          title: "Исполнитель создан",
          description: "Новый исполнитель успешно создан",
        })
      }

      onOpenChange(false)
      onSuccess()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{executor ? "Редактировать исполнителя" : "Добавить исполнителя"}</DialogTitle>
          <DialogDescription>
            {executor ? "Внесите изменения и нажмите Сохранить" : "Заполните информацию о новом исполнителе"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Имя исполнителя</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Введите имя исполнителя"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="color_icon">Цвет</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="color_icon"
                  name="color_icon"
                  type="color"
                  value={formData.color_icon}
                  onChange={handleChange}
                  className="w-16 h-10 p-1"
                />
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: formData.color_icon }} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {executor ? "Сохранение..." : "Создание..."}
                </>
              ) : executor ? (
                "Сохранить"
              ) : (
                "Создать"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
