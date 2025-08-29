import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

// Schema validare pentru creare companie
const createCompanySchema = z.object({
  name: z.string().min(2, 'Numele companiei trebuie să aibă minim 2 caractere'),
  legal_name: z.string().min(2, 'Numele legal trebuie să aibă minim 2 caractere'),
  cui: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalid').optional()
})

// GET /api/companies - Lista companii
export const GET = withAuth(async (req) => {
  const { user } = req

  try {
    let query = supabase
      .from('companies')
      .select('*')
      .eq('status', 'active')
      .order('name')

    // Dacă nu e super admin, vezi doar compania proprie
    if (user?.role !== 'super_admin' && user?.company_id) {
      query = query.eq('id', user.company_id)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Eroare la obținerea companiilor' },
        { status: 500 }
      )
    }

    return NextResponse.json({ companies: data })
  } catch (error) {
    console.error('Eroare GET companies:', error)
    return NextResponse.json(
      { error: 'Eroare internă' },
      { status: 500 }
    )
  }
}, ['super_admin', 'admin_company'])

// POST /api/companies - Creare companie nouă
export const POST = withAuth(async (req) => {
  const { user } = req

  try {
    const body = await req.json()
    const validatedData = createCompanySchema.parse(body)

    const { data, error } = await supabase
      .from('companies')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Eroare la crearea companiei' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Companie creată cu succes',
      company: data 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Date invalide', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Eroare POST companies:', error)
    return NextResponse.json(
      { error: 'Eroare internă' },
      { status: 500 }
    )
  }
}, ['super_admin'])
