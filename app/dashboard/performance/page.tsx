'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function PerformancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({
    lessons: { total: 0, completed: 0, percentage: 0 },
    quizzes: { total: 0, averageScore: 0, attempts: [] },
    assignments: { total: 0, submitted: 0, averageScore: 0, grades: [] },
    subjects: []
  })
  const [userGrade, setUserGrade] = useState('')

  useEffect(() => {
    loadPerformanceData()
  }, [])

  const loadPerformanceData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('grade')
      .eq('id', user.id)
      .single()

    if (profile?.grade) {
      setUserGrade(profile.grade)
    }

    // Get lessons stats
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, title, target_grade')
      .eq('target_grade', profile?.grade || '')

    let totalLessons = 0
    let completedLessons = 0
    const subjectStats: any[] = []

    if (subjectsData) {
      for (const subject of subjectsData) {
        const { count: lessonCount } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', subject.id)

        const { data: completedData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, lessons!inner(subject_id)')
          .eq('user_id', user.id)
          .eq('lessons.subject_id', subject.id)

        const completed = completedData?.length || 0
        const total = lessonCount || 0
        totalLessons += total
        completedLessons += completed

        subjectStats.push({
          id: subject.id,
          title: subject.title,
          total,
          completed,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        })
      }
    }

    // Get quiz stats
    const { data: quizSubmissions } = await supabase
      .from('quiz_submissions')
      .select('score, quizzes!inner(lessons!inner(subjects!inner(target_grade)))')
      .eq('quizzes.lessons.subjects.target_grade', profile?.grade || '')

    const quizScores = quizSubmissions?.map((qs: any) => qs.score) || []
    const totalQuizzes = quizScores.length
    const averageQuizScore = totalQuizzes > 0
      ? Math.round(quizScores.reduce((a: number, b: number) => a + b, 0) / totalQuizzes)
      : 0

    // Get assignment stats
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('id, max_score, subjects!inner(target_grade)')
      .eq('subjects.target_grade', profile?.grade || '')

    const assignmentIds = assignmentsData?.map(a => a.id) || []
    const { data: submissionsData } = await supabase
      .from('submissions')
      .select('score, assignment_id, assignments!inner(max_score)')
      .eq('user_id', user.id)
      .in('assignment_id', assignmentIds)
      .not('score', 'is', null)

    const assignmentScores = submissionsData?.map((s: any) => ({
      score: s.score,
      maxScore: s.assignments?.max_score
    })) || []

    const totalAssignments = assignmentIds.length
    const submittedAssignments = submissionsData?.length || 0
    const averageAssignmentScore = assignmentScores.length > 0
      ? Math.round(
          assignmentScores.reduce((sum: number, s: any) => {
            const percentage = s.maxScore ? (s.score / s.maxScore) * 100 : s.score
            return sum + percentage
          }, 0) / assignmentScores.length
        )
      : 0

    setStats({
      lessons: {
        total: totalLessons,
        completed: completedLessons,
        percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
      },
      quizzes: {
        total: totalQuizzes,
        averageScore: averageQuizScore,
        attempts: quizScores
      },
      assignments: {
        total: totalAssignments,
        submitted: submittedAssignments,
        averageScore: averageAssignmentScore,
        grades: assignmentScores
      },
      subjects: subjectStats
    })

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-gray-600 font-medium">Loading performance data...</p>
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
          <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">Performance Analytics</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">Performance Dashboard</h1>
          <p className="text-gray-600">Track your learning progress and achievements</p>
        </div>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Lessons Completed"
            value={`${stats.lessons.completed} / ${stats.lessons.total}`}
            percentage={stats.lessons.percentage}
            icon="📚"
            color="indigo"
          />
          <StatCard
            title="Quiz Average"
            value={stats.quizzes.averageScore > 0 ? `${stats.quizzes.averageScore}%` : 'N/A'}
            percentage={stats.quizzes.averageScore}
            icon="📊"
            color="blue"
          />
          <StatCard
            title="Assignment Average"
            value={stats.assignments.averageScore > 0 ? `${stats.assignments.averageScore}%` : 'N/A'}
            percentage={stats.assignments.averageScore}
            icon="✅"
            color="green"
          />
        </div>

        {/* Lessons Progress by Subject */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Progress by Subject</h2>
          <div className="space-y-4">
            {stats.subjects.length > 0 ? (
              stats.subjects.map((subject: any) => (
                <div key={subject.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-900">{subject.title}</h3>
                    <span className="text-sm font-bold text-indigo-600">
                      {subject.completed} / {subject.total} ({subject.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${subject.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No subjects available</p>
            )}
          </div>
        </div>

        {/* Quiz Performance */}
        {stats.quizzes.total > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quiz Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">Total Quizzes Taken</p>
                <p className="text-3xl font-black text-indigo-600">{stats.quizzes.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Average Score</p>
                <p className="text-3xl font-black text-blue-600">{stats.quizzes.averageScore}%</p>
              </div>
            </div>
            {stats.quizzes.attempts.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-bold text-gray-600 mb-3">Recent Scores</p>
                <div className="flex flex-wrap gap-2">
                  {stats.quizzes.attempts.slice(0, 10).map((score: number, index: number) => (
                    <span
                      key={index}
                      className={`px-3 py-1 rounded-lg text-sm font-bold ${
                        score >= 80
                          ? 'bg-green-100 text-green-700'
                          : score >= 60
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {score}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assignment Performance */}
        {stats.assignments.total > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Assignment Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">Total Assignments</p>
                <p className="text-3xl font-black text-gray-900">{stats.assignments.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Submitted</p>
                <p className="text-3xl font-black text-indigo-600">
                  {stats.assignments.submitted} / {stats.assignments.total}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Average Score</p>
                <p className="text-3xl font-black text-green-600">
                  {stats.assignments.averageScore > 0 ? `${stats.assignments.averageScore}%` : 'N/A'}
                </p>
              </div>
            </div>
            {stats.assignments.grades.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-600 mb-3">Grade Distribution</p>
                <div className="space-y-2">
                  {['A', 'B', 'C', 'D', 'F'].map((grade) => {
                    const count = stats.assignments.grades.filter((g: any) => {
                      const percentage = g.maxScore ? (g.score / g.maxScore) * 100 : g.score
                      if (grade === 'A') return percentage >= 90
                      if (grade === 'B') return percentage >= 80 && percentage < 90
                      if (grade === 'C') return percentage >= 70 && percentage < 80
                      if (grade === 'D') return percentage >= 60 && percentage < 70
                      return percentage < 60
                    }).length
                    return (
                      <div key={grade} className="flex items-center gap-3">
                        <span className="w-8 font-bold text-gray-700">{grade}</span>
                        <div className="flex-1 bg-gray-200 h-4 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              grade === 'A' || grade === 'B'
                                ? 'bg-green-500'
                                : grade === 'C'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{
                              width: `${stats.assignments.grades.length > 0 ? (count / stats.assignments.grades.length) * 100 : 0}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-600 w-12 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/lessons"
              className="p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              <div className="text-2xl mb-2">📖</div>
              <p className="font-bold text-gray-900">View My Lessons</p>
              <p className="text-sm text-gray-600">Continue learning</p>
            </Link>
            <Link
              href="/assignments"
              className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <div className="text-2xl mb-2">📝</div>
              <p className="font-bold text-gray-900">My Assignments</p>
              <p className="text-sm text-gray-600">View and submit</p>
            </Link>
            <Link
              href="/dashboard"
              className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
            >
              <div className="text-2xl mb-2">🏠</div>
              <p className="font-bold text-gray-900">Back to Dashboard</p>
              <p className="text-sm text-gray-600">Main menu</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ title, value, percentage, icon, color }: { title: string, value: string, percentage: number, icon: string, color: string }) {
  const colorClasses: { [key: string]: string } = {
    indigo: 'bg-indigo-600',
    blue: 'bg-blue-600',
    green: 'bg-green-600'
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        <span className={`text-2xl font-black ${colorClasses[color]} text-white px-3 py-1 rounded-lg`}>
          {percentage}%
        </span>
      </div>
      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">{title}</h3>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <div className="mt-4 w-full bg-gray-200 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}



