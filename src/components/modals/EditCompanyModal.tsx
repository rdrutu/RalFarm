'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Company {
  id: string
  name: string
  legal_name: string
  cui: string
  email: string
  phone: string
  address: string
  status: string
}

interface EditCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  company: Company
  onCompanyUpdated: () => void
}

export default function EditCompanyModal({ isOpen, onClose, company, onCompanyUpdated }: EditCompanyModalProps) {
  const [formData, setFormData] = useState({
    name: company.name || '',
    legal_name: company.legal_name || '',
    cui: company.cui || '',
    email: company.email || '',
    phone: company.phone || '',
    address: company.address || '',
    status: company.status || 'active'
  })
  const [loading, setLoading] = useState(false)

  // Actualizează formData când se schimbă company
  useEffect(() => {
    setFormData({
      name: company.name || '',
      legal_name: company.legal_name || '',
      cui: company.cui || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      status: company.status || 'active'
    })
  }, [company])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('companies')
        .update(formData)
        .eq('id', company.id)

      if (error) throw error

      onCompanyUpdated()
      onClose()
    } catch (error: any) {
      console.error('Error updating company:', error.message)
      alert('Eroare la actualizarea companiei: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Editează Compania</h2>
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
              Nume Companie
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numele Legal
            </label>
            <input
              type="text"
              value={formData.legal_name}
              onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CUI
            </label>
            <input
              type="text"
              value={formData.cui}
              onChange={(e) => setFormData({...formData, cui: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresă
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Activ</option>
              <option value="inactive">Inactiv</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Se salvează...' : 'Salvează'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
