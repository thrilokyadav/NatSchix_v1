import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

interface Question {
  id: string;
  subject: string;
  question: string;
  question_image_url?: string | null;
  options: { text: string; image_url?: string | null }[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface TestAnswer {
  questionId: string;
  selectedAnswer: number | null;
  timeSpent: number;
  marked: boolean;
}

interface TestState {
  questions: Question[];
  answers: TestAnswer[];
  currentQuestion: number;
  timeRemaining: number;
  isActive: boolean;
  startTime: Date | null;
}

interface TestContextType {
  testState: TestState;
  startTest: () => void;
  endTest: () => void;
  selectAnswer: (questionId: string, answer: number) => void;
  markForReview: (questionId: string) => void;
  navigateToQuestion: (index: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  submitTest: () => Promise<void>;
  setTimeRemaining: (seconds: number) => void;
}

const TestContext = createContext<TestContextType | undefined>(undefined);

export const useTest = () => {
  const context = useContext(TestContext);
  if (context === undefined) {
    throw new Error('useTest must be used within a TestProvider');
  }
  return context;
};

interface TestProviderProps {
  children: ReactNode;
}



export const TestProvider: React.FC<TestProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [testState, setTestState] = useState<TestState>({
    questions: [],
    answers: [],
    currentQuestion: 0,
    timeRemaining: 3600, // 60 minutes
    isActive: false,
    startTime: null
  });

  const startTest = async () => {
    console.log('Starting test and fetching questions...');
    
    // Check if user has already taken the test
    if (user) {
      const { data: existingResults, error: resultsError } = await supabase
        .from('test_results')
        .select('id')
        .eq('user_id', user.id);
      
      if (resultsError) {
        console.error('Error checking existing test results:', resultsError);
      } else if (existingResults && existingResults.length > 0) {
        console.log('User has already taken the test');
        // Optionally show a message to the user that they've already taken the test
        return;
      }
    }
    
    try {
      const { data: fetchedQuestions, error } = await supabase
        .from('questions')
        .select('*');

      if (error) {
        console.error('Error fetching questions:', error);
        throw error;
      }

      if (!fetchedQuestions || fetchedQuestions.length === 0) {
        console.error('No questions found in the database.');
        // Handle case with no questions, maybe show a message to the user
        return;
      }

      // Transform database questions to the expected format
      const transformedQuestions = fetchedQuestions.map(q => ({
        id: q.id,
        subject: q.subject,
        question: q.question,
        question_image_url: q.question_image_url || null,
        options: [
          { text: q.option_a, image_url: q.option_a_image_url || null },
          { text: q.option_b, image_url: q.option_b_image_url || null },
          { text: q.option_c, image_url: q.option_c_image_url || null },
          { text: q.option_d, image_url: q.option_d_image_url || null }
        ],
        correctAnswer: q.correct_answer,
        difficulty: q.difficulty
      }));

      const shuffledQuestions = [...transformedQuestions].sort(() => Math.random() - 0.5);
      
      const initialAnswers = shuffledQuestions.map(q => ({
        questionId: q.id,
        selectedAnswer: null,
        timeSpent: 0,
        marked: false
      }));

      setTestState({
        questions: shuffledQuestions,
        answers: initialAnswers,
        currentQuestion: 0,
        timeRemaining: 3600, // 60 minutes
        isActive: true,
        startTime: new Date()
      });
      console.log('Test started with questions:', shuffledQuestions);
    } catch (error) {
      console.error('Failed to start test:', error);
    }
  };

  const endTest = () => {
    setTestState(prev => ({
      ...prev,
      isActive: false
    }));
  };

  const setTimeRemaining = (seconds: number) => {
    setTestState(prev => ({
      ...prev,
      timeRemaining: seconds
    }));
  };

  const selectAnswer = (questionId: string, answer: number) => {
    setTestState(prev => ({
      ...prev,
      answers: prev.answers.map(a =>
        a.questionId === questionId ? { ...a, selectedAnswer: answer } : a
      )
    }));
  };

  const markForReview = (questionId: string) => {
    setTestState(prev => ({
      ...prev,
      answers: prev.answers.map(a =>
        a.questionId === questionId ? { ...a, marked: !a.marked } : a
      )
    }));
  };

  const navigateToQuestion = (index: number) => {
    setTestState(prev => ({
      ...prev,
      currentQuestion: index
    }));
  };

  const nextQuestion = () => {
    setTestState(prev => ({
      ...prev,
      currentQuestion: Math.min(prev.currentQuestion + 1, prev.questions.length - 1)
    }));
  };

  const previousQuestion = () => {
    setTestState(prev => ({
      ...prev,
      currentQuestion: Math.max(prev.currentQuestion - 1, 0)
    }));
  };

  const submitTest = async () => {
    if (!user || !testState.startTime) {
      const errorMessage = 'User not authenticated or test not started.';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const endTime = new Date();
      const durationSeconds = Math.round((endTime.getTime() - testState.startTime.getTime()) / 1000);

      let correctAnswers = 0;
      testState.answers.forEach(answer => {
        const question = testState.questions.find(q => q.id === answer.questionId);
        if (question && question.correctAnswer === answer.selectedAnswer) {
          correctAnswers++;
        }
      });
      const score = Math.round((correctAnswers / testState.questions.length) * 100);

      // Determine the subject for this test (using the subject of the first question)
      const subject = testState.questions.length > 0 ? testState.questions[0].subject : 'General';

      const testResultData = {
        user_id: user.id,
        test_time: testState.startTime.toISOString(),
        subject: subject,
        questions: testState.questions, // Include the questions data
        score: score,
        duration_seconds: durationSeconds,
        // The 'answers' field now correctly stores the JSONB data
        answers: testState.answers 
      };

      console.log('Submitting test results to Supabase:', testResultData);

      const { error } = await supabase.from('test_results').insert([testResultData]);

      if (error) {
        console.error('Error saving test results:', error);
        throw error;
      }

      console.log('Test results submitted successfully!');
      endTest();
    } catch (error) {
      console.error('Error submitting test:', error);
      throw error;
    }
  };

  const value: TestContextType = {
    testState,
    startTest,
    endTest,
    selectAnswer,
    markForReview,
    navigateToQuestion,
    nextQuestion,
    previousQuestion,
    submitTest,
    setTimeRemaining
  };

  return (
    <TestContext.Provider value={value}>
      {children}
    </TestContext.Provider>
  );
};