'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Link from 'next/link'

export default function LessonPage() {
  const { id } = useParams()
  const router = useRouter()
  
  const [lesson, setLesson] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false) // New: prevents double-clicks

  useEffect(() => {
    const fetchLesson = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('lessons')
        .select('*, subjects(title)')
        .eq('id', id)
        .single()

      if (error) {
        console.error("Fetch error:", error.message)
      } else {
        setLesson(data)
      }
      setLoading(false)
    }

    if (id) fetchLesson()
  }, [id, router])

  const handleComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !lesson || isSaving) return

    setIsSaving(true) // Disable button while saving

    const { error } = await supabase
      .from('lesson_progress')
      .insert([{ 
        user_id: user.id, 
        lesson_id: id 
      }])

    if (error && error.code !== '23505') { 
      alert("Error saving progress. Please check your connection.")
      setIsSaving(false)
    } else {
      // Small delay for better "feel" before redirecting
      router.push(`/subject/${lesson.subject_id}`)
    }
  }

  if (loading) return <div className="p-10 text-center text-black">Loading lesson...</div>
  
  if (!lesson) return (
    <div className="p-10 text-center text-black">
      <h2 className="text-xl font-bold">Lesson not found</h2>
      <Link href="/dashboard" className="text-blue-600 underline mt-4 block">Return to Dashboard</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black">
      <nav className="border-b p-4 flex justify-between items-center bg-gray-50 shadow-sm sticky top-0 z-10">
        <Link href={`/subject/${lesson.subject_id}`} className="text-blue-600 font-bold hover:underline flex items-center gap-2">
          <span>←</span> Back to {lesson.subjects?.title || 'Subject'}
        </Link>
        <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">Elias Learning Portal</span>
      </nav>

      <main className="max-w-3xl mx-auto p-8 lg:p-16">
        <header className="mb-12">
           <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
            {lesson.title}
          </h1>
        </header>
        
        <article className="text-gray-800 leading-relaxed text-lg whitespace-pre-wrap mb-16 prose prose-blue">
          {lesson.content}
        </article>

        <footer className="pt-8 border-t flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-gray-600 font-medium">Have you finished the reading?</p>
            <p className="text-xs text-gray-400">Your progress will be saved automatically.</p>
          </div>
          
          <button 
            onClick={handleComplete}
            disabled={isSaving}
            className={`w-full md:w-64 py-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${
              isSaving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-xl'
            }`}
          >
            {isSaving ? 'Saving...' : 'Mark as Completed'}
          </button>
        </footer>
      </main>
    </div>
  )
}