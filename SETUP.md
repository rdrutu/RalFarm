# 🚀 Ghid Complet de Configurare RalFarm

## 📋 Pasul 1: Configurare Supabase

### 1.1 Creează un nou proiect Supabase
1. Mergi la [supabase.com](https://supabase.com)
2. Creează un cont sau loghează-te
3. Apasă pe "New Project"
4. Alege un nume (ex: "ralfarm")
5. Setează o parolă pentru baza de date
6. Alege regiunea (Europe West pentru România)

### 1.2 Aplică schema bazei de date
1. În dashboard-ul Supabase, mergi la **SQL Editor**
2. Copiază întregul conținut din `database/supabase_schema.sql`
3. Lipește-l în editor-ul SQL
4. Apasă **Run** pentru a executa schema
5. Verifică că toate tabelele s-au creat în secțiunea **Table Editor**

### 1.3 Obține cheile API
1. Mergi la **Settings** > **API**
2. Copiază următoarele valori:
   - **Project URL** (ex: https://xyz123.supabase.co)
   - **anon public** key
   - **service_role** key (doar pentru admin)

## 📋 Pasul 2: Configurare Environment Variables

### 2.1 Actualizează .env.local
Deschide fișierul `.env.local` și înlocuiește cu valorile tale:

```bash
# Înlocuiește cu valorile din Supabase Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Generează o cheie secretă pentru produse
NEXTAUTH_SECRET=your-super-secret-key-32-chars-min
NEXTAUTH_URL=http://localhost:3000
```

### 2.2 Generează NEXTAUTH_SECRET
Rulează în terminal:
```bash
openssl rand -base64 32
```
Sau folosește un generator online pentru o cheie de 32+ caractere.

## 📋 Pasul 3: Instalare și Pornire

### 3.1 Instalează dependențele
```bash
npm install
```

### 3.2 Testează configurația
```bash
npm run test:schema
```
Ar trebui să vezi mesajul "Schema aplicată cu succes!"

### 3.3 Pornește serverul de development
```bash
npm run dev
```
Aplicația va fi disponibilă la http://localhost:3000

## 📋 Pasul 4: Creare și Testare Date Demo

### 4.1 Creează date demo
```bash
npm run demo:create
```

Acest command va crea:
- 1 companie demo (AGRO DEMO SRL)
- 2 utilizatori (admin + engineer)
- 2 ferme
- 3 parcele
- 2 campanii de cultivare
- 2 cheltuieli

### 4.2 Credențiale demo create
- **Admin**: admin@agrodemo.ro
- **Engineer**: engineer@agrodemo.ro
- **Parole**: Pentru demo, parolele sunt hash-uri statice

### 4.3 Comenzi utile pentru date demo
```bash
npm run demo:delete  # Șterge datele demo
npm run demo:reset   # Resetează (șterge + creează din nou)
```

## 📋 Pasul 5: Testare API Endpoints

### 5.1 Endpoints disponibile
Toate endpoint-urile sunt în `/api/`:

- **Companii**: `GET|POST /api/companies`
- **Ferme**: `GET|POST /api/farms`
- **Parcele**: `GET|POST /api/plots`
- **Campanii**: `GET|POST /api/campaigns`
- **Cheltuieli**: `GET|POST /api/expenses`

### 5.2 Testare cu cURL (după configurarea Supabase)

```bash
# Testează endpoint-ul companiilor
curl http://localhost:3000/api/companies \
  -H "Authorization: Bearer your-jwt-token"

# Creează o companie nouă
curl -X POST http://localhost:3000/api/companies \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TEST AGRO SRL",
    "legal_name": "TEST AGRO SOCIETE CU RESPONSABILITATE LIMITATA",
    "cui": "RO99999999"
  }'
```

### 5.3 Pentru testare completă
Pentru a testa API-urile complet, vei avea nevoie de:
1. Supabase Auth configurat pentru autentificare
2. JWT tokens valide pentru requests
3. Utilizatori creați în sistem

## 📋 Pasul 6: Dezvoltare Continuă

### 6.1 Structura proiectului
```
src/
├── app/              # Pages (App Router)
├── lib/              # Utilities (Supabase, auth)
├── types/            # TypeScript definitions
└── components/       # React components (viitor)

database/
├── supabase_schema.sql  # Schema completă
└── test-schema.js       # Script de testare

scripts/
└── demo.js              # Management date demo
```

### 6.2 Următorii pași recomandați
1. **Autentificare**: Implementează Supabase Auth
2. **Frontend**: Construiește interfața pentru fermieri
3. **Dashboard**: Pagini pentru ferme, parcele, campanii
4. **Hărți**: Integrează Google Maps pentru parcele
5. **Rapoarte**: Grafice pentru profituri și costuri

### 6.3 Resurse utile
- [Documentația Supabase](https://supabase.com/docs)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zod Validation](https://zod.dev/)

## 🆘 Troubleshooting

### Probleme comune:

1. **"Cannot find module '@/types/database'"**
   - Verifică că fișierul `src/types/database.ts` există
   - Restartează TypeScript server în VS Code

2. **"Missing Supabase environment variables"**
   - Verifică că `.env.local` are toate variabilele
   - Restartează serverul de development

3. **"Token de autentificare lipsește"**
   - API-urile necesită autentificare
   - Implementează Supabase Auth pentru JWT tokens

4. **Erori la aplicarea schemei**
   - Verifică că ai ales regiunea corectă în Supabase
   - Unele extensii PostgreSQL pot necesita activare manuală

## ✅ Checklist Final

- [ ] Proiect Supabase creat
- [ ] Schema aplicată cu succes
- [ ] Variabile de mediu configurate
- [ ] Serverul development pornește fără erori
- [ ] Date demo create și testate
- [ ] API endpoints răspund (cu autentificare)

**Felicitări! RalFarm este gata pentru dezvoltare! 🎉**
