// Google Calendar API service
import { supabase } from '../supabaseClient';

export interface CalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
  }>;
  reminders: {
    useDefault: boolean;
    overrides: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

export class GoogleCalendarService {
  private static async getAccessToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.provider_token) {
        console.error('No Google access token found in session');
        return null;
      }
      return session.provider_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  static async createEvent(event: CalendarEvent): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return { success: false, error: 'No Google access token available. Please re-login with Google.' };
      }

      console.log('Creating Google Calendar event:', event);

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Google Calendar API error:', response.status, errorData);
        
        if (response.status === 401) {
          return { success: false, error: 'Google access token expired. Please re-login with Google.' };
        }
        
        return { success: false, error: `Failed to create calendar event: ${response.status}` };
      }

      const createdEvent = await response.json();
      console.log('Google Calendar event created successfully:', createdEvent.id);
      
      return { success: true, eventId: createdEvent.id };
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      return { success: false, error: 'Network error while creating calendar event' };
    }
  }

  static async createAssessmentEvent(
    scheduledDateTime: Date,
    userEmail: string,
    userName: string
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const eventStart = new Date(scheduledDateTime);
    const eventEnd = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

    const event: CalendarEvent = {
      summary: 'NatSchix Assessment - Scheduled Test',
      description: `Hello ${userName},\n\nYour assessment has been scheduled for ${eventStart.toLocaleString()}.\n\nPlease make sure to:\n- Be available at the scheduled time\n- Have a stable internet connection\n- Use a quiet environment\n- Have your ID ready for verification\n\nGood luck!\n\nBest regards,\nNatSchix Team`,
      start: {
        dateTime: eventStart.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: eventEnd.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: [
        {
          email: userEmail,
        }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 60 }, // 1 hour before
          { method: 'popup', minutes: 15 }, // 15 minutes before
        ],
      },
    };

    return await this.createEvent(event);
  }

  static async checkCalendarAccess(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) return false;

      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 403) {
        console.warn('Calendar access denied - insufficient OAuth scope. Need to request calendar permission.');
        return false;
      }

      return response.ok;
    } catch (error) {
      console.error('Error checking calendar access:', error);
      return false;
    }
  }

  // Request additional calendar permissions
  static async requestCalendarPermission(): Promise<boolean> {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      // Sign out and re-authenticate with calendar scope
      await supabase.auth.signOut();
      
      // Redirect to Google OAuth with calendar scope
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Error requesting calendar permission:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting calendar permission:', error);
      return false;
    }
  }
}
