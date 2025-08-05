-- Check trigger status and test
-- Run each section separately

-- 1. Check if trigger function exists


-- 2. Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'assessment_scheduled_trigger';

-- 3. Check if http extension is enabled
SELECT extname FROM pg_extension WHERE extname = 'http';

-- 4. Check recent scheduled_assessments
SELECT id, user_id, scheduled_time, notification_method, created_at 
FROM scheduled_assessments 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Test the trigger function manually
-- This will help us see if the function works when called directly
SELECT send_assessment_notification();

-- 6. Enable logging to see trigger execution
SET log_statement = 'all';
SET log_min_messages = 'notice';

-- 7. Insert a new test record to trigger the function
INSERT INTO scheduled_assessments (user_id, scheduled_time, notification_method) 
VALUES (
    gen_random_uuid(),
    NOW() + INTERVAL '2 hours', 
    'email'
);
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'send_assessment_notification';
-- 8. Check if the insert created a new record
SELECT COUNT(*) FROM scheduled_assessments;
