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
  companies: {
    name: string
  }
}

interface Plot {
  id: string
  name: string
  farm_id: string
  area_hectares: number
  crop_type: string | null
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
  }
}

interface Expense {
  id: string
  description: string
  amount: number
  expense_type: string
  date: string
  farm_id: string
}

export default function FarmAdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [assignedFarms, setAssignedFarms] = useState<Farm[]>([])
  const [plots, setPlots] = useState<Plot[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
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

    // Verifică dacă e admin_farm
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin_farm') {
      router.push('/dashboard')
      return
    }

    setUser(userData)
    loadDashboardData(userData.id)
  }

  const loadDashboardData = async (userId: string) => {
    setLoading(true)

    // Încarcă fermele asignate utilizatorului
    const { data: farmsData } = await supabase
      .from('user_farm_assignments')
      .select(`
        farms!inner (
          *,
          companies (
            name
          )
        )
      `)
      .eq('user_id', userId)

    const farms = farmsData?.map((assignment: any) => assignment.farms).filter(Boolean) || []

    // Încarcă parcelele din fermele asignate
    const farmIds = farms.map((farm: any) => farm.id)
    
    if (farmIds.length > 0) {
      const { data: plotsData } = await supabase
        .from('plots')
        .select('*')
        .in('farm_id', farmIds)

      // Încarcă campaniile pentru parcelele din fermele asignate
      const plotIds = plotsData?.map(plot => plot.id) || []
      
      let campaignsData = []
      if (plotIds.length > 0) {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select(`
            *,
            plots (
              name
            )
          `)
          .in('plot_id', plotIds)
          .order('start_date', { ascending: false })
        
        campaignsData = campaigns || []
      }

      // Încarcă cheltuielile pentru fermele asignate
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .in('farm_id', farmIds)
        .order('date', { ascending: false })

      setPlots(plotsData || [])
      setCampaigns(campaignsData)
      setExpenses(expensesData || [])
    }

    setAssignedFarms(farms as Farm[])
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

  const getTotalBudget = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
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
                🚜 Dashboard Admin Fermă
              </h1>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                Gestiune Operațională
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.first_name} {user?.last_name} - Admin Fermă
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
              <div className="p-3 rounded-full bg-purple-100">
                <span className="text-2xl">🚜</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ferme Gestionate</p>
                <p className="text-2xl font-semibold text-gray-900">{assignedFarms.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <span className="text-2xl">📐</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Parcele</p>
                <p className="text-2xl font-semibold text-gray-900">{plots.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
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
              <div className="p-3 rounded-full bg-yellow-100">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Buget Total</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {getTotalBudget().toLocaleString('ro-RO')} RON
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-8">
          <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center">
            <span className="mr-2">📊</span>
            Nouă Campanie
          </button>
          <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center">
            <span className="mr-2">📐</span>
            Adaugă Parcelă
          </button>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
            <span className="mr-2">💰</span>
            Înregistrează Cheltuială
          </button>
          <button className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center">
            <span className="mr-2">📈</span>
            Vezi Rapoarte
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Assigned Farms */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Fermele Tale</h2>
            </div>
            
            {assignedFarms.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {assignedFarms.map((farm) => (
                  <div key={farm.id} className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">{farm.name}</h3>
                      <span className="text-sm text-gray-500">{farm.area_hectares} ha</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      📍 {farm.location}
                    </p>
                    <p className="text-sm text-gray-500">
                      🏢 {farm.companies?.name}
                    </p>
                    <div className="mt-3 flex space-x-2">
                      <button className="text-purple-600 hover:text-purple-800 text-xs px-2 py-1 rounded">
                        Vezi Detalii
                      </button>
                      <button className="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded">
                        Gestionsază
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🚜</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nicio fermă asignată</h3>
                <p className="text-gray-500">
                  Nu ai ferme asignate pentru gestionare.
                </p>
              </div>
            )}
          </div>

          {/* Active Campaigns */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Campanii Active</h2>
            </div>
            
            {campaigns.length > 0 ? (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {campaigns.filter(c => c.status === 'active' || c.status === 'in_progress').slice(0, 8).map((campaign) => (
                  <div key={campaign.id} className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">{campaign.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      📐 {campaign.plots?.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      📅 {new Date(campaign.start_date).toLocaleDateString('ro-RO')} - {new Date(campaign.end_date).toLocaleDateString('ro-RO')}
                    </p>
                    <div className="mt-3 flex space-x-2">
                      <button className="text-purple-600 hover:text-purple-800 text-xs px-2 py-1 rounded">
                        Monitorizează
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
                  Nu există campanii în desfășurare în fermele tale.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Expenses & Plot Summary */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
          {/* Recent Expenses */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Cheltuieli Recente</h2>
            </div>
            
            {expenses.length > 0 ? (
              <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
                {expenses.slice(0, 6).map((expense) => (
                  <div key={expense.id} className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">{expense.description}</h3>
                      <span className="text-sm font-medium text-gray-900">
                        {expense.amount.toLocaleString('ro-RO')} RON
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      🏷️ {expense.expense_type}
                    </p>
                    <p className="text-sm text-gray-500">
                      📅 {new Date(expense.date).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">💰</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nicio cheltuială</h3>
                <p className="text-gray-500">
                  Nu există cheltuieli înregistrate.
                </p>
              </div>
            )}
          </div>

          {/* Plot Summary */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Rezumat Parcele</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {plots.filter(p => p.crop_type).length}
                  </p>
                  <p className="text-sm text-gray-600">Cu Culturi</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {plots.filter(p => !p.crop_type).length}
                  </p>
                  <p className="text-sm text-gray-600">Disponibile</p>
                </div>
              </div>
              
              {plots.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {plots.slice(0, 5).map((plot) => (
                    <div key={plot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{plot.name}</p>
                        <p className="text-xs text-gray-500">
                          {plot.crop_type || 'Disponibilă'}
                        </p>
                      </div>
                      <span className="text-sm text-gray-600">{plot.area_hectares} ha</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="text-4xl mb-2 block">📐</span>
                  <p className="text-gray-500 text-sm">Nicio parcelă disponibilă</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
