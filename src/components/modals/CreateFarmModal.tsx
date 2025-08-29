'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface CreateFarmModalProps {
  isOpen: boolean
  companyId: string
  onClose: () => void
  onSuccess: () => void
}

export default function CreateFarmModal({ isOpen, companyId, onClose, onSuccess }: CreateFarmModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    total_area: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('farms')
        .insert({
          name: formData.name,
          address: formData.address,
          total_area: formData.total_area ? parseFloat(formData.total_area) : null,
          description: formData.description || null,
          company_id: companyId,
          status: 'active'
        })

      if (error) throw error

      alert('Ferma a fost creată cu succes!')
      onSuccess()
      onClose()
      setFormData({ name: '', address: '', total_area: '', description: '' })
    } catch (error: any) {
      console.error('Error creating farm:', error)
      alert('Eroare la crearea fermei: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-gray-900">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">🚜 Adaugă Fermă Nouă</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numele Fermei *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="ex: Ferma Central"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresa *
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="ex: Com. Voluntari, Ilfov"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Suprafața (hectare) - opțional
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={formData.total_area}
              onChange={(e) => setFormData({ ...formData, total_area: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Se va calcula automat din parcele"
            />
            <p className="text-xs text-gray-500 mt-1">
              Suprafața se va calcula automat când adaugi parcele în fermă
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descriere (opțional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Descriere fermă..."
              rows={3}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Se creează...' : 'Creează Ferma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
