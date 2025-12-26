'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [role, setRole] = useState('student')
  const [userGrade, setUserGrade] = useState('')
  const [subjects, setSubjects] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('All')
  
  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const isResizing = useRef(false)

  // Profile Dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Resizing logic for flexible sidebar
  const startResizing = (e: React.MouseEvent) => {
    if (isCollapsed) return
    isResizing.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)
  }

  const stopResizing = () => {
    isResizing.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResizing)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return
    const newWidth = e.clientX
    if (newWidth > 200 && newWidth < 450) {
      setSidebarWidth(newWidth)
    }
  }

  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [targetGrade, setTargetGrade] = useState('')
  const [newType, setNewType] = useState('lesson')
  const [newUrl, setNewUrl] = useState('')

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase.from('profiles').select('full_name, role, grade').eq('id', user.id).single()

    if (profile) {
      setUserName(profile.full_name)
      setRole(profile.role || 'student')
      setUserGrade(profile.grade || '')
    }

    let query = supabase.from('subjects').select('*').order('title')
    if (profile?.role === 'student') {
      query = query.eq('target_grade', profile.grade)
    }

    const { data: subjectsData } = await query
    
    if (subjectsData) {
      const subjectsWithProgress = await Promise.all(subjectsData.map(async (subject) => {
        const { count: totalLessons } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('subject_id', subject.id)
        const { data: completedData } = await supabase.from('lesson_progress').select('lesson_id, lessons!inner(subject_id)').eq('user_id', user.id).eq('lessons.subject_id', subject.id)
        const completedCount = completedData?.length || 0
        const percentage = totalLessons && totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
        return { ...subject, percentage, completedCount, totalLessons }
      }))
      setSubjects(subjectsWithProgress)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === 'All' || s.target_grade === gradeFilter;
    return matchesSearch && matchesGrade;
  })

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (role !== 'admin') return
    const { error } = await supabase.from('subjects').insert([{ 
      title: newTitle, 
      description: newDesc, 
      target_grade: targetGrade,
      subject_type: newType,
      content_url: newUrl 
    }])
    if (error) alert(error.message)
    else { 
      setNewTitle(''); setNewDesc(''); setTargetGrade(''); 
      setNewType('lesson'); setNewUrl('');
      setShowForm(false); loadData() 
    }
  }

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("Are you sure?")) return
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId)
    if (error) alert(error.message)
    else loadData()
  }

  if (loading) return <div className="p-10 text-center text-black font-bold">Initializing LMS...</div>

  return (
    <div className="flex h-screen bg-gray-50 text-black font-sans relative overflow-hidden">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside 
        style={{ width: isSidebarOpen ? '280px' : (isCollapsed ? '80px' : `${sidebarWidth}px`) }}
        className={`
          fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 flex flex-col transition-all duration-300 lg:translate-x-0 lg:static h-screen
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {!isCollapsed && (
          <div 
            onMouseDown={startResizing}
            className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-indigo-400 transition-colors hidden lg:block"
          />
        )}

        <div className={`p-8 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
              <span className="text-xl">🎓</span>
            </div>
            {!isCollapsed && <h1 className="text-2xl font-bold tracking-tighter text-gray-900 truncate">LearnHub</h1>}
          </div>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
          >
            {isCollapsed ? '➡️' : '⬅️'}
          </button>
          
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 p-2">✕</button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <SidebarItem icon="🏠" label="Dashboard" active collapsed={isCollapsed} />
          <SidebarItem icon="📖" label="My Lessons" collapsed={isCollapsed} />
          <SidebarItem icon="📤" label="Submissions" collapsed={isCollapsed} />
          <SidebarItem icon="📅" label="Schedule" collapsed={isCollapsed} />
          <SidebarItem icon="🔔" label="Notifications" collapsed={isCollapsed} />
        </nav>

        <div className="p-6 border-t border-gray-50 mt-auto shrink-0">
          <SidebarItem icon="⚙️" label="Settings" collapsed={isCollapsed} />
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <nav className="bg-white/80 backdrop-blur-md p-4 flex justify-between items-center border-b sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <span className="text-2xl">☰</span>
            </button>
            
            <div className="relative hidden md:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
              <input 
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-2xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-80 transition-all text-sm"
              />
            </div>
          </div>

          {/* Profile Section with Dropdown */}
          <div className="flex items-center gap-4 relative" ref={dropdownRef}>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-gray-900 leading-tight">{userName}</p>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                {role === 'admin' ? '🛡️ Administrator' : `🎓 ${userGrade}`}
              </p>
            </div>
            
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700 border-2 border-white shadow-sm shrink-0 hover:ring-2 hover:ring-indigo-300 transition-all active:scale-95"
            >
              {userName.charAt(0)}
            </button>

            {/* Login/Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute top-12 right-0 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-gray-50 sm:hidden">
                    <p className="text-xs font-bold text-gray-900">{userName}</p>
                    <p className="text-[9px] text-indigo-500 font-bold uppercase">{userGrade}</p>
                </div>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                  👤 Profile Settings
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                  📊 Performance
                </button>
                <hr className="my-1 border-gray-50" />
                <button 
                  onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold transition-colors flex items-center gap-2"
                >
                  ↪️ Log Out
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-6xl mx-auto">
            {/* ... rest of the dashboard content ... */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-12">
              <div>
                <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-gray-900 mb-2">My Dashboard</h2>
                <p className="text-gray-500 font-medium italic">
                  {role === 'admin' ? `Managing ${subjects.length} active subjects.` : `Continue your progress in ${userGrade}.`}
                </p>
              </div>
              {role === 'admin' && (
                <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap">
                  {showForm ? 'Close Panel' : '+ New Subject'}
                </button>
              )}
            </div>

            {/* Admin Form */}
            {role === 'admin' && showForm && (
              <form onSubmit={handleAddSubject} className="bg-white p-8 rounded-[2.5rem] shadow-xl mb-12 border border-indigo-50 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h3 className="text-xl font-bold mb-6 text-gray-800">New Content Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Title</label>
                      <input placeholder="e.g. Physics" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full border-gray-100 border-2 p-3.5 rounded-2xl outline-none focus:border-indigo-500 bg-gray-50/50" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Level</label>
                      <select value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)} className="w-full border-gray-100 border-2 p-3.5 rounded-2xl outline-none focus:border-indigo-500 bg-gray-50/50" required>
                        <option value="">Select</option>
                        <option value="Grade 10">Grade 10</option>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Format</label>
                      <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full border-gray-100 border-2 p-3.5 rounded-2xl outline-none focus:border-indigo-500 bg-gray-50/50">
                        <option value="lesson">📚 Lesson</option>
                        <option value="video">🎥 Video</option>
                        <option value="live">🔴 Live</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">URL</label>
                      <input placeholder="https://..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="w-full border-gray-100 border-2 p-3.5 rounded-2xl outline-none focus:border-indigo-500 bg-gray-50/50" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition">Create Subject</button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
              {filteredSubjects.map((s) => (
                <div key={s.id} className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col relative group transition-all hover:shadow-2xl hover:-translate-y-2">
                  {role === 'admin' && (
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleDeleteSubject(s.id)} className="bg-red-50 p-2 rounded-xl text-red-600 hover:bg-red-600 hover:text-white transition-colors">🗑️</button>
                    </div>
                  )}
                  
                  <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-3xl mb-6 shadow-inner group-hover:scale-110 transition-transform shrink-0">
                    {s.subject_type === 'video' ? '🎥' : s.subject_type === 'live' ? '🔴' : '📚'}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">{s.title}</h3>
                  <p className="text-gray-500 text-sm mb-8 line-clamp-2">{s.description}</p>

                  <div className="mb-8">
                    <div className="flex justify-between text-[10px] mb-2 text-gray-400 font-black uppercase tracking-widest">
                      <span>Progress</span>
                      <span className="text-gray-900">{s.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden p-0.5">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${s.percentage}%` }} />
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      if (role !== 'admin' && (s.subject_type === 'video' || s.subject_type === 'live') && s.content_url) {
                        window.open(s.content_url, '_blank');
                      } else {
                        router.push(`/subject/${s.id}`);
                      }
                    }} 
                    className={`mt-auto w-full py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 text-white
                      ${role === 'admin' ? 'bg-gray-900 hover:bg-black' : s.subject_type === 'live' ? 'bg-red-600 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}
                    `}
                  >
                    {role === 'admin' ? "Manage" : s.subject_type === 'live' ? "Join Live 🔴" : "View Lessons"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function SidebarItem({ icon, label, active = false, collapsed = false }: { icon: string, label: string, active?: boolean, collapsed?: boolean }) {
  return (
    <div 
      title={collapsed ? label : ''} 
      className={`
        flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all group overflow-hidden
        ${active ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
        ${collapsed ? 'justify-center px-0' : ''}
      `}
    >
      <span className={`text-xl shrink-0 group-hover:scale-110 transition-transform ${active ? 'scale-110' : ''}`}>{icon}</span>
      {!collapsed && <span className="font-bold text-sm tracking-tight whitespace-nowrap">{label}</span>}
    </div>
  )
}