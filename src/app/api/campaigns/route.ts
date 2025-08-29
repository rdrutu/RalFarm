import { NextRequest, NextResponse } from 'next/server'
import { withAuth, checkFarmAccess } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

// Schema validare pentru creare campanie
const createCampaignSchema = z.object({
  farm_id: z.string().uuid('ID fermă invalid'),
  plot_id: z.string().uuid('ID parcelă invalid'),
  crop_type_id: z.string().uuid('ID tip cultură invalid'),
  name: z.string().min(2, 'Numele campaniei trebuie să aibă minim 2 caractere'),
  crop_year: z.number().int().min(2020).max(2030),
  planted_area: z.number().positive('Suprafața plantată trebuie să fie pozitivă').optional(),
  planting_date: z.string().optional(),
  expected_harvest_date: z.string().optional(),
  status: z.enum(['planned', 'planted', 'growing', 'ready_harvest', 'harvested', 'completed', 'failed']).optional()
})

const updateCampaignSchema = createCampaignSchema.partial()

// GET /api/campaigns - Lista campanii
export const GET = withAuth(async (req) => {
  const { user } = req
  const { searchParams } = new URL(req.url)
  const farmId = searchParams.get('farm_id')
  const plotId = searchParams.get('plot_id')
  const status = searchParams.get('status')
  const year = searchParams.get('year')

  try {
    let query = supabase
      .from('cultivation_campaigns')
      .select(`
        *,
        farms (
          id,
          name,
          company_id
        ),
        plots (
          id,
          name,
          calculated_area
        ),
        crop_types (
          id,
          name,
          category,
          average_yield_per_ha,
          average_price_per_kg
        )
      `)
      .order('created_at', { ascending: false })

    // Filtrare după fermă
    if (farmId) {
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
      // Filtrare în funcție de rol
      if (user?.role === 'super_admin') {
        // Super admin vede toate campaniile
      } else if (user?.role === 'admin_company') {
        // Admin companie vede campaniile fermelor companiei
        query = query.eq('farms.company_id', user.company_id!)
      } else {
        // Engineer și admin_farm văd campaniile fermelor asignate
        const { data: assignments } = await supabase
          .from('user_farm_assignments')
          .select('farm_id')
          .eq('user_id', user!.id)

        const farmIds = assignments?.map(a => a.farm_id) || []
        if (farmIds.length === 0) {
          return NextResponse.json({ campaigns: [] })
        }

        query = query.in('farm_id', farmIds)
      }
    }

    // Filtrări suplimentare
    if (plotId) {
      query = query.eq('plot_id', plotId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (year) {
      query = query.eq('crop_year', parseInt(year))
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Eroare la obținerea campaniilor' },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaigns: data })
  } catch (error) {
    console.error('Eroare GET campaigns:', error)
    return NextResponse.json(
      { error: 'Eroare internă' },
      { status: 500 }
    )
  }
})

// POST /api/campaigns - Creare campanie nouă
export const POST = withAuth(async (req) => {
  const { user } = req

  try {
    const body = await req.json()
    const validatedData = createCampaignSchema.parse(body)

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

    // Verifică că parcela aparține fermei
    const { data: plot } = await supabase
      .from('plots')
      .select('farm_id')
      .eq('id', validatedData.plot_id)
      .single()

    if (!plot || plot.farm_id !== validatedData.farm_id) {
      return NextResponse.json(
        { error: 'Parcela nu aparține fermei specificate' },
        { status: 400 }
      )
    }

    // Verifică că nu există deja o campanie activă pe parcela respectivă
    const { data: existingCampaign } = await supabase
      .from('cultivation_campaigns')
      .select('id')
      .eq('plot_id', validatedData.plot_id)
      .in('status', ['planted', 'growing', 'ready_harvest'])
      .single()

    if (existingCampaign) {
      return NextResponse.json(
        { error: 'Există deja o campanie activă pe această parcelă' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('cultivation_campaigns')
      .insert(validatedData)
      .select(`
        *,
        farms (name),
        plots (name),
        crop_types (name)
      `)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Eroare la crearea campaniei' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Campanie creată cu succes',
      campaign: data 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Date invalide', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Eroare POST campaigns:', error)
    return NextResponse.json(
      { error: 'Eroare internă' },
      { status: 500 }
    )
  }
}, ['super_admin', 'admin_company', 'admin_farm', 'engineer'])
