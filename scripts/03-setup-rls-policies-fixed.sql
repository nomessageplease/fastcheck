-- Включаем RLS для всех таблиц
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

DROP POLICY IF EXISTS "Users can view own executors" ON public.executors;
DROP POLICY IF EXISTS "Users can insert own executors" ON public.executors;
DROP POLICY IF EXISTS "Users can update own executors" ON public.executors;
DROP POLICY IF EXISTS "Users can delete own executors" ON public.executors;

DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON public.settings;

DROP POLICY IF EXISTS "Users can view own review_logs" ON public.review_logs;
DROP POLICY IF EXISTS "Users can insert own review_logs" ON public.review_logs;
DROP POLICY IF EXISTS "Users can update own review_logs" ON public.review_logs;
DROP POLICY IF EXISTS "Users can delete own review_logs" ON public.review_logs;

-- Создаем политики для таблицы projects
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Создаем политики для таблицы executors
CREATE POLICY "Users can view own executors" ON public.executors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executors" ON public.executors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own executors" ON public.executors
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own executors" ON public.executors
    FOR DELETE USING (auth.uid() = user_id);

-- Создаем политики для таблицы tasks
CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Создаем политики для таблицы settings
CREATE POLICY "Users can view own settings" ON public.settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON public.settings
    FOR DELETE USING (auth.uid() = user_id);

-- Создаем политики для таблицы review_logs
CREATE POLICY "Users can view own review_logs" ON public.review_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review_logs" ON public.review_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own review_logs" ON public.review_logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own review_logs" ON public.review_logs
    FOR DELETE USING (auth.uid() = user_id);

-- Выводим информацию о созданных политиках
SELECT 'RLS policies created successfully' as status;
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'tasks', 'executors', 'settings', 'review_logs')
ORDER BY tablename, policyname;
