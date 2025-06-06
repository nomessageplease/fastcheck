-- Включаем RLS для безопасности
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Создаем таблицу проектов
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color_icon TEXT NOT NULL DEFAULT '#3B82F6',
    start_date TIMESTAMPTZ NOT NULL,
    planned_finish TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Создаем таблицу исполнителей
CREATE TABLE IF NOT EXISTS public.executors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color_icon TEXT NOT NULL DEFAULT '#10B981',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Создаем таблицу задач
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    executor_id UUID REFERENCES public.executors(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    is_urgent BOOLEAN DEFAULT FALSE NOT NULL,
    status TEXT DEFAULT 'waiting' NOT NULL CHECK (status IN ('waiting', 'in_progress', 'pending_review', 'completed', 'extended', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Создаем таблицу настроек
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    review_time TIME DEFAULT '18:00:00' NOT NULL,
    push_notifications BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Создаем таблицу логов проверок
CREATE TABLE IF NOT EXISTS public.review_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('completed', 'extended', 'cancelled')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_executors_user_id ON public.executors(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON public.tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_executor_id ON public.tasks(executor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_id ON public.review_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_task_id ON public.review_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_date ON public.review_logs(date);
