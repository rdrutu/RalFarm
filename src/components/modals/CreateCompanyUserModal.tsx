'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface CreateCompanyUserModalProps {
  isOpen: boolean
  companyId: string
  companyName: string
  onClose: () => void
  onUserCreated: () => void
}

export default function CreateCompanyUserModal({ 
  isOpen, 
  companyId, 
  companyName, 
  onClose, 
  onUserCreated 
}: CreateCompanyUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    username: '',
    role: 'admin_company'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const roles = [
    { value: 'admin_company', label: 'Admin Companie', description: 'Gestionează toate fermele companiei' },
    { value: 'admin_farm', label: 'Admin Fermă', description: 'Gestionează o fermă specifică' },
    { value: 'engineer', label: 'Inginer', description: 'Monitorizează și raportează activitățile' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('Form data:', formData)

    // Verifică exact ce câmpuri sunt goale
    const missingFields = []
    if (!formData.full_name.trim()) missingFields.push('Nume complet')
    if (!formData.email.trim()) missingFields.push('Email')
    if (!formData.username.trim()) missingFields.push('Username')
    if (!formData.password.trim()) missingFields.push('Parolă')
    if (!formData.confirmPassword.trim()) missingFields.push('Confirmarea parolei')

    if (missingFields.length > 0) {
      setError(`Următoarele câmpuri sunt obligatorii: ${missingFields.join(', ')}`)
      setLoading(false)
      return
    }

    // Validări existente
    if (formData.password !== formData.confirmPassword) {
      setError('Parolele nu se potrivesc')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere')
      setLoading(false)
      return
    }

    try {
      // Obține token-ul de autentificare
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setError('Nu ești autentificat')
        setLoading(false)
        return
      }

      // Apelează API endpoint-ul pentru crearea utilizatorului
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          username: formData.username,
          role: formData.role,
          company_id: companyId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Eroare la crearea utilizatorului')
      }

      onUserCreated()
      onClose()
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        username: '',
        role: 'admin_company'
      })
    } catch (err: any) {
      console.error('Error creating user:', err)
      setError(err.message || 'Eroare la crearea utilizatorului')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const generateUsername = () => {
    if (formData.full_name.trim()) {
      const username = formData.full_name.toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '')
      console.log('Generated username:', username)
      setFormData({ ...formData, username })
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, password, confirmPassword: password })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto text-gray-900">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">👤 Adaugă Utilizator</h2>
            <p className="text-sm text-gray-600">Pentru compania: <strong>{companyName}</strong></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Debug info - să vedem ce e completat */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs">
            <strong>Debug:</strong> 
            {` Nume: ${formData.full_name ? '✓' : '✗'}`}
            {` Email: ${formData.email ? '✓' : '✗'}`}
            {` Username: ${formData.username ? '✓' : '✗'}`}
            {` Parolă: ${formData.password ? '✓' : '✗'}`}
            {` Confirmare: ${formData.confirmPassword ? '✓' : '✗'}`}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Informații Personale */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Informații Personale</h3>
            
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Nume Complet *
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                onBlur={generateUsername}
                required
                placeholder="Ex: Ion Popescu"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="utilizator@compania.ro"
              />
            </div>

          </div>

          {/* Informații Cont */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Informații Cont</h3>
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="nume.prenume"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Parolă *
                <button
                  type="button"
                  onClick={generatePassword}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  (Generează Automată)
                </button>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Minim 6 caractere"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmă Parola *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Rol */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Rol și Permisiuni</h3>
            
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Rol *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {roles.find(r => r.value === formData.role)?.description}
              </p>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Se creează...' : 'Adaugă Utilizatorul'}
            </button>
          </div>
        </form>

        {formData.password && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>📋 Parolă generată:</strong> {formData.password}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Salvează această parolă și transmite-o utilizatorului în siguranță!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
