'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function NotificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    loadNotifications()
  }, [filter])

  const loadNotifications = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filter === 'unread') {
        query = query.eq('read', false)
      }

      const { data, error } = await query
      
      if (error && error.code === '42P01') {
        // Table doesn't exist yet
        setNotifications([])
        setLoading(false)
        return
      }

      setNotifications(data || [])
    } catch (error) {
      // Table might not exist
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (!error) {
      loadNotifications()
    }
  }

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (!error) {
      loadNotifications()
    }
  }

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (!error) {
      loadNotifications()
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-gray-600 font-medium">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="text-indigo-600 font-bold hover:underline flex items-center gap-2">
            <span>←</span> Back to Dashboard
          </Link>
          <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">Notifications</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">Notifications</h1>
            <p className="text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm"
            >
              Mark All Read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-bold transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-xl font-bold transition-colors ${
              filter === 'unread'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white p-5 rounded-2xl shadow-sm border transition-all ${
                  notification.read
                    ? 'border-gray-100 opacity-75'
                    : 'border-indigo-200 bg-indigo-50/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <h3 className={`text-lg font-bold ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-gray-600 text-sm mb-3 ml-10">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 ml-10">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {notification.link && (
                      <Link
                        href={notification.link}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm"
                      >
                        View
                      </Link>
                    )}
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors text-sm"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="px-3 py-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-gray-500">
                {filter === 'unread' 
                  ? 'You\'re all caught up!' 
                  : 'You\'ll see notifications here when there are updates'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function getNotificationIcon(type: string): string {
  const icons: { [key: string]: string } = {
    assignment_new: '📝',
    assignment_due_soon: '⏰',
    assignment_overdue: '⚠️',
    grade_received: '✅',
    quiz_score: '📊',
    lesson_new: '📚',
    general: '🔔'
  }
  return icons[type] || '🔔'
}

