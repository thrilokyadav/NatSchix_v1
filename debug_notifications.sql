-- Debug script to check notification setup
-- Run each section separately in Supabase SQL Editor

-- 1. Check if scheduled_assessments table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scheduled_assessments'
ORDER BY ordinal_position;

-- 2. Check if the trigger function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'send_assessment_notification';

-- 3. Check if the trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'assessment_scheduled_trigger';

-- 4. Check if we have any users in registrations table
SELECT COUNT(*) as user_count FROM registrations;
SELECT user_id, email, first_name, last_name FROM registrations LIMIT 3;

-- 5. Check if scheduled_assessments table exists and is empty
SELECT COUNT(*) as scheduled_count FROM scheduled_assessments;

-- 6. If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS scheduled_assessments (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    notification_method VARCHAR(20) NOT NULL CHECK (notification_method IN ('email', 'calendar', 'both')),
    is_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Test insert with a simple manual trigger (without foreign key constraint)
-- First, let's try inserting with a dummy UUID
INSERT INTO scheduled_assessments (user_id, scheduled_time, notification_method) 
VALUES (
    gen_random_uuid(),
    NOW() + INTERVAL '1 hour', 
    'email'
);

-- 8. Check if the insert worked
SELECT * FROM scheduled_assessments ORDER BY created_at DESC LIMIT 5;
