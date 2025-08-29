import { supabase } from './supabase.js'

// Funcție pentru crearea datelor demo
export async function createDemoData() {
  try {
    console.log('🌱 Creez date demo pentru RalFarm...')

    // 1. Creare companie demo
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: 'AGRO DEMO SRL',
        legal_name: 'AGRO DEMO SOCIETE CU RESPONSABILITATE LIMITATA',
        cui: 'RO12345678',
        address: 'Sat Demo, Comuna Demo, Județul Dolj',
        phone: '+40712345678',
        email: 'contact@agrodemo.ro'
      })
      .select()
      .single()

    if (companyError) {
      console.error('Eroare creare companie:', companyError)
      return
    }

    console.log('✅ Companie creată:', company.name)

    // 2. Creare utilizatori demo
    const users = [
      {
        company_id: company.id,
        username: 'admin_demo',
        email: 'admin@agrodemo.ro',
        password_hash: '$2b$10$example_hash_admin',
        full_name: 'Administrator Demo',
        role: 'admin_company' as const
      },
      {
        company_id: company.id,
        username: 'engineer_demo',
        email: 'engineer@agrodemo.ro',
        password_hash: '$2b$10$example_hash_engineer',
        full_name: 'Inginer Agricol Demo',
        role: 'engineer' as const
      }
    ]

    const { data: createdUsers, error: usersError } = await supabase
      .from('users')
      .insert(users)
      .select()

    if (usersError) {
      console.error('Eroare creare utilizatori:', usersError)
      return
    }

    console.log('✅ Utilizatori creați:', createdUsers.length)

    // 3. Creare ferme demo
    const farms = [
      {
        company_id: company.id,
        name: 'Ferma Nord',
        description: 'Ferma principală din zona de nord',
        address: 'Sat Nord, Comuna Demo',
        total_area: 150.5,
        latitude: 44.3302,
        longitude: 23.7949
      },
      {
        company_id: company.id,
        name: 'Ferma Sud',
        description: 'Ferma secundară din zona de sud',
        address: 'Sat Sud, Comuna Demo',
        total_area: 89.2,
        latitude: 44.3100,
        longitude: 23.8100
      }
    ]

    const { data: createdFarms, error: farmsError } = await supabase
      .from('farms')
      .insert(farms)
      .select()

    if (farmsError) {
      console.error('Eroare creare ferme:', farmsError)
      return
    }

    console.log('✅ Ferme create:', createdFarms.length)

    // 4. Asignare utilizatori la ferme
    const assignments = [
      {
        user_id: createdUsers[1].id, // engineer
        farm_id: createdFarms[0].id  // Ferma Nord
      },
      {
        user_id: createdUsers[1].id, // engineer
        farm_id: createdFarms[1].id  // Ferma Sud
      }
    ]

    const { error: assignmentsError } = await supabase
      .from('user_farm_assignments')
      .insert(assignments)

    if (assignmentsError) {
      console.error('Eroare asignare utilizatori:', assignmentsError)
      return
    }

    console.log('✅ Asignări create')

    // 5. Creare parcele demo
    const plots = [
      {
        farm_id: createdFarms[0].id,
        name: 'Parcela A1',
        description: 'Parcelă din zona nordică a fermei',
        calculated_area: 25.5,
        soil_type: 'Cernoziom',
        slope_percentage: 2.5,
        rent_type: 'fixed_amount' as const,
        rent_amount: 300,
        rent_description: 'Arenda anuală 300 RON/ha'
      },
      {
        farm_id: createdFarms[0].id,
        name: 'Parcela A2',
        description: 'Parcelă centrală mare',
        calculated_area: 45.0,
        soil_type: 'Cernoziom',
        slope_percentage: 1.8
      },
      {
        farm_id: createdFarms[1].id,
        name: 'Parcela B1',
        description: 'Parcelă din ferma sud',
        calculated_area: 30.2,
        soil_type: 'Lut argilos',
        slope_percentage: 3.2,
        rent_type: 'percentage_yield' as const,
        rent_percentage: 15,
        rent_description: '15% din recoltă'
      }
    ]

    const { data: createdPlots, error: plotsError } = await supabase
      .from('plots')
      .insert(plots)
      .select()

    if (plotsError) {
      console.error('Eroare creare parcele:', plotsError)
      return
    }

    console.log('✅ Parcele create:', createdPlots.length)

    // 6. Obținere tipuri de culturi existente
    const { data: cropTypes, error: cropTypesError } = await supabase
      .from('crop_types')
      .select('*')
      .limit(3)

    if (cropTypesError || !cropTypes) {
      console.error('Eroare obținere tipuri culturi:', cropTypesError)
      return
    }

    // 7. Creare campanii demo
    const campaigns = [
      {
        farm_id: createdFarms[0].id,
        plot_id: createdPlots[0].id,
        crop_type_id: cropTypes[0].id, // Porumb
        name: 'Porumb Parcela A1 2025',
        crop_year: 2025,
        planted_area: 25.5,
        planting_date: '2025-04-15',
        expected_harvest_date: '2025-09-15',
        status: 'planned' as const
      },
      {
        farm_id: createdFarms[0].id,
        plot_id: createdPlots[1].id,
        crop_type_id: cropTypes[1].id, // Floarea-soarelui
        name: 'Floarea-soarelui Parcela A2 2025',
        crop_year: 2025,
        planted_area: 45.0,
        planting_date: '2025-04-20',
        expected_harvest_date: '2025-09-01',
        status: 'planned' as const
      }
    ]

    const { data: createdCampaigns, error: campaignsError } = await supabase
      .from('cultivation_campaigns')
      .insert(campaigns)
      .select()

    if (campaignsError) {
      console.error('Eroare creare campanii:', campaignsError)
      return
    }

    console.log('✅ Campanii create:', createdCampaigns.length)

    // 8. Creare cheltuieli demo
    const expenses = [
      {
        farm_id: createdFarms[0].id,
        campaign_id: createdCampaigns[0].id,
        cost_type: 'specific' as const,
        category: 'seeds' as const,
        amount_ron: 2500,
        vat_amount_ron: 475,
        total_amount_ron: 2975,
        description: 'Semințe porumb hibrid Pioneer',
        supplier: 'AGRO SEEDS SRL',
        invoice_number: 'F2025001',
        invoice_date: '2025-03-15',
        quantity: 50,
        unit: 'kg',
        unit_price: 50,
        expense_date: '2025-03-15',
        created_by: createdUsers[0].id
      },
      {
        farm_id: createdFarms[0].id,
        cost_type: 'general' as const,
        category: 'fuel' as const,
        amount_ron: 1200,
        vat_amount_ron: 228,
        total_amount_ron: 1428,
        description: 'Motorină pentru tractor',
        supplier: 'PETROM',
        expense_date: '2025-03-20',
        quantity: 800,
        unit: 'litri',
        unit_price: 1.5,
        created_by: createdUsers[1].id
      }
    ]

    const { error: expensesError } = await supabase
      .from('expenses')
      .insert(expenses)

    if (expensesError) {
      console.error('Eroare creare cheltuieli:', expensesError)
      return
    }

    console.log('✅ Cheltuieli create:', expenses.length)

    console.log('\n🎉 Date demo create cu succes!')
    console.log('\n📊 Rezumat:')
    console.log(`• Companie: ${company.name}`)
    console.log(`• Utilizatori: ${createdUsers.length}`)
    console.log(`• Ferme: ${createdFarms.length}`)
    console.log(`• Parcele: ${createdPlots.length}`)
    console.log(`• Campanii: ${createdCampaigns.length}`)
    console.log(`• Cheltuieli: ${expenses.length}`)

    console.log('\n🔑 Credențiale test:')
    console.log('Admin: admin@agrodemo.ro')
    console.log('Engineer: engineer@agrodemo.ro')

    return {
      company,
      users: createdUsers,
      farms: createdFarms,
      plots: createdPlots,
      campaigns: createdCampaigns
    }

  } catch (error) {
    console.error('❌ Eroare generală creare date demo:', error)
    throw error
  }
}

// Funcție pentru ștergearea datelor demo
export async function deleteDemoData() {
  try {
    console.log('🗑️ Șterg datele demo...')

    // Șterge compania demo (cascading va șterge restul)
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('name', 'AGRO DEMO SRL')

    if (error) {
      console.error('Eroare ștergere date demo:', error)
      return
    }

    console.log('✅ Date demo șterse cu succes!')

  } catch (error) {
    console.error('❌ Eroare generală ștergere date demo:', error)
    throw error
  }
}
