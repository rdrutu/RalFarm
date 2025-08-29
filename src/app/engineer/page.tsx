'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Farm {
  id: string
  name: string
  location: string
  area_hectares: number
  company_id: string
}

interface Plot {
  id: string
  name: string
  farm_id: string
  area_hectares: number
  crop_type: string | null
  farms: {
    name: string
  }
}

interface Campaign {
  id: string
  name: string
  type: string
  status: string
  start_date: string
  end_date: string
  plot_id: string
  plots: {
    name: string
    farms: {
      name: string
    }
  }
}

export default function EngineerDashboard() {
  const [user, setUser] = useState<any>(null)
  const [farms, setFarms] = useState<Farm[]>([])
  const [plots, setPlots] = useState<Plot[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
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

    // Verifică dacă e engineer
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'engineer') {
      router.push('/dashboard')
      return
    }

    setUser(userData)
    loadDashboardData(userData.company_id)
  }

  const loadDashboardData = async (companyId: string) => {
    setLoading(true)

    // Încarcă fermele companiei
    const { data: farmsData } = await supabase
      .from('farms')
      .select('*')
      .eq('company_id', companyId)

    // Încarcă parcelele cu informații despre ferme
    const { data: plotsData } = await supabase
      .from('plots')
      .select(`
        *,
        farms!inner (
          name,
          company_id
        )
      `)
      .eq('farms.company_id', companyId)

    // Încarcă campaniile active
    const { data: campaignsData } = await supabase
      .from('campaigns')
      .select(`
        *,
        plots!inner (
          name,
          farms!inner (
            name,
            company_id
          )
        )
      `)
      .eq('plots.farms.company_id', companyId)
      .order('start_date', { ascending: false })

    setFarms(farmsData || [])
    setPlots(plotsData || [])
    setCampaigns(campaignsData || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return 'bg-green-100 text-green-800'
      case 'planned':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
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
                🔧 Dashboard Inginer
              </h1>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                Monitorizare și Raportare
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.first_name} {user?.last_name} - Inginer
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
                <p className="text-sm font-medium text-gray-600">Ferme Monitorizate</p>
                <p className="text-2xl font-semibold text-gray-900">{farms.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <span className="text-2xl">📐</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Parcele Gestionate</p>
                <p className="text-2xl font-semibold text-gray-900">{plots.length}</p>
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
                  {plots.reduce((sum, plot) => sum + plot.area_hectares, 0).toFixed(1)}
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
                <p className="text-2xl font-semibold text-gray-900">
                  {campaigns.filter(c => c.status === 'active' || c.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-8">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
            <span className="mr-2">📊</span>
            Raport Nou
          </button>
          <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center">
            <span className="mr-2">📝</span>
            Înregistrare Activitate
          </button>
          <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center">
            <span className="mr-2">📈</span>
            Vezi Analize
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Active Campaigns */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Campanii în Desfășurare</h2>
            </div>
            
            {campaigns.length > 0 ? (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {campaigns.slice(0, 10).map((campaign) => (
                  <div key={campaign.id} className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">{campaign.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      📐 {campaign.plots?.name} - {campaign.plots?.farms?.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      📅 {new Date(campaign.start_date).toLocaleDateString('ro-RO')} - {new Date(campaign.end_date).toLocaleDateString('ro-RO')}
                    </p>
                    <div className="mt-3 flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded">
                        Vezi Detalii
                      </button>
                      <button className="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded">
                        Actualizează
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">📊</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nicio campanie activă</h3>
                <p className="text-gray-500">
                  Nu există campanii în desfășurare în acest moment.
                </p>
              </div>
            )}
          </div>

          {/* Plots Overview */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Parcele Monitorizate</h2>
            </div>
            
            {plots.length > 0 ? (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {plots.slice(0, 10).map((plot) => (
                  <div key={plot.id} className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{plot.name}</h3>
                        <p className="text-sm text-gray-500">{plot.farms.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{plot.area_hectares} ha</p>
                        {plot.crop_type && (
                          <p className="text-xs text-gray-500">{plot.crop_type}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded">
                        Vezi Progres
                      </button>
                      <button className="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded">
                        Adaugă Observație
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">📐</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nicio parcelă</h3>
                <p className="text-gray-500">
                  Nu ai parcele asignate pentru monitorizare.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistici Rapide</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {campaigns.filter(c => c.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-600">Campanii Finalizate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {campaigns.filter(c => c.status === 'planned').length}
              </p>
              <p className="text-sm text-gray-600">Campanii Planificate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {plots.filter(p => p.crop_type).length}
              </p>
              <p className="text-sm text-gray-600">Parcele cu Culturi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
