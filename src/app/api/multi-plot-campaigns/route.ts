import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface PlotAssignment {
  plot_id: string;
  planted_area_ha: number;
}

interface CampaignPlot {
  campaign_id: string;
}

interface Plot {
  id: string;
  calculated_area: number;
}

interface ConflictCampaign {
  plot_id: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farm_id');
    const status = searchParams.get('status');
    const year = searchParams.get('year');
    const season = searchParams.get('season');

    let query = supabase
      .from('multi_plot_campaign_details')
      .select('*')
      .order('created_at', { ascending: false });

    if (farmId) {
      // Filtrare după fermă prin parcele
      const { data: campaignIds } = await supabase
        .from('campaign_plots')
        .select('campaign_id, plots!inner(farm_id)')
        .eq('plots.farm_id', farmId);
      
      if (campaignIds && campaignIds.length > 0) {
        const ids = campaignIds.map((c: CampaignPlot) => c.campaign_id);
        query = query.in('campaign_id', ids);
      } else {
        // Nu există campanii pentru această fermă
        return NextResponse.json([]);
      }
    }

    if (status) {
      query = query.eq('campaign_status', status);
    }

    if (year) {
      query = query.eq('year', parseInt(year));
    }

    if (season) {
      query = query.eq('season', season);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching multi-plot campaigns:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in multi-plot campaigns API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      crop_type,
      season,
      year,
      start_date,
      end_date,
      notes,
      plot_assignments // Array of { plot_id, planted_area_ha }
    } = body;

    // Validare date
    if (!name || !crop_type || !season || !year || !plot_assignments || plot_assignments.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, crop_type, season, year, plot_assignments' },
        { status: 400 }
      );
    }

    // Verifică că toate parcelele există și calculează suprafața totală
    const plotIds = plot_assignments.map((p: PlotAssignment) => p.plot_id);
    const { data: plots, error: plotsError } = await supabase
      .from('plots')
      .select('id, calculated_area')
      .in('id', plotIds);

    if (plotsError) {
      return NextResponse.json({ error: plotsError.message }, { status: 500 });
    }

    if (!plots || plots.length !== plotIds.length) {
      return NextResponse.json(
        { error: 'Some plots do not exist' },
        { status: 400 }
      );
    }

    // Calculează suprafața totală plantată
    const total_area_ha = plot_assignments.reduce((sum: number, p: PlotAssignment) => sum + p.planted_area_ha, 0);

    // Verifică că suprafața plantată nu depășește suprafața parcelei
    for (const assignment of plot_assignments) {
      const plot = plots.find((p: Plot) => p.id === assignment.plot_id);
      if (plot && assignment.planted_area_ha > plot.calculated_area) {
        return NextResponse.json(
          { error: `Planted area (${assignment.planted_area_ha}ha) exceeds plot area (${plot.calculated_area}ha) for plot ${assignment.plot_id}` },
          { status: 400 }
        );
      }
    }

    // Verifică că parcelele nu sunt deja în alte campanii active în același sezon
    const { data: existingCampaigns, error: existingError } = await supabase
      .from('campaign_plots')
      .select(`
        plot_id,
        multi_plot_campaigns!inner(season, year, status)
      `)
      .in('plot_id', plotIds)
      .eq('multi_plot_campaigns.season', season)
      .eq('multi_plot_campaigns.year', year)
      .in('multi_plot_campaigns.status', ['planned', 'active']);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existingCampaigns && existingCampaigns.length > 0) {
      const conflictPlots = existingCampaigns.map((c: ConflictCampaign) => c.plot_id);
      return NextResponse.json(
        { error: `Plots ${conflictPlots.join(', ')} are already assigned to other active campaigns in ${season} ${year}` },
        { status: 409 }
      );
    }

    // Creează campania
    const { data: campaign, error: campaignError } = await supabase
      .from('multi_plot_campaigns')
      .insert([{
        name,
        crop_type,
        season,
        year,
        total_area_ha,
        start_date,
        end_date,
        notes,
        status: 'planned'
      }])
      .select()
      .single();

    if (campaignError) {
      return NextResponse.json({ error: campaignError.message }, { status: 500 });
    }

    // Adaugă parcelele la campanie
    const plotData = plot_assignments.map((assignment: PlotAssignment) => ({
      campaign_id: campaign.id,
      plot_id: assignment.plot_id,
      planted_area_ha: assignment.planted_area_ha
    }));

    const { error: plotsAssignError } = await supabase
      .from('campaign_plots')
      .insert(plotData);

    if (plotsAssignError) {
      // Șterge campania dacă nu s-au putut adăuga parcelele
      await supabase
        .from('multi_plot_campaigns')
        .delete()
        .eq('id', campaign.id);
      
      return NextResponse.json({ error: plotsAssignError.message }, { status: 500 });
    }

    // Returnează campania cu parcelele
    const { data: fullCampaign, error: fullError } = await supabase
      .from('multi_plot_campaign_details')
      .select('*')
      .eq('campaign_id', campaign.id)
      .single();

    if (fullError) {
      return NextResponse.json({ error: fullError.message }, { status: 500 });
    }

    return NextResponse.json(fullCampaign, { status: 201 });
  } catch (error) {
    console.error('Error creating multi-plot campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
