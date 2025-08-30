import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: UserRole
    company_id: string | null
    full_name: string
  }
}

export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  allowedRoles?: UserRole[]
) {
  return async (req: NextRequest) => {
    try {
      // Obține token-ul din header
      const token = req.headers.get('authorization')?.replace('Bearer ', '')
      
      console.log('withAuth: Authorization header:', req.headers.get('authorization')?.substring(0, 50) + '...')
      console.log('withAuth: Token present:', !!token)
      
      if (!token) {
        console.log('withAuth: No token provided')
        return NextResponse.json(
          { error: 'Token de autentificare lipsește' },
          { status: 401 }
        )
      }

      // Verifică token-ul cu Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      console.log('withAuth: Supabase user:', user?.email, 'Error:', error?.message)
      
      if (error || !user || !user.email) {
        console.log('withAuth: Token invalid or user not found')
        return NextResponse.json(
          { error: 'Token invalid' },
          { status: 401 }
        )
      }

      // Obține informații complete despre utilizator din baza de date
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role, company_id, full_name, status')
        .eq('email', user.email)
        .single()

      console.log('withAuth: User data from DB:', userData?.email, userData?.role)

      if (userError || !userData || userData.status !== 'active') {
        return NextResponse.json(
          { error: 'Utilizator inactiv sau inexistent' },
          { status: 401 }
        )
      }

      // Verifică rolurile permise
      if (allowedRoles && !allowedRoles.includes(userData.role)) {
        return NextResponse.json(
          { error: 'Acces interzis - rol insuficient' },
          { status: 403 }
        )
      }

      // Adaugă utilizatorul la request
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = userData

      return handler(authenticatedReq)
    } catch (error) {
      console.error('Eroare autentificare:', error)
      return NextResponse.json(
        { error: 'Eroare internă de autentificare' },
        { status: 500 }
      )
    }
  }
}

// Helper pentru verificarea accesului la fermă
export async function checkFarmAccess(
  userId: string, 
  farmId: string, 
  userRole: UserRole,
  companyId: string | null
): Promise<boolean> {
  // Super admin are acces la toate fermele
  if (userRole === 'super_admin') {
    return true
  }

  // Verifică că ferma aparține companiei utilizatorului
  const { data: farm } = await supabase
    .from('farms')
    .select('company_id')
    .eq('id', farmId)
    .single()

  if (!farm || farm.company_id !== companyId) {
    return false
  }

  // Admin company are acces la toate fermele companiei
  if (userRole === 'admin_company') {
    return true
  }

  // Engineer și admin_farm trebuie să fie asignați la fermă
  const { data: assignment } = await supabase
    .from('user_farm_assignments')
    .select('id')
    .eq('user_id', userId)
    .eq('farm_id', farmId)
    .single()

  return !!assignment
}
