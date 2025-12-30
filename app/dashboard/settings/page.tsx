'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  
  // Form states
  const [fullName, setFullName] = useState('')
  const [grade, setGrade] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        router.push('/login')
        return
      }

      setUser(authUser)
      setEmail(authUser.email || '')

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, grade, role')
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
        // Continue with default values
        setProfile({ full_name: '', grade: '', role: 'student' })
      } else if (profileData) {
        setProfile(profileData)
        setFullName(profileData.full_name || '')
        setGrade(profileData.grade || '')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      // Set default values on error
      setProfile({ full_name: '', grade: '', role: 'student' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (!user) {
      setMessage({ type: 'error', text: 'User not found. Please log in again.' })
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          grade: grade
        })
        .eq('id', user.id)

      if (error) {
        if (error.code === '42P01') {
          setMessage({ type: 'error', text: 'Profiles table not found. Please contact administrator.' })
        } else {
          setMessage({ type: 'error', text: `Error updating profile: ${error.message}` })
        }
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        // Reload profile data
        setTimeout(() => loadUserData(), 500)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message || 'Failed to update profile'}` })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    // Validation
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in new password fields' })
      setSaving(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      setSaving(false)
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      setSaving(false)
      return
    }

    try {
      // Update password (Supabase doesn't require current password for updateUser)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setMessage({ type: 'error', text: `Error changing password: ${error.message}` })
      } else {
        setMessage({ type: 'success', text: 'Password changed successfully!' })
        // Clear password fields
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message || 'Failed to change password'}` })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-gray-600 font-medium">Loading settings...</p>
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
          <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">Settings</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Profile Settings */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Information</h2>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {profile?.role === 'student' && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Grade
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
                  required
                >
                  <option value="">Select Grade</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>
            )}

            {profile?.role === 'admin' && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Role
                </label>
                <input
                  type="text"
                  value="Administrator"
                  disabled
                  className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`w-full py-3 rounded-xl font-bold transition-colors ${
                saving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {saving ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Password Change */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h2>
          
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
                placeholder="Enter new password (min 6 characters)"
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none bg-gray-50"
                placeholder="Confirm new password"
                minLength={6}
              />
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
              {saving ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Account Info */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600 font-medium">User ID</span>
              <span className="text-gray-900 font-mono text-sm">{user?.id}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Account Created</span>
              <span className="text-gray-900">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600 font-medium">Role</span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                {profile?.role === 'admin' ? 'Administrator' : 'Student'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

