import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'

type ActivityProduct = Database['public']['Tables']['activity_products']['Row']
type ActivityProductInsert = Database['public']['Tables']['activity_products']['Insert']
type ActivityProductUpdate = Database['public']['Tables']['activity_products']['Update']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('activity_id')

    if (!activityId) {
      return NextResponse.json(
        { error: 'ID activitate lipsește' },
        { status: 400 }
      )
    }

    const { data: activityProducts, error } = await supabase
      .from('activity_products')
      .select(`
        *,
        product:agricultural_products!inner(
          id,
          name,
          category,
          manufacturer,
          unit,
          price_per_unit,
          min_dose_per_ha,
          max_dose_per_ha,
          recommended_dose_per_ha,
          safety_period_days,
          preharvest_interval_days
        )
      `)
      .eq('activity_id', activityId)
      .order('created_at')

    if (error) {
      console.error('Eroare la încărcarea produselor activității:', error)
      return NextResponse.json(
        { error: 'Eroare la încărcarea produselor activității' },
        { status: 500 }
      )
    }

    return NextResponse.json(activityProducts)
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
    const activityProductData: ActivityProductInsert = await request.json()

    // Validări de bază
    if (!activityProductData.activity_id || !activityProductData.product_id) {
      return NextResponse.json(
        { error: 'Câmpurile obligatorii lipsesc' },
        { status: 400 }
      )
    }

    // Verifică dacă produsul nu există deja în activitate
    const { data: existing } = await supabase
      .from('activity_products')
      .select('id')
      .eq('activity_id', activityProductData.activity_id)
      .eq('product_id', activityProductData.product_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Produsul este deja adăugat în această activitate' },
        { status: 400 }
      )
    }

    // Dacă nu e specificat un preț planificat, folosește prețul din produs
    if (!activityProductData.planned_unit_cost) {
      const { data: product } = await supabase
        .from('agricultural_products')
        .select('price_per_unit')
        .eq('id', activityProductData.product_id)
        .single()

      if (product) {
        activityProductData.planned_unit_cost = product.price_per_unit
      }
    }

    const { data: activityProduct, error } = await supabase
      .from('activity_products')
      .insert([activityProductData])
      .select(`
        *,
        product:agricultural_products!inner(
          id,
          name,
          category,
          manufacturer,
          unit,
          price_per_unit,
          min_dose_per_ha,
          max_dose_per_ha,
          recommended_dose_per_ha,
          safety_period_days,
          preharvest_interval_days
        )
      `)
      .single()

    if (error) {
      console.error('Eroare la adăugarea produsului în activitate:', error)
      return NextResponse.json(
        { error: 'Eroare la adăugarea produsului în activitate' },
        { status: 500 }
      )
    }

    return NextResponse.json(activityProduct)
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
    const activityProductId = searchParams.get('id')

    if (!activityProductId) {
      return NextResponse.json(
        { error: 'ID legătură activitate-produs lipsește' },
        { status: 400 }
      )
    }

    const updateData: ActivityProductUpdate = await request.json()

    const { data: activityProduct, error } = await supabase
      .from('activity_products')
      .update(updateData)
      .eq('id', activityProductId)
      .select(`
        *,
        product:agricultural_products!inner(
          id,
          name,
          category,
          manufacturer,
          unit,
          price_per_unit,
          min_dose_per_ha,
          max_dose_per_ha,
          recommended_dose_per_ha,
          safety_period_days,
          preharvest_interval_days
        )
      `)
      .single()

    if (error) {
      console.error('Eroare la actualizarea produsului în activitate:', error)
      return NextResponse.json(
        { error: 'Eroare la actualizarea produsului în activitate' },
        { status: 500 }
      )
    }

    return NextResponse.json(activityProduct)
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
    const activityProductId = searchParams.get('id')

    if (!activityProductId) {
      return NextResponse.json(
        { error: 'ID legătură activitate-produs lipsește' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('activity_products')
      .delete()
      .eq('id', activityProductId)

    if (error) {
      console.error('Eroare la ștergerea produsului din activitate:', error)
      return NextResponse.json(
        { error: 'Eroare la ștergerea produsului din activitate' },
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
