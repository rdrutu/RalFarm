'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Campaign {
  id: string;
  name: string;
  crop_type: string;
}

interface Plot {
  id: string;
  name: string;
  calculated_area: number;
}

interface CampaignPlot {
  plot_id: string;
  planted_area_ha: number;
  plot?: Plot;
}

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campaign: Campaign | null;
}

const activityTypes = [
  { value: 'preparation', label: '🚜 Pregătirea terenului', description: 'Arătură, discare, nivelare' },
  { value: 'planting', label: '🌱 Semănat/Plantat', description: 'Semănatul culturilor' },
  { value: 'fertilizing', label: '🧪 Fertilizare', description: 'Aplicarea îngrășămintelor' },
  { value: 'spraying', label: '💨 Tratamente', description: 'Aplicarea pesticidelor, fungicidelor' },
  { value: 'irrigation', label: '💧 Irigare', description: 'Udarea culturilor' },
  { value: 'cultivation', label: '🌿 Întreținere', description: 'Prașila, cultivarea' },
  { value: 'harvesting', label: '🌾 Recoltare', description: 'Recoltarea produselor' },
  { value: 'transport', label: '🚚 Transport', description: 'Transportul produselor' },
  { value: 'maintenance', label: '🔧 Întreținere echipamente', description: 'Service utilaje' },
  { value: 'monitoring', label: '📊 Monitorizare', description: 'Inspecție, evaluare cultură' },
  { value: 'other', label: '📝 Altele', description: 'Alte activități' }
];

