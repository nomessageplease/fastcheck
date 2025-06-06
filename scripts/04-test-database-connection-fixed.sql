-- Тестируем создание и чтение данных

-- Проверяем текущего пользователя
SELECT 'Current user ID: ' || COALESCE(auth.uid()::text, 'NOT AUTHENTICATED') as user_info;

-- Тестируем создание проекта (только если пользователь аутентифицирован)
DO $$
DECLARE
    current_user_id UUID;
    test_project_id UUID;
BEGIN
    -- Получаем ID текущего пользователя
    current_user_id := auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        -- Создаем тестовый проект
        INSERT INTO public.projects (user_id, name, description, start_date, planned_finish)
        VALUES (
            current_user_id,
            'Тестовый проект',
            'Описание тестового проекта',
            NOW(),
            NOW() + INTERVAL '30 days'
        )
        RETURNING id INTO test_project_id;
        
        RAISE NOTICE 'Test project created with ID: %', test_project_id;
        
        -- Создаем тестовую задачу
        INSERT INTO public.tasks (
            user_id, 
            project_id, 
            title, 
            description, 
            start_date, 
            due_date,
            status
        )
        VALUES (
            current_user_id,
            test_project_id,
            'Тестовая задача',
            'Описание тестовой задачи',
            NOW(),
            NOW() + INTERVAL '7 days',
            'waiting'
        );
        
        RAISE NOTICE 'Test task created successfully';
        
        -- Удаляем тестовые данные
        DELETE FROM public.tasks WHERE project_id = test_project_id;
        DELETE FROM public.projects WHERE id = test_project_id;
        
        RAISE NOTICE 'Test data cleaned up successfully';
    ELSE
        RAISE NOTICE 'User not authenticated - skipping data tests';
    END IF;
END $$;

-- Проверяем структуру таблиц
SELECT 'Database structure check:' as info;
SELECT 
    t.table_name,
    COUNT(c.column_name) as column_count
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
AND t.table_name IN ('projects', 'tasks', 'executors', 'settings', 'review_logs')
GROUP BY t.table_name
ORDER BY t.table_name;

-- Проверяем RLS политики
SELECT 'RLS policies check:' as info;
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'tasks', 'executors', 'settings', 'review_logs')
GROUP BY tablename
ORDER BY tablename;

SELECT 'Database setup completed successfully!' as final_status;
