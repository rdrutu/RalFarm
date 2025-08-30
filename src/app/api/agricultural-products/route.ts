import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'

type AgriculturalProduct = Database['public']['Tables']['agricultural_products']['Row']
type AgriculturalProductInsert = Database['public']['Tables']['agricultural_products']['Insert']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('active')
    const search = searchParams.get('search')

    let query = supabase
      .from('agricultural_products')
      .select('*')
      .order('name')

    // Filtrare după categorie
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Filtrare după status activ
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    // Căutare după nume sau producător
    if (search) {
      query = query.or(`name.ilike.%${search}%,manufacturer.ilike.%${search}%`)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('Eroare la încărcarea produselor agricole:', error)
      return NextResponse.json(
        { error: 'Eroare la încărcarea produselor agricole' },
        { status: 500 }
      )
    }

    return NextResponse.json(products)
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
    const productData: AgriculturalProductInsert = await request.json()

    // Validări de bază
    if (!productData.name || !productData.category || !productData.unit || !productData.price_per_unit) {
      return NextResponse.json(
        { error: 'Câmpurile obligatorii lipsesc' },
        { status: 400 }
      )
    }

    const { data: product, error } = await supabase
      .from('agricultural_products')
      .insert([productData])
      .select()
      .single()

    if (error) {
      console.error('Eroare la crearea produsului agricol:', error)
      return NextResponse.json(
        { error: 'Eroare la crearea produsului agricol' },
        { status: 500 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Eroare neașteptată:', error)
    return NextResponse.json(
      { error: 'Eroare internă a serverului' },
      { status: 500 }
    )
  }
}
