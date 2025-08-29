'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Utilizatorul este autentificat, redirecționează la dashboard
      router.push('/dashboard')
    } else {
      // Utilizatorul nu este autentificat, redirecționează la login
      router.push('/login')
    }
  }

  // Loading state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🌾</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">RalFarm</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Se încarcă...</p>
      </div>
    </div>
  )
}

