'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
      }
    }
    checkUser()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <span className="text-xl">🎓</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Elias Learning Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="px-4 py-2 text-gray-700 font-medium hover:text-indigo-600 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-lg transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-6 leading-tight">
            Learn at Your Own Pace
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Access comprehensive lessons, interactive quizzes, and track your progress all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup" 
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1"
            >
              Start Learning Now
            </Link>
            <Link 
              href="/login" 
              className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-lg border-2 border-indigo-600 hover:bg-indigo-50 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Comprehensive Lessons</h3>
            <p className="text-gray-600">
              Access well-structured lessons organized by subjects and grade levels. Learn at your own pace with detailed content.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Interactive Quizzes</h3>
            <p className="text-gray-600">
              Test your knowledge with quizzes after each lesson. Get instant feedback and track your scores over time.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Progress Tracking</h3>
            <p className="text-gray-600">
              Monitor your learning journey with detailed progress tracking. See how far you've come in each subject.
            </p>
          </div>
        </div>

        <div className="mt-20 text-center">
          <p className="text-gray-500 mb-4">Ready to start your learning journey?</p>
          <Link 
            href="/signup" 
            className="inline-block px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-xl transition-all"
          >
            Create Your Account
          </Link>
        </div>
      </main>

      <footer className="border-t bg-white mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
          <p>© 2024 Elias Learning Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
