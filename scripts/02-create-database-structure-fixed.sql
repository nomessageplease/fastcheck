-- Создаем таблицу проектов
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
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
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    color_icon TEXT NOT NULL DEFAULT '#10B981',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Создаем таблицу задач
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    project_id UUID NOT NULL,
    parent_id UUID,
    executor_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    is_urgent BOOLEAN DEFAULT FALSE NOT NULL,
    status TEXT DEFAULT 'waiting' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Создаем таблицу настроек
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    review_time TIME DEFAULT '18:00:00' NOT NULL,
    push_notifications BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Создаем таблицу логов проверок
CREATE TABLE IF NOT EXISTS public.review_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    task_id UUID NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    result TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Добавляем ограничения для статуса задач
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_status_check' 
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE public.tasks 
        ADD CONSTRAINT tasks_status_check 
        CHECK (status IN ('waiting', 'in_progress', 'pending_review', 'completed', 'extended', 'cancelled'));
    END IF;
END $$;

-- Добавляем ограничения для результата проверки
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'review_logs_result_check' 
        AND table_name = 'review_logs'
    ) THEN
        ALTER TABLE public.review_logs 
        ADD CONSTRAINT review_logs_result_check 
        CHECK (result IN ('completed', 'extended', 'cancelled'));
    END IF;
END $$;

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

-- Выводим информацию о созданных таблицах
SELECT 'Tables created successfully' as status;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'tasks', 'executors', 'settings', 'review_logs')
ORDER BY table_name, ordinal_position;
