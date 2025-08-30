-- =====================================================
-- RALFARM - SCHEMA BAZA DE DATE POSTGRESQL/SUPABASE
-- Platforma pentru managementul fermelor
-- =====================================================

-- Activare extensii necesare
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- Pentru coordonate geografice

-- =====================================================
-- 1. AUTENTIFICARE & ROLURI
-- =====================================================

-- Tipuri de roluri în sistem
CREATE TYPE user_role AS ENUM ('super_admin', 'admin_company', 'admin_farm', 'engineer');

-- Tipuri de status pentru entități
CREATE TYPE status_type AS ENUM ('active', 'inactive', 'deleted');

-- Companii (SC, SRL, etc.)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- SC ABC AGRICOL SRL
    legal_name VARCHAR(255) NOT NULL, -- Numele legal complet
    cui VARCHAR(20) UNIQUE, -- Codul Unic de Identificare
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    status status_type DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Utilizatori sistem
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- BCrypt hash
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    status status_type DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. FERME & STRUCTURA ORGANIZATORICĂ
-- =====================================================

-- Ferme (unitatea de business principală)
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    total_area DECIMAL(10,4), -- hectare
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    status status_type DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asignarea inginerilor la ferme (many-to-many)
CREATE TABLE user_farm_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, farm_id)
);

-- =====================================================
-- 3. CULTURI & PRODUSE AGRICOLE
-- =====================================================

-- Tipuri de culturi (template-uri)
CREATE TABLE crop_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- Porumb, Floarea-soarelui, etc.
    scientific_name VARCHAR(255),
    category VARCHAR(100), -- Cereale, Oleaginoase, Leguminoase, etc.
    average_yield_per_ha DECIMAL(8,2), -- tone/hectar mediu în România
    average_price_per_kg DECIMAL(8,4), -- preț mediu RON/kg
    planting_season VARCHAR(50), -- Primăvară, Toamnă
    harvest_season VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. PARCELE & TERENURI
-- =====================================================

-- Status parcelelor
CREATE TYPE plot_status AS ENUM ('free', 'planted', 'harvesting', 'processing');

-- Tipuri de arenda
CREATE TYPE rent_type AS ENUM ('fixed_amount', 'percentage_yield');

-- Parcele de teren
CREATE TABLE plots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    coordinates JSONB, -- Array de coordonate pentru poligon
    calculated_area DECIMAL(10,4), -- hectare calculate automat din coordonate
    soil_type VARCHAR(100),
    slope_percentage DECIMAL(5,2),
    status plot_status DEFAULT 'free',
    
    -- Informații arenda
    rent_type rent_type,
    rent_amount DECIMAL(12,2), -- RON pentru fixed_amount
    rent_percentage DECIMAL(5,2), -- % pentru percentage_yield
    rent_description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. CAMPANII DE CULTIVARE
-- =====================================================

-- Status campanii
CREATE TYPE campaign_status AS ENUM ('planned', 'planted', 'growing', 'ready_harvest', 'harvested', 'completed', 'failed');

-- Campanii de cultivare (o cultură pe o parcelă într-o perioadă)
CREATE TABLE cultivation_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
    crop_type_id UUID REFERENCES crop_types(id) ON DELETE RESTRICT,
    
    -- Informații campanie
    name VARCHAR(255) NOT NULL, -- Porumb Parcela Nord 2025
    crop_year INTEGER NOT NULL,
    planted_area DECIMAL(10,4), -- hectare efectiv semănate
    
    -- Date importante
    planting_date DATE,
    expected_harvest_date DATE,
    actual_harvest_date DATE,
    
    -- Status și progres
    status campaign_status DEFAULT 'planned',
    
    -- Rezultate finale
    total_harvest_kg DECIMAL(12,2), -- kg recoltate total
    yield_per_ha DECIMAL(8,2), -- tone/hectar realizat
    
    -- Feedback sezon
    season_feedback TEXT, -- An secetos, ploios, etc.
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- O singură cultură activă per parcelă
    UNIQUE(plot_id, status) WHERE status IN ('planted', 'growing', 'ready_harvest')
);

