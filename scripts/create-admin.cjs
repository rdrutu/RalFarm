// =====================================================
// RALFARM - SCRIPT PENTRU CREAREA PRIMULUI SUPER ADMIN
// =====================================================

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Verifică variabilele de mediu
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variabilele de mediu NEXT_PUBLIC_SUPABASE_URL și SUPABASE_SERVICE_ROLE_KEY trebuie să fie setate în .env.local');
  process.exit(1);
}

console.log('🔗 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('🔑 Service key loaded:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'YES' : 'NO');

// Inițializare Supabase cu service role key (admin)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSuperAdmin() {
  console.log('🛡️ Crearea super admin-ului...\n');

  try {
    const adminData = {
      email: 'admin@ralfarm.ro',  // 👈 Email pentru super admin
      password: 'admin123',       // 👈 Parolă pentru super admin
      full_name: 'Super Administrator',
      role: 'super_admin'
    };

    // 1. Creez utilizatorul în Supabase Auth
    console.log('📝 Creez contul în Supabase Auth...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminData.email,
      password: adminData.password,
      email_confirm: true, // Confirmă automat email-ul
      user_metadata: {
        full_name: adminData.full_name,
        role: adminData.role
      }
    });

    if (authError) {
      console.error('❌ Eroare la crearea contului în Auth:', authError);
      return;
    }

    console.log('✅ Cont Auth creat:', authUser.user.email);

    // 2. Adaug utilizatorul în tabela noastră
    console.log('📝 Adaug utilizatorul în tabela users...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{
        id: authUser.user.id, // Folosesc același ID ca în auth
        company_id: null,     // Super admin nu aparține unei companii
        username: 'admin',
        email: adminData.email,
        full_name: adminData.full_name,
        role: adminData.role,
        password_hash: 'managed_by_supabase_auth' // Placeholder
      }])
      .select()
      .single();

    if (userError) {
      console.error('❌ Eroare la inserarea în tabela users:', userError);
      return;
    }

    console.log('✅ Utilizator creat în tabela users');

    console.log('\n🎉 Super Admin creat cu succes!');
    console.log('\n📋 INFORMAȚII PENTRU LOGIN:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👤 ${adminData.full_name}`);
    console.log(`📧 Email: ${adminData.email}`);
    console.log(`🔑 Parolă: ${adminData.password}`);
    console.log(`🛡️  Rol: ${adminData.role}`);
    console.log('\n🔗 Accesează: http://localhost:3000/login');
    console.log('📍 Vei fi redirecționat automat la /admin');

  } catch (error) {
    console.error('❌ Eroare generală:', error);
  }
}

// Funcție pentru listarea utilizatorilor din Supabase Auth
async function listAuthUsers() {
  console.log('🔐 Utilizatorii din Supabase Auth:\n');

  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ Eroare la listarea utilizatorilor din Auth:', error);
      return;
    }

    if (users.users.length === 0) {
      console.log('📭 Nu există utilizatori în Supabase Auth.');
      return;
    }

    users.users.forEach(user => {
      console.log(`🔐 Auth User: ${user.email}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   ✅ Confirmat: ${user.email_confirmed_at ? 'Da' : 'Nu'}`);
      console.log(`   📅 Creat: ${new Date(user.created_at).toLocaleString('ro-RO')}`);
      if (user.user_metadata) {
        console.log('   📋 Metadata:', JSON.stringify(user.user_metadata, null, 2));
      }
      console.log('');
    });
  } catch (error) {
    console.error('❌ Eroare generală:', error);
  }
}

// Funcție pentru listarea utilizatorilor existenți
async function listUsers() {
  console.log('👥 Utilizatorii existenți:\n');

  const { data: users, error } = await supabase
    .from('users')
    .select(`
      id,
      username,
      email,
      full_name,
      role,
      status,
      company_id,
      companies (
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Eroare:', error);
    return;
  }

  if (users.length === 0) {
    console.log('📭 Nu există utilizatori înregistrați.');
    console.log('💡 Rulează: node scripts/create-admin.cjs create');
    return;
  }

  users.forEach(user => {
    console.log(`👤 ${user.full_name} (${user.role})`);
    console.log(`   🆔 ID: ${user.id}`);
    console.log(`   📧 ${user.email}`);
    console.log(`   👤 Username: ${user.username}`);
    if (user.companies) {
      console.log(`   🏢 Companie: ${user.companies.name}`);
    }
    console.log(`   📊 Status: ${user.status}`);
    console.log('');
  });
}

// Script principal
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'create':
      await createSuperAdmin();
      break;
    case 'list':
      await listUsers();
      break;
    case 'auth':
      await listAuthUsers();
      break;
    default:
      console.log('📖 Utilizare:');
      console.log('  node scripts/create-admin.cjs create  # Creează super admin');
      console.log('  node scripts/create-admin.cjs list    # Listează utilizatorii din BD');
      console.log('  node scripts/create-admin.cjs auth    # Listează utilizatorii din Auth');
  }
}

main().catch(console.error);
