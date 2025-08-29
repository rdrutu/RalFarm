'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email: string
  full_name: string
  role: 'admin_company' | 'admin_farm' | 'engineer'
  company_id: string
  status: string
  created_at: string
}

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  onUserUpdated: () => void
}

export default function EditUserModal({ isOpen, onClose, user, onUserUpdated }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    role: user.role || 'admin_company'
  })
  const [loading, setLoading] = useState(false)

  // Actualizează formData când se schimbă user
  useEffect(() => {
    setFormData({
      full_name: user.full_name || '',
      role: user.role || 'admin_company'
    })
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Actualizează utilizatorul în tabelul nostru
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          role: formData.role
        })
        .eq('id', user.id)

      if (error) throw error

      onUserUpdated()
      onClose()
    } catch (error: any) {
      console.error('Error updating user:', error.message)
      alert('Eroare la actualizarea utilizatorului: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!confirm('Ești sigur că vrei să ștergi acest utilizator? Această acțiune nu poate fi anulată.')) {
      return
    }

    setLoading(true)

    try {
      // Șterge utilizatorul din tabelul nostru
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (dbError) throw dbError

      onUserUpdated()
      onClose()
    } catch (error: any) {
      console.error('Error deleting user:', error.message)
      alert('Eroare la ștergerea utilizatorului: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md text-gray-900">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Editează Utilizator</h2>
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
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">Email-ul nu poate fi modificat</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nume Complet
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value as any})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin_company">Administrator Companie</option>
              <option value="admin_farm">Administrator Fermă</option>
              <option value="engineer">Inginer</option>
            </select>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleDeleteUser}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Se șterge...' : 'Șterge Utilizator'}
            </button>
            
            <div className="flex space-x-3">
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
          </div>
        </form>
      </div>
    </div>
  )
}
