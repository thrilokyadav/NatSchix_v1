-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create trigger function for sending assessment notifications
CREATE OR REPLACE FUNCTION send_assessment_notification()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  payload jsonb;
  response record;
BEGIN
  -- Log the insertion for debugging
  RAISE NOTICE 'New assessment scheduled for user % at %', NEW.user_id, NEW.scheduled_time;
  
  -- Construct the Edge Function URL
  function_url := 'https://aczuaveodktaklativsb.supabase.co/functions/v1/send-assessment-notification';
  
  -- Create payload
  payload := jsonb_build_object(
    'record', row_to_json(NEW),
    'type', 'INSERT',
    'table', 'scheduled_assessments'
  );
  
  -- Make HTTP request to Edge Function
  BEGIN
    SELECT * INTO response FROM http((
      'POST',
      function_url,
      ARRAY[http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true))],
      payload::text
    ));
    
    RAISE NOTICE 'Notification function called with status: %', response.status;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to call notification function: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS assessment_scheduled_trigger ON scheduled_assessments;

-- Create trigger to call the function after inserting into scheduled_assessments
CREATE TRIGGER assessment_scheduled_trigger
  AFTER INSERT ON scheduled_assessments
  FOR EACH ROW
  EXECUTE FUNCTION send_assessment_notification();
