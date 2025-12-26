'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import Link from 'next/link'

export default function SubjectLessonsPage() {
  const { id } = useParams()
  const router = useRouter()
  
  const [subject, setSubject] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('student') // New: Track user role

  // Form State for new lessons
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')

  const fetchSubjectData = async () => {
    setLoading(true)

    // 1. Get User and Role
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile) setRole(profile.role || 'student')
    }

    // 2. Fetch Subject Info
    const { data: subData } = await supabase.from('subjects').select('*').eq('id', id).single()
    
    // 3. Fetch Lessons for this subject
    const { data: lesData } = await supabase.from('lessons').select('*').eq('subject_id', id).order('created_at', { ascending: true })

    setSubject(subData)
    setLessons(lesData || [])
    setLoading(false)
  }

  useEffect(() => {
    if (id) fetchSubjectData()
  }, [id])

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Security check: Only allow if admin
    if (role !== 'admin') {
      alert("Unauthorized: Only admins can add lessons.")
      return
    }

    const { error } = await supabase
      .from('lessons')
      .insert([{ 
        title: newTitle, 
        content: newContent, 
        subject_id: id 
      }])

    if (error) {
      alert(error.message)
    } else {
      setNewTitle('')
      setNewContent('')
      setShowForm(false)
      fetchSubjectData() 
    }
  }

  if (loading) return <div className="p-10 text-center text-black">Loading lessons...</div>

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <nav className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <Link href="/dashboard" className="text-blue-600 font-bold hover:underline">← Back to Dashboard</Link>
        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">
          {role === 'admin' ? '🛡️ Admin View' : 'Subject View'}
        </span>
      </nav>

      <main className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">{subject?.title}</h1>
            <p className="text-gray-600 text-lg">{subject?.description}</p>
          </div>
          
          {/* Only Admins see the Add Lesson button */}
          {role === 'admin' && (
            <button 
              onClick={() => setShowForm(!showForm)}
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800"
            >
              {showForm ? 'Cancel' : '+ Add Lesson'}
            </button>
          )}
        </div>

        {/* Only Admins see the Add Lesson form */}
        {role === 'admin' && showForm && (
          <form onSubmit={handleAddLesson} className="bg-blue-50 p-6 rounded-2xl mb-10 border-2 border-blue-100 shadow-inner">
            <h3 className="font-bold mb-4">New Lesson for {subject?.title}</h3>
            <input 
              className="w-full p-3 rounded-lg mb-4 border focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Lesson Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />
            <textarea 
              className="w-full p-3 rounded-lg mb-4 border h-40 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Lesson Content..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">
              Publish Lesson
            </button>
          </form>
        )}

        <div className="grid gap-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Curriculum</h2>
          {lessons.length > 0 ? (
            lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => router.push(`/lesson/${lesson.id}`)}
                className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                    {index + 1}
                  </div>
                  <span className="font-bold text-lg group-hover:text-blue-600">{lesson.title}</span>
                </div>
                <div className="text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Read Lesson →
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400">No lessons created yet for this subject.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}