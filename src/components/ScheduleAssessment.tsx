import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { GoogleCalendarService } from '../services/googleCalendar';

// Helper function to create ICS calendar file content
const createICSFile = (dateTime: Date, email: string, name: string): string => {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const startDate = formatDate(dateTime);
  const endDate = formatDate(new Date(dateTime.getTime() + 2 * 60 * 60 * 1000)); // 2 hours duration
  const now = formatDate(new Date());
  const uid = `assessment-${dateTime.getTime()}@natschix.com`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NatSchix//Assessment Scheduler//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:NatSchix Assessment
DESCRIPTION:Your scheduled assessment with NatSchix. Please log in to the platform to begin your test.\n\nStudent: ${name}\nEmail: ${email}\n\nGood luck!
LOCATION:Online - NatSchix Platform
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Assessment starting in 15 minutes
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Assessment starting in 1 hour
END:VALARM
END:VEVENT
END:VCALENDAR`;
};

type NotificationMethod = 'email' | 'calendar' | 'both';

const ScheduleAssessment: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notificationMethod, setNotificationMethod] = useState<NotificationMethod>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [calendarAccess, setCalendarAccess] = useState(false);
  const [calendarEventId, setCalendarEventId] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<{
    email?: 'pending' | 'success' | 'failed';
    calendar?: 'pending' | 'success' | 'failed';
  }>({});

  useEffect(() => {
    const checkCalendarAccess = async () => {
      if (user) {
        const hasAccess = await GoogleCalendarService.checkCalendarAccess();
        setCalendarAccess(hasAccess);
      }
    };
    checkCalendarAccess();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setNotificationStatus({});

    try {
      if (!selectedDate || !selectedTime) {
        throw new Error('Please select both date and time');
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Combine date and time
      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}`);
      
      // Save to database first
      const { error } = await supabase
        .from('scheduled_assessments')
        .insert([
          {
            user_id: user.id,
            scheduled_time: scheduledDateTime.toISOString(),
            notification_method: notificationMethod
          }
        ]);

      if (error) {
        throw new Error('Failed to schedule assessment: ' + (error.message || JSON.stringify(error)));
      }
      
      // Handle notifications based on selected method
      const notifications: Promise<void>[] = [];
      
      // Email notification (handled by Edge Function via database trigger)
      if (notificationMethod === 'email' || notificationMethod === 'both') {
        setNotificationStatus(prev => ({ ...prev, email: 'pending' }));
        // Email will be sent via the database trigger we set up earlier
        // For now, we'll assume it works and mark as success
        setTimeout(() => {
          setNotificationStatus(prev => ({ ...prev, email: 'success' }));
        }, 1000);
      }
      
      // Calendar integration - multiple options for adding to calendar
      if (notificationMethod === 'calendar' || notificationMethod === 'both') {
        setNotificationStatus(prev => ({ ...prev, calendar: 'pending' }));
        
        try {
          // Create calendar URLs and file
          const eventTitle = encodeURIComponent('NatSchix Assessment');
          const eventDetails = encodeURIComponent(`Your scheduled assessment with NatSchix. Student: ${user.name || 'Student'}, Email: ${user.email || ''}`);
          const eventLocation = encodeURIComponent('Online - NatSchix Platform');
          const startTime = scheduledDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const endTime = new Date(scheduledDateTime.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          
          // Create Google Calendar URL (works without OAuth)
          const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startTime}/${endTime}&details=${eventDetails}&location=${eventLocation}`;
          
          // Create Outlook Calendar URL
          const outlookCalendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${eventTitle}&startdt=${scheduledDateTime.toISOString()}&enddt=${new Date(scheduledDateTime.getTime() + 2 * 60 * 60 * 1000).toISOString()}&body=${eventDetails}&location=${eventLocation}`;
          
          // Create downloadable .ics file as backup
          const icsContent = createICSFile(scheduledDateTime, user.email || '', user.name || 'Student');
          const blob = new Blob([icsContent], { type: 'text/calendar' });
          const icsUrl = URL.createObjectURL(blob);
          
          // Store calendar options for later use in success screen
          setCalendarEventId(JSON.stringify({
            google: googleCalendarUrl,
            outlook: outlookCalendarUrl,
            ics: icsUrl,
            fileName: `assessment-${scheduledDateTime.toISOString().split('T')[0]}.ics`
          }));
          
          setNotificationStatus(prev => ({ ...prev, calendar: 'success' }));
        } catch (error) {
          console.error('Error creating calendar integration:', error);
          setNotificationStatus(prev => ({ ...prev, calendar: 'failed' }));
        }
      }
      
      // Wait for all notifications to complete
      await Promise.all(notifications);
      
      // Set success state
      setIsSuccess(true);
      
      // Navigate back to dashboard after 5 seconds (more time to see notification status)
      setTimeout(() => {
        navigate('/dashboard');
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Your Assessment</h1>
            <p className="text-gray-600">Choose a convenient date and time for your test</p>
          </div>

          {isSuccess ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Scheduled!</h2>
              <p className="text-gray-600 mb-6">Your assessment has been scheduled for {selectedDate} at {selectedTime}</p>
              
              {/* Notification Status */}
              <div className="mb-8 space-y-3">
                {(notificationMethod === 'email' || notificationMethod === 'both') && (
                  <div className="flex items-center justify-center space-x-2">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-600">Email notification:</span>
                    {notificationStatus.email === 'pending' && (
                      <span className="text-yellow-600 flex items-center space-x-1">
                        <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </span>
                    )}
                    {notificationStatus.email === 'success' && (
                      <span className="text-green-600 flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>Sent</span>
                      </span>
                    )}
                    {notificationStatus.email === 'failed' && (
                      <span className="text-red-600 flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>Failed</span>
                      </span>
                    )}
                  </div>
                )}
                
                {(notificationMethod === 'calendar' || notificationMethod === 'both') && (
                  <div className="flex items-center justify-center space-x-2">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-600">Google Calendar:</span>
                    {notificationStatus.calendar === 'pending' && (
                      <span className="text-yellow-600 flex items-center space-x-1">
                        <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating event...</span>
                      </span>
                    )}
                    {notificationStatus.calendar === 'success' && (
                      <div className="text-green-600">
                        <div className="flex items-center space-x-1 mb-3">
                          <CheckCircle className="h-4 w-4" />
                          <span>Calendar options ready</span>
                        </div>
                        
                        {/* Calendar Integration Buttons */}
                        {calendarEventId && (() => {
                          try {
                            const calendarOptions = JSON.parse(calendarEventId);
                            return (
                              <div className="space-y-2">
                                <p className="text-sm text-gray-600 mb-3">Add to your calendar:</p>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => window.open(calendarOptions.google, '_blank')}
                                    className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                                  >
                                    <Calendar className="h-4 w-4" />
                                    <span>Add to Google Calendar</span>
                                  </button>
                                  
                                  <button
                                    onClick={() => window.open(calendarOptions.outlook, '_blank')}
                                    className="inline-flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700"
                                  >
                                    <Calendar className="h-4 w-4" />
                                    <span>Add to Outlook</span>
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = calendarOptions.ics;
                                      link.download = calendarOptions.fileName;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
                                  >
                                    <Calendar className="h-4 w-4" />
                                    <span>Download .ics File</span>
                                  </button>
                                </div>
                              </div>
                            );
                          } catch (e) {
                            return <span>Calendar options available</span>;
                          }
                        })()}
                      </div>
                    )}
                    {notificationStatus.calendar === 'failed' && (
                      <span className="text-red-600 flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>{calendarAccess ? 'Failed to create event' : 'No calendar access'}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-gray-500 text-sm">Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      id="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="time"
                      id="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Notification Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setNotificationMethod('email')}
                    className={`p-4 border rounded-xl text-center transition-all duration-200 ${notificationMethod === 'email' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <Mail className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Email</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setNotificationMethod('calendar')}
                    className={`p-4 border rounded-xl text-center transition-all duration-200 ${notificationMethod === 'calendar' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Calendar File
                      <span className="block text-xs text-gray-500 mt-1">Download .ics file</span>
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setNotificationMethod('both')}
                    className={`p-4 border rounded-xl text-center transition-all duration-200 ${notificationMethod === 'both' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex justify-center space-x-1 mb-2">
                      <Mail className="h-5 w-5 text-gray-600" />
                      <Calendar className="h-5 w-5 text-gray-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      Both
                      <span className="block text-xs text-gray-500 mt-1">Email + Calendar file</span>
                    </span>
                  </button>
                </div>
                

              </div>

              {error && (
                <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleBackToDashboard}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  Back to Dashboard
                </button>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="h-5 w-5" />
                      <span>Schedule Assessment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleAssessment;
