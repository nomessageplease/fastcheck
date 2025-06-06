"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export function DatabaseTest() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const { toast } = useToast()

  const addResult = (message: string) => {
    setResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testConnection = async () => {
    setLoading(true)
    setResults([])

    try {
      addResult("🔄 Начинаем тестирование...")

      // 1. Проверяем аутентификацию
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError) {
        addResult(`❌ Ошибка аутентификации: ${authError.message}`)
        return
      }

      if (!userData.user) {
        addResult("❌ Пользователь не аутентифицирован")
        return
      }

      addResult(`✅ Пользователь аутентифицирован: ${userData.user.id}`)

      // 2. Проверяем доступ к таблицам
      const { data: projects, error: projectsError } = await supabase.from("projects").select("*").limit(1)

      if (projectsError) {
        addResult(`❌ Ошибка доступа к таблице projects: ${projectsError.message}`)
      } else {
        addResult(`✅ Доступ к таблице projects: найдено ${projects?.length || 0} записей`)
      }

      const { data: tasks, error: tasksError } = await supabase.from("tasks").select("*").limit(1)

      if (tasksError) {
        addResult(`❌ Ошибка доступа к таблице tasks: ${tasksError.message}`)
      } else {
        addResult(`✅ Доступ к таблице tasks: найдено ${tasks?.length || 0} записей`)
      }

      // 3. Пробуем создать тестовый проект
      const testProjectData = {
        user_id: userData.user.id,
        name: "Тестовый проект " + Date.now(),
        description: "Автоматически созданный тестовый проект",
        color_icon: "#3B82F6",
        start_date: new Date().toISOString(),
        planned_finish: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }

      const { data: createdProject, error: createProjectError } = await supabase
        .from("projects")
        .insert([testProjectData])
        .select()
        .single()

      if (createProjectError) {
        addResult(`❌ Ошибка создания проекта: ${createProjectError.message}`)
        addResult(`📝 Детали ошибки: ${JSON.stringify(createProjectError, null, 2)}`)
        return
      }

      addResult(`✅ Проект создан успешно: ${createdProject.id}`)

      // 4. Пробуем создать тестовую задачу
      const testTaskData = {
        user_id: userData.user.id,
        project_id: createdProject.id,
        title: "Тестовая задача " + Date.now(),
        description: "Автоматически созданная тестовая задача",
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_urgent: false,
        status: "waiting",
      }

      const { data: createdTask, error: createTaskError } = await supabase
        .from("tasks")
        .insert([testTaskData])
        .select()
        .single()

      if (createTaskError) {
        addResult(`❌ Ошибка создания задачи: ${createTaskError.message}`)
        addResult(`📝 Детали ошибки: ${JSON.stringify(createTaskError, null, 2)}`)
      } else {
        addResult(`✅ Задача создана успешно: ${createdTask.id}`)
      }

      // 5. Очищаем тестовые данные
      if (createdTask) {
        await supabase.from("tasks").delete().eq("id", createdTask.id)
        addResult("🧹 Тестовая задача удалена")
      }

      await supabase.from("projects").delete().eq("id", createdProject.id)
      addResult("🧹 Тестовый проект удален")

      addResult("🎉 Тестирование завершено успешно!")

      toast({
        title: "Тестирование завершено",
        description: "Все проверки прошли успешно",
      })
    } catch (error) {
      addResult(`💥 Неожиданная ошибка: ${error instanceof Error ? error.message : String(error)}`)
      console.error("Database test error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Тестирование базы данных</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testConnection} disabled={loading} className="w-full">
          {loading ? "Тестирование..." : "Запустить тест"}
        </Button>

        {results.length > 0 && (
          <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
            <h3 className="font-medium mb-2">Результаты тестирования:</h3>
            <div className="space-y-1 text-sm font-mono">
              {results.map((result, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
