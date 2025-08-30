'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import CreateCampaignModal from '@/components/modals/CreateCampaignModal'
import CreateActivityModal from '@/components/modals/CreateActivityModal'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true)
  const [isLoadingActivities, setIsLoadingActivities] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modals state
  const [showCreateCampaign, setShowCreateCampaign] = useState(false)
  const [showCreateActivity, setShowCreateActivity] = useState(false)
  const [selectedCampaignForActivity, setSelectedCampaignForActivity] = useState<any>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [farmFilter, setFarmFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  
  // View mode
  const [viewMode, setViewMode] = useState<'campaigns' | 'activities' | 'calendar'>('campaigns')

  useEffect(() => {
    loadCampaigns()
    loadActivities()
  }, [statusFilter, farmFilter, yearFilter, urgencyFilter])

  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true)
    try {
      let url = '/api/campaigns?'
      const params = new URLSearchParams()
      
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (farmFilter !== 'all') params.append('farmId', farmFilter)
      if (yearFilter !== 'all') params.append('year', yearFilter)
      
      const response = await fetch(url + params.toString())
      if (!response.ok) throw new Error('Failed to fetch campaigns')
      
      const data = await response.json()
      setCampaigns(data)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoadingCampaigns(false)
    }
  }

  const loadActivities = async () => {
    setIsLoadingActivities(true)
    try {
      let url = '/api/campaigns/activities?'
      const params = new URLSearchParams()
      
      if (urgencyFilter !== 'all') params.append('urgency', urgencyFilter)
      if (farmFilter !== 'all') params.append('farm_id', farmFilter)
      
      const response = await fetch(url + params.toString())
      if (!response.ok) throw new Error('Failed to fetch activities')
      
      const data = await response.json()
      setActivities(data)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoadingActivities(false)
    }
  }

  const handleCampaignCreated = (newCampaign: any) => {
    setCampaigns(prev => [newCampaign, ...prev])
  }

  const handleActivityCreated = (newActivity: any) => {
    setActivities(prev => [newActivity, ...prev])
  }

  const handleAddActivity = (campaign: any) => {
    setSelectedCampaignForActivity(campaign)
    setShowCreateActivity(true)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      planned: 'bg-blue-100 text-blue-800',
      planted: 'bg-green-100 text-green-800',
      growing: 'bg-yellow-100 text-yellow-800',
      ready_harvest: 'bg-orange-100 text-orange-800',
      harvested: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getActivityUrgencyColor = (urgencyStatus: string) => {
    const colors = {
      overdue: 'bg-red-100 text-red-800 border-red-200',
      today: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      soon: 'bg-blue-100 text-blue-800 border-blue-200',
      normal: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[urgencyStatus as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">🌱 Management Campanii</h1>
            <button
              onClick={() => setShowCreateCampaign(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Campanie Nouă</span>
            </button>
          </div>

          {/* View Mode Tabs */}
          <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewMode('campaigns')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'campaigns' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Campanii
            </button>
            <button
              onClick={() => setViewMode('activities')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'activities' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Activități
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {viewMode === 'campaigns' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">Toate statusurile</option>
                    <option value="planned">Planificată</option>
                    <option value="planted">Plantată</option>
                    <option value="growing">În Creștere</option>
                    <option value="ready_harvest">Gata Recoltare</option>
                    <option value="harvested">Recoltată</option>
                    <option value="completed">Completată</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">An</label>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgență</label>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">Toate</option>
                  <option value="overdue">Întârziate</option>
                  <option value="today">Astăzi</option>
                  <option value="urgent">Urgente</option>
                  <option value="soon">În curând</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Content based on view mode */}
        {viewMode === 'campaigns' && (
          <div className="space-y-6">
            {/* Campaign Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{campaigns.length}</div>
                <div className="text-sm text-gray-600">Total Campanii</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-green-600">
                  {campaigns.filter(c => c.status === 'growing').length}
                </div>
                <div className="text-sm text-gray-600">În Creștere</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-orange-600">
                  {campaigns.filter(c => c.status === 'ready_harvest').length}
                </div>
                <div className="text-sm text-gray-600">Gata Recoltare</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-purple-600">
                  {campaigns.reduce((sum, c) => sum + (c.planted_area || 0), 0).toFixed(1)} ha
                </div>
                <div className="text-sm text-gray-600">Suprafață Totală</div>
              </div>
            </div>

            {/* Campaigns Grid */}
            {isLoadingCampaigns ? (
              <div className="text-center py-8">Se încarcă campaniile...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nu există campanii. Creează prima campanie!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {campaign.status === 'planned' && 'Planificată'}
                        {campaign.status === 'planted' && 'Plantată'}
                        {campaign.status === 'growing' && 'În Creștere'}
                        {campaign.status === 'ready_harvest' && 'Gata Recoltare'}
                        {campaign.status === 'harvested' && 'Recoltată'}
                        {campaign.status === 'completed' && 'Completată'}
                        {campaign.status === 'failed' && 'Eșuată'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex justify-between">
                        <span>Fermă:</span>
                        <span className="font-medium">{campaign.farm?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Parcelă:</span>
                        <span className="font-medium">{campaign.plot?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cultură:</span>
                        <span className="font-medium">{campaign.crop_type?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Suprafață:</span>
                        <span className="font-medium">
                          {(campaign.planted_area || campaign.plot?.calculated_area || 0).toFixed(2)} ha
                        </span>
                      </div>
                      {campaign.planting_date && (
                        <div className="flex justify-between">
                          <span>Plantat:</span>
                          <span className="font-medium">{formatDate(campaign.planting_date)}</span>
                        </div>
                      )}
                      {campaign.expected_harvest_date && (
                        <div className="flex justify-between">
                          <span>Recoltare:</span>
                          <span className="font-medium">{formatDate(campaign.expected_harvest_date)}</span>
                        </div>
                      )}
                    </div>

                    {/* Campaign Stats */}
                    {campaign.stats && (
                      <div className="border-t pt-4 mb-4">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-center">
                            <div className="font-semibold text-red-600">
                              {campaign.stats.totalCosts?.toFixed(0)} RON
                            </div>
                            <div className="text-gray-500">Costuri</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-green-600">
                              {campaign.stats.totalRevenue?.toFixed(0)} RON
                            </div>
                            <div className="text-gray-500">Venituri</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAddActivity(campaign)}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
                      >
                        + Activitate
                      </button>
                      <button
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                      >
                        Detalii
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === 'activities' && (
          <div className="space-y-6">
            {/* Activities Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-red-600">
                  {activities.filter(a => a.urgency_status === 'overdue').length}
                </div>
                <div className="text-sm text-gray-600">Întârziate</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-orange-600">
                  {activities.filter(a => a.urgency_status === 'today').length}
                </div>
                <div className="text-sm text-gray-600">Astăzi</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-yellow-600">
                  {activities.filter(a => a.urgency_status === 'urgent').length}
                </div>
                <div className="text-sm text-gray-600">Urgente</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-blue-600">
                  {activities.filter(a => a.urgency_status === 'soon').length}
                </div>
                <div className="text-sm text-gray-600">În curând</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-green-600">
                  {activities.filter(a => a.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completate</div>
              </div>
            </div>

            {/* Activities List */}
            {isLoadingActivities ? (
              <div className="text-center py-8">Se încarcă activitățile...</div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nu există activități planificate.
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className={`bg-white rounded-lg shadow-sm border-l-4 p-4 ${getActivityUrgencyColor(activity.urgency_status)}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{activity.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            activity.status === 'planned' ? 'bg-blue-100 text-blue-800' :
                            activity.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                            activity.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {activity.status === 'planned' && 'Planificată'}
                            {activity.status === 'in_progress' && 'În progres'}
                            {activity.status === 'completed' && 'Completată'}
                            {activity.status === 'overdue' && 'Întârziată'}
                            {activity.status === 'cancelled' && 'Anulată'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Data:</span>
                            <div>{formatDate(activity.planned_date)}</div>
                          </div>
                          <div>
                            <span className="font-medium">Campanie:</span>
                            <div>{activity.campaign_name}</div>
                          </div>
                          <div>
                            <span className="font-medium">Fermă:</span>
                            <div>{activity.farm_name}</div>
                          </div>
                          <div>
                            <span className="font-medium">Asignat:</span>
                            <div>{activity.assigned_to_name || 'Neasignat'}</div>
                          </div>
                        </div>

                        {activity.description && (
                          <p className="mt-2 text-sm text-gray-600">{activity.description}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                          Editează
                        </button>
                        {activity.status === 'planned' && (
                          <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                            Marchează Completă
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center py-8 text-gray-500">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium mb-2">Calendar Interactiv</h3>
              <p>Această funcționalitate va fi implementată în următoarea versiune.</p>
              <p className="text-sm mt-2">Va include vizualizare calendar cu activități și deadlines.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateCampaignModal
        isOpen={showCreateCampaign}
        onClose={() => setShowCreateCampaign(false)}
        onCampaignCreated={handleCampaignCreated}
      />

      <CreateActivityModal
        isOpen={showCreateActivity}
        onClose={() => {
          setShowCreateActivity(false)
          setSelectedCampaignForActivity(null)
        }}
        onActivityCreated={handleActivityCreated}
        campaignId={selectedCampaignForActivity?.id || ''}
        campaignName={selectedCampaignForActivity?.name}
      />
    </div>
  )
}
