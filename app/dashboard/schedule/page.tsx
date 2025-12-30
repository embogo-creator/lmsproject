'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function SchedulePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [role, setRole] = useState('student')
  
  // Form State for Admin
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('class')
  const [newDate, setNewDate] = useState('')
  const [newDesc, setNewDesc] = useState('')

  useEffect(() => {
    loadScheduleData()
  }, [])

  const loadScheduleData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('grade, role')
      .eq('id', user.id)
      .single()

    if (profile) {
      setRole(profile.role || 'student')
    }

    // Load Events
    const { data: eventsData } = await supabase
      .from('events')
      .select('*, subjects(title)')
      .order('start_time', { ascending: true })
    
    setEvents(eventsData || [])

    // Load Assignments
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('*, subjects(title)')
      .order('due_date', { ascending: true })

    setAssignments(assignmentsData || [])
    setLoading(false)
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newDate) return alert("Please fill in title and date")

    const { error } = await supabase
      .from('events')
      .insert([{
        title: newTitle,
        type: newType,
        start_time: new Date(newDate).toISOString(),
        description: newDesc
      }])

    if (error) {
      alert("Error: " + error.message)
    } else {
      alert("Event added!")
      setShowForm(false)
      setNewTitle('')
      loadScheduleData() // Refresh list
    }
  }

  // --- UI Helpers ---
  const getEventIcon = (type: string) => {
    const icons: any = { class: '📚', exam: '📝', assignment_due: '📋', holiday: '🎉', general: '📅' }
    return icons[type] || '📅'
  }

  const getEventColor = (type: string) => {
    const colors: any = { 
      class: 'bg-blue-100 text-blue-700', 
      exam: 'bg-red-100 text-red-700', 
      assignment_due: 'bg-orange-100 text-orange-700',
      holiday: 'bg-green-100 text-green-700'
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Combine Items
  const allItems = [
    ...events.map(e => ({ ...e, isEvent: true, date: e.start_time })),
    ...assignments.map(a => ({ ...a, isEvent: false, date: a.due_date, type: 'assignment_due' }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (loading) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between">
          <Link href="/dashboard" className="text-indigo-600 font-bold">← Dashboard</Link>
          <span className="text-gray-400 font-bold uppercase text-xs">Schedule</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900">Schedule</h1>
            <p className="text-gray-600">Upcoming classes and tasks</p>
          </div>

          {/* ADMIN ONLY BUTTON */}
          {role === 'admin' && (
            <button 
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition"
            >
              {showForm ? 'Close Form' : '+ Add Event'}
            </button>
          )}
        </div>

        {/* ADMIN CREATE FORM */}
        {showForm && role === 'admin' && (
          <form onSubmit={handleCreateEvent} className="bg-white p-6 rounded-2xl border-2 border-indigo-100 mb-8 space-y-4 shadow-lg">
            <h2 className="text-xl font-bold">Create New Event</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" placeholder="Event Title" 
                className="p-3 border rounded-xl"
                value={newTitle} onChange={e => setNewTitle(e.target.value)}
              />
              <select 
                className="p-3 border rounded-xl"
                value={newType} onChange={e => setNewType(e.target.value)}
              >
                <option value="class">Class</option>
                <option value="exam">Exam</option>
                <option value="holiday">Holiday</option>
                <option value="general">General</option>
              </select>
              <input 
                type="datetime-local" 
                className="p-3 border rounded-xl"
                value={newDate} onChange={e => setNewDate(e.target.value)}
              />
              <input 
                type="text" placeholder="Description (Optional)" 
                className="p-3 border rounded-xl"
                value={newDesc} onChange={e => setNewDesc(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Save Event to Schedule</button>
          </form>
        )}

        {/* LIST OF ITEMS */}
        <div className="space-y-4">
          {allItems.map((item, idx) => (
            <div key={idx} className={`bg-white p-6 rounded-2xl shadow-sm border ${new Date(item.date) < new Date() ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${getEventColor(item.type)}`}>
                  {getEventIcon(item.type)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="text-sm text-gray-500">{formatDate(item.date)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}