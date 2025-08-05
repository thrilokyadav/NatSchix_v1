import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { X } from 'lucide-react';

interface AddQuestionModalProps {
  onClose: () => void;
  onQuestionAdded: () => void;
}

const AddQuestionModal: React.FC<AddQuestionModalProps> = ({ onClose, onQuestionAdded }) => {
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [optionImages, setOptionImages] = useState<(File | null)[]>([null, null, null, null]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (type: 'question' | 'option', index: number | null, file: File | null) => {
    if (type === 'question' && file) {
      setQuestionImage(file);
    } else if (type === 'option' && index !== null && file) {
      const newOptionImages = [...optionImages];
      newOptionImages[index] = file;
      setOptionImages(newOptionImages);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!subject || !question || options.some(opt => !opt)) {
      setError('Please fill out all text fields.');
      setLoading(false);
      return;
    }

    try {
      const uploadImage = async (file: File) => {
        const fileName = `${Date.now()}-${file.name}`;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('User is not authenticated.');

        const { data, error } = await supabase.storage
          .from('question-images')
          .upload(fileName, file, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

        if (error) {
          throw new Error(`Image upload failed: ${error.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('question-images')
          .getPublicUrl(data.path);

        return publicUrl;
      };

      let question_image_url: string | undefined = undefined;
      if (questionImage) {
        question_image_url = await uploadImage(questionImage);
      }

      const optionImageUrls = await Promise.all(
        optionImages.map(file => file ? uploadImage(file) : Promise.resolve(undefined))
      );

      const questionData = {
        subject,
        question,
        question_image_url,
        option_a: options[0],
        option_a_image_url: optionImageUrls[0],
        option_b: options[1],
        option_b_image_url: optionImageUrls[1],
        option_c: options[2],
        option_c_image_url: optionImageUrls[2],
        option_d: options[3],
        option_d_image_url: optionImageUrls[3],
        correct_answer: parseInt(String(correctAnswer), 10),
        difficulty,
      };

      const { error: insertError } = await supabase.from('questions').insert([questionData]);

      if (insertError) {
        throw insertError;
      }

      console.log('Question added successfully!');
      onQuestionAdded();
      onClose();
    } catch (err) {
      console.error('Error adding question:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to add question: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Question</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Math"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="What is 2 + 2?"
            ></textarea>
            <label className="block text-sm font-medium text-gray-700 mt-2">Question Image (Optional)</label>
            <input 
              type="file"
              onChange={(e) => handleImageChange('question', null, e.target.files ? e.target.files[0] : null)}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Options</label>
            {options.map((option, index) => (
              <div key={index} className="mb-3">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder={`Option ${index + 1}`}
                />
                <input 
                  type="file"
                  onChange={(e) => handleImageChange('option', index, e.target.files ? e.target.files[0] : null)}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
            <select
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(Number(e.target.value))}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {options.map((_, index) => (
                <option key={index} value={index}>
                  {`Option ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddQuestionModal;
