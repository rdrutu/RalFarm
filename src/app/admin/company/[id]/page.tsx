'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import EditCompanyModal from '@/components/modals/EditCompanyModal'
import CreateCompanyUserModal from '@/components/modals/CreateCompanyUserModal'
import EditUserModal from '@/components/modals/EditUserModal'

interface Company {
  id: string
  name: string
  legal_name: string
  cui: string
  address: string
  phone: string
  email: string
  status: 'active' | 'inactive'
  created_at: string
}

interface User {
  id: string
  email: string
  username: string
  full_name: string
  role: 'admin_company' | 'admin_farm' | 'engineer'
  company_id: string
  status: string
  created_at: string
}

export default function CompanyManagementPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showEditCompany, setShowEditCompany] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string

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
    loadCompanyData()
  }

  const loadCompanyData = async () => {
    setLoading(true)

    // Încarcă datele companiei
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !companyData) {
      console.error('Error loading company:', companyError)
      router.push('/admin')
      return
    }

    // Încarcă utilizatorii companiei
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error loading users:', usersError)
    } else {
      setUsers(usersData || [])
    }

    setCompany(companyData)
    setLoading(false)
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
          <p className="mt-4 text-gray-600">Se încarcă datele companiei...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Compania nu a fost găsită</h1>
          <button
            onClick={() => router.push('/admin')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Înapoi la Admin Panel
          </button>
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Înapoi
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                🏢 {company.name}
              </h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                Management Companie
              </span>
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
        {/* Company Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Informații Companie</h2>
            <button
              onClick={() => setShowEditCompany(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ✏️ Editează
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Nume Companie</h3>
              <p className="text-lg text-gray-900">{company.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Denumire Legală</h3>
              <p className="text-lg text-gray-900">{company.legal_name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">CUI</h3>
              <p className="text-lg text-gray-900">{company.cui}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                company.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {company.status}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
              <p className="text-lg text-gray-900">{company.email}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Telefon</h3>
              <p className="text-lg text-gray-900">{company.phone}</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Adresă</h3>
              <p className="text-lg text-gray-900">{company.address}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Data Creării</h3>
              <p className="text-lg text-gray-900">
                {new Date(company.created_at).toLocaleDateString('ro-RO')}
              </p>
            </div>
          </div>
        </div>

        {/* Users Management */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Utilizatori Companie</h2>
              <p className="text-sm text-gray-600">
                Gestionează utilizatorii care au acces la această companie
              </p>
            </div>
            <button
              onClick={() => setShowCreateUser(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              👤 Adaugă Utilizator
            </button>
          </div>

          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilizator
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ultima Conectare
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acțiuni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin_company' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'admin_farm' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'engineer' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800`}>
                          Activ
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('ro-RO')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Editează
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Șterge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">👥</span>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Niciun utilizator</h3>
              <p className="text-gray-500 mb-6">
                Această companie nu are încă utilizatori înregistrați.
              </p>
              <button
                onClick={() => setShowCreateUser(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Adaugă Primul Utilizator
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showEditCompany && company && (
        <EditCompanyModal 
          isOpen={showEditCompany}
          company={company}
          onClose={() => setShowEditCompany(false)}
          onCompanyUpdated={() => {
            setShowEditCompany(false)
            loadCompanyData()
          }}
        />
      )}

      {showCreateUser && company && (
        <CreateCompanyUserModal 
          isOpen={showCreateUser}
          companyId={companyId}
          companyName={company.name}
          onClose={() => setShowCreateUser(false)}
          onUserCreated={() => {
            setShowCreateUser(false)
            loadCompanyData()
          }}
        />
      )}

      {selectedUser && (
        <EditUserModal 
          isOpen={!!selectedUser}
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUserUpdated={() => {
            setSelectedUser(null)
            loadCompanyData()
          }}
        />
      )}
    </div>
  )
}