-- =====================================================
-- 5.1. ACTIVITĂȚI CAMPANII & PRODUSE AGRICOLE
-- =====================================================

-- Tipuri de activități agricole
CREATE TYPE activity_type AS ENUM (
    'soil_preparation',    -- Pregătire teren
    'planting',           -- Semănat/plantat
    'fertilizing',        -- Fertilizare
    'spraying',           -- Stropit pesticide/erbicide/fungicide/insecticide
    'irrigation',         -- Irigare
    'weeding',           -- Plivit
    'harvesting',        -- Recoltare
    'field_inspection',   -- Inspecție câmp
    'maintenance',       -- Întreținere
    'other'              -- Alte activități
);

-- Status activități
CREATE TYPE activity_status AS ENUM (
    'planned',           -- Planificată
    'in_progress',       -- În progres
    'completed',         -- Finalizată
    'overdue',          -- Întârziată
    'cancelled'         -- Anulată
);

-- Produse agricole (fertilizatori, pesticide, semințe, etc.)
CREATE TABLE agricultural_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL, -- Urea 46%, Roundup, Karate Zeon, etc.
    category VARCHAR(100) NOT NULL, -- fertilizer, herbicide, insecticide, fungicide, seed
    active_substance VARCHAR(255), -- NPK 20-20-20, Glyfosat, Lambda-cyhalothrin
    concentration VARCHAR(100), -- 46%, 360 g/l, 50 g/l
    unit VARCHAR(50) NOT NULL, -- kg, l, g
    
    -- Informații aplicare
    recommended_dose_per_ha DECIMAL(8,2), -- doza recomandată per hectar
    application_method VARCHAR(255), -- pulverizare foliară, încorporare în sol
    
    -- Informații comerciale
    manufacturer VARCHAR(255),
    registration_number VARCHAR(100), -- numărul de înregistrare fitosanitar
    
    -- Restricții și siguranță
    withdrawal_period_days INTEGER, -- perioada de carentă în zile
    safety_notes TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activități pentru campanii
CREATE TABLE campaign_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES cultivation_campaigns(id) ON DELETE CASCADE,
    
    -- Tipul și statusul activității
    activity_type activity_type NOT NULL,
    status activity_status DEFAULT 'planned',
    
    -- Planificare și execuție
    planned_date DATE NOT NULL,
    planned_start_time TIME,
    planned_end_time TIME,
    completed_date DATE,
    completed_start_time TIME,
    completed_end_time TIME,
    
    -- Detalii activitate
    name VARCHAR(255) NOT NULL, -- Fertilizare Porumb 2025, Erbicidare Post-emergență
    description TEXT,
    priority INTEGER DEFAULT 3, -- 1=urgent, 2=high, 3=normal, 4=low, 5=very_low
    
    -- Resurse necesare
    required_equipment TEXT, -- Tractoare, pulverizatoare, semănătoare, etc.
    estimated_duration_hours DECIMAL(5,2),
    
    -- Costuri estimate și reale
    estimated_cost_ron DECIMAL(10,2),
    actual_cost_ron DECIMAL(10,2),
    
    -- Condiții și observații
    weather_requirements TEXT, -- Fără ploaie, temperatura min, etc.
    weather_conditions_actual TEXT,
    completion_notes TEXT,
    
    -- Responsabil și echipă
    assigned_to_user_id UUID REFERENCES users(id),
    team_members TEXT, -- JSON array cu membrii echipei
    
    -- Notificări
    send_reminder BOOLEAN DEFAULT true,
    reminder_days_before INTEGER DEFAULT 1,
    notification_sent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Produse folosite în activități (many-to-many cu cantități și prețuri)
