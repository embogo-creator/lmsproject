'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function AdminQuizPage() {
  const router = useRouter()
  const [lessons, setLessons] = useState<any[]>([])
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [quizTitle, setQuizTitle] = useState('')
  const [questions, setQuestions] = useState([{ text: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] }])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState('student')

  useEffect(() => {
    checkAuth()
    fetchLessons()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      alert('Access denied. Admin only.')
      router.push('/dashboard')
      return
    }

    setRole(profile.role)
  }

  async function fetchLessons() {
    setLoading(true)
    const { data, error } = await supabase
      .from('lessons')
      .select('id, title, subjects(title)')
      .order('title')
    
    if (error) {
      console.error('Error fetching lessons:', error)
    } else if (data) {
      setLessons(data)
    }
    setLoading(false)
  }

  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] }])
  }

  const handleSave = async () => {
    if (!selectedLessonId || !quizTitle) {
      alert("Please select a lesson and enter a quiz title")
      return
    }

    // Validate questions
    const validQuestions = questions.filter(q => q.text.trim() !== '')
    if (validQuestions.length === 0) {
      alert("Please add at least one question")
      return
    }

    // Validate each question has at least one correct answer
    for (const q of validQuestions) {
      const hasCorrect = q.options.some(opt => opt.isCorrect && opt.text.trim() !== '')
      if (!hasCorrect) {
        alert(`Question "${q.text.substring(0, 30)}..." must have at least one correct answer`)
        return
      }
    }

    setSaving(true)

    try {
      // 1. Create the Quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert([{ lesson_id: selectedLessonId, title: quizTitle }])
        .select()
        .single()

      if (quizError) {
        alert(`Error creating quiz: ${quizError.message}`)
        setSaving(false)
        return
      }

      // 2. Create Questions and Options
      for (const q of validQuestions) {
        const { data: qData, error: qError } = await supabase
          .from('questions')
          .insert([{ quiz_id: quizData.id, question_text: q.text.trim() }])
          .select()
          .single()

        if (qError) {
          console.error('Error creating question:', qError)
          continue
        }

        if (qData) {
          const optionsToInsert = q.options
            .filter(opt => opt.text.trim() !== '')
            .map(opt => ({
              question_id: qData.id,
              option_text: opt.text.trim(),
              is_correct: opt.isCorrect
            }))
          
          if (optionsToInsert.length > 0) {
            const { error: optError } = await supabase.from('options').insert(optionsToInsert)
            if (optError) {
              console.error('Error creating options:', optError)
            }
          }
        }
      }

      alert("Quiz created successfully!")
      // Reset form
      setSelectedLessonId('')
      setQuizTitle('')
      setQuestions([{ text: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] }])
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while creating the quiz')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="text-indigo-600 font-bold hover:underline flex items-center gap-2">
            <span>←</span> Back to Dashboard
          </Link>
          <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">Admin: Create Quiz</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">Create a New Quiz</h1>
          <p className="text-gray-600">Add interactive quizzes to your lessons</p>
        </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Select Lesson
            </label>
            <select 
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
            >
              <option value="">Select a Lesson</option>
              {lessons.map(l => (
                <option key={l.id} value={l.id}>
                  {l.title} {l.subjects ? `(${l.subjects.title})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Quiz Title
            </label>
            <input 
              type="text" 
              placeholder="e.g., Biology Basics Quiz" 
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Question {qIndex + 1}</h3>
              {questions.length > 1 && (
                <button
                  onClick={() => {
                    const newQ = questions.filter((_, i) => i !== qIndex)
                    setQuestions(newQ)
                  }}
                  className="text-red-600 hover:text-red-700 font-bold text-sm"
                >
                  Remove
                </button>
              )}
            </div>
            <input 
              type="text" 
              placeholder="Enter your question here..." 
              className="w-full p-3 mb-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
              value={q.text}
              onChange={(e) => {
                const newQ = [...questions]
                newQ[qIndex].text = e.target.value
                setQuestions(newQ)
              }}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt, oIndex) => (
                <div key={oIndex} className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl hover:border-indigo-300 transition-colors">
                  <input 
                    type="text" 
                    placeholder={`Option ${oIndex + 1}`} 
                    className="flex-1 p-2 border-0 focus:outline-none bg-transparent"
                    value={opt.text}
                    onChange={(e) => {
                      const newQ = [...questions]
                      newQ[qIndex].options[oIndex].text = e.target.value
                      setQuestions(newQ)
                    }}
                  />
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={opt.isCorrect}
                      onChange={(e) => {
                        const newQ = [...questions]
                        newQ[qIndex].options.forEach((o, i) => o.isCorrect = i === oIndex)
                        setQuestions(newQ)
                      }}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-gray-600">Correct</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          onClick={addQuestion} 
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
        >
          + Add Question
        </button>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className={`flex-1 px-6 py-3 rounded-xl font-bold transition-colors ${
            saving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {saving ? 'Saving Quiz...' : 'Save Entire Quiz'}
        </button>
      </div>
      </main>
    </div>
  )
}
