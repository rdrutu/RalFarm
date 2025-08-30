import { NextRequest, NextResponse } from 'next/server'
import { withAuth, checkFarmAccess, AuthenticatedRequest } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

// Schema validare pentru activități
const createActivitySchema = z.object({
  campaign_id: z.string().uuid('ID campanie invalid'),
  activity_type: z.enum([
    'soil_preparation', 'planting', 'fertilizing', 'spraying', 
    'irrigation', 'weeding', 'harvesting', 'field_inspection', 
    'maintenance', 'other'
  ]),
  name: z.string().min(2, 'Numele activității trebuie să aibă minim 2 caractere'),
  planned_date: z.string(),
  planned_start_time: z.string().optional(),
  planned_end_time: z.string().optional(),
  description: z.string().optional(),
  priority: z.number().min(1).max(5).optional(),
  required_equipment: z.string().optional(),
  required_materials: z.string().optional(),
  estimated_duration_hours: z.number().positive().optional(),
  estimated_cost_ron: z.number().positive().optional(),
  weather_requirements: z.string().optional(),
  assigned_to_user_id: z.string().uuid().optional(),
  team_members: z.string().optional(),
  send_reminder: z.boolean().optional(),
  reminder_days_before: z.number().min(0).max(30).optional()
})

const updateActivitySchema = createActivitySchema.partial().extend({
  id: z.string().uuid('ID activitate invalid'),
  status: z.enum(['planned', 'in_progress', 'completed', 'overdue', 'cancelled']).optional(),
  completed_date: z.string().optional(),
  completed_start_time: z.string().optional(),
  completed_end_time: z.string().optional(),
  actual_cost_ron: z.number().positive().optional(),
  weather_conditions_actual: z.string().optional(),
  completion_notes: z.string().optional()
})

// GET /api/campaigns/activities - Lista activități
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const { user } = req
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('campaign_id')
  const farmId = searchParams.get('farm_id')
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const urgency = searchParams.get('urgency') // today, urgent, soon, overdue
  const assignedTo = searchParams.get('assigned_to')

  try {
    let query = supabase
      .from('campaign_activities')
      .select(`
        *,
        cultivation_campaigns!inner(
          id,
          name,
          farm_id,
          plots(id, name),
          farms(id, name)
        ),
        users(id, full_name)
      `)
      .order('planned_date', { ascending: true })

    // Filtre
    if (campaignId) query = query.eq('campaign_id', campaignId)
    if (farmId) query = query.eq('cultivation_campaigns.farm_id', farmId)
    if (status) query = query.eq('status', status)
    if (assignedTo) query = query.eq('assigned_to_user_id', assignedTo)
    
    if (dateFrom) query = query.gte('planned_date', dateFrom)
    if (dateTo) query = query.lte('planned_date', dateTo)

    // Verifică accesul la fermă pentru utilizatorii non-admin
    if (user.role !== 'super_admin' && user.role !== 'admin_company') {
      if (user.role === 'admin_farm') {
        // Admin fermă vede doar activitățile din ferma sa
        const { data: userFarms } = await supabase
          .from('farms')
          .select('id')
          .eq('company_id', user.company_id)
        
        const farmIds = userFarms?.map(f => f.id) || []
        if (farmIds.length > 0) {
          query = query.in('farm_id', farmIds)
        }
      } else {
        // Engineer vede doar activitățile care îi sunt asignate
        query = query.eq('assigned_to_user_id', user.id)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching activities:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

// POST /api/campaigns/activities - Creare activitate nouă
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const { user } = req
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validatedData = createActivitySchema.parse(body)

    // Verifică accesul la campanie
    const { data: campaign } = await supabase
      .from('cultivation_campaigns')
      .select('farm_id, farms!inner(company_id)')
      .eq('id', validatedData.campaign_id)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campania nu a fost găsită' }, { status: 404 })
    }

    // Verifică permisiuni
    const hasAccess = await checkFarmAccess(user.id, campaign.farm_id, user.role, user.company_id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Nu aveți permisiunea să creați activități pentru această campanie' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('campaign_activities')
      .insert([{
        ...validatedData,
        created_by: user.id
      }])
      .select(`
        *,
        cultivation_campaigns (
          name,
          farms (name),
          plots (name),
          crop_types (name)
        ),
        assigned_to:users (
          id,
          full_name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating activity:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Date invalide', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

// PUT /api/campaigns/activities - Actualizare activitate
export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  const { user } = req
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validatedData = updateActivitySchema.parse(body)
    const { id, ...updateFields } = validatedData

    // Verifică existența și accesul la activitate
    const { data: activity } = await supabase
      .from('campaign_activities')
      .select(`
        *,
        cultivation_campaigns (
          farm_id,
          farms!inner (company_id)
        )
      `)
      .eq('id', id)
      .single()

    if (!activity) {
      return NextResponse.json({ error: 'Activitatea nu a fost găsită' }, { status: 404 })
    }

    // Verifică permisiuni
    const hasAccess = await checkFarmAccess(user.id, activity.cultivation_campaigns.farm_id, user.role, user.company_id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Nu aveți permisiunea să modificați această activitate' }, { status: 403 })
    }

    // Engineer poate modifica doar activitățile care îi sunt asignate
    if (user.role === 'engineer' && activity.assigned_to_user_id !== user.id) {
      return NextResponse.json({ error: 'Puteți modifica doar activitățile care vă sunt asignate' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('campaign_activities')
      .update(updateFields)
      .eq('id', id)
      .select(`
        *,
        cultivation_campaigns (
          name,
          farms (name),
          plots (name),
          crop_types (name)
        ),
        assigned_to:users (
          id,
          full_name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating activity:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Date invalide', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

// DELETE /api/campaigns/activities - Ștergere activitate
export const DELETE = withAuth(async (req: AuthenticatedRequest) => {
  const { user } = req
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID activitate necesar' }, { status: 400 })
  }

  try {
    // Verifică existența și accesul la activitate
    const { data: activity } = await supabase
      .from('campaign_activities')
      .select(`
        *,
        cultivation_campaigns (
          farm_id,
          farms!inner (company_id)
        )
      `)
      .eq('id', id)
      .single()

    if (!activity) {
      return NextResponse.json({ error: 'Activitatea nu a fost găsită' }, { status: 404 })
    }

    // Verifică permisiuni
    const hasAccess = await checkFarmAccess(user.id, activity.cultivation_campaigns.farm_id, user.role, user.company_id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Nu aveți permisiunea să ștergeți această activitate' }, { status: 403 })
    }

    // Engineer nu poate șterge activități
    if (user.role === 'engineer') {
      return NextResponse.json({ error: 'Nu aveți permisiunea să ștergeți activități' }, { status: 403 })
    }

    const { error } = await supabase
      .from('campaign_activities')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting activity:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