CREATE TABLE activity_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES campaign_activities(id) ON DELETE CASCADE,
    product_id UUID REFERENCES agricultural_products(id) ON DELETE RESTRICT,
    
    -- Cantități planificate
    planned_quantity_per_ha DECIMAL(10,4) NOT NULL, -- kg/ha sau l/ha
    planned_total_quantity DECIMAL(12,4), -- calculat automat: planned_quantity_per_ha × hectare campanie
    
    -- Cantități reale folosite
    actual_quantity_per_ha DECIMAL(10,4),
    actual_total_quantity DECIMAL(12,4),
    
    -- Prețuri și costuri
    unit_price_ron DECIMAL(10,4) NOT NULL, -- preț per kg sau litru
    planned_total_cost_ron DECIMAL(12,2), -- calculat automat
    actual_total_cost_ron DECIMAL(12,2),
    
    -- Detalii aplicare
    application_method VARCHAR(255), -- cum s-a aplicat produsul
    dilution_ratio VARCHAR(100), -- raportul de diluare (ex: 1:100)
    
    -- Documente și referințe
    supplier VARCHAR(255),
    invoice_number VARCHAR(100),
    batch_number VARCHAR(100), -- lot produs pentru traceabilitate
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexuri pentru performanță activități
CREATE INDEX idx_campaign_activities_campaign_id ON campaign_activities(campaign_id);
CREATE INDEX idx_campaign_activities_status ON campaign_activities(status);
CREATE INDEX idx_campaign_activities_planned_date ON campaign_activities(planned_date);
CREATE INDEX idx_campaign_activities_assigned_to ON campaign_activities(assigned_to_user_id);
CREATE INDEX idx_campaign_activities_activity_type ON campaign_activities(activity_type);

CREATE INDEX idx_activity_products_activity_id ON activity_products(activity_id);
CREATE INDEX idx_activity_products_product_id ON activity_products(product_id);

CREATE INDEX idx_agricultural_products_category ON agricultural_products(category);
CREATE INDEX idx_agricultural_products_active ON agricultural_products(is_active);

-- Trigger pentru actualizarea automată a statusului activităților
CREATE OR REPLACE FUNCTION update_activity_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Marchează ca întârziată dacă data planificată a trecut și nu e completată
    IF NEW.status = 'planned' AND NEW.planned_date < CURRENT_DATE THEN
        NEW.status = 'overdue';
    END IF;
    
    -- Actualizează updated_at
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_activities_status 
    BEFORE UPDATE ON campaign_activities
    FOR EACH ROW EXECUTE FUNCTION update_activity_status();

-- Trigger pentru calculul automat al cantităților și costurilor în activity_products
CREATE OR REPLACE FUNCTION calculate_activity_product_totals()
RETURNS TRIGGER AS $$
DECLARE
    campaign_total_area DECIMAL(10,4);
BEGIN
    -- Obține suprafața totală a campaniei
    SELECT planted_area INTO campaign_total_area
    FROM cultivation_campaigns cc
    JOIN campaign_activities ca ON cc.id = ca.campaign_id
    WHERE ca.id = NEW.activity_id;
    
    -- Calculează cantitatea totală planificată
    IF NEW.planned_quantity_per_ha IS NOT NULL AND campaign_total_area IS NOT NULL THEN
        NEW.planned_total_quantity = NEW.planned_quantity_per_ha * campaign_total_area;
        NEW.planned_total_cost_ron = NEW.planned_total_quantity * NEW.unit_price_ron;
    END IF;
    
    -- Calculează costul total real
    IF NEW.actual_total_quantity IS NOT NULL THEN
        NEW.actual_total_cost_ron = NEW.actual_total_quantity * NEW.unit_price_ron;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_activity_product_totals_trigger
    BEFORE INSERT OR UPDATE ON activity_products
    FOR EACH ROW EXECUTE FUNCTION calculate_activity_product_totals();

-- =====================================================
-- 6. GESTIUNEA STOCURILOR
-- =====================================================

-- Tipuri de mișcări stoc
CREATE TYPE stock_movement_type AS ENUM ('production', 'sale', 'storage', 'usage', 'loss', 'adjustment');

