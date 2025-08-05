-- Final trigger test with real user ID
-- Run each section separately

-- 1. Set up the debug trigger function and log table (run steps 2-4 from previous script first)

-- 2. Test with Thrilok's user ID (yadavthrilok@gmail.com)
INSERT INTO scheduled_assessments (user_id, scheduled_time, notification_method) 
VALUES (
    'bc2d73bf-911c-4b91-8894-b9035692bef5',
    NOW() + INTERVAL '4 hours', 
    'email'
);

-- 3. Check the logs to see what happened
SELECT * FROM scheduled_assessments_logs ORDER BY created_at DESC LIMIT 3;

-- 4. Check total scheduled assessments count
SELECT COUNT(*) FROM scheduled_assessments;

-- 5. Check the most recent scheduled assessment
SELECT id, user_id, scheduled_time, notification_method, created_at 
FROM scheduled_assessments 
ORDER BY created_at DESC 
LIMIT 3;
