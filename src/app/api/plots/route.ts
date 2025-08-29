import { NextRequest, NextResponse } from 'next/server'
import { withAuth, checkFarmAccess } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

// Schema validare pentru creare parcelă
const createPlotSchema = z.object({
  farm_id: z.string().uuid('ID fermă invalid'),
  name: z.string().min(2, 'Numele parcelei trebuie să aibă minim 2 caractere'),
  description: z.string().optional(),
  coordinates: z.any().optional(), // JSON coordinates
  calculated_area: z.number().positive('Suprafața trebuie să fie pozitivă').optional(),
  soil_type: z.string().optional(),
  slope_percentage: z.number().min(0).max(100).optional(),
  rent_type: z.enum(['fixed_amount', 'percentage_yield']).optional(),
  rent_amount: z.number().positive().optional(),
  rent_percentage: z.number().min(0).max(100).optional(),
  rent_description: z.string().optional()
})

const updatePlotSchema = createPlotSchema.partial()

// GET /api/plots - Lista parcele
export const GET = withAuth(async (req) => {
  const { user } = req
  const { searchParams } = new URL(req.url)
  const farmId = searchParams.get('farm_id')
  const status = searchParams.get('status')

  try {
    let query = supabase
      .from('plots')
      .select(`
        *,
        farms (
          id,
          name,
          company_id
        ),
        cultivation_campaigns (
          id,
          name,
          status,
          crop_type_id,
          crop_types (
            name
          )
        )
      `)
      .order('name')

    // Filtrare după fermă
    if (farmId) {
      // Verifică accesul la fermă
      const hasAccess = await checkFarmAccess(
        user!.id,
        farmId,
        user!.role,
        user!.company_id
      )

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Nu aveți acces la această fermă' },
          { status: 403 }
        )
      }

      query = query.eq('farm_id', farmId)
    } else {
      // Dacă nu e specificată ferma, filtrează după roluri
      if (user?.role === 'super_admin') {
        // Super admin vede toate parcelele
      } else if (user?.role === 'admin_company') {
        // Admin companie vede parcelele fermelor companiei
        query = query.eq('farms.company_id', user.company_id!)
      } else {
        // Engineer și admin_farm văd doar parcelele fermelor asignate
        const { data: assignments } = await supabase
          .from('user_farm_assignments')
          .select('farm_id')
          .eq('user_id', user!.id)

        const farmIds = assignments?.map(a => a.farm_id) || []
        if (farmIds.length === 0) {
          return NextResponse.json({ plots: [] })
        }

        query = query.in('farm_id', farmIds)
      }
    }

    // Filtrare după status
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Eroare la obținerea parcelelor' },
        { status: 500 }
      )
    }

    return NextResponse.json({ plots: data })
  } catch (error) {
    console.error('Eroare GET plots:', error)
    return NextResponse.json(
      { error: 'Eroare internă' },
      { status: 500 }
    )
  }
})

// POST /api/plots - Creare parcelă nouă
export const POST = withAuth(async (req) => {
  const { user } = req

  try {
    const body = await req.json()
    const validatedData = createPlotSchema.parse(body)

    // Verifică accesul la fermă
    const hasAccess = await checkFarmAccess(
      user!.id,
      validatedData.farm_id,
      user!.role,
      user!.company_id
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Nu aveți acces la această fermă' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('plots')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Eroare la crearea parcelei' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Parcelă creată cu succes',
      plot: data 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Date invalide', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Eroare POST plots:', error)
    return NextResponse.json(
      { error: 'Eroare internă' },
      { status: 500 }
    )
  }
}, ['super_admin', 'admin_company', 'admin_farm'])
