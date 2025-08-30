'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import CreateActivityModal from '@/components/modals/CreateActivityModal';

interface Activity {
  id: string;
  name: string;
  description?: string;
  activity_type: string;
  planned_date: string;
  actual_date?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  urgency_status?: 'overdue' | 'today' | 'urgent' | 'soon' | 'normal';
  campaign_id: string;
  planned_cost_ron?: number;
  actual_cost_ron?: number;
  planned_area_ha?: number;
  actual_area_ha?: number;
  planned_quantity?: number;
  actual_quantity?: number;
  planned_unit?: string;
  operator_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  campaign?: {
    id: string;
    name: string;
    crop_type: string;
    status: string;
    farms?: {
      name: string;
    };
  };
  activity_plots?: {
    plot_id: string;
    planned_area_ha: number;
    actual_area_ha?: number;
    plot: {
      name: string;
    };
  }[];
}

interface Campaign {
  id: string;
  name: string;
  crop_type: string;
  status: string;
}

const activityTypeLabels: { [key: string]: string } = {
  'preparation': '🚜 Pregătirea terenului',
  'planting': '🌱 Semănat/Plantat',
  'fertilizing': '🧪 Fertilizare',
  'spraying': '💨 Tratamente',
  'irrigation': '💧 Irigare',
  'cultivation': '🌿 Întreținere',
  'harvesting': '🌾 Recoltare',
  'transport': '🚚 Transport',
  'maintenance': '🔧 Întreținere echipamente',
  'monitoring': '📊 Monitorizare',
  'other': '📝 Altele'
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtre
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Încarcă campaniile
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('multi_plot_campaigns')
        .select('id, name, crop_type, status')
        .order('name');

      if (campaignsError) {
        throw new Error(campaignsError.message);
      }

      setCampaigns(campaignsData || []);

      // Încarcă activitățile
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('campaign_activities')
        .select(`
          *,
          multi_plot_campaigns!inner(
            id,
            name,
            crop_type,
            status
          )
        `)
        .order('planned_date', { ascending: true });

      if (activitiesError) {
        throw new Error(activitiesError.message);
      }

      // Calculează urgency_status pentru fiecare activitate
      const activitiesWithUrgency = (activitiesData || []).map(activity => {
        const urgencyStatus = calculateUrgencyStatus(activity.planned_date, activity.status);
        return {
          ...activity,
          urgency_status: urgencyStatus,
          campaign: activity.multi_plot_campaigns
        };
      });

      setActivities(activitiesWithUrgency);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateUrgencyStatus = (plannedDate: string, status: string): string => {
    if (status === 'completed' || status === 'cancelled') {
      return 'normal';
    }

    const today = new Date();
    const planned = new Date(plannedDate);
    const diffTime = planned.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 2) return 'urgent';
    if (diffDays <= 7) return 'soon';
    return 'normal';
  };

  const getFilteredActivities = () => {
    return activities.filter(activity => {
      if (statusFilter !== 'all' && activity.status !== statusFilter) return false;
      if (urgencyFilter !== 'all' && activity.urgency_status !== urgencyFilter) return false;
      if (campaignFilter !== 'all' && activity.campaign_id !== campaignFilter) return false;
      if (activityTypeFilter !== 'all' && activity.activity_type !== activityTypeFilter) return false;
      return true;
    });
  };

  const handleCreateActivity = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowCreateModal(true);
  };

  const handleActivityCreated = () => {
    loadData();
    setShowCreateModal(false);
    setSelectedCampaign(null);
  };

  const updateActivityStatus = async (activityId: string, newStatus: string) => {
    try {
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Dacă activitatea este marcată ca finalizată, setează data actuală
      if (newStatus === 'completed') {
        updateData.actual_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('campaign_activities')
        .update(updateData)
        .eq('id', activityId);

      if (error) {
        throw new Error(error.message);
      }

      loadData();
    } catch (err: any) {
      setError(`Eroare la actualizarea statusului: ${err.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'overdue': return 'border-red-500 bg-red-50';
      case 'today': return 'border-orange-500 bg-orange-50';
      case 'urgent': return 'border-yellow-500 bg-yellow-50';
      case 'soon': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const filteredActivities = getFilteredActivities();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă activitățile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              📋 Gestionare Activități
            </h1>
            <p className="text-gray-600 mt-2">
              Planifică și urmărește activitățile pe campaniile agricole
            </p>
          </div>
          <button
            onClick={() => router.push('/farm-management')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Înapoi la Ferme
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Activități</p>
                <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Întârziate</p>
                <p className="text-2xl font-bold text-red-600">
                  {activities.filter(a => a.urgency_status === 'overdue').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🕐</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Astăzi</p>
                <p className="text-2xl font-bold text-orange-600">
                  {activities.filter(a => a.urgency_status === 'today').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completate</p>
                <p className="text-2xl font-bold text-green-600">
                  {activities.filter(a => a.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Campaniile cu buton de creare activități */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Creează Activități Noi</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                    <p className="text-sm text-gray-600">{campaign.crop_type}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    campaign.status === 'planned' ? 'bg-blue-100 text-blue-800' :
                    campaign.status === 'planted' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'growing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.status === 'planned' ? 'Planificată' :
                     campaign.status === 'planted' ? 'Plantată' :
                     campaign.status === 'growing' ? 'În Creștere' :
                     campaign.status}
                  </span>
                </div>
                <button
                  onClick={() => handleCreateActivity(campaign)}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  + Adaugă Activitate
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Filtre */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Filtrează Activitățile</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">Toate statusurile</option>
                <option value="planned">Planificate</option>
                <option value="in_progress">În progres</option>
                <option value="completed">Completate</option>
                <option value="cancelled">Anulate</option>
              </select>
            </div>

            {/* Urgency Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgență</label>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">Toate urgențele</option>
                <option value="overdue">Întârziate</option>
                <option value="today">Astăzi</option>
                <option value="urgent">Urgente</option>
                <option value="soon">În curând</option>
                <option value="normal">Normale</option>
              </select>
            </div>

            {/* Campaign Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campanie</label>
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">Toate campaniile</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} - {campaign.crop_type}
                  </option>
                ))}
              </select>
            </div>

            {/* Activity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tip Activitate</label>
              <select
                value={activityTypeFilter}
                onChange={(e) => setActivityTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="all">Toate tipurile</option>
                {Object.entries(activityTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setStatusFilter('all');
                setUrgencyFilter('all');
                setCampaignFilter('all');
                setActivityTypeFilter('all');
              }}
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Șterge Filtrele
            </button>
          </div>
        </div>

        {/* Lista de activități */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Activități Filtrate ({filteredActivities.length})
            </h3>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nu există activități</h3>
              <p className="text-gray-600">
                {activities.length === 0 
                  ? 'Nu aveți activități create încă. Creați prima activitate folosind butoanele de mai sus.'
                  : 'Nu există activități care să corespundă filtrelor aplicate.'
                }
              </p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className={`bg-white rounded-lg shadow-sm border-l-4 p-6 hover:shadow-md transition-shadow ${getUrgencyColor(activity.urgency_status || 'normal')}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{activity.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                        {activity.status === 'planned' ? 'Planificată' :
                         activity.status === 'in_progress' ? 'În progres' :
                         activity.status === 'completed' ? 'Completată' :
                         activity.status === 'cancelled' ? 'Anulată' : activity.status}
                      </span>
                      <span className="text-sm text-gray-600">
                        {activityTypeLabels[activity.activity_type] || activity.activity_type}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-medium">Campanie:</span>
                        <div className="text-gray-900">{activity.campaign?.name}</div>
                        <div className="text-xs text-gray-500">{activity.campaign?.crop_type}</div>
                      </div>
                      <div>
                        <span className="font-medium">Data planificată:</span>
                        <div className="text-gray-900">{new Date(activity.planned_date).toLocaleDateString('ro-RO')}</div>
                        {activity.actual_date && (
                          <div className="text-xs text-green-600">
                            Realizat: {new Date(activity.actual_date).toLocaleDateString('ro-RO')}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Cost planificat:</span>
                        <div className="text-gray-900">
                          {activity.planned_cost_ron ? `${activity.planned_cost_ron.toLocaleString()} RON` : 'N/A'}
                        </div>
                        {activity.actual_cost_ron && (
                          <div className="text-xs text-blue-600">
                            Actual: {activity.actual_cost_ron.toLocaleString()} RON
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Operator:</span>
                        <div className="text-gray-900">{activity.operator_name || 'Neasignat'}</div>
                      </div>
                    </div>

                    {activity.description && (
                      <p className="text-gray-600 text-sm mb-4">{activity.description}</p>
                    )}

                    {activity.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                        <p className="text-sm text-yellow-800">{activity.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="ml-6 flex flex-col space-y-2">
                    {activity.status === 'planned' && (
                      <>
                        <button
                          onClick={() => updateActivityStatus(activity.id, 'in_progress')}
                          className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                        >
                          Începe
                        </button>
                        <button
                          onClick={() => updateActivityStatus(activity.id, 'completed')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          Finalizează
                        </button>
                      </>
                    )}

                    {activity.status === 'in_progress' && (
                      <button
                        onClick={() => updateActivityStatus(activity.id, 'completed')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                      >
                        Finalizează
                      </button>
                    )}

                    {activity.status !== 'cancelled' && activity.status !== 'completed' && (
                      <button
                        onClick={() => updateActivityStatus(activity.id, 'cancelled')}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Anulează
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal pentru crearea activităților */}
        <CreateActivityModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleActivityCreated}
          campaign={selectedCampaign}
        />
      </div>
    </div>
  );
}
