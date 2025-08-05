-- Simplified trigger test that works without database parameter permissions
-- Run each section separately

-- 1. Create a test trigger function with hardcoded service role key
CREATE OR REPLACE FUNCTION send_assessment_notification_debug()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  payload jsonb;
  response record;
  service_key text;
BEGIN
  -- Log the insertion for debugging
  RAISE NOTICE 'DEBUG: New assessment scheduled for user % at %', NEW.user_id, NEW.scheduled_time;
  
  -- Hardcode the service role key (temporary for testing)
  service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjenVhdmVvZGt0YWtsYXRpdnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1NDQyMywiZXhwIjoyMDY5NzMwNDIzfQ.w_3ldZnfcRwS7WVdCrQHtcf5jMGMCuAS00mSGJgdjl0';
  
  -- Use your actual Supabase project URL
  function_url := 'https://aczuaveodktaklativsb.supabase.co/functions/v1/send-assessment-notification';
  
  -- Create payload
  payload := jsonb_build_object(
    'record', row_to_json(NEW),
    'type', 'INSERT',
    'table', 'scheduled_assessments'
  );
  
  RAISE NOTICE 'DEBUG: Calling function at URL: %', function_url;
  RAISE NOTICE 'DEBUG: Payload: %', payload;
  
  -- Make HTTP request to Edge Function
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
    
    -- Also log to a table for easier debugging
    INSERT INTO scheduled_assessments_logs (user_id, status_code, response_body, created_at)
    VALUES (NEW.user_id, response.status, response.content, NOW());
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'DEBUG: Failed to call notification function: %', SQLERRM;
    -- Log the error too
    INSERT INTO scheduled_assessments_logs (user_id, status_code, response_body, created_at)
    VALUES (NEW.user_id, -1, SQLERRM, NOW());
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create a simple log table to track trigger executions
CREATE TABLE IF NOT EXISTS scheduled_assessments_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    status_code INTEGER,
    response_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Replace the trigger temporarily with our debug version
DROP TRIGGER IF EXISTS assessment_scheduled_trigger ON scheduled_assessments;
CREATE TRIGGER assessment_scheduled_trigger
  AFTER INSERT ON scheduled_assessments
  FOR EACH ROW
  EXECUTE FUNCTION send_assessment_notification_debug();

-- 4. Test with a new insert
INSERT INTO scheduled_assessments (user_id, scheduled_time, notification_method) 
VALUES (
    gen_random_uuid(),
    NOW() + INTERVAL '4 hours', 
    'email'
);

-- 5. Check the logs to see what happened
SELECT * FROM scheduled_assessments_logs ORDER BY created_at DESC LIMIT 3;

-- 6. Check if the insert worked
SELECT COUNT(*) FROM scheduled_assessments;
