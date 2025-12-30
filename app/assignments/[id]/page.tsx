'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function AssignmentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [assignment, setAssignment] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Fetch assignment
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('assignments')
      .select('*, subjects(title)')
      .eq('id', id)
      .single()

    if (assignmentError) {
      console.error('Error fetching assignment:', assignmentError)
      setLoading(false)
      return
    }

    setAssignment(assignmentData)

    // Fetch existing submission
    const { data: submissionData } = await supabase
      .from('submissions')
      .select('*')
      .eq('assignment_id', id)
      .eq('user_id', user.id)
      .single()

    if (submissionData) {
      setSubmission(submissionData)
      setContent(submissionData.content || '')
    }

    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert('Please enter your submission content')
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    try {
      if (submission) {
        // Update existing submission
        const { error } = await supabase
          .from('submissions')
          .update({
            content: content.trim(),
            submitted_at: new Date().toISOString()
          })
          .eq('id', submission.id)

        if (error) {
          alert(`Error updating submission: ${error.message}`)
        } else {
          alert('Submission updated successfully!')
          loadData()
        }
      } else {
        // Create new submission
        const { error } = await supabase
          .from('submissions')
          .insert([{
            assignment_id: id,
            user_id: user!.id,
            content: content.trim()
          }])

        if (error) {
          alert(`Error submitting: ${error.message}`)
        } else {
          alert('Assignment submitted successfully!')
          loadData()
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while submitting')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-gray-600 font-medium">Loading assignment...</p>
        </div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assignment not found</h2>
          <Link href="/assignments" className="text-indigo-600 hover:underline">
            Back to Assignments
          </Link>
        </div>
      </div>
    )
  }

  const dueDate = new Date(assignment.due_date)
  const isOverdue = !submission && dueDate < new Date()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/assignments" className="text-indigo-600 font-bold hover:underline flex items-center gap-2">
            <span>←</span> Back to Assignments
          </Link>
          <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">Assignment</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-black text-gray-900">{assignment.title}</h1>
            {submission && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                Submitted
              </span>
            )}
            {isOverdue && !submission && (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                Overdue
              </span>
            )}
          </div>
          
          <p className="text-indigo-600 font-medium mb-4">
            {assignment.subjects?.title || 'Unknown Subject'}
          </p>

          {assignment.description && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Instructions</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{assignment.description}</p>
            </div>
          )}

          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div>
              <span className="font-bold">Due Date: </span>
              {dueDate.toLocaleDateString()} {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            {assignment.max_score && (
              <div>
                <span className="font-bold">Max Score: </span>
                {assignment.max_score}
              </div>
            )}
            {submission && submission.submitted_at && (
              <div>
                <span className="font-bold">Submitted: </span>
                {new Date(submission.submitted_at).toLocaleDateString()}
              </div>
            )}
            {submission && submission.score !== null && (
              <div className="text-indigo-600">
                <span className="font-bold">Score: </span>
                {submission.score}{assignment.max_score ? ` / ${assignment.max_score}` : ''}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {submission ? 'Your Submission' : 'Submit Your Work'}
          </h2>
          
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your submission here... You can write your essay, answer questions, or provide any required content."
            rows={15}
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50 font-mono text-sm"
            disabled={!!submission && submission.score !== null}
          />

          {submission && submission.feedback && (
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <h3 className="font-bold text-indigo-900 mb-2">Feedback:</h3>
              <p className="text-indigo-800 whitespace-pre-wrap">{submission.feedback}</p>
            </div>
          )}

          <div className="mt-6 flex gap-4">
            {(!submission || (submission && submission.score === null)) && (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className={`px-8 py-3 rounded-xl font-bold transition-colors ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {saving ? 'Saving...' : submission ? 'Update Submission' : 'Submit Assignment'}
              </button>
            )}
            {submission && submission.score !== null && (
              <div className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">
                Graded - Submission locked
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}



