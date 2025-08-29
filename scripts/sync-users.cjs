// =====================================================
// RALFARM - SCRIPT PENTRU SINCRONIZAREA ID-URILOR
// =====================================================

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Inițializare Supabase cu service role key (admin)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncUserIds() {
  console.log('🔄 Sincronizarea ID-urilor utilizatorilor...\n');

  try {
    // 1. Obține utilizatorii din Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('❌ Eroare la listarea utilizatorilor din Auth:', authError);
      return;
    }

    // 2. Obține utilizatorii din baza de date
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*');
    if (dbError) {
      console.error('❌ Eroare la listarea utilizatorilor din BD:', dbError);
      return;
    }

    console.log('📊 Utilizatori în Auth:', authUsers.users.length);
    console.log('📊 Utilizatori în BD:', dbUsers.length);

    // 3. Sincronizează utilizatorii
    for (const authUser of authUsers.users) {
      const dbUser = dbUsers.find(u => u.email === authUser.email);
      
      if (dbUser) {
        if (dbUser.id !== authUser.id) {
          console.log(`🔄 Sincronizez utilizatorul ${authUser.email}:`);
          console.log(`   🆔 Auth ID: ${authUser.id}`);
          console.log(`   🆔 BD ID:   ${dbUser.id}`);

          // Actualizează ID-ul în baza de date
          const { error: updateError } = await supabase
            .from('users')
            .update({ id: authUser.id })
            .eq('email', authUser.email);

          if (updateError) {
            console.error(`❌ Eroare la actualizarea utilizatorului ${authUser.email}:`, updateError);
          } else {
            console.log(`✅ ID actualizat pentru ${authUser.email}`);
          }
        } else {
          console.log(`✅ ID-urile sunt deja sincronizate pentru ${authUser.email}`);
        }
      } else {
        console.log(`⚠️  Utilizatorul ${authUser.email} există în Auth dar nu în BD`);
      }
    }

    console.log('\n🎉 Sincronizarea completă!');

  } catch (error) {
    console.error('❌ Eroare generală:', error);
  }
}

syncUserIds().catch(console.error);
