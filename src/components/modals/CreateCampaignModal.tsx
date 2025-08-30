'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface CreateCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onCampaignCreated: (campaign: any) => void
  farmId?: string
}

export default function CreateCampaignModal({ 
  isOpen, 
  onClose, 
  onCampaignCreated,
  farmId 
}: CreateCampaignModalProps) {
  const [formData, setFormData] = useState({
    farm_id: farmId || '',
    plot_id: '',
    crop_type_id: '',
    name: '',
    crop_year: new Date().getFullYear(),
    planted_area: '',
    planting_date: '',
    expected_harvest_date: '',
    status: 'planned' as const
  })

  const [farms, setFarms] = useState<any[]>([])
  const [plots, setPlots] = useState<any[]>([])
  const [cropTypes, setCropTypes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Încarcă fermele dacă nu e specificată una
  useEffect(() => {
    if (!farmId && isOpen) {
      loadFarms()
    }
  }, [farmId, isOpen])

  // Încarcă parcelele când se schimbă ferma
  useEffect(() => {
    if (formData.farm_id) {
      loadPlots(formData.farm_id)
    }
  }, [formData.farm_id])

  // Încarcă tipurile de culturi
  useEffect(() => {
    if (isOpen) {
      loadCropTypes()
    }
  }, [isOpen])

  const loadFarms = async () => {
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setFarms(data || [])
    } catch (error) {
      console.error('Error loading farms:', error)
    }
  }

  const loadPlots = async (farmId: string) => {
    try {
      const { data, error } = await supabase
        .from('plots')
        .select('id, name, calculated_area')
        .eq('farm_id', farmId)
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setPlots(data || [])
    } catch (error) {
      console.error('Error loading plots:', error)
    }
  }

  const loadCropTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('crop_types')
        .select('id, name, category, planting_season, harvest_season')
        .order('name')

      if (error) throw error
      setCropTypes(data || [])
    } catch (error) {
      console.error('Error loading crop types:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Validări
      if (!formData.farm_id || !formData.plot_id || !formData.crop_type_id || !formData.name) {
        throw new Error('Toate câmpurile obligatorii trebuie completate')
      }

      // Verifică dacă există deja o campanie activă pe această parcelă
      const { data: existingCampaigns } = await supabase
        .from('cultivation_campaigns')
        .select('id')
        .eq('plot_id', formData.plot_id)
        .eq('crop_year', formData.crop_year)
        .not('status', 'in', '(completed,failed)')

      if (existingCampaigns && existingCampaigns.length > 0) {
        throw new Error('Există deja o campanie activă pe această parcelă pentru anul selectat')
      }

      const { data, error } = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          planted_area: formData.planted_area ? parseFloat(formData.planted_area) : null,
          planting_date: formData.planting_date || null,
          expected_harvest_date: formData.expected_harvest_date || null
        })
      }).then(res => res.json())

      if (error) throw new Error(error)

      onCampaignCreated(data)
      onClose()
      
      // Resetează formularul
      setFormData({
        farm_id: farmId || '',
        plot_id: '',
        crop_type_id: '',
        name: '',
        crop_year: new Date().getFullYear(),
        planted_area: '',
        planting_date: '',
        expected_harvest_date: '',
        status: 'planned'
      })
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-gray-900">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Campanie Nouă</h2>
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
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fermă */}
          {!farmId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fermă *
              </label>
              <select
                value={formData.farm_id}
                onChange={(e) => setFormData(prev => ({ ...prev, farm_id: e.target.value, plot_id: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selectează ferma</option>
                {farms.map(farm => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Parcelă */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parcelă *
            </label>
            <select
              value={formData.plot_id}
              onChange={(e) => setFormData(prev => ({ ...prev, plot_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={!formData.farm_id}
            >
              <option value="">Selectează parcela</option>
              {plots.map(plot => (
                <option key={plot.id} value={plot.id}>
                  {plot.name} ({(plot.calculated_area || 0).toFixed(2)} ha)
                </option>
              ))}
            </select>
          </div>

          {/* Tip cultură */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tip Cultură *
            </label>
            <select
              value={formData.crop_type_id}
              onChange={(e) => setFormData(prev => ({ ...prev, crop_type_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selectează cultura</option>
              {cropTypes.map(crop => (
                <option key={crop.id} value={crop.id}>
                  {crop.name} ({crop.category}) - {crop.planting_season}
                </option>
              ))}
            </select>
          </div>

          {/* Nume campanie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nume Campanie *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: Porumb 2024 - Parcela Nord"
              required
            />
          </div>

          {/* Anul culturii și suprafața */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anul Culturii *
              </label>
              <input
                type="number"
                value={formData.crop_year}
                onChange={(e) => setFormData(prev => ({ ...prev, crop_year: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="2020"
                max="2030"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Suprafață Plantată (ha)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.planted_area}
                onChange={(e) => setFormData(prev => ({ ...prev, planted_area: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Date planificare */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Semănat/Plantat
              </label>
              <input
                type="date"
                value={formData.planting_date}
                onChange={(e) => setFormData(prev => ({ ...prev, planting_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Recoltare Estimată
              </label>
              <input
                type="date"
                value={formData.expected_harvest_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_harvest_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Inițial
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="planned">Planificată</option>
              <option value="planted">Plantată</option>
              <option value="growing">În Creștere</option>
            </select>
          </div>

          {/* Butoane */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              disabled={isLoading}
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Se creează...' : 'Creează Campania'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
