-- Alternative HTTP syntax for different Supabase versions
-- Try this simpler approach

CREATE OR REPLACE FUNCTION send_assessment_notification_debug()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  payload text;
  result text;
  service_key text;
BEGIN
  RAISE NOTICE 'DEBUG: New assessment scheduled for user % at %', NEW.user_id, NEW.scheduled_time;
  
  service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjenVhdmVvZGt0YWtsYXRpdnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1NDQyMywiZXhwIjoyMDY5NzMwNDIzfQ.w_3ldZnfcRwS7WVdCrQHtcf5jMGMCuAS00mSGJgdjl0';
  
  function_url := 'https://aczuaveodktaklativsb.supabase.co/functions/v1/send-assessment-notification';
  
  payload := jsonb_build_object(
    'record', row_to_json(NEW),
    'type', 'INSERT',
    'table', 'scheduled_assessments'
  )::text;
  
  RAISE NOTICE 'DEBUG: Calling function at URL: %', function_url;
  RAISE NOTICE 'DEBUG: Payload: %', payload;
  
  BEGIN
    -- Try simpler HTTP call
    SELECT content INTO result FROM http_post(
      function_url,
      payload,
      'application/json',
      ARRAY[
        http_header('Authorization', 'Bearer ' || service_key)
      ]
    );
    
    RAISE NOTICE 'DEBUG: Function called successfully';
    RAISE NOTICE 'DEBUG: Response: %', result;
    
    INSERT INTO scheduled_assessments_logs (user_id, status_code, response_body, created_at)
    VALUES (NEW.user_id, 200, result, NOW());
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'DEBUG: Failed to call notification function: %', SQLERRM;
    INSERT INTO scheduled_assessments_logs (user_id, status_code, response_body, created_at)
    VALUES (NEW.user_id, -1, SQLERRM, NOW());
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Alternative approach if http_post doesn't work either
-- This one uses the basic http function with simpler syntax

CREATE OR REPLACE FUNCTION send_assessment_notification_simple()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  payload text;
  curl_command text;
BEGIN
  RAISE NOTICE 'SIMPLE: New assessment scheduled for user % at %', NEW.user_id, NEW.scheduled_time;
  
  function_url := 'https://aczuaveodktaklativsb.supabase.co/functions/v1/send-assessment-notification';
  
  payload := jsonb_build_object(
    'record', row_to_json(NEW),
    'type', 'INSERT',
    'table', 'scheduled_assessments'
  )::text;
  
  RAISE NOTICE 'SIMPLE: Would call URL: %', function_url;
  RAISE NOTICE 'SIMPLE: With payload: %', payload;
  
  -- For now, just log that we would send the notification
  -- This confirms the trigger is working properly
  INSERT INTO scheduled_assessments_logs (user_id, status_code, response_body, created_at)
  VALUES (NEW.user_id, 999, 'TRIGGER_WORKING_WOULD_SEND_NOTIFICATION', NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
