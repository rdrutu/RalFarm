'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import CreatePlotModal from '@/components/modals/CreatePlotModal'

interface Farm {
  id: string
  name: string
  location: string
  area_hectares?: number
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
  coordinates: any
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

interface User {
  id: string
  full_name: string
  email: string
  role: string
}

export default function FarmManagement() {
  const [user, setUser] = useState<any>(null)
  const [farm, setFarm] = useState<Farm | null>(null)
  const [plots, setPlots] = useState<Plot[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [farmUsers, setFarmUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'plots' | 'campaigns' | 'expenses' | 'users'>('overview')
  const [showCreatePlotModal, setShowCreatePlotModal] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const farmId = searchParams.get('id')
  const editMode = searchParams.get('edit') === 'true'

  useEffect(() => {
    if (farmId) {
      checkAuth()
    } else {
      router.push('/farms')
    }
  }, [farmId])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!userData || !['admin', 'admin_company', 'admin_farm', 'engineer'].includes(userData.role)) {
      router.push('/dashboard')
      return
    }

    setUser(userData)
    await loadFarmData(userData, farmId!)
  }

  const loadFarmData = async (userData: any, farmId: string) => {
    setLoading(true)

    try {
      // Încarcă datele fermei
      const { data: farmData } = await supabase
        .from('farms')
        .select(`
          *,
          companies (
            name
          )
        `)
        .eq('id', farmId)
        .single()

      if (!farmData) {
        router.push('/farms')
        return
      }

      // Verifică permisiunile
      if (userData.role === 'admin_company' && farmData.company_id !== userData.company_id) {
        router.push('/farms')
        return
      }

      if (userData.role === 'admin_farm') {
        const { data: assignment } = await supabase
          .from('user_farm_assignments')
          .select('*')
          .eq('user_id', userData.id)
          .eq('farm_id', farmId)
          .single()

        if (!assignment) {
          router.push('/farms')
          return
        }
      }

      setFarm(farmData)

      // Încarcă parcelele
      const { data: plotsData } = await supabase
        .from('plots')
        .select('*')
        .eq('farm_id', farmId)
        .order('name')

      setPlots(plotsData || [])

      // Încarcă campaniile
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
      setCampaigns(campaignsData)

      // Încarcă cheltuielile
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .eq('farm_id', farmId)
        .order('date', { ascending: false })

      setExpenses(expensesData || [])

      // Încarcă utilizatorii asignați fermei
      const { data: farmUsersData } = await supabase
        .from('user_farm_assignments')
        .select(`
          users (
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('farm_id', farmId)

      const users = farmUsersData?.map((assignment: any) => assignment.users).filter(Boolean) || []
      setFarmUsers(users)

    } catch (error) {
      console.error('Error loading farm data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlotCreated = () => {
    setShowCreatePlotModal(false)
    if (farmId) {
      loadFarmData(user, farmId)
    }
  }

  const calculateTotalArea = () => {
    return plots.reduce((total, plot) => total + plot.area_hectares, 0)
  }

  const getActiveCampaigns = () => {
    return campaigns.filter(campaign => campaign.status === 'active').length
  }

  const getTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0)
  }

  const getCampaignsByStatus = (status: string) => {
    return campaigns.filter(campaign => campaign.status === status)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!farm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ferma nu a fost găsită</h2>
          <button
            onClick={() => router.push('/farms')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Înapoi la lista de ferme
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  // Navighează înapoi în funcție de rolul utilizatorului
                  if (user?.role === 'admin_company') {
                    router.push('/company')
                  } else {
                    router.push('/farms')
                  }
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Înapoi
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">🚜 {farm.name}</h1>
                <p className="text-gray-600 mt-1">
                  📍 {farm.location} • 🏢 {farm.companies.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                👋 {user?.full_name || user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <span className="text-2xl">📍</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Parcele</h3>
                <p className="text-2xl font-semibold text-gray-900">{plots.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <span className="text-2xl">🌾</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Suprafață Totală</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {calculateTotalArea().toFixed(2)} ha
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <span className="text-2xl">🚀</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Campanii Active</h3>
                <p className="text-2xl font-semibold text-gray-900">{getActiveCampaigns()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Cheltuieli Totale</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {getTotalExpenses().toLocaleString()} RON
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: '📊 Generală', count: null },
                { id: 'plots', label: '📍 Parcele', count: plots.length },
                { id: 'campaigns', label: '🚀 Campanii', count: campaigns.length },
                { id: 'expenses', label: '💰 Cheltuieli', count: expenses.length },
                { id: 'users', label: '👥 Echipa', count: farmUsers.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      activeTab === tab.id 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Acțiuni Rapide</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowCreatePlotModal(true)}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">📍</div>
                  <div className="font-medium text-gray-900">Adaugă Parcelă</div>
                  <div className="text-sm text-gray-600">Creează o nouă parcelă</div>
                </button>
                
                <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center">
                  <div className="text-2xl mb-2">🚀</div>
                  <div className="font-medium text-gray-900">Nouă Campanie</div>
                  <div className="text-sm text-gray-600">Planifică activități</div>
                </button>
                
                <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors text-center">
                  <div className="text-2xl mb-2">💰</div>
                  <div className="font-medium text-gray-900">Adaugă Cheltuială</div>
                  <div className="text-sm text-gray-600">Înregistrează costuri</div>
                </button>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Campaigns */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">🚀 Campanii Recente</h3>
                  <button
                    onClick={() => setActiveTab('campaigns')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Vezi toate →
                  </button>
                </div>
                <div className="space-y-3">
                  {campaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-600">{campaign.plots.name}</div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                  ))}
                  {campaigns.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      Nu există campanii încă
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Expenses */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">💰 Cheltuieli Recente</h3>
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Vezi toate →
                  </button>
                </div>
                <div className="space-y-3">
                  {expenses.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{expense.description}</div>
                        <div className="text-sm text-gray-600">{expense.expense_type}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{expense.amount.toLocaleString()} RON</div>
                        <div className="text-sm text-gray-600">{new Date(expense.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                  {expenses.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      Nu există cheltuieli încă
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plots' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">📍 Parcele</h2>
              <button
                onClick={() => setShowCreatePlotModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Parcelă Nouă</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plots.map((plot) => (
                <div key={plot.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {plot.name}
                        </h3>
                        {plot.crop_type && (
                          <p className="text-sm text-gray-600 mb-2">
                            🌱 {plot.crop_type}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Suprafață:</span>
                        <span className="font-medium text-gray-900">
                          {plot.area_hectares.toFixed(4)} ha
                        </span>
                      </div>
                      {plot.coordinates && (
                        <div className="text-xs text-gray-500">
                          📍 Coordonate definite
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {plots.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nu există parcele
                </h3>
                <p className="text-gray-600 mb-6">
                  Adaugă prima parcelă la această fermă.
                </p>
                <button
                  onClick={() => setShowCreatePlotModal(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  ➕ Creează Prima Parcelă
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">🚀 Campanii</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <span>➕</span>
                <span>Campanie Nouă</span>
              </button>
            </div>

            {/* Campaign Status Filters */}
            <div className="flex space-x-4">
              {['all', 'active', 'completed', 'planned'].map((status) => (
                <button
                  key={status}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    status === 'all' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'Toate' : 
                   status === 'active' ? 'Active' :
                   status === 'completed' ? 'Finalizate' : 'Planificate'}
                  <span className="ml-2">
                    ({status === 'all' ? campaigns.length : getCampaignsByStatus(status).length})
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                          campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">📍 {campaign.plots.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {campaign.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {campaigns.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🚀</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nu există campanii
                </h3>
                <p className="text-gray-600 mb-6">
                  Creează prima campanie pentru a începe planificarea activităților.
                </p>
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                  ➕ Creează Prima Campanie
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">💰 Cheltuieli</h2>
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2">
                <span>➕</span>
                <span>Cheltuială Nouă</span>
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descriere
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tip
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sumă
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {expense.expense_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.amount.toLocaleString()} RON
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {expenses.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">💰</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nu există cheltuieli
                </h3>
                <p className="text-gray-600 mb-6">
                  Începe să înregistrezi cheltuielile pentru a avea un control financiar complet.
                </p>
                <button className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">
                  ➕ Adaugă Prima Cheltuială
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">👥 Echipa Fermei</h2>
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
                <span>➕</span>
                <span>Asignează Utilizator</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {farmUsers.map((farmUser) => (
                <div key={farmUser.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xl">👤</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{farmUser.full_name}</h3>
                      <p className="text-sm text-gray-600">{farmUser.email}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        farmUser.role === 'admin_farm' ? 'bg-blue-100 text-blue-800' :
                        farmUser.role === 'engineer' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {farmUser.role}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {farmUsers.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nu există utilizatori asignați
                </h3>
                <p className="text-gray-600 mb-6">
                  Asignează utilizatori pentru a gestiona această fermă.
                </p>
                <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors">
                  ➕ Asignează Primul Utilizator
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreatePlotModal && farm && (
        <CreatePlotModal
          isOpen={showCreatePlotModal}
          onClose={() => setShowCreatePlotModal(false)}
          onSuccess={handlePlotCreated}
          farmId={farm.id}
          farmName={farm.name}
        />
      )}
    </div>
  )
}
