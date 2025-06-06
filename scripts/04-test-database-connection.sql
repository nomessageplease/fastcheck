-- Тестируем подключение и создание данных
DO $$
DECLARE
    test_user_id UUID;
    test_project_id UUID;
    test_executor_id UUID;
    test_task_id UUID;
BEGIN
    -- Получаем текущего пользователя (если есть)
    SELECT auth.uid() INTO test_user_id;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user found. Please authenticate first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with user ID: %', test_user_id;
    
    -- Создаем тестовый проект
    INSERT INTO public.projects (user_id, name, description, start_date, planned_finish)
    VALUES (test_user_id, 'Test Project', 'Test Description', NOW(), NOW() + INTERVAL '30 days')
    RETURNING id INTO test_project_id;
    
    RAISE NOTICE 'Created test project with ID: %', test_project_id;
    
    -- Создаем тестового исполнителя
    INSERT INTO public.executors (user_id, name)
    VALUES (test_user_id, 'Test Executor')
    RETURNING id INTO test_executor_id;
    
    RAISE NOTICE 'Created test executor with ID: %', test_executor_id;
    
    -- Создаем тестовую задачу
    INSERT INTO public.tasks (user_id, project_id, executor_id, title, description, start_date, due_date)
    VALUES (test_user_id, test_project_id, test_executor_id, 'Test Task', 'Test Task Description', NOW(), NOW() + INTERVAL '7 days')
    RETURNING id INTO test_task_id;
    
    RAISE NOTICE 'Created test task with ID: %', test_task_id;
    
    -- Проверяем, что данные созданы
    RAISE NOTICE 'Projects count: %', (SELECT COUNT(*) FROM public.projects WHERE user_id = test_user_id);
    RAISE NOTICE 'Executors count: %', (SELECT COUNT(*) FROM public.executors WHERE user_id = test_user_id);
    RAISE NOTICE 'Tasks count: %', (SELECT COUNT(*) FROM public.tasks WHERE user_id = test_user_id);
    
    -- Удаляем тестовые данные
    DELETE FROM public.tasks WHERE id = test_task_id;
    DELETE FROM public.executors WHERE id = test_executor_id;
    DELETE FROM public.projects WHERE id = test_project_id;
    
    RAISE NOTICE 'Test completed successfully. Test data cleaned up.';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %', SQLERRM;
END $$;
