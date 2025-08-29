'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import PlotMapSelector from '@/components/PlotMapSelector'

interface CreatePlotModalProps {
  isOpen: boolean
  farmId: string
  farmName: string
  onClose: () => void
  onSuccess: () => void
}

export default function CreatePlotModal({ isOpen, farmId, farmName, onClose, onSuccess }: CreatePlotModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    calculated_area: '',
    soil_type: '',
    slope_percentage: '',
    description: '',
    coordinates: [] as number[][]
  })
  const [loading, setLoading] = useState(false)

  const handlePlotSelected = (coordinates: number[][], area: number) => {
    setFormData(prev => ({
      ...prev,
      coordinates,
      calculated_area: area.toString()
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Inserează parcela
      const { error: plotError } = await supabase
        .from('plots')
        .insert({
          farm_id: farmId,
          name: formData.name,
          calculated_area: parseFloat(formData.calculated_area),
          coordinates: formData.coordinates.length > 0 ? JSON.stringify(formData.coordinates) : null,
          soil_type: formData.soil_type || null,
          slope_percentage: formData.slope_percentage ? parseFloat(formData.slope_percentage) : null,
          description: formData.description || null,
          status: 'free'
        })

      if (plotError) throw plotError

      // Calculează automat suprafața fermei
      const response = await fetch('/api/farms/calculate-area', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ farmId })
      })

      if (!response.ok) {
        console.warn('Failed to calculate farm area automatically')
      }

      alert('Parcela a fost adăugată cu succes!')
      onSuccess()
      onClose()
      setFormData({
        name: '',
        calculated_area: '',
        soil_type: '',
        slope_percentage: '',
        description: '',
        coordinates: []
      })
    } catch (error: any) {
      console.error('Error creating plot:', error)
      alert('Eroare la crearea parcelei: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 text-gray-900 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">🌾 Adaugă Parcelă</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Fermă:</span> {farmName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coloana formular */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numele Parcelei *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="ex: Parcela Nord"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipul Solului (opțional)
              </label>
              <select
                value={formData.soil_type}
                onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Selectează tipul solului</option>
                <option value="argilos">Argilos</option>
                <option value="nisipos">Nisipos</option>
                <option value="lutos">Lutos</option>
                <option value="cernoziom">Cernoziom</option>
                <option value="aluvionar">Aluvionar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Panta (%) - opțional
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.slope_percentage}
                onChange={(e) => setFormData({ ...formData, slope_percentage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="ex: 2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descriere (opțional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Informații suplimentare despre parcelă..."
                rows={3}
              />
            </div>

            {formData.calculated_area && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Suprafață selectată:</span> {parseFloat(formData.calculated_area).toFixed(4)} hectare
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Suprafața totală a fermei se va actualiza automat
                </p>
              </div>
            )}
          </div>

          {/* Coloana hartă */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selectează Parcela pe Hartă *
              </label>
              <PlotMapSelector 
                onPlotSelected={handlePlotSelected}
                initialPosition={[44.4268, 26.1025]}
              />
            </div>
          </div>

          {/* Butoane - pe toată lățimea */}
          <div className="lg:col-span-2 flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading || !formData.calculated_area}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Se creează...' : 'Adaugă Parcela'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
