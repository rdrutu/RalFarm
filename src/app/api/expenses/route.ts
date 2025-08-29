import { NextRequest, NextResponse } from 'next/server'
import { withAuth, checkFarmAccess } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

// Schema validare pentru creare cheltuială
const createExpenseSchema = z.object({
  farm_id: z.string().uuid('ID fermă invalid'),
  campaign_id: z.string().uuid('ID campanie invalid').optional(),
  cost_type: z.enum(['specific', 'general']),
  category: z.enum([
    'seeds', 'fertilizers', 'pesticides', 'plot_labor', 'plot_rent', 'irrigation',
    'fuel', 'machinery', 'general_labor', 'insurance', 'taxes', 'maintenance', 'utilities', 'other'
  ]),
  amount_ron: z.number().positive('Suma trebuie să fie pozitivă'),
  vat_amount_ron: z.number().min(0).optional(),
  total_amount_ron: z.number().positive('Suma totală trebuie să fie pozitivă'),
  description: z.string().min(5, 'Descrierea trebuie să aibă minim 5 caractere'),
  supplier: z.string().optional(),
  invoice_number: z.string().optional(),
  invoice_date: z.string().optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  unit_price: z.number().positive().optional(),
  expense_date: z.string()
})

// GET /api/expenses - Lista cheltuieli
export const GET = withAuth(async (req) => {
  const { user } = req
  const { searchParams } = new URL(req.url)
  const farmId = searchParams.get('farm_id')
  const campaignId = searchParams.get('campaign_id')
  const costType = searchParams.get('cost_type')
  const category = searchParams.get('category')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  try {
    let query = supabase
      .from('expenses')
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
          plots (
            name
          ),
          crop_types (
            name
          )
        ),
        users!expenses_created_by_fkey (
          full_name
        )
      `)
      .order('expense_date', { ascending: false })

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
        // Super admin vede toate cheltuielile
      } else if (user?.role === 'admin_company') {
        // Admin companie vede cheltuielile fermelor companiei
        query = query.eq('farms.company_id', user.company_id!)
      } else {
        // Engineer și admin_farm văd cheltuielile fermelor asignate
        const { data: assignments } = await supabase
          .from('user_farm_assignments')
          .select('farm_id')
          .eq('user_id', user!.id)

        const farmIds = assignments?.map(a => a.farm_id) || []
        if (farmIds.length === 0) {
          return NextResponse.json({ expenses: [] })
        }

        query = query.in('farm_id', farmIds)
      }
    }

    // Filtrări suplimentare
    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }
    if (costType) {
      query = query.eq('cost_type', costType)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (startDate) {
      query = query.gte('expense_date', startDate)
    }
    if (endDate) {
      query = query.lte('expense_date', endDate)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Eroare la obținerea cheltuielilor' },
        { status: 500 }
      )
    }

    return NextResponse.json({ expenses: data })
  } catch (error) {
    console.error('Eroare GET expenses:', error)
    return NextResponse.json(
      { error: 'Eroare internă' },
      { status: 500 }
    )
  }
})

// POST /api/expenses - Creare cheltuială nouă
export const POST = withAuth(async (req) => {
  const { user } = req

  try {
    const body = await req.json()
    const validatedData = createExpenseSchema.parse(body)

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

    // Dacă e specificată o campanie, verifică că aparține fermei
    if (validatedData.campaign_id) {
      const { data: campaign } = await supabase
        .from('cultivation_campaigns')
        .select('farm_id')
        .eq('id', validatedData.campaign_id)
        .single()

      if (!campaign || campaign.farm_id !== validatedData.farm_id) {
        return NextResponse.json(
          { error: 'Campania nu aparține fermei specificate' },
          { status: 400 }
        )
      }
    }

    // Validare logică cost_type vs campaign_id
    if (validatedData.cost_type === 'specific' && !validatedData.campaign_id) {
      return NextResponse.json(
        { error: 'Costurile specifice trebuie să fie asociate unei campanii' },
        { status: 400 }
      )
    }

    // Calculează total_amount_ron dacă nu e specificat
    if (!validatedData.total_amount_ron) {
      validatedData.total_amount_ron = validatedData.amount_ron + (validatedData.vat_amount_ron || 0)
    }

    const expenseData = {
      ...validatedData,
      created_by: user!.id
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select(`
        *,
        farms (name),
        cultivation_campaigns (
          name,
          plots (name),
          crop_types (name)
        )
      `)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Eroare la crearea cheltuielii' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Cheltuială creată cu succes',
      expense: data 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Date invalide', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Eroare POST expenses:', error)
    return NextResponse.json(
      { error: 'Eroare internă' },
      { status: 500 }
    )
  }
}, ['super_admin', 'admin_company', 'admin_farm', 'engineer'])
