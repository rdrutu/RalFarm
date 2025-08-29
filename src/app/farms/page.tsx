'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CreateFarmModal from '@/components/modals/CreateFarmModal'
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

interface Company {
  id: string
  name: string
}

export default function FarmManagement() {
  const [user, setUser] = useState<any>(null)
  const [farms, setFarms] = useState<Farm[]>([])
  const [plots, setPlots] = useState<Plot[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateFarmModal, setShowCreateFarmModal] = useState(false)
  const [showCreatePlotModal, setShowCreatePlotModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'farms' | 'plots'>('farms')
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

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!userData || !['admin', 'admin_company', 'admin_farm'].includes(userData.role)) {
      router.push('/dashboard')
      return
    }

    setUser(userData)
    loadData(userData)
  }

  const loadData = async (userData: any) => {
    setLoading(true)

    try {
      // Încarcă companiile (pentru admin global) sau doar compania curentă
      let companiesQuery = supabase.from('companies').select('*')
      
      if (userData.role === 'admin_company' && userData.company_id) {
        companiesQuery = companiesQuery.eq('id', userData.company_id)
      }
      
      const { data: companiesData } = await companiesQuery
      setCompanies(companiesData || [])

      // Încarcă fermele
      let farmsQuery = supabase
        .from('farms')
        .select(`
          *,
          companies (
            name
          )
        `)
        .order('name')

      if (userData.role === 'admin_company' && userData.company_id) {
        farmsQuery = farmsQuery.eq('company_id', userData.company_id)
      } else if (userData.role === 'admin_farm') {
        // Pentru admin_farm, încarcă doar fermele asignate
        const { data: assignments } = await supabase
          .from('user_farm_assignments')
          .select('farm_id')
          .eq('user_id', userData.id)
        
        const farmIds = assignments?.map(a => a.farm_id) || []
        if (farmIds.length > 0) {
          farmsQuery = farmsQuery.in('id', farmIds)
        } else {
          setFarms([])
          setLoading(false)
          return
        }
      }

      const { data: farmsData } = await farmsQuery
      setFarms(farmsData || [])

      // Încarcă toate parcelele pentru toate fermele
      if (farmsData && farmsData.length > 0) {
        const farmIds = farmsData.map(farm => farm.id)
        
        const { data: allPlotsData } = await supabase
          .from('plots')
          .select('*')
          .in('farm_id', farmIds)
          .order('name')

        setPlots(allPlotsData || [])
        
        // Setează prima fermă ca selectată pentru tab-ul parcele
        const firstFarmId = farmsData[0].id
        setSelectedFarmId(firstFarmId)
      }

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPlotsForFarm = async (farmId: string) => {
    // Nu mai face cerere la server, doar filtrează parcelele deja încărcate
    // Parcelele sunt deja încărcate în loadData()
    setSelectedFarmId(farmId)
  }

  const calculateTotalArea = (farmId: string) => {
    const farmPlots = plots.filter(plot => plot.farm_id === farmId)
    return farmPlots.reduce((total, plot) => {
      const area = plot.area_hectares || 0
      return total + area
    }, 0)
  }

  const handleFarmCreated = () => {
    setShowCreateFarmModal(false)
    // Reîncarcă datele pentru a afișa noua fermă
    loadData(user)
  }

  const handlePlotCreated = () => {
    setShowCreatePlotModal(false)
    // Reîncarcă parcelele pentru ferma curentă
    if (selectedFarmId) {
      loadPlotsForFarm(selectedFarmId)
    }
    // Refresh farms to update calculated areas
    loadData(user)
  }

  const handleDeleteFarm = async (farmId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi această fermă? Toate parcelele asociate vor fi șterse.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('farms')
        .delete()
        .eq('id', farmId)

      if (error) throw error

      setFarms(prev => prev.filter(farm => farm.id !== farmId))
      if (selectedFarmId === farmId) {
        setSelectedFarmId(null)
        setPlots([])
      }
    } catch (error) {
      console.error('Error deleting farm:', error)
      alert('Eroare la ștergerea fermei')
    }
  }

  const handleDeletePlot = async (plotId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi această parcelă?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('plots')
        .delete()
        .eq('id', plotId)

      if (error) throw error

      setPlots(prev => prev.filter(plot => plot.id !== plotId))
      
      // Refresh farms to update calculated areas
      loadData(user)
    } catch (error) {
      console.error('Error deleting plot:', error)
      alert('Eroare la ștergerea parcelei')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🌾 Gestionare Ferme</h1>
              <p className="text-gray-600 mt-1">
                Administrează fermele și parcelele din sistem
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                👋 Bună, {user?.full_name || user?.email}
              </span>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('farms')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'farms'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏛️ Ferme ({farms.length})
              </button>
              <button
                onClick={() => setActiveTab('plots')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'plots'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📍 Parcele ({plots.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Farms Tab */}
        {activeTab === 'farms' && (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">Lista Ferme</h2>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Total: {farms.length} ferme
                </span>
              </div>
              {(user?.role === 'admin' || user?.role === 'admin_company') && (
                <button
                  onClick={() => setShowCreateFarmModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <span>➕</span>
                  <span>Fermă Nouă</span>
                </button>
              )}
            </div>

            {/* Farms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {farms.map((farm) => {
                const totalArea = calculateTotalArea(farm.id)
                return (
                  <div key={farm.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {farm.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            📍 {farm.location}
                          </p>
                          <p className="text-sm text-gray-600">
                            🏢 {farm.companies.name}
                          </p>
                        </div>
                        {(user?.role === 'admin' || user?.role === 'admin_company') && (
                          <button
                            onClick={() => handleDeleteFarm(farm.id)}
                            className="text-red-600 hover:text-red-800 transition-colors p-1"
                            title="Șterge ferma"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Suprafață totală:</span>
                          <span className="font-medium text-gray-900">
                            {(totalArea || 0).toFixed(2)} ha
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Parcele:</span>
                          <span className="font-medium text-gray-900">
                            {plots.filter(plot => plot.farm_id === farm.id).length}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                        <button
                          onClick={() => router.push(`/farm-management?id=${farm.id}`)}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          🚜 Gestionează Ferma
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFarmId(farm.id)
                            loadPlotsForFarm(farm.id)
                            setActiveTab('plots')
                          }}
                          className="w-full bg-gray-50 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                        >
                          👁️ Vezi Parcele
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {farms.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🌾</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nu există ferme
                </h3>
                <p className="text-gray-600 mb-6">
                  Începe prin a crea prima fermă din sistem.
                </p>
                {(user?.role === 'admin' || user?.role === 'admin_company') && (
                  <button
                    onClick={() => setShowCreateFarmModal(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    ➕ Creează Prima Fermă
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Plots Tab */}
        {activeTab === 'plots' && (
          <div className="space-y-6">
            {/* Farm Selector & Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">Parcele</h2>
                {farms.length > 0 && (
                  <select
                    value={selectedFarmId || ''}
                    onChange={(e) => {
                      const farmId = e.target.value
                      setSelectedFarmId(farmId)
                      loadPlotsForFarm(farmId)
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {farms.map((farm) => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name} - {farm.location}
                      </option>
                    ))}
                  </select>
                )}
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedFarmId ? plots.filter(plot => plot.farm_id === selectedFarmId).length : 0} parcele
                </span>
              </div>
              {selectedFarmId && (
                <button
                  onClick={() => setShowCreatePlotModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <span>➕</span>
                  <span>Parcelă Nouă</span>
                </button>
              )}
            </div>

            {/* Plots Grid */}
            {selectedFarmId && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plots.filter(plot => plot.farm_id === selectedFarmId).map((plot) => (
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
                        <button
                          onClick={() => handleDeletePlot(plot.id)}
                          className="text-red-600 hover:text-red-800 transition-colors p-1"
                          title="Șterge parcela"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Suprafață:</span>
                          <span className="font-medium text-gray-900">
                            {(plot.area_hectares || 0).toFixed(4)} ha
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
            )}

            {plots.filter(plot => plot.farm_id === selectedFarmId).length === 0 && selectedFarmId && (
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

            {!selectedFarmId && farms.length > 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🏛️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Selectează o fermă
                </h3>
                <p className="text-gray-600">
                  Alege o fermă din lista de mai sus pentru a vedea parcelele.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateFarmModal && companies.length > 0 && (
        <CreateFarmModal
          isOpen={showCreateFarmModal}
          onClose={() => setShowCreateFarmModal(false)}
          onSuccess={handleFarmCreated}
          companyId={user?.role === 'admin_company' ? user.company_id : companies[0]?.id || ''}
        />
      )}

      {showCreatePlotModal && selectedFarmId && (
        <CreatePlotModal
          isOpen={showCreatePlotModal}
          onClose={() => setShowCreatePlotModal(false)}
          onSuccess={handlePlotCreated}
          farmId={selectedFarmId}
          farmName={farms.find(f => f.id === selectedFarmId)?.name || ''}
        />
      )}
    </div>
  )
}
