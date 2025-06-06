"use client"

import { useState } from "react"
import type { Project } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2 } from "lucide-react"
import { ProjectDialog } from "./project-dialog"
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

interface ProjectsManagementProps {
  projects: Project[]
  onProjectsChange: () => void
}

export function ProjectsManagement({ projects, onProjectsChange }: ProjectsManagementProps) {
  const { toast } = useToast()
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setProjectDialogOpen(true)
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      // Проверяем, есть ли задачи в этом проекте
      const { data: tasks } = await supabase.from("tasks").select("id").eq("project_id", projectToDelete.id).limit(1)

      if (tasks && tasks.length > 0) {
        toast({
          title: "Ошибка",
          description: "Нельзя удалить проект, в котором есть задачи",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("projects").delete().eq("id", projectToDelete.id)

      if (error) throw error

      toast({
        title: "Проект удален",
        description: "Проект успешно удален",
      })

      onProjectsChange()
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setProjectToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-3 lg:space-y-0">
            <div>
              <CardTitle className="text-lg lg:text-xl">Управление проектами</CardTitle>
              <CardDescription className="text-sm">Создание, редактирование и удаление проектов</CardDescription>
            </div>
            <Button onClick={() => setProjectDialogOpen(true)} size="sm" className="w-full lg:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Новый проект
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {projects.length === 0 ? (
            <div className="text-center py-6 lg:py-8">
              <p className="text-gray-500 mb-4 text-sm lg:text-base">У вас пока нет проектов</p>
              <Button onClick={() => setProjectDialogOpen(true)} size="sm" className="w-full lg:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Создать первый проект
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-3 border rounded-lg space-y-3 lg:space-y-0"
                >
                  <div className="flex items-start lg:items-center space-x-3 flex-1 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 lg:mt-0"
                      style={{ backgroundColor: project.color_icon }}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm lg:text-base truncate">{project.name}</h4>
                      {project.description && (
                        <p className="text-xs lg:text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(project.start_date).toLocaleDateString("ru-RU")} -{" "}
                        {new Date(project.planned_finish).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 lg:flex-row lg:space-y-0 lg:space-x-2 lg:flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProject(project)}
                      className="w-full lg:w-auto"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProjectToDelete(project)
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

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSuccess={() => {
          onProjectsChange()
          setSelectedProject(undefined)
        }}
        project={selectedProject}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Вы уверены, что хотите удалить проект "{projectToDelete?.name}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-2">
            <AlertDialogCancel className="w-full lg:w-auto">Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="w-full lg:w-auto">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
