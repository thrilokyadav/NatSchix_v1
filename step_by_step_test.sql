-- Step-by-step commands to run separately
-- Copy and paste each command individually into Supabase SQL Editor

-- STEP 1: Create the log table
CREATE TABLE IF NOT EXISTS scheduled_assessments_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    status_code INTEGER,
    response_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STEP 2: Create the debug trigger function
CREATE OR REPLACE FUNCTION send_assessment_notification_debug()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  payload jsonb;
  response record;
  service_key text;
BEGIN
  RAISE NOTICE 'DEBUG: New assessment scheduled for user % at %', NEW.user_id, NEW.scheduled_time;
  
  service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjenVhdmVvZGt0YWtsYXRpdnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1NDQyMywiZXhwIjoyMDY5NzMwNDIzfQ.w_3ldZnfcRwS7WVdCrQHtcf5jMGMCuAS00mSGJgdjl0';
  
  function_url := 'https://aczuaveodktaklativsb.supabase.co/functions/v1/send-assessment-notification';
  
  payload := jsonb_build_object(
    'record', row_to_json(NEW),
    'type', 'INSERT',
    'table', 'scheduled_assessments'
  );
  
  RAISE NOTICE 'DEBUG: Calling function at URL: %', function_url;
  RAISE NOTICE 'DEBUG: Payload: %', payload;
  
  BEGIN
    SELECT * INTO response FROM http((
      'POST',
      function_url,
      ARRAY[http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || service_key)],
      payload::text
    ));
    
    RAISE NOTICE 'DEBUG: Function called with status: %', response.status;
    RAISE NOTICE 'DEBUG: Response body: %', response.content;
    
    INSERT INTO scheduled_assessments_logs (user_id, status_code, response_body, created_at)
    VALUES (NEW.user_id, response.status, response.content, NOW());
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'DEBUG: Failed to call notification function: %', SQLERRM;
    INSERT INTO scheduled_assessments_logs (user_id, status_code, response_body, created_at)
    VALUES (NEW.user_id, -1, SQLERRM, NOW());
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Drop and recreate the trigger
DROP TRIGGER IF EXISTS assessment_scheduled_trigger ON scheduled_assessments;

-- STEP 4: Create the new trigger
CREATE TRIGGER assessment_scheduled_trigger
  AFTER INSERT ON scheduled_assessments
  FOR EACH ROW
  EXECUTE FUNCTION send_assessment_notification_debug();

-- STEP 5: Test with real user ID
INSERT INTO scheduled_assessments (user_id, scheduled_time, notification_method) 
VALUES (
    'bc2d73bf-911c-4b91-8894-b9035692bef5',
    NOW() + INTERVAL '4 hours', 
    'email'
);

-- STEP 6: Check the logs
SELECT * FROM scheduled_assessments_logs ORDER BY created_at DESC LIMIT 3;

-- STEP 7: Check total count
SELECT COUNT(*) FROM scheduled_assessments;
