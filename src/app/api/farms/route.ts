import { NextRequest, NextResponse } from 'next/server'
import { withAuth, checkFarmAccess } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

// Schema validare pentru creare fermă
const createFarmSchema = z.object({
  company_id: z.string().uuid('ID companie invalid'),
  name: z.string().min(2, 'Numele fermei trebuie să aibă minim 2 caractere'),
  description: z.string().optional(),
  address: z.string().optional(),
  total_area: z.number().positive('Suprafața trebuie să fie pozitivă').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
})

const updateFarmSchema = createFarmSchema.partial()

// GET /api/farms - Lista ferme
export const GET = withAuth(async (req) => {
  const { user } = req
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')

  try {
    let query = supabase
      .from('farms')
      .select(`
        *,
        companies (
          name,
          legal_name
        )
      `)
      .eq('status', 'active')
      .order('name')

    // Filtrare în funcție de rol
    if (user?.role === 'super_admin') {
      // Super admin vede toate fermele
      if (companyId) {
        query = query.eq('company_id', companyId)
      }
    } else if (user?.role === 'admin_company') {
      // Admin companie vede doar fermele companiei sale
      query = query.eq('company_id', user.company_id!)
    } else {
      // Engineer și admin_farm văd doar fermele la care sunt asignați
      const { data: assignments } = await supabase
        .from('user_farm_assignments')
        .select('farm_id')
        .eq('user_id', user!.id)

      const farmIds = assignments?.map(a => a.farm_id) || []
      if (farmIds.length === 0) {
        return NextResponse.json({ farms: [] })
      }

      query = query.in('id', farmIds)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Eroare la obținerea fermelor' },
        { status: 500 }
      )
    }

    return NextResponse.json({ farms: data })
  } catch (error) {
    console.error('Eroare GET farms:', error)
    return NextResponse.json(
      { error: 'Eroare internă' },
      { status: 500 }
    )
  }
})

// POST /api/farms - Creare fermă nouă
export const POST = withAuth(async (req) => {
  const { user } = req

  try {
    const body = await req.json()
    const validatedData = createFarmSchema.parse(body)

    // Verifică accesul la companie
    if (user?.role !== 'super_admin' && validatedData.company_id !== user?.company_id) {
      return NextResponse.json(
        { error: 'Nu aveți permisiunea să creați ferme pentru această companie' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('farms')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Eroare la crearea fermei' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Fermă creată cu succes',
      farm: data 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Date invalide', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Eroare POST farms:', error)
    return NextResponse.json(
      { error: 'Eroare internă' },
      { status: 500 }
    )
  }
}, ['super_admin', 'admin_company'])