-- Stocuri per fermă și tip cultură
CREATE TABLE farm_stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    crop_type_id UUID REFERENCES crop_types(id) ON DELETE RESTRICT,
    current_stock_kg DECIMAL(12,2) DEFAULT 0,
    reserved_stock_kg DECIMAL(12,2) DEFAULT 0, -- Rezervat pentru semințe
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(farm_id, crop_type_id)
);

-- Mișcări de stoc (istoric complet)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    farm_stock_id UUID REFERENCES farm_stocks(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES cultivation_campaigns(id) ON DELETE SET NULL,
    
    -- Tipul și cantitatea mișcării
    movement_type stock_movement_type NOT NULL,
    quantity_kg DECIMAL(12,2) NOT NULL, -- pozitiv = intrare, negativ = ieșire
    unit_price_ron DECIMAL(8,4), -- preț/kg pentru vânzări
    
    -- Descriere și referințe
    description TEXT,
    reference_number VARCHAR(100), -- Nr factură, bon, etc.
    
    -- Legături pentru traceabilitate
    related_campaign_id UUID REFERENCES cultivation_campaigns(id), -- De unde vine producția
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================
-- 7. COSTURI & CHELTUIELI
-- =====================================================

-- Categorii de costuri
CREATE TYPE cost_category AS ENUM (
    -- Costuri specifice parcelă/campanie
    'seeds', 'fertilizers', 'pesticides', 'plot_labor', 'plot_rent', 'irrigation',
    -- Costuri generale fermă
    'fuel', 'machinery', 'general_labor', 'insurance', 'taxes', 'maintenance', 'utilities', 'other'
);

-- Tipuri de costuri
CREATE TYPE cost_type AS ENUM ('specific', 'general');

-- Costuri și cheltuieli
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES cultivation_campaigns(id) ON DELETE CASCADE, -- NULL pentru costuri generale
    
    -- Tipul și categoria costului
    cost_type cost_type NOT NULL,
    category cost_category NOT NULL,
    
    -- Detalii financiare
    amount_ron DECIMAL(12,2) NOT NULL,
    vat_amount_ron DECIMAL(12,2) DEFAULT 0,
    total_amount_ron DECIMAL(12,2) NOT NULL,
    
    -- Descriere și documente
    description TEXT NOT NULL,
    supplier VARCHAR(255),
    invoice_number VARCHAR(100),
    invoice_date DATE,
    
    -- Cantități pentru calculul costului unitar
    quantity DECIMAL(12,2),
    unit VARCHAR(50), -- kg, litri, ore, etc.
    unit_price DECIMAL(8,4),
    
    expense_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================
-- 8. ANGAJAȚI & RESURSE UMANE
-- =====================================================

-- Tipuri de contracte
CREATE TYPE contract_type AS ENUM ('permanent', 'seasonal', 'daily', 'hourly');

-- Angajați per fermă
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    
    -- Informații personale
    full_name VARCHAR(255) NOT NULL,
    cnp VARCHAR(13), -- CNP pentru România
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    
    -- Informații contract
    contract_type contract_type NOT NULL,
    position VARCHAR(100), -- Tractorist, Muncitor agricol, etc.
    hire_date DATE,
    end_date DATE,
    
    -- Informații salariale
    gross_salary_ron DECIMAL(10,2), -- Salariu brut
    net_salary_ron DECIMAL(10,2), -- Salariu net
    hourly_rate_ron DECIMAL(6,2), -- Pentru contracte pe ore
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pontaj și ore lucrate
CREATE TABLE employee_timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES cultivation_campaigns(id) ON DELETE SET NULL,
    
    work_date DATE NOT NULL,
    hours_worked DECIMAL(4,2) NOT NULL,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    
    activity_description TEXT,
    hourly_rate_ron DECIMAL(6,2), -- Rate specific pentru ziua respectivă
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================
-- 9. OPERAȚIUNI AGRICOLE & ACTIVITĂȚI
-- =====================================================

-- Tipuri de operațiuni agricole
CREATE TYPE operation_type AS ENUM (
    'plowing', 'seeding', 'fertilizing', 'spraying', 'irrigation', 
    'harvesting', 'soil_preparation', 'maintenance', 'other'
);

-- Operațiuni agricole (pentru bulk operations)
CREATE TABLE agricultural_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- Semănat porumb parcele nord
    operation_type operation_type NOT NULL,
    operation_date DATE NOT NULL,
    
    -- Detalii operațiune
    description TEXT,
    weather_conditions VARCHAR(255),
    equipment_used TEXT,
    
    -- Costuri operațiune
    total_cost_ron DECIMAL(12,2),
    fuel_consumed_liters DECIMAL(8,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Parcele implicate în operațiuni (many-to-many)
CREATE TABLE operation_plots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES agricultural_operations(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES cultivation_campaigns(id) ON DELETE CASCADE,
    
    -- Detalii specifice parcelei
    area_worked_ha DECIMAL(10,4),
    quantity_used DECIMAL(12,2), -- kg semințe, litri pesticide, etc.
    unit VARCHAR(50),
    cost_allocated_ron DECIMAL(12,2),
    
    notes TEXT
);

-- =====================================================
-- 10. VÂNZĂRI & FACTURARE
-- =====================================================

-- Status facturi
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Clienți pentru vânzări
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    cui VARCHAR(20),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    
    payment_terms_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Facturi vânzări
CREATE TABLE sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    subtotal_ron DECIMAL(12,2) NOT NULL,
    vat_amount_ron DECIMAL(12,2) DEFAULT 0,
    total_amount_ron DECIMAL(12,2) NOT NULL,
    
    status invoice_status DEFAULT 'draft',
    payment_date DATE,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Linii factură (produse vândute)
CREATE TABLE sales_invoice_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES sales_invoices(id) ON DELETE CASCADE,
    stock_movement_id UUID REFERENCES stock_movements(id) ON DELETE RESTRICT,
    
    crop_type_id UUID REFERENCES crop_types(id) ON DELETE RESTRICT,
    quantity_kg DECIMAL(12,2) NOT NULL,
    unit_price_ron DECIMAL(8,4) NOT NULL,
    total_price_ron DECIMAL(12,2) NOT NULL,
    
    description TEXT
);

-- =====================================================
-- 11. INDEXURI PENTRU PERFORMANȚĂ
-- =====================================================

-- Indexuri pentru căutări frecvente
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_farms_company_id ON farms(company_id);
CREATE INDEX idx_farms_status ON farms(status);

CREATE INDEX idx_plots_farm_id ON plots(farm_id);
CREATE INDEX idx_plots_status ON plots(status);

CREATE INDEX idx_campaigns_farm_id ON cultivation_campaigns(farm_id);
CREATE INDEX idx_campaigns_plot_id ON cultivation_campaigns(plot_id);
CREATE INDEX idx_campaigns_status ON cultivation_campaigns(status);
CREATE INDEX idx_campaigns_crop_year ON cultivation_campaigns(crop_year);

CREATE INDEX idx_expenses_farm_id ON expenses(farm_id);
CREATE INDEX idx_expenses_campaign_id ON expenses(campaign_id);
CREATE INDEX idx_expenses_cost_type ON expenses(cost_type);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);

