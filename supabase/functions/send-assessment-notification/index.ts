// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Import necessary modules
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  try {
    console.log('Assessment notification function called');
    
    // Get the payload from the request
    const payload = await req.json()
    console.log('Received payload:', JSON.stringify(payload, null, 2));
    
    // Extract relevant data
    const { record } = payload
    if (!record) {
      throw new Error('No record found in payload')
    }
    
    const { user_id, scheduled_time, notification_method } = record
    console.log(`Processing notification for user ${user_id}, scheduled for ${scheduled_time}, method: ${notification_method}`);
    
    if (!user_id || !scheduled_time || !notification_method) {
      throw new Error('Missing required fields: user_id, scheduled_time, or notification_method')
    }
    
    // Fetch user details
    console.log(`Fetching user details for user_id: ${user_id}`);
    const { data: user, error: userError } = await supabase
      .from('registrations')
      .select('email, first_name, last_name')
      .eq('user_id', user_id)
      .single()
    
    if (userError) {
      console.error('User fetch error:', userError);
      throw new Error(`Failed to fetch user: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error(`User not found for user_id: ${user_id}`)
    }
    
    console.log(`User found: ${user.email}`);
    
    const results: {
      email: string | null,
      calendar: string | null
    } = {
      email: null,
      calendar: null
    };
    
    // Send notifications based on user preference
    if (notification_method === 'email' || notification_method === 'both') {
      console.log('Sending email notification...');
      try {
        await sendEmailNotification(user, scheduled_time)
        results.email = 'success';
        console.log('Email notification sent successfully');
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        results.email = `failed: ${emailError.message}`;
      }
    }
    
    if (notification_method === 'calendar' || notification_method === 'both') {
      console.log('Sending calendar invite...');
      try {
        await sendCalendarInvite(user, scheduled_time)
        results.calendar = 'success';
        console.log('Calendar invite sent successfully');
      } catch (calendarError) {
        console.error('Calendar invite failed:', calendarError);
        results.calendar = `failed: ${calendarError.message}`;
      }
    }
    
    console.log('Notification processing completed:', results);
    
    return new Response(
      JSON.stringify({ 
        message: 'Notification processing completed',
        results: results,
        user_email: user.email
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

async function sendEmailNotification(user: any, scheduled_time: string) {
  try {
    // For Google Mail, we'll use a simple SMTP approach or Gmail API
    // This example uses a generic email sending service
    // You'll need to configure environment variables for your email service
    
    const emailData = {
      to: user.email,
      from: Deno.env.get('EMAIL_FROM') || 'noreply@yourdomain.com',
      subject: 'Assessment Scheduled Confirmation',
      text: `Hello ${user.first_name} ${user.last_name},

Your assessment has been scheduled for ${new Date(scheduled_time).toLocaleString()}.

Please make sure to be available at the scheduled time.

Best regards,
AssessmentPro Team`,
      html: `<h2>Hello ${user.first_name} ${user.last_name},</h2>
<p>Your assessment has been scheduled for <strong>${new Date(scheduled_time).toLocaleString()}</strong>.</p>
<p>Please make sure to be available at the scheduled time.</p>
<br>
<p>Best regards,<br>AssessmentPro Team</p>`
    };
    
    // If using SendGrid or similar service
    if (Deno.env.get('SENDGRID_API_KEY')) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: user.email }],
            subject: emailData.subject
          }],
          from: { email: emailData.from },
          content: [{
            type: 'text/html',
            value: emailData.html
          }]
        })
      });
      
      if (!response.ok) {
        throw new Error(`Email sending failed: ${response.status} ${response.statusText}`);
      }
      
      console.log(`Email sent successfully to ${user.email}`);
      return;
    }
    
    // If using Resend
    if (Deno.env.get('RESEND_API_KEY')) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: emailData.from,
          to: [user.email],
          subject: emailData.subject,
          html: emailData.html
        })
      });
      
      if (!response.ok) {
        throw new Error(`Email sending failed: ${response.status} ${response.statusText}`);
      }
      
      console.log(`Email sent successfully to ${user.email}`);
      return;
    }
    
    // Fallback to console log if no email service configured
    console.log(`EMAIL NOT SENT - No email service configured. Would send to ${user.email} for assessment on ${scheduled_time}`);
    console.log('To enable email notifications, set SENDGRID_API_KEY or RESEND_API_KEY environment variables');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

async function sendCalendarInvite(user: any, scheduled_time: string) {
  try {
    const eventStart = new Date(scheduled_time);
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour duration
    
    // Check if Google Calendar credentials are configured
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const googleRefreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');
    
    if (!googleClientId || !googleClientSecret || !googleRefreshToken) {
      console.log(`GOOGLE CALENDAR NOT CONFIGURED - Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN environment variables`);
      return;
    }
    
    // Step 1: Get access token using refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: googleRefreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    // Step 2: Create calendar event
    const event = {
      summary: 'Scheduled Assessment - NatSchix',
      description: `Hello ${user.first_name} ${user.last_name},\n\nYour assessment has been scheduled. Please make sure to be available at the scheduled time.\n\nBest regards,\nNatSchix Team`,
      start: {
        dateTime: eventStart.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventEnd.toISOString(),
        timeZone: 'UTC',
      },
      attendees: [
        {
          email: user.email,
          responseStatus: 'needsAction'
        }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
      conferenceData: {
        createRequest: {
          requestId: `assessment-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };
    
    // Step 3: Insert event into Google Calendar
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    
    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      throw new Error(`Failed to create calendar event: ${calendarResponse.status} ${calendarResponse.statusText} - ${errorText}`);
    }
    
    const createdEvent = await calendarResponse.json();
    console.log(`Google Calendar event created successfully for ${user.email}:`, createdEvent.htmlLink);
    
    return createdEvent;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    // Don't throw error to prevent email notification from failing
    console.log('Calendar invite failed, but continuing with other notifications');
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-assessment-notification' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
