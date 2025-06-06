"use client"

import { useState } from "react"
import type { Executor } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2 } from "lucide-react"
import { ExecutorDialog } from "./executor-dialog"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ExecutorsManagementProps {
  executors: Executor[]
  onExecutorsChange: () => void
}

export function ExecutorsManagement({ executors, onExecutorsChange }: ExecutorsManagementProps) {
  const { toast } = useToast()
  const [executorDialogOpen, setExecutorDialogOpen] = useState(false)
  const [selectedExecutor, setSelectedExecutor] = useState<Executor | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [executorToDelete, setExecutorToDelete] = useState<Executor | null>(null)

  const handleEditExecutor = (executor: Executor) => {
    setSelectedExecutor(executor)
    setExecutorDialogOpen(true)
  }

  const handleDeleteExecutor = async () => {
    if (!executorToDelete) return

    try {
      // Проверяем, есть ли задачи у этого исполнителя
      const { data: tasks } = await supabase.from("tasks").select("id").eq("executor_id", executorToDelete.id).limit(1)

      if (tasks && tasks.length > 0) {
        toast({
          title: "Ошибка",
          description: "Нельзя удалить исполнителя, у которого есть задачи",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("executors").delete().eq("id", executorToDelete.id)

      if (error) throw error

      toast({
        title: "Исполнитель удален",
        description: "Исполнитель успешно удален",
      })

      onExecutorsChange()
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setExecutorToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-3 lg:space-y-0">
            <div>
              <CardTitle className="text-lg lg:text-xl">Управление исполнителями</CardTitle>
              <CardDescription className="text-sm">Создание, редактирование и удаление исполнителей</CardDescription>
            </div>
            <Button onClick={() => setExecutorDialogOpen(true)} size="sm" className="w-full lg:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Новый исполнитель
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {executors.length === 0 ? (
            <div className="text-center py-6 lg:py-8">
              <p className="text-gray-500 mb-4 text-sm lg:text-base">У вас пока нет исполнителей</p>
              <Button onClick={() => setExecutorDialogOpen(true)} size="sm" className="w-full lg:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Создать первого исполнителя
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {executors.map((executor) => (
                <div
                  key={executor.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-3 border rounded-lg space-y-3 lg:space-y-0"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: executor.color_icon }}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm lg:text-base truncate">{executor.name}</h4>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 lg:flex-row lg:space-y-0 lg:space-x-2 lg:flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditExecutor(executor)}
                      className="w-full lg:w-auto"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setExecutorToDelete(executor)
                        setDeleteDialogOpen(true)
                      }}
                      className="w-full lg:w-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ExecutorDialog
        open={executorDialogOpen}
        onOpenChange={setExecutorDialogOpen}
        onSuccess={() => {
          onExecutorsChange()
          setSelectedExecutor(undefined)
        }}
        executor={selectedExecutor}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Удалить исполнителя?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Вы уверены, что хотите удалить исполнителя "{executorToDelete?.name}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-2">
            <AlertDialogCancel className="w-full lg:w-auto">Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExecutor} className="w-full lg:w-auto">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
