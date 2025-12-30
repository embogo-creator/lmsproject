'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function MyLessonsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [lessons, setLessons] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'completed' | 'incomplete'>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [subjects, setSubjects] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Get user's grade to filter subjects
    const { data: profile } = await supabase
      .from('profiles')
      .select('grade, role')
      .eq('id', user.id)
      .single()

    // Fetch all subjects (or filtered by grade for students)
    let subjectsQuery = supabase.from('subjects').select('id, title').order('title')
    if (profile?.role === 'student' && profile?.grade) {
      subjectsQuery = subjectsQuery.eq('target_grade', profile.grade)
    }

    const { data: subjectsData } = await subjectsQuery
    setSubjects(subjectsData || [])

    // Fetch all lessons with subject info
    let lessonsQuery = supabase
      .from('lessons')
      .select('*, subjects(id, title)')
      .order('created_at', { ascending: true })

    if (profile?.role === 'student' && profile?.grade) {
      lessonsQuery = lessonsQuery.eq('subjects.target_grade', profile.grade)
    }

    const { data: lessonsData } = await lessonsQuery

    // Fetch completed lessons
    const { data: completedData } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', user.id)

    const completedIds = new Set(completedData?.map(c => c.lesson_id) || [])

    // Combine and add completion status
    const lessonsWithStatus = (lessonsData || []).map(lesson => ({
      ...lesson,
      completed: completedIds.has(lesson.id),
      subjectTitle: lesson.subjects?.title || 'Unknown Subject'
    }))

    setLessons(lessonsWithStatus)
    setLoading(false)
  }

  const filteredLessons = lessons.filter(lesson => {
    // Filter by completion status
    if (filter === 'completed' && !lesson.completed) return false
    if (filter === 'incomplete' && lesson.completed) return false

    // Filter by subject
    if (subjectFilter !== 'all' && lesson.subject_id !== subjectFilter) return false

    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-gray-600 font-medium">Loading your lessons...</p>
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
          <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">My Lessons</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 lg:p-10">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">My Lessons</h1>
          <p className="text-gray-600">Track your learning progress across all subjects</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Status
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
              >
                <option value="all">All Lessons</option>
                <option value="completed">Completed</option>
                <option value="incomplete">Incomplete</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Subject
              </label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
              >
                <option value="all">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lessons List */}
        <div className="space-y-4">
          {filteredLessons.length > 0 ? (
            filteredLessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                      lesson.completed ? 'bg-green-500' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {lesson.completed ? '✓' : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {lesson.title}
                        </h3>
                        {lesson.completed && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {lesson.subjectTitle}
                      </p>
                      {lesson.content && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {lesson.content.substring(0, 150)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/lesson/${lesson.id}`)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shrink-0"
                  >
                    {lesson.completed ? 'Review' : 'Start'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No lessons found</h3>
              <p className="text-gray-500">
                {filter === 'all' 
                  ? "You don't have any lessons yet." 
                  : `No ${filter === 'completed' ? 'completed' : 'incomplete'} lessons found.`}
              </p>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        {lessons.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-gray-900">{lessons.length}</div>
              <div className="text-sm text-gray-500 mt-1">Total Lessons</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-green-600">
                {lessons.filter(l => l.completed).length}
              </div>
              <div className="text-sm text-gray-500 mt-1">Completed</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-indigo-600">
                {Math.round((lessons.filter(l => l.completed).length / lessons.length) * 100)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Completion Rate</div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}



