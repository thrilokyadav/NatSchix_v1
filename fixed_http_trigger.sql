-- Fixed trigger function with correct HTTP syntax
-- Run this to replace the broken trigger function

CREATE OR REPLACE FUNCTION send_assessment_notification_debug()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  payload jsonb;
  response http_response;
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
    -- Fixed HTTP call syntax
    response := http((
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
