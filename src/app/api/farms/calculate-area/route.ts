import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { farmId } = await request.json()

    if (!farmId) {
      return NextResponse.json(
        { error: 'Farm ID is required' },
        { status: 400 }
      )
    }

    // Calculează suprafața totală din parcele
    const { data: plots, error: plotsError } = await supabase
      .from('plots')
      .select('calculated_area')
      .eq('farm_id', farmId)

    if (plotsError) {
      console.error('Error fetching plots:', plotsError)
      return NextResponse.json(
        { error: 'Failed to fetch plots' },
        { status: 500 }
      )
    }

    // Calculează suprafața totală
    const totalArea = plots?.reduce((sum, plot) => sum + (plot.calculated_area || 0), 0) || 0

    // Actualizează ferma cu suprafața calculată
    const { error: updateError } = await supabase
      .from('farms')
      .update({ total_area: totalArea })
      .eq('id', farmId)

    if (updateError) {
      console.error('Error updating farm:', updateError)
      return NextResponse.json(
        { error: 'Failed to update farm area' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      total_area: totalArea,
      plots_count: plots?.length || 0
    })

  } catch (error: any) {
    console.error('Error calculating farm area:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
