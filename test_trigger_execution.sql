-- Test trigger execution and debug issues
-- Run each section separately

-- 1. First, let's set up database settings for the trigger
-- Set the service role key (replace with your actual service role key)
ALTER DATABASE postgres SET app.settings.service_role_key = 'your_service_role_key_here';

-- 2. Set the Supabase URL
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://aczuaveodktaklativsb.supabase.co';

-- 3. Check current settings
SELECT name, setting FROM pg_settings WHERE name LIKE '%app.settings%';

-- 4. Create a simplified trigger function for testing
CREATE OR REPLACE FUNCTION send_assessment_notification_test()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  payload jsonb;
  response record;
BEGIN
  -- Log the insertion for debugging
  RAISE NOTICE 'TEST: New assessment scheduled for user % at %', NEW.user_id, NEW.scheduled_time;
  
  -- Use your actual Supabase project URL
  function_url := 'https://aczuaveodktaklativsb.supabase.co/functions/v1/send-assessment-notification';
  
  -- Create payload
  payload := jsonb_build_object(
    'record', row_to_json(NEW),
    'type', 'INSERT',
    'table', 'scheduled_assessments'
  );
  
  RAISE NOTICE 'TEST: Calling function at URL: %', function_url;
  RAISE NOTICE 'TEST: Payload: %', payload;
  
  -- Make HTTP request to Edge Function
  BEGIN
    SELECT * INTO response FROM http((
      'POST',
      function_url,
      ARRAY[http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true))],
      payload::text
    ));
    
    RAISE NOTICE 'TEST: Function called with status: %', response.status;
    RAISE NOTICE 'TEST: Response body: %', response.content;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'TEST: Failed to call notification function: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Replace the trigger temporarily with our test version
DROP TRIGGER IF EXISTS assessment_scheduled_trigger ON scheduled_assessments;
CREATE TRIGGER assessment_scheduled_trigger
  AFTER INSERT ON scheduled_assessments
  FOR EACH ROW
  EXECUTE FUNCTION send_assessment_notification_test();

-- 6. Test with a new insert
INSERT INTO scheduled_assessments (user_id, scheduled_time, notification_method) 
VALUES (
    gen_random_uuid(),
    NOW() + INTERVAL '3 hours', 
    'email'
);

-- 7. Check if the insert worked
SELECT COUNT(*) FROM scheduled_assessments;
