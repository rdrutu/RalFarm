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
  farm?: Farm;
}

interface PlotAssignment {
  plot_id: string;
  planted_area_ha: number;
}

interface CreateMultiPlotCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedFarmId?: string;
}

export default function CreateMultiPlotCampaignModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedFarmId
}: CreateMultiPlotCampaignModalProps) {
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
  const [selectedFarmId, setSelectedFarmId] = useState<string>(preselectedFarmId || '');
  const [farms, setFarms] = useState<Farm[]>([]);

  // Încarcă fermele
  useEffect(() => {
    const loadFarms = async () => {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Error loading farms:', error);
        return;
      }

      setFarms(data || []);
      if (preselectedFarmId) {
        setSelectedFarmId(preselectedFarmId);
      }
    };

    if (isOpen) {
      loadFarms();
    }
  }, [isOpen, preselectedFarmId]);

  // Încarcă parcelele când se schimbă ferma
  useEffect(() => {
    const loadPlots = async () => {
      if (!selectedFarmId) {
        setPlots([]);
        setSelectedPlots([]);
        return;
      }

      const { data, error } = await supabase
        .from('plots')
        .select('id, name, calculated_area, farm_id')
        .eq('farm_id', selectedFarmId)
        .order('name');

      if (error) {
        console.error('Error loading plots:', error);
        setError('Eroare la încărcarea parcelelor');
        return;
      }

      setPlots(data || []);
      setSelectedPlots([]);
    };

    loadPlots();
  }, [selectedFarmId]);

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

      // Prepare form data with proper null handling for dates
      const submissionData = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        plot_assignments: selectedPlots
      };

      const response = await fetch('/api/multi-plot-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Eroare la crearea campaniei');
      }

      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        crop_type: '',
        season: 'spring',
        year: new Date().getFullYear(),
        start_date: '',
        end_date: '',
        notes: ''
      });
      setSelectedPlots([]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTotalArea = () => {
    return selectedPlots.reduce((sum, p) => sum + p.planted_area_ha, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 text-gray-900 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Creează Campanie Multi-Parcele
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Selecția fermei */}
            {!preselectedFarmId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fermă *
                </label>
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selectează ferma</option>
                  {farms.map(farm => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selecția parcelelor */}
            {selectedFarmId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parcele în Campanie *
                </label>
                <div className="border border-gray-300 rounded-md p-4">
                  {plots.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      Nu există parcele disponibile pentru această fermă
                    </p>
                  ) : (
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
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  )}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {loading ? 'Se creează...' : 'Creează Campania'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
