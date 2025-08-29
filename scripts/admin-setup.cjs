// =====================================================
// RALFARM - SCRIPT ADMIN PENTRU CREAREA FIRMELOR ȘI UTILIZATORILOR
// =====================================================

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Inițializare Supabase cu service role key (admin)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createCompanyAndUsers() {
  console.log('🏢 Crearea firmei și utilizatorilor...\n');

  try {
    // 1. CREAREA FIRMEI
    console.log('📝 Creez firma...');
    const companyData = {
      name: 'Ferma Exemplu SRL',  // 👈 Schimbă cu datele tale
      legal_name: 'SOCIETATEA COMERCIALĂ FERMA EXEMPLU SRL',
      cui: 'RO12345678',  // 👈 Schimbă cu CUI-ul real
      address: 'Strada Fermei Nr. 123, Cluj-Napoca, Cluj',
      phone: '0740123456',
      email: 'contact@fermaexemplu.ro'
    };

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([companyData])
      .select()
      .single();

    if (companyError) {
      console.error('❌ Eroare la crearea firmei:', companyError);
      return;
    }

    console.log('✅ Firmă creată:', company.name);
    console.log('🆔 Company ID:', company.id);

    // 2. CREAREA UTILIZATORILOR ÎN SUPABASE AUTH
    console.log('\n👥 Creez utilizatorii în Supabase Auth...');

    const users = [
      {
        email: 'admin@fermaexemplu.ro',  // 👈 Email pentru login
        password: 'admin123',  // 👈 Parola
        full_name: 'Administrator Fermă',
        role: 'admin_company',
        username: 'admin'
      },
      {
        email: 'ferma1@fermaexemplu.ro',
        password: 'ferma123',
        full_name: 'Manager Fermă 1',
        role: 'admin_farm',
        username: 'ferma1'
      },
      {
        email: 'inginer@fermaexemplu.ro',
        password: 'inginer123',
        full_name: 'Inginer Agricol',
        role: 'engineer',
        username: 'inginer'
      }
    ];

    for (const userData of users) {
      // Creez utilizatorul în Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Confirmă automat email-ul
        user_metadata: {
          full_name: userData.full_name,
          company_id: company.id,
          role: userData.role,
          username: userData.username
        }
      });

      if (authError) {
        console.error(`❌ Eroare la crearea utilizatorului ${userData.username}:`, authError);
        continue;
      }

      // Adaug utilizatorul în tabela noastră
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert([{
          id: authUser.user.id, // Folosesc același ID ca în auth
          company_id: company.id,
          username: userData.username,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          password_hash: 'managed_by_supabase_auth' // Placeholder
        }])
        .select()
        .single();

      if (userError) {
        console.error(`❌ Eroare la inserarea utilizatorului în tabela users:`, userError);
        continue;
      }

      console.log(`✅ Utilizator creat: ${user.username} (${user.email})`);
      console.log(`   Parolă: ${userData.password}`);
    }

    console.log('\n🎉 Setup complet!');
    console.log('\n📋 INFORMAȚII PENTRU LOGIN:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.forEach(user => {
      console.log(`👤 ${user.full_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Parolă: ${user.password}`);
      console.log(`   Rol: ${user.role}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Eroare generală:', error);
  }
}

// Funcție pentru listarea firmelor existente
async function listCompanies() {
  console.log('🏢 Firmele existente:\n');

  const { data: companies, error } = await supabase
    .from('companies')
    .select(`
      *,
      users (
        id,
        username,
        email,
        full_name,
        role,
        status
      )
    `);

  if (error) {
    console.error('❌ Eroare:', error);
    return;
  }

  companies.forEach(company => {
    console.log(`🏢 ${company.name} (${company.cui})`);
    console.log(`   📧 ${company.email}`);
    console.log(`   👥 Utilizatori: ${company.users.length}`);
    
    company.users.forEach(user => {
      console.log(`      👤 ${user.full_name} - ${user.username} (${user.role})`);
    });
    console.log('');
  });
}

// Script principal
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'create':
      await createCompanyAndUsers();
      break;
    case 'list':
      await listCompanies();
      break;
    default:
      console.log('📖 Utilizare:');
      console.log('  node scripts/admin-setup.js create  # Creează firmă și utilizatori');
      console.log('  node scripts/admin-setup.js list    # Listează firmele existente');
  }
}

main().catch(console.error);
