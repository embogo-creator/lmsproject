'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [grade, setGrade] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 1. Create the User in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      alert(authError.message)
    } else if (authData.user) {
      // 2. Create the Profile Entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { 
            id: authData.user.id, 
            full_name: fullName, 
            grade: grade,
            role: 'student' // Forces the 'student' role by default
          }
        ])

      if (profileError) {
        alert("Account created, but profile setup failed: " + profileError.message)
      } else {
        alert("Welcome! You are now registered as a student.")
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-gray-100">
        <h2 className="text-3xl font-black text-blue-600 mb-2">Join the LMS 🎓</h2>
        <p className="text-gray-500 mb-8 font-medium">Create your student account to start learning.</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Full Name</label>
            <input 
              type="text" required className="w-full p-3 mt-1 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="E.g., John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Grade / Level</label>
            <select 
              required className="w-full p-3 mt-1 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={grade} onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">Select your Grade</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Email Address</label>
            <input 
              type="email" required className="w-full p-3 mt-1 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="student@school.com" value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Password</label>
            <input 
              type="password" required className="w-full p-3 mt-1 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up as Student'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500 font-medium">
          Already have an account? <Link href="/login" className="text-blue-600 font-bold hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  )
}