export default function CreateActivityModal({
  isOpen,
  onClose,
  onSuccess,
  campaign
}: CreateActivityModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    activity_type: '',
    description: '',
    planned_date: '',
    planned_cost_ron: '',
    operator_name: '',
    notes: '',
    planned_area_ha: '',
    planned_quantity: '',
    planned_unit: 'ore'
  });

  const [campaignPlots, setCampaignPlots] = useState<CampaignPlot[]>([]);
  const [selectedPlots, setSelectedPlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Încarcă parcelele campaniei
  useEffect(() => {
    if (isOpen && campaign) {
      loadCampaignPlots();
      // Reset form
      setFormData({
        name: '',
        activity_type: '',
        description: '',
        planned_date: '',
        planned_cost_ron: '',
        operator_name: '',
        notes: '',
        planned_area_ha: '',
        planned_quantity: '',
        planned_unit: 'ore'
      });
      setSelectedPlots([]);
      setError(null);
    }
  }, [isOpen, campaign]);

  const loadCampaignPlots = async () => {
    if (!campaign) return;

    try {
      const { data, error } = await supabase
        .from('campaign_plots')
        .select(`
          plot_id,
          planted_area_ha,
          plots!inner(id, name, calculated_area)
        `)
        .eq('campaign_id', campaign.id);

      if (error) {
        console.error('Error loading campaign plots:', error);
        return;
      }

      setCampaignPlots(data || []);
    } catch (err) {
      console.error('Error loading campaign plots:', err);
    }
  };

  const handleActivityTypeChange = (type: string) => {
    setFormData(prev => ({ ...prev, activity_type: type }));
    
    // Auto-completează numele bazat pe tipul activității
    const activityType = activityTypes.find(a => a.value === type);
    if (activityType && !formData.name) {
      setFormData(prev => ({ 
        ...prev, 
        name: `${activityType.label.split(' ')[1]} - ${campaign?.crop_type || ''}`
      }));
    }
  };

  const handlePlotSelection = (plotId: string, selected: boolean) => {
    if (selected) {
      setSelectedPlots(prev => [...prev, plotId]);
    } else {
      setSelectedPlots(prev => prev.filter(id => id !== plotId));
    }
  };

  const getTotalSelectedArea = () => {
    return campaignPlots
      .filter(cp => selectedPlots.includes(cp.plot_id))
      .reduce((sum, cp) => sum + cp.planted_area_ha, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;

    setLoading(true);
    setError(null);

    try {
      if (selectedPlots.length === 0) {
        setError('Selectați cel puțin o parcelă pentru activitate');
        return;
      }

      // Calculează suprafața totală pentru activitate
      const totalArea = getTotalSelectedArea();
      const plannedAreaHa = formData.planned_area_ha ? parseFloat(formData.planned_area_ha) : totalArea;

      // Creează activitatea principală
      const { data: activity, error: activityError } = await supabase
        .from('campaign_activities')
        .insert([{
          campaign_id: campaign.id,
          name: formData.name,
          activity_type: formData.activity_type,
          description: formData.description,
          planned_date: formData.planned_date,
          planned_cost_ron: formData.planned_cost_ron ? parseFloat(formData.planned_cost_ron) : null,
          operator_name: formData.operator_name || null,
          notes: formData.notes || null,
          planned_area_ha: plannedAreaHa,
          planned_quantity: formData.planned_quantity ? parseFloat(formData.planned_quantity) : null,
          planned_unit: formData.planned_unit,
          status: 'planned'
        }])
        .select()
        .single();

      if (activityError) {
        throw new Error(activityError.message);
      }

      // Creează legăturile cu parcelele
      const plotActivities = selectedPlots.map(plotId => {
        const campaignPlot = campaignPlots.find(cp => cp.plot_id === plotId);
        return {
          activity_id: activity.id,
          plot_id: plotId,
          planned_area_ha: campaignPlot?.planted_area_ha || 0
        };
      });

      const { error: plotActivitiesError } = await supabase
        .from('activity_plots')
        .insert(plotActivities);

      if (plotActivitiesError) {
        throw new Error('Eroare la salvarea legăturilor cu parcelele');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 text-gray-900 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Creează Activitate Nouă
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Campania: {campaign.name} - {campaign.crop_type}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipul activității */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipul Activității *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activityTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.activity_type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="activity_type"
                      value={type.value}
                      checked={formData.activity_type === type.value}
                      onChange={(e) => handleActivityTypeChange(e.target.value)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{type.label}</div>
                      <div className="text-xs text-gray-600">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Informații de bază */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume Activitate *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="ex: Arătură de toamnă - Porumb"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Planificată *
                </label>
                <input
                  type="date"
                  value={formData.planned_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, planned_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Planificat (RON)
                </label>
                <input
                  type="number"
                  value={formData.planned_cost_ron}
                  onChange={(e) => setFormData(prev => ({ ...prev, planned_cost_ron: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operator/Responsabil
                </label>
                <input
                  type="text"
                  value={formData.operator_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, operator_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Nume operator"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantitate Planificată
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={formData.planned_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, planned_quantity: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                  <select
                    value={formData.planned_unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, planned_unit: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="ore">ore</option>
                    <option value="kg">kg</option>
                    <option value="litri">litri</option>
                    <option value="tone">tone</option>
                    <option value="bucati">bucăți</option>
                    <option value="ha">ha</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suprafață Planificată (ha)
                </label>
                <input
                  type="number"
                  value={formData.planned_area_ha}
                  onChange={(e) => setFormData(prev => ({ ...prev, planned_area_ha: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder={`Auto: ${getTotalSelectedArea().toFixed(4)} ha`}
                  step="0.0001"
                  min="0"
                />
              </div>
            </div>

            {/* Descrierea activității */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descriere
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                rows={3}
                placeholder="Descrierea detaliată a activității..."
              />
            </div>

            {/* Selecția parcelelor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parcele pentru Activitate *
              </label>
              <div className="border border-gray-300 rounded-md p-4">
                {campaignPlots.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Nu există parcele în această campanie
                  </p>
                ) : (
                  <div className="space-y-3">
                    {campaignPlots.map(cp => {
                      const plot = cp.plot as any;
                      const isSelected = selectedPlots.includes(cp.plot_id);
                      
                      return (
                        <div key={cp.plot_id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handlePlotSelection(cp.plot_id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{plot.name}</div>
                            <div className="text-sm text-gray-500">
                              Suprafață plantată: {cp.planted_area_ha.toFixed(4)} ha
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {selectedPlots.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-sm font-medium text-blue-900">
                    Parcele selectate: {selectedPlots.length}, Suprafață totală: {getTotalSelectedArea().toFixed(4)} ha
                  </div>
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note Suplimentare
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                rows={2}
                placeholder="Note suplimentare, instrucțiuni speciale..."
              />
            </div>

            {/* Butoane */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={loading || selectedPlots.length === 0 || !formData.activity_type || !formData.name}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 rounded-md transition-colors"
              >
                {loading ? 'Se creează...' : 'Creează Activitatea'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
