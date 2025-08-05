import React, { useState } from 'react';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface GoogleCalendarAuthProps {
  onAuthSuccess: (accessToken: string) => void;
  onAuthError: (error: string) => void;
}

const GoogleCalendarAuth: React.FC<GoogleCalendarAuthProps> = ({ onAuthSuccess, onAuthError }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const authenticateWithCalendar = async () => {
    setIsAuthenticating(true);
    
    try {
      // Get Google Client ID from environment or Supabase config
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'your-google-client-id';
      
      // Create OAuth URL with Calendar scope
      const scope = 'https://www.googleapis.com/auth/calendar';
      const redirectUri = `${window.location.origin}/auth/callback`;
      
      const authUrl = `https://accounts.google.com/oauth/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent`;
      
      // Open popup for OAuth
      const popup = window.open(
        authUrl,
        'google-calendar-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      // Listen for popup completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsAuthenticating(false);
          
          // Check if we got the token (you'd implement this based on your callback handling)
          const token = localStorage.getItem('google_calendar_token');
          if (token) {
            onAuthSuccess(token);
            localStorage.removeItem('google_calendar_token');
          } else {
            onAuthError('Authentication was cancelled or failed');
          }
        }
      }, 1000);
      
    } catch (error) {
      setIsAuthenticating(false);
      onAuthError(error instanceof Error ? error.message : 'Authentication failed');
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Google Calendar Permission Required
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            To create calendar events, we need additional permission to access your Google Calendar.
          </p>
          <button
            onClick={authenticateWithCalendar}
            disabled={isAuthenticating}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calendar className="h-4 w-4" />
            <span>
              {isAuthenticating ? 'Authenticating...' : 'Grant Calendar Access'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarAuth;