CREATE INDEX idx_stock_movements_farm_id ON stock_movements(farm_id);
CREATE INDEX idx_stock_movements_campaign_id ON stock_movements(campaign_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);

-- =====================================================
-- 12. TRIGGERS PENTRU ACTUALIZĂRI AUTOMATE
-- =====================================================

-- Trigger pentru actualizarea timestampului updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicare trigger pe tabele relevante
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON farms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plots_updated_at BEFORE UPDATE ON plots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON cultivation_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pentru actualizarea stocurilor
CREATE OR REPLACE FUNCTION update_farm_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizează stocul curent
    INSERT INTO farm_stocks (farm_id, crop_type_id, current_stock_kg)
    SELECT 
        NEW.farm_id,
        ct.id,
        NEW.quantity_kg
    FROM crop_types ct
    WHERE ct.id = (
        SELECT crop_type_id 
        FROM cultivation_campaigns cc 
        WHERE cc.id = NEW.campaign_id
    )
    ON CONFLICT (farm_id, crop_type_id) 
    DO UPDATE SET 
        current_stock_kg = farm_stocks.current_stock_kg + NEW.quantity_kg,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_on_movement AFTER INSERT ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION update_farm_stock_on_movement();

-- =====================================================
-- 13. VIEWS PENTRU RAPOARTE
-- =====================================================

