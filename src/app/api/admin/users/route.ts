import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Creează un client Supabase cu service role key pentru operațiuni admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Aceasta va fi cheia service role
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  console.log('🚀 API /admin/users called')
  
  try {
    // Verifică dacă utilizatorul curent este super admin
    const authHeader = request.headers.get('authorization')
    console.log('📝 Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.log('❌ No authorization header')
      return NextResponse.json(
        { error: 'Acces neautorizat' },
        { status: 401 }
      )
    }

    // Extrage token-ul din header
    const token = authHeader.replace('Bearer ', '')
    console.log('🔑 Token extracted, length:', token.length)
    
    // Verifică token-ul și obține utilizatorul
    const { data: { user }, error: tokenError } = await supabaseAdmin.auth.getUser(token)
    
    if (tokenError || !user) {
      console.log('❌ Token validation failed:', tokenError?.message)
      return NextResponse.json(
        { error: 'Token invalid' },
        { status: 401 }
      )
    }

    console.log('✅ User authenticated:', user.email)

    // Verifică dacă utilizatorul este super admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('👤 User role check:', userData?.role, userError?.message)

    if (userError || userData?.role !== 'super_admin') {
      console.log('❌ Access denied - not super admin')
      return NextResponse.json(
        { error: 'Acces interzis - doar super admin poate crea utilizatori' },
        { status: 403 }
      )
    }

    const body = await request.json()
    console.log('📦 Request body received:', { ...body, password: '***' })
    
    const { 
      email, 
      password, 
      full_name, 
      username, 
      role, 
      company_id
    } = body

    // Validări
    if (!email || !password || !full_name || !username || !role || !company_id) {
      console.log('❌ Missing required fields:', { 
        email: !!email, 
        password: !!password, 
        full_name: !!full_name, 
        username: !!username, 
        role: !!role, 
        company_id: !!company_id 
      })
      return NextResponse.json(
        { error: 'Toate câmpurile obligatorii trebuie completate' },
        { status: 400 }
      )
    }

    console.log('🔄 Creating auth user...')

    // 1. Creează utilizatorul în Supabase Auth cu privilegii admin
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role
      }
    })

    if (createError || !authUser?.user) {
      console.error('❌ Auth user creation failed:', createError)
      return NextResponse.json(
        { error: createError?.message || 'Eroare la crearea utilizatorului' },
        { status: 400 }
      )
    }

    console.log('✅ Auth user created:', authUser.user.id)
    console.log('🔄 Creating user profile...')

    // 2. Creează profilul utilizatorului în tabela users
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authUser.user.id,
        email,
        username,
        password_hash: '', // Nu stocăm parola în tabela noastră, e în Auth
        full_name,
        role,
        company_id,
        status: 'active'
      }])

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError)
      
      // Dacă crearea profilului eșuează, șterge utilizatorul din Auth
      console.log('🔄 Rolling back auth user...')
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      
      return NextResponse.json(
        { error: `Eroare la crearea profilului utilizatorului: ${profileError.message}` },
        { status: 400 }
      )
    }

    console.log('✅ User profile created successfully')

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        email,
        full_name,
        username,
        role,
        company_id
      }
    })

  } catch (error: any) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Eroare internă de server' },
      { status: 500 }
    )
  }
}
