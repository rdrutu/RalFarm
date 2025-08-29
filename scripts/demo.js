#!/usr/bin/env node

/**
 * Script pentru crearea datelor demo în RalFarm
 * Rulează cu: npm run demo:create
 */

// Pentru ES modules, trebuie să importăm direct cu extensia .js
import { createDemoData, deleteDemoData } from '../src/lib/demo-data.js'

async function main() {
  const command = process.argv[2]

  switch (command) {
    case 'create':
      await createDemoData()
      break
    
    case 'delete':
      await deleteDemoData()
      break
    
    case 'reset':
      console.log('🔄 Resetez datele demo...')
      await deleteDemoData()
      await new Promise(resolve => setTimeout(resolve, 1000)) // Pauză 1s
      await createDemoData()
      break
    
    default:
      console.log('📖 Utilizare:')
      console.log('  npm run demo:create  - Creează date demo')
      console.log('  npm run demo:delete  - Șterge date demo')
      console.log('  npm run demo:reset   - Resetează (șterge + creează)')
      process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ Eroare:', error)
  process.exit(1)
})