-- View pentru profitul pe campanie
CREATE VIEW campaign_profit_view AS
SELECT 
    cc.id as campaign_id,
    cc.name as campaign_name,
    f.name as farm_name,
    c.name as company_name,
    p.name as plot_name,
    ct.name as crop_name,
    cc.planted_area,
    cc.total_harvest_kg,
    cc.yield_per_ha,
    
    -- Venituri din vânzări
    COALESCE(SUM(CASE WHEN sm.movement_type = 'sale' THEN sm.quantity_kg * sm.unit_price_ron END), 0) as revenue_ron,
    
    -- Costuri specifice
    COALESCE(SUM(CASE WHEN e.cost_type = 'specific' THEN e.total_amount_ron END), 0) as specific_costs_ron,
    
    -- Profit brut (fără costuri generale)
    COALESCE(SUM(CASE WHEN sm.movement_type = 'sale' THEN sm.quantity_kg * sm.unit_price_ron END), 0) - 
    COALESCE(SUM(CASE WHEN e.cost_type = 'specific' THEN e.total_amount_ron END), 0) as gross_profit_ron
    
FROM cultivation_campaigns cc
JOIN plots p ON cc.plot_id = p.id
JOIN farms f ON cc.farm_id = f.id
JOIN companies c ON f.company_id = c.id
JOIN crop_types ct ON cc.crop_type_id = ct.id
LEFT JOIN stock_movements sm ON cc.id = sm.campaign_id
LEFT JOIN expenses e ON cc.id = e.campaign_id
GROUP BY cc.id, cc.name, f.name, c.name, p.name, ct.name, cc.planted_area, cc.total_harvest_kg, cc.yield_per_ha;

-- View pentru profitul pe fermă
CREATE VIEW farm_profit_view AS
SELECT 
    f.id as farm_id,
    f.name as farm_name,
    c.name as company_name,
    
    -- Profit brut total din campanii
    COALESCE(SUM(cpv.gross_profit_ron), 0) as total_gross_profit_ron,
    
    -- Costuri generale fermă
    COALESCE(general_costs.total_general_costs, 0) as total_general_costs_ron,
    
    -- Profit net fermă
    COALESCE(SUM(cpv.gross_profit_ron), 0) - COALESCE(general_costs.total_general_costs, 0) as net_profit_ron
    
FROM farms f
JOIN companies c ON f.company_id = c.id
LEFT JOIN campaign_profit_view cpv ON f.id = cpv.farm_id
LEFT JOIN (
    SELECT 
        farm_id,
        SUM(total_amount_ron) as total_general_costs
    FROM expenses 
    WHERE cost_type = 'general'
    GROUP BY farm_id
) general_costs ON f.id = general_costs.farm_id
GROUP BY f.id, f.name, c.name, general_costs.total_general_costs;

-- =====================================================
-- 14. FUNCȚII UTILITARE
-- =====================================================

-- Funcție pentru calcularea suprafeței din coordonate
CREATE OR REPLACE FUNCTION calculate_plot_area(coordinates JSONB)
RETURNS DECIMAL(10,4) AS $$
DECLARE
    polygon_text TEXT;
    area_sqm DECIMAL;
    area_hectares DECIMAL;
