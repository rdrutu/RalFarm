'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface EditFarmModalProps {
  isOpen: boolean
  farm: {
    id: string
    name: string
    address: string
    total_area: number | null
    company_id: string
  } | null
  onClose: () => void
  onSuccess: () => void
}

export default function EditFarmModal({ isOpen, farm, onClose, onSuccess }: EditFarmModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    total_area: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (farm) {
      setFormData({
        name: farm.name || '',
        address: farm.address || '',
        total_area: farm.total_area?.toString() || '',
        description: ''
      })
    }
  }, [farm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!farm) return

    setLoading(true)

    try {
      const updateData: any = {
        name: formData.name,
        address: formData.address
      }

      // Adaugă total_area doar dacă este completat
      if (formData.total_area) {
        updateData.total_area = parseFloat(formData.total_area)
      }

      const { error } = await supabase
        .from('farms')
        .update(updateData)
        .eq('id', farm.id)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating farm:', error)
      alert('Eroare la actualizarea fermei')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!farm) return
    
    if (!confirm('Ești sigur că vrei să ștergi această fermă? Această acțiune nu poate fi anulată.')) {
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('farms')
        .delete()
        .eq('id', farm.id)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error deleting farm:', error)
      alert('Eroare la ștergerea fermei')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !farm) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Editează Ferma: {farm.name}
          </h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nume Fermă *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Ferma Valea Verde"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresă *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Comuna Agricola, Județul Ilfov"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Suprafață Totală (hectare)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total_area}
                onChange={(e) => setFormData({ ...formData, total_area: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: 150.5 (opțional - se calculează din parcele)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Dacă nu completezi, suprafața se va calcula automat din parcele
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              🗑️ Șterge Ferma
            </button>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
