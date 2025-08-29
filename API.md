# RalFarm API Documentation

## 🚀 Endpoints Disponibile

### Autentificare
Toate endpoint-urile necesită un header de autentificare:
```
Authorization: Bearer your_supabase_jwt_token
```

### 📊 Companii
- `GET /api/companies` - Lista companii
- `POST /api/companies` - Creare companie nouă

**Roluri permise:** `super_admin`, `admin_company`

### 🏡 Ferme
- `GET /api/farms` - Lista ferme
- `POST /api/farms` - Creare fermă nouă

**Query params pentru GET:**
- `company_id` - Filtrare după companie

**Roluri permise:** Toate rolurile (cu restricții pe baza accesului)

### 🌾 Parcele
- `GET /api/plots` - Lista parcele
- `POST /api/plots` - Creare parcelă nouă

**Query params pentru GET:**
- `farm_id` - Filtrare după fermă
- `status` - Filtrare după status (`free`, `planted`, `harvesting`, `processing`)

**Roluri permise:** `super_admin`, `admin_company`, `admin_farm`

### 🌱 Campanii de Cultivare
- `GET /api/campaigns` - Lista campanii
- `POST /api/campaigns` - Creare campanie nouă

**Query params pentru GET:**
- `farm_id` - Filtrare după fermă
- `plot_id` - Filtrare după parcelă
- `status` - Filtrare după status
- `year` - Filtrare după an

**Roluri permise:** Toate rolurile (cu restricții pe baza accesului)

### 💰 Cheltuieli
- `GET /api/expenses` - Lista cheltuieli
- `POST /api/expenses` - Creare cheltuială nouă

**Query params pentru GET:**
- `farm_id` - Filtrare după fermă
- `campaign_id` - Filtrare după campanie
- `cost_type` - Filtrare după tip cost (`specific`, `general`)
- `category` - Filtrare după categorie
- `start_date` - Data de început (YYYY-MM-DD)
- `end_date` - Data de sfârșit (YYYY-MM-DD)

**Roluri permise:** Toate rolurile (cu restricții pe baza accesului)

## 🛠️ Structura Răspunsurilor

### Succes (200/201)
```json
{
  "message": "Operație realizată cu succes",
  "data": { ... }
}
```

### Eroare Validare (400)
```json
{
  "error": "Date invalide",
  "details": [
    {
      "field": "name",
      "message": "Numele este obligatoriu"
    }
  ]
}
```

### Eroare Autentificare (401)
```json
{
  "error": "Token de autentificare lipsește"
}
```

### Eroare Autorizare (403)
```json
{
  "error": "Acces interzis - rol insuficient"
}
```

### Eroare Server (500)
```json
{
  "error": "Eroare internă"
}
```

## 🔒 Sistemul de Roluri

### Super Admin (`super_admin`)
- Acces complet la toate resursele
- Poate crea și gestiona companii
- Poate vedea toate fermele, parcelele, campaniile

### Admin Companie (`admin_company`)
- Poate gestiona doar resursele companiei sale
- Poate crea ferme, parcele, campanii în compania sa
- Poate vedea toate cheltuielile companiei

### Admin Fermă (`admin_farm`)
- Poate gestiona doar fermele la care este asignat
- Poate crea parcele și campanii în fermele sale
- Poate vedea cheltuielile fermelor sale

### Inginer (`engineer`)
- Poate vedea și contribui la fermele asignate
- Poate crea campanii și cheltuieli
- Nu poate crea ferme sau parcele noi

## 📝 Exemple de Utilizare

### Creare Companie
```bash
curl -X POST /api/companies \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AGRO EXEMPLE SRL",
    "legal_name": "AGRO EXEMPLE SOCIETE CU RESPONSABILITATE LIMITATA",
    "cui": "RO12345678",
    "email": "contact@agroexemple.ro"
  }'
```

### Creare Fermă
```bash
curl -X POST /api/farms \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "uuid-here",
    "name": "Ferma Exemple",
    "total_area": 150.5,
    "address": "Sat Exemple, Comuna Exemple"
  }'
```

### Creare Campanie
```bash
curl -X POST /api/campaigns \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": "uuid-here",
    "plot_id": "uuid-here", 
    "crop_type_id": "uuid-here",
    "name": "Porumb Parcela A1 2025",
    "crop_year": 2025,
    "planted_area": 25.5,
    "planting_date": "2025-04-15"
  }'
```

## 🎯 Date Demo

Pentru testare, poți crea date demo cu:

```bash
# Creare date demo
npm run demo:create

# Ștergere date demo  
npm run demo:delete

# Resetare (ștergere + creare)
npm run demo:reset
```

Datele demo includ:
- 1 companie (AGRO DEMO SRL)
- 2 utilizatori (admin + engineer)  
- 2 ferme
- 3 parcele
- 2 campanii
- 2 cheltuieli

**Credențiale demo:**
- Admin: admin@agrodemo.ro
- Engineer: engineer@agrodemo.ro