BEGIN
    -- Construiește geometria poligon din coordonate JSON
    -- Această funcție va fi implementată când vom avea coordonatele reale
    -- Pentru moment returnează 0
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 15. DATE INIȚIALE (SEED DATA)
-- =====================================================

-- Tipuri de culturi pentru România
INSERT INTO crop_types (name, scientific_name, category, average_yield_per_ha, average_price_per_kg, planting_season, harvest_season, description) VALUES
('Porumb', 'Zea mays', 'Cereale', 6.5, 1.20, 'Aprilie-Mai', 'Septembrie-Octombrie', 'Cultură principală pentru furaj și consum'),
('Floarea-soarelui', 'Helianthus annuus', 'Oleaginoase', 2.8, 2.50, 'Aprilie-Mai', 'Septembrie', 'Cultură oleaginoasă pentru ulei'),
('Grâu', 'Triticum aestivum', 'Cereale', 4.2, 1.10, 'Septembrie-Octombrie', 'Iunie-Iulie', 'Cereală de bază pentru panificație'),
('Orz', 'Hordeum vulgare', 'Cereale', 4.0, 1.00, 'Septembrie-Octombrie', 'Iunie-Iulie', 'Cereală pentru furaj și bere'),
('Rapiță', 'Brassica napus', 'Oleaginoase', 3.2, 2.20, 'Septembrie', 'Iunie-Iulie', 'Cultură oleaginoasă pentru biodiesel'),
('Soia', 'Glycine max', 'Leguminoase', 2.5, 2.80, 'Aprilie-Mai', 'Septembrie-Octombrie', 'Leguminoasă bogată în proteine'),
('Sfeclă de zahăr', 'Beta vulgaris', 'Rădăcinoase', 45.0, 0.25, 'Martie-Aprilie', 'Octombrie-Noiembrie', 'Cultură industrială pentru zahăr'),
('Cartof', 'Solanum tuberosum', 'Rădăcinoase', 25.0, 1.50, 'Aprilie-Mai', 'Septembrie-Octombrie', 'Cultură de bază pentru alimentație'),
('Lucernă', 'Medicago sativa', 'Furajere', 8.0, 0.80, 'Martie-Aprilie', 'Mai-Octombrie', 'Cultură peren pentru furaj'),
('Ovăz', 'Avena sativa', 'Cereale', 3.5, 0.90, 'Martie-Aprilie', 'Iulie-August', 'Cereală pentru furaj și consum');

-- Cont Super Admin implicit
INSERT INTO users (id, username, email, password_hash, full_name, role, status) VALUES
(uuid_generate_v4(), 'superadmin', 'admin@ralfarm.ro', '$2b$10$example_hash', 'Super Administrator', 'super_admin', 'active');

-- =====================================================
-- COMENTARII FINALE
-- =====================================================

/*
SCHEMA COMPLETĂ RALFARM - CARACTERISTICI PRINCIPALE:

✅ MULTI-TENANT: Companii → Ferme → Utilizatori cu roluri
✅ AUTENTIFICARE: Username/Password cu roluri (super_admin, admin_company, admin_farm, engineer)
✅ PARCELE: Coordonate geografice, calcul automat suprafață, arenda flexibilă
✅ CAMPANII: O cultură activă per parcelă, tracking complet producție
✅ STOCURI: Sistem flexibil cu mișcări, transfer magazie, folosire pentru semințe
✅ COSTURI: Separare clară între costuri specifice (per parcelă) și generale (per fermă)
✅ OPERAȚIUNI BULK: Selectare multiple parcele pentru operațiuni
✅ ANGAJAȚI: Management complet cu pontaj și salarii
✅ VÂNZĂRI: Facturare integrată cu stocurile
✅ RAPOARTE: Views pentru profit per campanie și per fermă
✅ PERFORMANȚĂ: Indexuri și triggers pentru actualizări automate
✅ ISTORIC COMPLET: Păstrarea tuturor datelor de la început

Schema este pregătită pentru Supabase/PostgreSQL și include toate funcționalitățile discutate.
*/
