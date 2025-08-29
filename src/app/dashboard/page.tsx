'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUserAndRedirect()
  }, [])

  const checkUserAndRedirect = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // Obține rolul utilizatorului din baza de date
    const { data: userData, error } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (error || !userData) {
      console.error('Error fetching user data:', error)
      router.push('/login')
      return
    }

    // Redirect în funcție de rol
    switch (userData.role) {
      case 'super_admin':
        router.push('/admin')
        break
      case 'admin_company':
        router.push('/company')
        break
      case 'admin_farm':
        router.push('/farm')
        break
      case 'engineer':
        router.push('/engineer')
        break
      default:
        router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Se determină tipul de cont...</p>
        <p className="mt-2 text-sm text-gray-500">Vei fi redirecționat automat</p>
      </div>
    </div>
  )
}
