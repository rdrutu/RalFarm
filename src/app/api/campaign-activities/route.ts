import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'

type CampaignActivity = Database['public']['Tables']['campaign_activities']['Row']
type CampaignActivityInsert = Database['public']['Tables']['campaign_activities']['Insert']
type CampaignActivityUpdate = Database['public']['Tables']['campaign_activities']['Update']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')
    const farmId = searchParams.get('farm_id')
    const status = searchParams.get('status')
    const activityType = searchParams.get('activity_type')

    let query = supabase
      .from('campaign_activities')
      .select('*')
      .order('planned_date', { ascending: true })

    // Filtrare după campanie
    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    // Filtrare după fermă (prin parcelele campaniei)
    if (farmId) {
      // Pentru campaniile multi-plot, trebuie să filtrăm prin tabelul campaign_plots
      const { data: campaignIds } = await supabase
        .from('campaign_plots')
        .select('campaign_id, plots!inner(farm_id)')
        .eq('plots.farm_id', farmId)
      
      if (campaignIds && campaignIds.length > 0) {
        const validCampaignIds = campaignIds.map(c => c.campaign_id)
        query = query.in('campaign_id', validCampaignIds)
      } else {
        // Dacă nu găsim campanii pentru această fermă, returnăm listă goală
        return NextResponse.json([])
      }
    }

    // Filtrare după status
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filtrare după tipul activității
    if (activityType && activityType !== 'all') {
      query = query.eq('activity_type', activityType)
    }

    const { data: activities, error } = await query

    if (error) {
      console.error('Eroare la încărcarea activităților:', error)
      return NextResponse.json(
        { error: 'Eroare la încărcarea activităților' },
        { status: 500 }
      )
    }

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Eroare neașteptată:', error)
    return NextResponse.json(
      { error: 'Eroare internă a serverului' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const activityData: CampaignActivityInsert = await request.json()

    // Validări de bază
    if (!activityData.campaign_id || !activityData.name || !activityData.activity_type) {
      return NextResponse.json(
        { error: 'Câmpurile obligatorii lipsesc' },
        { status: 400 }
      )
    }

    // Setează suprafața planificată din campanie dacă nu e specificată
    if (!activityData.planned_area_ha) {
      const { data: campaign } = await supabase
        .from('cultivation_campaigns')
        .select('planted_area')
        .eq('id', activityData.campaign_id)
        .single()

      if (campaign) {
        activityData.planned_area_ha = campaign.planted_area
      }
    }

    const { data: activity, error } = await supabase
      .from('campaign_activities')
      .insert([activityData])
      .select(`
        *,
        campaign:cultivation_campaigns!inner(
          id,
          name,
          farm_id,
          plot_id,
          crop_type_id,
          planted_area,
          status
        )
      `)
      .single()

    if (error) {
      console.error('Eroare la crearea activității:', error)
      return NextResponse.json(
        { error: 'Eroare la crearea activității' },
        { status: 500 }
      )
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Eroare neașteptată:', error)
    return NextResponse.json(
      { error: 'Eroare internă a serverului' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('id')

    if (!activityId) {
      return NextResponse.json(
        { error: 'ID activitate lipsește' },
        { status: 400 }
      )
    }

    const updateData: CampaignActivityUpdate = await request.json()

    const { data: activity, error } = await supabase
      .from('campaign_activities')
      .update(updateData)
      .eq('id', activityId)
      .select(`
        *,
        campaign:cultivation_campaigns!inner(
          id,
          name,
          farm_id,
          plot_id,
          crop_type_id,
          planted_area,
          status
        )
      `)
      .single()

    if (error) {
      console.error('Eroare la actualizarea activității:', error)
      return NextResponse.json(
        { error: 'Eroare la actualizarea activității' },
        { status: 500 }
      )
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Eroare neașteptată:', error)
    return NextResponse.json(
      { error: 'Eroare internă a serverului' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('id')

    if (!activityId) {
      return NextResponse.json(
        { error: 'ID activitate lipsește' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('campaign_activities')
      .delete()
      .eq('id', activityId)

    if (error) {
      console.error('Eroare la ștergerea activității:', error)
      return NextResponse.json(
        { error: 'Eroare la ștergerea activității' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Eroare neașteptată:', error)
    return NextResponse.json(
      { error: 'Eroare internă a serverului' },
      { status: 500 }
    )
  }
}
