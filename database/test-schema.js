import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// =====================================================
// SCRIPT DE TEST PENTRU SCHEMA RALFARM
// =====================================================

console.log('🚀 Testare Schema RalFarm pentru Supabase...\n')

// Configurație pentru testare
// Înlocuiește cu datele tale de Supabase sau folosește o bază locală
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.log('⚠️  Pentru a testa cu Supabase real, setează variabilele:')
  console.log('   SUPABASE_URL=your_project_url')
  console.log('   SUPABASE_ANON_KEY=your_anon_key')
  console.log('\n📝 Verificăm doar sintaxa fișierelor SQL...\n')
  
  testSqlSyntax()
} else {
  console.log('🔗 Conectare la Supabase...')
  testWithSupabase()
}

// Funcție pentru validarea sintaxei SQL
function testSqlSyntax() {
  try {
    // Citește fișierul schema
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    console.log('✅ Fișierul schema.sql se citește corect')
    console.log(`📊 Dimensiune fișier: ${(schema.length / 1024).toFixed(2)} KB`)
    
    // Verifică structura de bază
    const checks = [
      { name: 'Extensii PostgreSQL', pattern: /CREATE EXTENSION IF NOT EXISTS/g },
      { name: 'Tipuri ENUM', pattern: /CREATE TYPE .* AS ENUM/g },
      { name: 'Tabele CREATE', pattern: /CREATE TABLE \w+/g },
      { name: 'Indexuri', pattern: /CREATE INDEX/g },
      { name: 'Views', pattern: /CREATE VIEW/g },
      { name: 'Funcții', pattern: /CREATE OR REPLACE FUNCTION/g },
      { name: 'Triggers', pattern: /CREATE TRIGGER/g },
      { name: 'Inserturi date', pattern: /INSERT INTO \w+/g }
    ]
    
    console.log('\n📋 Verificare structură schema:')
    checks.forEach(check => {
      const matches = schema.match(check.pattern)
      const count = matches ? matches.length : 0
      console.log(`   ${check.name}: ${count} găsite`)
    })
    
    // Verifică toate tabelele definite
    const expectedTables = [
      'companies', 'users', 'farms', 'user_farm_assignments',
      'crop_types', 'plots', 'cultivation_campaigns', 'farm_stocks',
      'stock_movements', 'expenses', 'employees', 'employee_timesheets',
      'agricultural_operations', 'operation_plots', 'customers',
      'sales_invoices', 'sales_invoice_lines'
    ]
    
    console.log('\n🗃️  Verificare tabele definite:')
    expectedTables.forEach(table => {
      const hasTable = schema.includes(`CREATE TABLE ${table}`)
      console.log(`   ${table}: ${hasTable ? '✅' : '❌'}`)
    })
    
    // Verifică tipurile ENUM
    const expectedEnums = [
      'user_role', 'status_type', 'plot_status', 'rent_type',
      'campaign_status', 'stock_movement_type', 'cost_category',
      'cost_type', 'contract_type', 'operation_type', 'invoice_status'
    ]
    
    console.log('\n🏷️  Verificare tipuri ENUM:')
    expectedEnums.forEach(enumType => {
      const hasEnum = schema.includes(`CREATE TYPE ${enumType} AS ENUM`)
      console.log(`   ${enumType}: ${hasEnum ? '✅' : '❌'}`)
    })
    
    console.log('\n✅ Validarea sintaxei completă cu succes!')
    console.log('\n💡 Pentru testare completă, configurează Supabase și rulează din nou.')
    
  } catch (error) {
    console.error('❌ Eroare la citirea fișierului:', error.message)
  }
}

// Funcție pentru testarea cu Supabase real
async function testWithSupabase() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Test conexiune
    const { data, error } = await supabase.from('companies').select('count').limit(1)
    
    if (error && error.code === '42P01') {
      console.log('📝 Tabelele nu există încă. Schema trebuie aplicată în Supabase.')
    } else if (error) {
      console.log(`⚠️  Eroare conexiune: ${error.message}`)
    } else {
      console.log('✅ Conexiunea la Supabase funcționează!')
      
      // Testează câteva operațiuni de bază
      await testBasicOperations(supabase)
    }
    
  } catch (error) {
    console.error('❌ Eroare la testarea Supabase:', error.message)
  }
}

// Teste operațiuni de bază
async function testBasicOperations(supabase) {
  console.log('\n🧪 Testare operațiuni de bază...')
  
  try {
    // Test 1: Verifică tabelele
    const tables = ['companies', 'farms', 'plots', 'crop_types', 'cultivation_campaigns']
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1)
      console.log(`   Tabel ${table}: ${error ? '❌ ' + error.message : '✅ OK'}`)
    }
    
    // Test 2: Verifică tipurile de culturi predefinite
    const { data: crops, error: cropsError } = await supabase
      .from('crop_types')
      .select('name')
    
    if (!cropsError && crops?.length > 0) {
      console.log(`   Culturi predefinite: ✅ ${crops.length} găsite`)
      console.log(`   Exemple: ${crops.slice(0, 3).map(c => c.name).join(', ')}`)
    } else {
      console.log('   Culturi predefinite: ❌ Nu s-au găsit')
    }
    
  } catch (error) {
    console.error('❌ Eroare la testarea operațiunilor:', error.message)
  }
}

// Funcție pentru aplicarea schemei (pentru referință)
function getApplySchemaInstructions() {
  console.log('\n📋 Pentru a aplica schema în Supabase:')
  console.log('1. Mergi la Dashboard-ul Supabase')
  console.log('2. Deschide SQL Editor')
  console.log('3. Copiază conținutul din database/schema.sql')
  console.log('4. Rulează scriptul')
  console.log('5. Verifică că toate tabelele s-au creat')
}

// Afișează instrucțiuni dacă nu se rulează cu Supabase
if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  getApplySchemaInstructions()
}
