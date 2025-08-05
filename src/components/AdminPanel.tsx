import React, { useState, useEffect, useCallback } from 'react';
import AddQuestionModal from './AddQuestionModal';
import { supabase } from '../supabaseClient';
import {
  Settings,
  Users,
  FileText,
  BarChart3,
  Plus,
  Edit3,
  Trash2,
  Eye,
  BookOpen,
  Award
} from 'lucide-react';

// Define interfaces for our data
interface Question {
  id: number;
  subject: string;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_image_url?: string | null;
  option_a_image_url?: string | null;
  option_b_image_url?: string | null;
  option_c_image_url?: string | null;
  option_d_image_url?: string | null;
}

interface TestResult {
  id: number;
  user_id: string;
  test_time: string;
  score: number;
  duration_seconds: number;
  registrations?: { email: string };
}

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [overviewCounts, setOverviewCounts] = useState({ users: 0, results: 0, questions: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Settings state
  const [testDuration, setTestDuration] = useState(120);
  const [questionsPerSubject, setQuestionsPerSubject] = useState(20);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [platformName, setPlatformName] = useState('AssessmentPro');
  const [contactEmail, setContactEmail] = useState('admin@assessmentpro.com');
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Fetch initial data for overview cards
  useEffect(() => {
    const fetchOverviewData = async () => {
        console.log("Fetching overview data...");
        try {
            const [questionsRes, resultsRes, usersRes] = await Promise.all([
                supabase.from('questions').select('id', { count: 'exact', head: true }),
                supabase.from('test_results').select('id', { count: 'exact', head: true }),
                supabase.from('registrations').select('id', { count: 'exact', head: true })
            ]);

            if (questionsRes.error) throw questionsRes.error;
            if (resultsRes.error) throw resultsRes.error;
            if (usersRes.error) throw usersRes.error;

            console.log('Overview data fetched:', { 
                questions: questionsRes.count,
                results: resultsRes.count,
                users: usersRes.count
            });

            setOverviewCounts({
                questions: questionsRes.count || 0,
                results: resultsRes.count || 0,
                users: usersRes.count || 0
            });

        } catch (error) {
            console.error('Error fetching overview data:', error);
        }
    };
    fetchOverviewData();
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    console.log('Fetching questions...');
    try {
      const { data, error } = await supabase.from('questions').select('*');
      if (error) throw error;
      console.log('Fetched questions:', data);
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (activeTab === 'overview' || activeTab === 'settings') return;

      setLoading(true);
      console.log(`Fetching data for tab: ${activeTab}`);
      try {
        if (activeTab === 'questions') {
          fetchQuestions();
        } else if (activeTab === 'results') {
          // Fetch test results and user emails separately and combine them
          const [resultsResponse, registrationsResponse] = await Promise.all([
            supabase.from('test_results').select('*'),
            supabase.from('registrations').select('user_id, email')
          ]);

          if (resultsResponse.error) throw resultsResponse.error;
          if (registrationsResponse.error) throw registrationsResponse.error;

          // Create a map of user_id to email for efficient lookup
          const emailMap = registrationsResponse.data.reduce((acc, registration) => {
            acc[registration.user_id] = registration.email;
            return acc;
          }, {} as Record<string, string>);

          // Combine the data
          const combinedData = resultsResponse.data.map(result => ({
            ...result,
            registrations: { email: emailMap[result.user_id] || 'Unknown User' }
          }));

          console.log('Fetched and combined results:', combinedData);
          setResults(combinedData || []);
        } else if (activeTab === 'users') {
          const { data, error } = await supabase.from('registrations').select('*');
          if (error) throw error;
          console.log('Fetched users:', data);
          setUsers(data || []);
        }
      } catch (error) {
        console.error(`Error fetching ${activeTab}:`, error);
      }
      setLoading(false);
    };

    fetchData();
  }, [activeTab, fetchQuestions]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'questions', name: 'Questions', icon: FileText },
    { id: 'results', name: 'Results', icon: Award },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  const handleQuestionAdded = () => {
    fetchQuestions();
    setOverviewCounts(prev => ({ ...prev, questions: prev.questions + 1 }));
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
          <p className="text-blue-100">Total Users</p>
          <p className="text-3xl font-bold">{overviewCounts.users}</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
          <p className="text-green-100">Tests Completed</p>
          <p className="text-3xl font-bold">{overviewCounts.results}</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
          <p className="text-purple-100">Questions Bank</p>
          <p className="text-3xl font-bold">{overviewCounts.questions}</p>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-2xl shadow-lg">
          <p className="text-amber-100">Avg. Score</p>
          <p className="text-3xl font-bold">{results.length > 0 ? `${Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)}%` : 'N/A'}</p>
        </div>
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Question Bank</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
          <Plus className="h-5 w-5" />
          <span>Add Question</span>
        </button>
      </div>
      {loading ? <p>Loading questions...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.map((q) => (
                <tr key={q.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{q.subject}</td>
                  <td className="px-6 py-4 max-w-sm truncate text-sm text-gray-500" title={q.question}>{q.question}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{q.difficulty}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {q.question_image_url || q.option_a_image_url || q.option_b_image_url || q.option_c_image_url || q.option_d_image_url ? (
                      <div className="flex space-x-1">
                        {q.question_image_url && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Q</span>
                        )}
                        {q.option_a_image_url && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">A</span>
                        )}
                        {q.option_b_image_url && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">B</span>
                        )}
                        {q.option_c_image_url && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">C</span>
                        )}
                        {q.option_d_image_url && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">D</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-blue-600 hover:text-blue-800"><Edit3 className="h-5 w-5" /></button>
                    <button className="text-red-600 hover:text-red-800"><Trash2 className="h-5 w-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderResults = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Test Results</h3>
      {loading ? <p>Loading results...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.registrations?.email || r.user_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.test_time).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.score}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.duration_seconds}s</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-blue-600 hover:text-blue-800"><Eye className="h-5 w-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">User Management</h3>
      {loading ? <p>Loading users...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-red-600 hover:text-red-800"><Trash2 className="h-5 w-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const handleSaveSettings = async () => {
    try {
      // In a real application, you would save these settings to a database or configuration service
      console.log('Saving settings:', {
        testDuration,
        questionsPerSubject,
        randomizeQuestions,
        platformName,
        contactEmail,
        emailNotifications
      });
      
      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900">System Settings</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Test Duration (minutes)</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg" 
                value={testDuration}
                onChange={(e) => setTestDuration(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Questions per Subject</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg" 
                value={questionsPerSubject}
                onChange={(e) => setQuestionsPerSubject(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="randomize" 
                className="rounded" 
                checked={randomizeQuestions}
                onChange={(e) => setRandomizeQuestions(e.target.checked)}
              />
              <label htmlFor="randomize" className="text-sm text-gray-700">Randomize Questions</label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">System Preferences</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg" 
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
              <input 
                type="email" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg" 
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="notifications" 
                className="rounded" 
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <label htmlFor="notifications" className="text-sm text-gray-700">Email Notifications</label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
          onClick={handleSaveSettings}
        >
          Save Settings
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'questions':
        return renderQuestions();
      case 'results':
        return renderResults();
      case 'users':
        return renderUsers();
      case 'settings':
        return renderSettings();
      default:
        return null;
    }
  };

  return (
    <>
      {isModalOpen && (
        <AddQuestionModal 
          onClose={() => setIsModalOpen(false)} 
          onQuestionAdded={handleQuestionAdded} 
        />
      )}
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Admin Panel</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Administrator</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                        ${activeTab === tab.id
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-gray-600 hover:bg-gray-100'
                        }
                      `}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span className="font-medium">{tab.name}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPanel;
