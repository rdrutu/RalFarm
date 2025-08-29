'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Company {
  id: string
  name: string
  legal_name: string
  cui: string
  address: string
  phone: string
  email: string
  status: 'active' | 'inactive'
  created_at: string
}

interface Farm {
  id: string
  name: string
  location: string
  area_hectares: number
  company_id: string
  created_at: string
}

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: 'admin_company' | 'admin_farm' | 'engineer'
  company_id: string
  created_at: string
}

export default function CompanyDashboard() {
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [farms, setFarms] = useState<Farm[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // Verifică dacă e admin_company
    const { data: userData } = await supabase
      .from('users')
      .select('*, companies(*)')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin_company') {
      router.push('/dashboard')
      return
    }

    setUser(userData)
    setCompany(userData.companies)
    loadDashboardData(userData.company_id)
  }

  const loadDashboardData = async (companyId: string) => {
    setLoading(true)

    // Încarcă fermele companiei
    const { data: farmsData } = await supabase
      .from('farms')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    // Încarcă utilizatorii companiei (exclus admin_company)
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .neq('role', 'admin_company')
      .order('created_at', { ascending: false })

    setFarms(farmsData || [])
    setUsers(usersData || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă dashboard-ul...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                🏢 {company?.name}
              </h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Dashboard Companie
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.first_name} {user?.last_name} - Admin Companie
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <span className="text-2xl">🚜</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Ferme</p>
                <p className="text-2xl font-semibold text-gray-900">{farms.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Utilizatori</p>
                <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <span className="text-2xl">🌾</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Hectare</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {farms.reduce((sum, farm) => sum + farm.area_hectares, 0).toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Campanii Active</p>
                <p className="text-2xl font-semibold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-8">
          <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center">
            <span className="mr-2">🚜</span>
            Adaugă Fermă
          </button>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
            <span className="mr-2">👤</span>
            Adaugă Utilizator
          </button>
          <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center">
            <span className="mr-2">📊</span>
            Planifică Campanie
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Farms List */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Fermele Mele</h2>
            </div>
            
            {farms.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {farms.map((farm) => (
                  <div key={farm.id} className="p-6 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{farm.name}</h3>
                        <p className="text-sm text-gray-500">{farm.location}</p>
                        <p className="text-sm text-gray-600">{farm.area_hectares} hectare</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 px-3 py-1 text-sm rounded">
                          Vizualizează
                        </button>
                        <button className="text-gray-600 hover:text-gray-800 px-3 py-1 text-sm rounded">
                          Editează
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🚜</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nicio fermă</h3>
                <p className="text-gray-500 mb-6">
                  Compania ta nu are încă ferme înregistrate.
                </p>
                <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                  Adaugă Prima Fermă
                </button>
              </div>
            )}
          </div>

          {/* Users List */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Utilizatori</h2>
            </div>
            
            {users.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {users.map((user) => (
                  <div key={user.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                          user.role === 'admin_farm' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'engineer' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 px-3 py-1 text-sm rounded">
                          Editează
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">👥</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Niciun utilizator</h3>
                <p className="text-gray-500 mb-6">
                  Nu ai încă utilizatori în echipa ta.
                </p>
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                  Adaugă Primul Utilizator
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
