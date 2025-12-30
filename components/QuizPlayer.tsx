"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Quiz } from '@/types/quiz';

interface QuizPlayerProps {
  lessonId: string;
}

export default function QuizPlayer({ lessonId }: QuizPlayerProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuiz();
  }, [lessonId]);

  async function fetchQuiz() {
    setLoading(true);
    // This query gets the quiz, its questions, and the options all at once
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        id, title, lesson_id,
        questions (
          id, question_text,
          options (id, option_text, is_correct)
        )
      `)
      .eq('lesson_id', lessonId)
      .single();

    if (error) {
      console.error('Error fetching quiz:', error);
    }
    
    if (data) {
      setQuiz(data as Quiz);
    }
    setLoading(false);
  }

  const handleAnswer = (isCorrect: boolean) => {
    // Use functional update to ensure we have the latest score
    setScore(prevScore => {
      const newScore = isCorrect ? prevScore + 1 : prevScore;
      
      // Move to next question or finish quiz
      const nextQuestion = currentQuestionIndex + 1;
      if (nextQuestion < (quiz?.questions.length || 0)) {
        setCurrentQuestionIndex(nextQuestion);
      } else {
        // Quiz finished - submit score with the new score value
        submitScore(newScore);
        setShowResults(true);
      }
      
      return newScore;
    });
  };

  async function submitScore(finalScore: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && quiz) {
      const { error } = await supabase.from('quiz_submissions').insert({
        user_id: user.id,
        quiz_id: quiz.id,
        score: finalScore,
      });
      
      if (error) {
        console.error('Error submitting score:', error);
      }
    }
  }

  if (loading) return <p className="p-4 text-center text-gray-600">Loading Quiz...</p>;
  if (!quiz) return <p className="p-4 text-gray-500 italic text-center">No quiz available for this lesson.</p>;

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md border">
      {!showResults ? (
        <>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-blue-600">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
              <span className="text-sm text-gray-500">Score: {score}</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
              ></div>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-6 text-gray-900">{currentQuestion.question_text}</h2>
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleAnswer(option.is_correct)}
                className="p-4 text-left border-2 border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all font-medium text-gray-800"
              >
                {option.option_text}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold mb-4 text-gray-900">Quiz Completed!</h2>
          <p className="text-xl mb-2 text-gray-700">
            Your Score: <span className="text-blue-600 font-bold text-2xl">{score}</span> / {quiz.questions.length}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {Math.round((score / quiz.questions.length) * 100)}% Correct
          </p>
          <button 
            onClick={() => {
              setCurrentQuestionIndex(0);
              setScore(0);
              setShowResults(false);
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
          >
            Retry Quiz
          </button>
        </div>
      )}
    </div>
  );
}



