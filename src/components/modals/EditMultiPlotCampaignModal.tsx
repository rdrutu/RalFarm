'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Farm {
  id: string;
  name: string;
}

interface Plot {
  id: string;
  name: string;
  calculated_area: number;
  farm_id: string;
}

interface PlotAssignment {
  plot_id: string;
  planted_area_ha: number;
}

interface Campaign {
  id: string;
  name: string;
  crop_type: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  year: number;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  status: string;
  total_area_ha: number;
}

interface CampaignPlot {
  plot_id: string;
  planted_area_ha: number;
  plot?: Plot;
}

interface EditMultiPlotCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campaign: Campaign | null;
}

export default function EditMultiPlotCampaignModal({
  isOpen,
  onClose,
  onSuccess,
  campaign
}: EditMultiPlotCampaignModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    crop_type: '',
    season: 'spring' as 'spring' | 'summer' | 'autumn' | 'winter',
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    notes: ''
  });

  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedPlots, setSelectedPlots] = useState<PlotAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string>('');

  // Încarcă datele campaniei când se deschide modalul
  useEffect(() => {
    if (isOpen && campaign) {
      setFormData({
        name: campaign.name,
        crop_type: campaign.crop_type,
        season: campaign.season,
        year: campaign.year,
        start_date: campaign.start_date || '',
        end_date: campaign.end_date || '',
        notes: campaign.notes || ''
      });
      
      loadCampaignData();
    }
  }, [isOpen, campaign]);

  const loadCampaignData = async () => {
    if (!campaign) return;

    try {
      // Încarcă parcelele din campanie
      const { data: campaignPlots, error: plotsError } = await supabase
        .from('campaign_plots')
        .select(`
          plot_id,
          planted_area_ha,
          plots!inner(id, name, calculated_area, farm_id)
        `)
        .eq('campaign_id', campaign.id);

      if (plotsError) {
        console.error('Error loading campaign plots:', plotsError);
        setError('Eroare la încărcarea parcelelor campaniei');
        return;
      }

      if (campaignPlots && campaignPlots.length > 0) {
        // Extrage farm_id din prima parcelă
        const firstPlot = campaignPlots[0].plots as any;
        const extractedFarmId = firstPlot.farm_id;
        setFarmId(extractedFarmId);

        // Setează parcelele selectate
        const assignments = campaignPlots.map(cp => ({
          plot_id: cp.plot_id,
          planted_area_ha: cp.planted_area_ha
        }));
        setSelectedPlots(assignments);

        // Încarcă toate parcelele din fermă
        const { data: farmPlots, error: farmPlotsError } = await supabase
          .from('plots')
          .select('id, name, calculated_area, farm_id')
          .eq('farm_id', extractedFarmId)
          .order('name');

        if (farmPlotsError) {
          console.error('Error loading farm plots:', farmPlotsError);
          setError('Eroare la încărcarea parcelelor fermei');
          return;
        }

        setPlots(farmPlots || []);
      }
    } catch (err) {
      console.error('Error loading campaign data:', err);
      setError('Eroare la încărcarea datelor campaniei');
    }
  };

  const handlePlotSelection = (plotId: string, selected: boolean) => {
    if (selected) {
      const plot = plots.find(p => p.id === plotId);
      if (plot) {
        setSelectedPlots(prev => [
          ...prev,
          { plot_id: plotId, planted_area_ha: plot.calculated_area }
        ]);
      }
    } else {
      setSelectedPlots(prev => prev.filter(p => p.plot_id !== plotId));
    }
  };

  const handlePlantedAreaChange = (plotId: string, area: number) => {
    setSelectedPlots(prev =>
      prev.map(p =>
        p.plot_id === plotId ? { ...p, planted_area_ha: area } : p
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;

    setLoading(true);
    setError(null);

    try {
      if (selectedPlots.length === 0) {
        setError('Selectați cel puțin o parcelă pentru campanie');
        return;
      }

      // Validare suprafețe
      for (const assignment of selectedPlots) {
        const plot = plots.find(p => p.id === assignment.plot_id);
        if (plot && assignment.planted_area_ha > plot.calculated_area) {
          setError(`Suprafața plantată (${assignment.planted_area_ha.toFixed(4)}ha) depășește suprafața parcelei ${plot.name} (${plot.calculated_area.toFixed(4)}ha)`);
          return;
        }
        if (assignment.planted_area_ha <= 0) {
          setError('Suprafața plantată trebuie să fie mai mare decât 0');
          return;
        }
      }

      // Calculează suprafața totală
      const total_area_ha = selectedPlots.reduce((sum, p) => sum + p.planted_area_ha, 0);

      // Actualizează campania
      const { error: campaignError } = await supabase
        .from('multi_plot_campaigns')
        .update({
          name: formData.name,
          crop_type: formData.crop_type,
          season: formData.season,
          year: formData.year,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          notes: formData.notes,
          total_area_ha,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

      if (campaignError) {
        throw new Error(campaignError.message);
      }

      // Șterge parcelele existente
      const { error: deleteError } = await supabase
        .from('campaign_plots')
        .delete()
        .eq('campaign_id', campaign.id);

      if (deleteError) {
        throw new Error('Eroare la ștergerea parcelelor existente');
      }

      // Adaugă parcelele noi
      const plotData = selectedPlots.map(assignment => ({
        campaign_id: campaign.id,
        plot_id: assignment.plot_id,
        planted_area_ha: assignment.planted_area_ha
      }));

      const { error: plotsError } = await supabase
        .from('campaign_plots')
        .insert(plotData);

      if (plotsError) {
        throw new Error('Eroare la salvarea parcelelor');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTotalArea = () => {
    return selectedPlots.reduce((sum, p) => sum + p.planted_area_ha, 0);
  };

  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 text-gray-900 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Editează Campania: {campaign.name}
            </h2>
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
            {/* Informații de bază */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume Campanie *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="ex: Porumb 2025"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cultură *
                </label>
                <input
                  type="text"
                  value={formData.crop_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, crop_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="ex: Porumb, Grâu, Floarea-soarelui"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sezon *
                </label>
                <select
                  value={formData.season}
                  onChange={(e) => setFormData(prev => ({ ...prev, season: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  <option value="spring">Primăvară</option>
                  <option value="summer">Vară</option>
                  <option value="autumn">Toamnă</option>
                  <option value="winter">Iarnă</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  An *
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  min="2020"
                  max="2030"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Start
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Sfârșit
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>

            {/* Status campanie */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-blue-900">Status actual:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  campaign.status === 'planned' ? 'bg-blue-100 text-blue-800' :
                  campaign.status === 'planted' ? 'bg-green-100 text-green-800' :
                  campaign.status === 'growing' ? 'bg-yellow-100 text-yellow-800' :
                  campaign.status === 'ready_harvest' ? 'bg-orange-100 text-orange-800' :
                  campaign.status === 'harvested' ? 'bg-purple-100 text-purple-800' :
                  campaign.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {campaign.status === 'planned' ? 'Planificată' :
                   campaign.status === 'planted' ? 'Plantată' :
                   campaign.status === 'growing' ? 'În Creștere' :
                   campaign.status === 'ready_harvest' ? 'Gata Recoltare' :
                   campaign.status === 'harvested' ? 'Recoltată' :
                   campaign.status === 'completed' ? 'Completată' :
                   campaign.status === 'failed' ? 'Eșuată' : campaign.status}
                </span>
              </div>
            </div>

            {/* Selecția parcelelor */}
            {plots.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parcele în Campanie *
                </label>
                <div className="border border-gray-300 rounded-md p-4">
                  <div className="space-y-3">
                    {plots.map(plot => {
                      const isSelected = selectedPlots.some(p => p.plot_id === plot.id);
                      const assignment = selectedPlots.find(p => p.plot_id === plot.id);
                      
                      return (
                        <div key={plot.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handlePlotSelection(plot.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{plot.name}</div>
                            <div className="text-sm text-gray-500">
                              Suprafață totală: {plot.calculated_area.toFixed(4)} ha
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="flex items-center space-x-2">
                              <label className="text-sm text-gray-700">Suprafață plantată:</label>
                              <input
                                type="number"
                                value={assignment?.planted_area_ha || 0}
                                onChange={(e) => handlePlantedAreaChange(plot.id, parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                                min="0"
                                max={plot.calculated_area}
                                step="0.0001"
                              />
                              <span className="text-sm text-gray-500">ha</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {selectedPlots.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-sm font-medium text-blue-900">
                      Rezumat selecție: {selectedPlots.length} parcele, {getTotalArea().toFixed(4)} ha total
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                rows={3}
                placeholder="Note suplimentare despre campanie..."
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
                disabled={loading || selectedPlots.length === 0}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 rounded-md transition-colors"
              >
                {loading ? 'Se salvează...' : 'Salvează Modificările'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
