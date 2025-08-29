'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CreateCompanyModal from '@/components/modals/CreateCompanyModal'
import EditCompanyModal from '@/components/modals/EditCompanyModal'

interface Company {
  id: string
  name: string
  legal_name: string
  cui: string
  email: string
  phone: string
  address: string
  status: string
  created_at: string
  users: User[]
}

interface User {
  id: string
  username: string
  email: string
  full_name: string
  role: string
  status: string
  last_login: string
}

export default function AdminPanel() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showCreateCompany, setShowCreateCompany] = useState(false)
  const [showEditCompany, setShowEditCompany] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // Verifică dacă e super admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'super_admin') {
      router.push('/dashboard')
      return
    }

    setUser(user)
    loadCompanies()
  }

  const loadCompanies = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        users (
          id,
          username,
          email,
          full_name,
          role,
          status,
          last_login
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading companies:', error)
    } else {
      setCompanies(data || [])
    }
    setLoading(false)
  }

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!confirm(`Ești sigur că vrei să ștergi compania "${companyName}"? Această acțiune va șterge și toți utilizatorii companiei și nu poate fi anulată.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId)

      if (error) throw error

      // Reîncarcă lista de companii
      loadCompanies()
      alert('Compania a fost ștearsă cu succes!')
    } catch (error: any) {
      console.error('Error deleting company:', error)
      alert('Eroare la ștergerea companiei: ' + error.message)
    }
  }

  const handleToggleCompanyStatus = async (companyId: string, currentStatus: string, companyName: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    const action = newStatus === 'active' ? 'activează' : 'dezactivează'
    
    if (!confirm(`Ești sigur că vrei să ${action} compania "${companyName}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('companies')
        .update({ status: newStatus })
        .eq('id', companyId)

      if (error) throw error

      // Reîncarcă lista de companii
      loadCompanies()
      alert(`Compania a fost ${newStatus === 'active' ? 'activată' : 'dezactivată'} cu succes!`)
    } catch (error: any) {
      console.error('Error updating company status:', error)
      alert('Eroare la actualizarea statusului: ' + error.message)
    }
  }

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company)
    setShowEditCompany(true)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă panoul de administrare...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">🛡️ Admin Panel - RalFarm</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Super Admin: {user?.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <span className="text-2xl">🏢</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Companii</p>
                <p className="text-2xl font-semibold text-gray-900">{companies.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Utilizatori</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {companies.reduce((total, company) => total + company.users.length, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Companii Active</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {companies.filter(c => c.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setShowCreateCompany(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <span className="mr-2">🏢</span>
            Creează Companie
          </button>
        </div>

        {/* Companies List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Companii Înregistrate</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Companie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilizatori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Creării
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr 
                    key={company.id} 
                    onClick={() => router.push(`/admin/company/${company.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        <div className="text-sm text-gray-500">CUI: {company.cui}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.email}</div>
                      <div className="text-sm text-gray-500">{company.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.users.length} utilizatori</div>
                      <div className="text-xs text-gray-500">
                        {company.users.map(u => u.role).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        company.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {company.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(company.created_at).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Previne click-ul pe rând
                            router.push(`/admin/company/${company.id}`)
                          }}
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                          title="Gestionează compania"
                        >
                          📋
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Previne click-ul pe rând
                            handleEditCompany(company)
                          }}
                          className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
                          title="Editează compania"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Previne click-ul pe rând
                            handleToggleCompanyStatus(company.id, company.status, company.name)
                          }}
                          className={`px-3 py-1 rounded transition-colors ${
                            company.status === 'active' 
                              ? 'bg-orange-600 text-white hover:bg-orange-700' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                          title={company.status === 'active' ? 'Dezactivează' : 'Activează'}
                        >
                          {company.status === 'active' ? '⏸️' : '▶️'}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Previne click-ul pe rând
                            handleDeleteCompany(company.id, company.name)
                          }}
                          className="text-red-600 hover:text-red-900 px-3 py-1 rounded hover:bg-red-50 transition-colors"
                          title="Șterge compania"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals pentru crearea și editarea companiilor */}
      {showCreateCompany && (
        <CreateCompanyModal 
          onClose={() => setShowCreateCompany(false)}
          onSuccess={loadCompanies}
        />
      )}

      {showEditCompany && selectedCompany && (
        <EditCompanyModal 
          isOpen={showEditCompany}
          company={selectedCompany}
          onClose={() => {
            setShowEditCompany(false)
            setSelectedCompany(null)
          }}
          onCompanyUpdated={loadCompanies}
        />
      )}
    </div>
  )
}
