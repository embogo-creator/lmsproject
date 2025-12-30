'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function AssignmentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<any[]>([])
  const [userGrade, setUserGrade] = useState('')

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

    // Get user's grade
    const { data: profile } = await supabase
      .from('profiles')
      .select('grade')
      .eq('id', user.id)
      .single()

    if (profile?.grade) {
      setUserGrade(profile.grade)
    }

    // Fetch assignments for user's grade
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*, subjects(title, target_grade)')
      .eq('subjects.target_grade', profile?.grade || '')
      .order('due_date', { ascending: true })

    if (assignmentsError && assignmentsError.code === '42P01') {
      // Table doesn't exist yet
      setAssignments([])
      setLoading(false)
      return
    }

    // Fetch user's submissions
    const { data: submissionsData, error: submissionsError } = await supabase
      .from('submissions')
      .select('assignment_id, submitted_at, score')
      .eq('user_id', user.id)

    if (submissionsError && submissionsError.code === '42P01') {
      // Table doesn't exist yet - continue without submission data
    }

    const submissionsMap = new Map(
      submissionsData?.map(s => [s.assignment_id, s]) || []
    )

    // Combine assignments with submission status
    const assignmentsWithStatus = (assignmentsData || []).map(assignment => {
      const submission = submissionsMap.get(assignment.id)
      return {
        ...assignment,
        submitted: !!submission,
        submissionDate: submission?.submitted_at,
        score: submission?.score
      }
    })

    setAssignments(assignmentsWithStatus)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-gray-600 font-medium">Loading assignments...</p>
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
          <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">My Assignments</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">My Assignments</h1>
          <p className="text-gray-600">View and submit your assignments</p>
        </div>

        <div className="space-y-4">
          {assignments.length > 0 ? (
            assignments.map(assignment => {
              const dueDate = new Date(assignment.due_date)
              const isOverdue = !assignment.submitted && dueDate < new Date()
              const isDueSoon = !assignment.submitted && dueDate < new Date(Date.now() + 24 * 60 * 60 * 1000)

              return (
                <div
                  key={assignment.id}
                  className={`bg-white p-6 rounded-2xl shadow-sm border transition-all hover:shadow-md ${
                    isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold text-gray-900">{assignment.title}</h3>
                        {assignment.submitted ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                            Submitted
                          </span>
                        ) : isOverdue ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                            Overdue
                          </span>
                        ) : isDueSoon ? (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                            Due Soon
                          </span>
                        ) : null}
                        {assignment.score !== null && assignment.score !== undefined && (
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                            Score: {assignment.score}{assignment.max_score ? ` / ${assignment.max_score}` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-indigo-600 font-medium mb-2">
                        {assignment.subjects?.title || 'Unknown Subject'}
                      </p>
                      {assignment.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          Due: {dueDate.toLocaleDateString()} {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {assignment.max_score && (
                          <span>Max Score: {assignment.max_score}</span>
                        )}
                        {assignment.submitted && assignment.submissionDate && (
                          <span className="text-green-600">
                            Submitted: {new Date(assignment.submissionDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/assignments/${assignment.id}`)}
                      className={`px-6 py-3 rounded-xl font-bold transition-colors shrink-0 ${
                        assignment.submitted
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {assignment.submitted ? 'View' : 'Submit'}
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No assignments available</h3>
              <p className="text-gray-500">Your teacher hasn't assigned any work yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

