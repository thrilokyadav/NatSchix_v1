# Notification Setup Guide

Your notification system is now implemented but requires proper configuration to work. Here's what you need to set up:

## 1. Environment Variables Required

### For Email Notifications (Resend)
```bash
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

### For Google Calendar Integration
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
```

### For Supabase Function
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 2. Setting Up Resend for Email Notifications

1. Go to [Resend.com](https://resend.com) and create an account
2. Create a new API key in your dashboard
3. Add your domain and verify it (for production)
4. Set the `RESEND_API_KEY` environment variable

## 3. Setting Up Google Calendar Integration

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google Calendar API

### Step 2: Create OAuth2 Credentials
1. Go to "Credentials" in the Google Cloud Console
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Set application type to "Web application"
4. Add authorized redirect URIs (for testing, you can use `http://localhost:3000`)

### Step 3: Get Refresh Token
You'll need to implement an OAuth2 flow to get the refresh token. Here's a simple way:

1. Use this URL to get authorization code (replace YOUR_CLIENT_ID):
```
https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000&scope=https://www.googleapis.com/auth/calendar&response_type=code&access_type=offline&prompt=consent
```

2. After authorization, exchange the code for tokens using this curl command:
```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=AUTHORIZATION_CODE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost:3000"
```

3. Save the `refresh_token` from the response

## 4. Configuring Supabase Environment Variables

### Option 1: Using Supabase CLI (Recommended)
```bash
supabase secrets set RESEND_API_KEY=your_key_here
supabase secrets set EMAIL_FROM=noreply@yourdomain.com
supabase secrets set GOOGLE_CLIENT_ID=your_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret
supabase secrets set GOOGLE_REFRESH_TOKEN=your_refresh_token
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Settings → Edge Functions
3. Add the environment variables in the "Environment Variables" section

## 5. Setting Up Database Configuration

You also need to configure the database settings for the trigger to work:

```sql
-- Set the Supabase URL (replace with your actual URL)
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';

-- Set the service role key (replace with your actual key)
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
```

## 6. Deploying and Testing

### Deploy the Function
```bash
supabase functions deploy send-assessment-notification
```

### Apply Database Migration
```bash
supabase db push
```

### Test the Notification
1. Schedule an assessment through your app
2. Check the Supabase logs for function execution:
```bash
supabase functions logs send-assessment-notification
```

## 7. Troubleshooting

### Common Issues:

1. **Function not triggered**: Check if the database trigger is properly installed
2. **Email not sent**: Verify Resend API key and domain configuration
3. **Calendar not created**: Check Google OAuth2 credentials and refresh token
4. **User not found**: Ensure the user_id in scheduled_assessments matches registrations table

### Debug Steps:
1. Check Supabase function logs
2. Test the function directly using curl
3. Verify environment variables are set correctly
4. Check database trigger execution in PostgreSQL logs

## 8. Testing the Function Directly

You can test the function directly with curl:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/send-assessment-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "record": {
      "user_id": "test-user-id",
      "scheduled_time": "2025-08-04T10:00:00Z",
      "notification_method": "both"
    }
  }'
```

Once you've completed this setup, your notification system should work properly!
