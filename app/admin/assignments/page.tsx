'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function AdminAssignmentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [role, setRole] = useState('student')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [maxScore, setMaxScore] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    checkAuth()
    loadData()
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

  const loadData = async () => {
    setLoading(true)
    
    // Fetch subjects
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, title')
      .order('title')
    
    setSubjects(subjectsData || [])

    // Fetch assignments with subject info and submission counts
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('*, subjects(title)')
      .order('created_at', { ascending: false })

    // Get submission counts for each assignment
    const assignmentsWithCounts = await Promise.all(
      (assignmentsData || []).map(async (assignment) => {
        const { count } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id)

        const { count: gradedCount } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id)
          .not('score', 'is', null)

        return {
          ...assignment,
          submissionCount: count || 0,
          gradedCount: gradedCount || 0
        }
      })
    )

    setAssignments(assignmentsWithCounts)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !subjectId || !dueDate) {
      alert('Please fill in all required fields')
      return
    }

    setSaving(true)

    try {
      const { data: assignmentData, error } = await supabase
        .from('assignments')
        .insert([{
          title: title.trim(),
          description: description.trim(),
          subject_id: subjectId,
          due_date: dueDate,
          max_score: maxScore ? parseInt(maxScore) : null
        }])
        .select()
        .single()

      if (error) {
        alert(`Error creating assignment: ${error.message}`)
      } else {
        // Create notifications for students in the subject's grade
        if (assignmentData) {
          await createAssignmentNotifications(subjectId, title, assignmentData.id)
        }
        
        alert('Assignment created successfully!')
        // Reset form
        setTitle('')
        setDescription('')
        setSubjectId('')
        setDueDate('')
        setMaxScore('')
        setShowForm(false)
        loadData()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while creating the assignment')
    } finally {
      setSaving(false)
    }
  }

  const createAssignmentNotifications = async (subjectId: string, assignmentTitle: string, assignmentId: string) => {
    // Get the subject's target grade
    const { data: subjectData } = await supabase
      .from('subjects')
      .select('target_grade')
      .eq('id', subjectId)
      .single()

    if (!subjectData?.target_grade) return

    // Get all students in that grade
    const { data: students } = await supabase
      .from('profiles')
      .select('id')
      .eq('grade', subjectData.target_grade)
      .eq('role', 'student')

    if (!students || students.length === 0) return

    // Create notifications for all students
    const notifications = students.map(student => ({
      user_id: student.id,
      type: 'assignment_new',
      title: `New Assignment: ${assignmentTitle}`,
      message: 'A new assignment has been created for your grade.',
      link: `/assignments/${assignmentId}`
    }))

    await supabase.from('notifications').insert(notifications)
  }

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)

    if (error) {
      alert(`Error deleting assignment: ${error.message}`)
    } else {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="text-indigo-600 font-bold hover:underline flex items-center gap-2">
            <span>←</span> Back to Dashboard
          </Link>
          <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">Admin: Assignments</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">Manage Assignments</h1>
            <p className="text-gray-600">Create and manage assignments for your students</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ New Assignment'}
          </button>
        </div>

        {/* Create Assignment Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Assignment</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Essay on Climate Change"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Assignment instructions and requirements..."
                  rows={4}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Subject *
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Due Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Max Score
                  </label>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    placeholder="100"
                    min="0"
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className={`w-full py-3 rounded-xl font-bold transition-colors ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {saving ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </form>
        )}

        {/* Assignments List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">All Assignments</h2>
          
          {assignments.length > 0 ? (
            assignments.map(assignment => {
              const dueDate = new Date(assignment.due_date)
              const isOverdue = dueDate < new Date()
              
              return (
                <div
                  key={assignment.id}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{assignment.title}</h3>
                        {isOverdue && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                            Overdue
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
                      <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                        <span>Due: {dueDate.toLocaleDateString()} {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {assignment.max_score && (
                          <span>Max Score: {assignment.max_score}</span>
                        )}
                        {assignment.submissionCount > 0 && (
                          <>
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">
                              {assignment.submissionCount} {assignment.submissionCount === 1 ? 'submission' : 'submissions'}
                            </span>
                            {assignment.gradedCount > 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                                {assignment.gradedCount} graded
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => router.push(`/admin/assignments/${assignment.id}`)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                      >
                        Grade ({assignment.submissionCount || 0})
                      </button>
                      <button
                        onClick={() => handleDelete(assignment.id)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No assignments yet</h3>
              <p className="text-gray-500">Create your first assignment to get started</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

