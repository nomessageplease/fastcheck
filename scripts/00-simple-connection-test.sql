-- Простая проверка подключения к базе данных
SELECT 'Database connection successful!' as status;
SELECT NOW() as current_time;
SELECT version() as postgres_version;

-- Проверяем, есть ли у нас доступ к auth
SELECT 
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'User authenticated: ' || auth.uid()::text
        ELSE 'User not authenticated'
    END as auth_status;

-- Проверяем существующие таблицы
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
