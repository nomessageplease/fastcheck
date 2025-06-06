"use client"

import { useState } from "react"
import type { Project } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Plus, Folder } from "lucide-react"
import { ProjectDialog } from "./project-dialog"
import { cn } from "@/lib/utils"

interface ProjectListProps {
  projects: Project[]
  selectedProject: string | null
  onSelectProject: (projectId: string | null) => void
  onProjectsChange: () => void
}

export function ProjectList({ projects, selectedProject, onSelectProject, onProjectsChange }: ProjectListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Проекты</h2>
        <Button size="sm" variant="ghost" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => onSelectProject(null)}
          className={cn(
            "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
            selectedProject === null ? "bg-gray-100 text-gray-900" : "hover:bg-gray-50 text-gray-700",
          )}
        >
          <Folder className="h-4 w-4" />
          <span className="text-sm font-medium">Все проекты</span>
        </button>

        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            className={cn(
              "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
              selectedProject === project.id ? "bg-gray-100 text-gray-900" : "hover:bg-gray-50 text-gray-700",
            )}
          >
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: project.color_icon }} />
            <span className="text-sm font-medium truncate">{project.name}</span>
          </button>
        ))}
      </div>

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={onProjectsChange} />
    </div>
  )
}
