'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function AssignmentGradingPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [assignment, setAssignment] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [role, setRole] = useState('student')

  useEffect(() => {
    if (id) {
      checkAuth()
      loadData()
    }
  }, [id])

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

  const loadData = async () => {
    setLoading(true)

    // Fetch assignment
    const { data: assignmentData } = await supabase
      .from('assignments')
      .select('*, subjects(title)')
      .eq('id', id)
      .single()

    setAssignment(assignmentData)

    // Fetch all submissions for this assignment
    const { data: submissionsData } = await supabase
      .from('submissions')
      .select(`
        *,
        profiles:user_id (
          full_name,
          grade
        )
      `)
      .eq('assignment_id', id)
      .order('submitted_at', { ascending: false })

    setSubmissions(submissionsData || [])
    setLoading(false)
  }

  const createGradeNotification = async (userId: string, assignmentTitle: string, score: number, maxScore: number | null) => {
    const notification = {
      user_id: userId,
      type: 'grade_received',
      title: `Grade Received: ${assignmentTitle}`,
      message: `You received a score of ${score}${maxScore ? ` out of ${maxScore}` : ''}.`,
      link: `/assignments/${id}`
    }

    await supabase.from('notifications').insert([notification])
  }

  const handleGrade = async (submissionId: string, score: string, feedback: string) => {
    if (!score || isNaN(parseInt(score))) {
      alert('Please enter a valid score')
      return
    }

    const scoreNum = parseInt(score)
    if (assignment.max_score && scoreNum > assignment.max_score) {
      alert(`Score cannot exceed maximum score of ${assignment.max_score}`)
      return
    }

    const { error } = await supabase
      .from('submissions')
      .update({
        score: scoreNum,
        feedback: feedback.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)

    if (error) {
      alert(`Error updating grade: ${error.message}`)
    } else {
      // Create notification for the student
      await createGradeNotification(submission.user_id, assignment.title, scoreNum, assignment.max_score)
      
      alert('Grade saved successfully!')
      loadData()
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

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assignment not found</h2>
          <Link href="/admin/assignments" className="text-indigo-600 hover:underline">
            Back to Assignments
          </Link>
        </div>
      </div>
    )
  }

  const gradedCount = submissions.filter(s => s.score !== null).length
  const totalSubmissions = submissions.length

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/admin/assignments" className="text-indigo-600 font-bold hover:underline flex items-center gap-2">
            <span>←</span> Back to Assignments
          </Link>
          <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">Grade Submissions</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        {/* Assignment Info */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <h1 className="text-3xl font-black text-gray-900 mb-2">{assignment.title}</h1>
          <p className="text-indigo-600 font-medium mb-4">{assignment.subjects?.title || 'Unknown Subject'}</p>
          
          <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
            <span>
              <span className="font-bold">Due Date: </span>
              {new Date(assignment.due_date).toLocaleDateString()} {new Date(assignment.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {assignment.max_score && (
              <span>
                <span className="font-bold">Max Score: </span>
                {assignment.max_score}
              </span>
            )}
          </div>

          {assignment.description && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <h3 className="font-bold text-gray-900 mb-2">Instructions:</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{assignment.description}</p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-4">
            <div className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl font-bold">
              {totalSubmissions} {totalSubmissions === 1 ? 'Submission' : 'Submissions'}
            </div>
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold">
              {gradedCount} Graded
            </div>
            {totalSubmissions > 0 && (
              <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold">
                {totalSubmissions - gradedCount} Pending
              </div>
            )}
          </div>
        </div>

        {/* Submissions List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Student Submissions</h2>

          {submissions.length > 0 ? (
            submissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                assignment={assignment}
                onGrade={handleGrade}
              />
            ))
          ) : (
            <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No submissions yet</h3>
              <p className="text-gray-500">Students haven't submitted this assignment yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function SubmissionCard({ submission, assignment, onGrade }: { submission: any, assignment: any, onGrade: (id: string, score: string, feedback: string) => void }) {
  const [score, setScore] = useState(submission.score?.toString() || '')
  const [feedback, setFeedback] = useState(submission.feedback || '')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onGrade(submission.id, score, feedback)
    setIsEditing(false)
    setSaving(false)
  }

  const isGraded = submission.score !== null && submission.score !== undefined

  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border transition-all ${
      isGraded ? 'border-green-200 bg-green-50/30' : 'border-gray-100'
    }`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900">
              {submission.profiles?.full_name || 'Unknown Student'}
            </h3>
            {isGraded && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                Graded
              </span>
            )}
            {!isGraded && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                Pending
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-2">
            {submission.profiles?.grade || 'Unknown Grade'}
          </p>
          <p className="text-sm text-gray-500">
            Submitted: {new Date(submission.submitted_at).toLocaleString()}
          </p>
        </div>
        {isGraded && (
          <div className="text-right">
            <div className="text-2xl font-black text-indigo-600">
              {submission.score}{assignment.max_score ? ` / ${assignment.max_score}` : ''}
            </div>
            <div className="text-xs text-gray-500">Score</div>
          </div>
        )}
      </div>

      {/* Submission Content */}
      <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <h4 className="font-bold text-gray-900 mb-2">Submission:</h4>
        <p className="text-gray-700 whitespace-pre-wrap">{submission.content}</p>
      </div>

      {/* Grading Section */}
      {isEditing ? (
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Score {assignment.max_score ? `(Max: ${assignment.max_score})` : ''}
              </label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                min="0"
                max={assignment.max_score || undefined}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-white"
                placeholder="Enter score"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Percentage
              </label>
              <div className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-600">
                {assignment.max_score && score
                  ? `${Math.round((parseInt(score) / assignment.max_score) * 100)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Feedback
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-white"
              placeholder="Provide feedback to the student..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-2 rounded-xl font-bold transition-colors ${
                saving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {saving ? 'Saving...' : 'Save Grade'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setScore(submission.score?.toString() || '')
                setFeedback(submission.feedback || '')
              }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {isGraded && (
            <div className="mb-4">
              {submission.feedback && (
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 mb-3">
                  <h4 className="font-bold text-indigo-900 mb-2">Feedback:</h4>
                  <p className="text-indigo-800 whitespace-pre-wrap">{submission.feedback}</p>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setIsEditing(true)}
            className={`px-6 py-2 rounded-xl font-bold transition-colors ${
              isGraded
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isGraded ? 'Edit Grade' : 'Grade Submission'}
          </button>
        </div>
      )}
    </div>
  )
}

