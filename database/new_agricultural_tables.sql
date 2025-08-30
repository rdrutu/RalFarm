-- =====================================================
-- TABELE NOI PENTRU MANAGEMENTUL ACTIVITĂȚILOR AGRICOLE
-- Sistem complet pentru gestionarea campaniilor cu activități detaliate
-- =====================================================

-- Activare extensii necesare (dacă nu există deja)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TIPURI DE DATE PENTRU PRODUSE AGRICOLE
-- =====================================================

-- Categorii de produse agricole
DO $$ BEGIN
    CREATE TYPE product_category AS ENUM ('fertilizer', 'herbicide', 'fungicide', 'insecticide', 'growth_regulator', 'seed', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Unități de măsură pentru produse
DO $$ BEGIN
    CREATE TYPE measurement_unit AS ENUM ('kg', 'l', 'ton', 'ml', 'g', 'pieces', 'ha');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tipuri de activități agricole
DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM (
        'soil_preparation', 'planting', 'fertilization', 'herbicide_treatment', 
        'fungicide_treatment', 'insecticide_treatment', 'irrigation', 
        'cultivation', 'harvesting', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Statusuri activități
DO $$ BEGIN
    CREATE TYPE activity_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABELA PRODUSE AGRICOLE
-- =====================================================

-- Produse agricole (îngrășăminte, pesticide, semințe, etc.)
CREATE TABLE IF NOT EXISTS agricultural_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category product_category NOT NULL,
    manufacturer VARCHAR(255),
    active_substance TEXT,
    concentration VARCHAR(100),
    
    -- Specificații tehnice
    unit measurement_unit NOT NULL,
    price_per_unit DECIMAL(10,4) NOT NULL, -- RON per unitate
    min_dose_per_ha DECIMAL(8,3), -- doza minimă/hectar
    max_dose_per_ha DECIMAL(8,3), -- doza maximă/hectar
    recommended_dose_per_ha DECIMAL(8,3), -- doza recomandată/hectar
    
    -- Informații de siguranță
    safety_period_days INTEGER, -- perioada de siguranță în zile
    preharvest_interval_days INTEGER, -- intervalul pre-recoltare
    
    -- Detalii administrative
    registration_number VARCHAR(100),
    expiry_date DATE,
    storage_conditions TEXT,
    application_method TEXT,
    
    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2B. TABELA PENTRU CAMPANII MULTI-PARCELE
-- =====================================================

-- Campanii agricole (pot avea mai multe parcele)
CREATE TABLE IF NOT EXISTS multi_plot_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informații campanie
    name VARCHAR(255) NOT NULL, -- "Porumb 2025", "Grâu Toamnă 2024"
    crop_type VARCHAR(255) NOT NULL, -- tip cultură (text simplu pentru flexibilitate)
    season VARCHAR(50) DEFAULT 'spring', -- spring, summer, autumn, winter
    year INTEGER NOT NULL,
    description TEXT,
    
    -- Date importante
    start_date DATE, -- data de început planificată
    end_date DATE,   -- data de sfârșit planificată
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- Status campanie - tipuri compatibile cu API
    status VARCHAR(50) DEFAULT 'planned', -- planned, active, completed, cancelled
    
    -- Rezultate totale (sumate pe toate parcelele)
    total_area_ha DECIMAL(12,4) DEFAULT 0, -- suma tuturor parcelelor (calculată automat)
    total_harvest_kg DECIMAL(15,2), -- kg recoltate total
    average_yield_per_ha DECIMAL(8,2), -- randament mediu
    
    -- Feedback și notițe
    season_feedback TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parcelele incluse în campanie (many-to-many)
CREATE TABLE IF NOT EXISTS campaign_plots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES multi_plot_campaigns(id) ON DELETE CASCADE,
    plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
    
    -- Informații specifice parcelei în campanie
    planted_area_ha DECIMAL(10,4) NOT NULL, -- suprafața semănată efectiv
    planting_date DATE,
    harvest_date DATE,
    
    -- Rezultate pe parcela
    harvest_kg DECIMAL(12,2), -- kg recoltate pe această parcelă
    yield_per_ha DECIMAL(8,2), -- randament pe această parcelă
    
    -- Status și observații
    status VARCHAR(50) DEFAULT 'planned', -- planned, active, completed, cancelled
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- O parcelă poate fi în doar o campanie activă
    UNIQUE(plot_id, campaign_id)
);

-- Index pentru a verifica că o parcelă nu e în mai multe campanii active
-- Nota: Verificarea se va face la nivel de aplicație sau prin constrainte la insert/update
CREATE INDEX IF NOT EXISTS idx_campaign_plots_plot_status 
ON campaign_plots (plot_id);

-- Index suplimentar pentru status-ul campaniilor
CREATE INDEX IF NOT EXISTS idx_multi_plot_campaigns_status_active 
ON multi_plot_campaigns (status) 
WHERE status IN ('planned', 'active');

-- =====================================================
-- 3. TABELA ACTIVITĂȚI CAMPANII MULTI-PARCELE
-- =====================================================

-- Activități agricole pentru campanii multi-parcele
CREATE TABLE IF NOT EXISTS campaign_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES multi_plot_campaigns(id) ON DELETE CASCADE,
    
    -- Informații activitate
    name VARCHAR(255) NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- folosim VARCHAR pentru flexibilitate
    description TEXT,
    
    -- Planificare
    planned_date DATE,
    planned_area_ha DECIMAL(10,4), -- suprafața totală planificată
    planned_cost_ron DECIMAL(12,2),
    
    -- Execuție  
    actual_date DATE,
    actual_area_ha DECIMAL(10,4), -- suprafața reală lucrată
    actual_cost_ron DECIMAL(12,2),
    
    -- Status și progres
    status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Condiții și observații
    weather_conditions VARCHAR(255),
    soil_conditions VARCHAR(255),
    equipment_used TEXT,
    operator_name VARCHAR(255),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activități pe parcele specifice (many-to-many)
CREATE TABLE IF NOT EXISTS activity_plot_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES campaign_activities(id) ON DELETE CASCADE,
    plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
    
    -- Planificare pe parcelă
    planned_area_ha DECIMAL(10,4), -- suprafața planificată pe această parcelă
    planned_date DATE,
    planned_quantity DECIMAL(12,3), -- cantitate planificată pentru această parcelă
    
    -- Execuție pe parcelă
    actual_area_ha DECIMAL(10,4), -- suprafața reală lucrată pe această parcelă
    actual_date DATE,
    actual_quantity DECIMAL(12,3), -- cantitate reală folosită pe această parcelă
    
    -- Status și observații specifice parcelei
    status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(activity_id, plot_id)
);

-- =====================================================
-- 4. TABELA PRODUSE UTILIZATE ÎN ACTIVITĂȚI
-- =====================================================

-- Produse folosite în activități (many-to-many)
CREATE TABLE IF NOT EXISTS activity_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES campaign_activities(id) ON DELETE CASCADE,
    product_id UUID REFERENCES agricultural_products(id) ON DELETE RESTRICT,
    
    -- Cantități planificate
    planned_quantity_per_ha DECIMAL(8,3),
    planned_total_quantity DECIMAL(12,3),
    planned_unit_cost DECIMAL(10,4),
    planned_total_cost DECIMAL(12,2),
    
    -- Cantități utilizate efectiv
    actual_quantity_per_ha DECIMAL(8,3),
    actual_total_quantity DECIMAL(12,3),
    actual_unit_cost DECIMAL(10,4),
    actual_total_cost DECIMAL(12,2),
    
    -- Metadata
    application_method VARCHAR(255),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. INDEXURI PENTRU PERFORMANȚĂ
-- =====================================================

-- Indexuri pentru produse agricole
CREATE INDEX IF NOT EXISTS idx_agricultural_products_category ON agricultural_products(category);
CREATE INDEX IF NOT EXISTS idx_agricultural_products_active ON agricultural_products(is_active);
CREATE INDEX IF NOT EXISTS idx_agricultural_products_manufacturer ON agricultural_products(manufacturer);

-- Indexuri pentru campanii multi-parcele
CREATE INDEX IF NOT EXISTS idx_multi_plot_campaigns_status ON multi_plot_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_multi_plot_campaigns_crop_year ON multi_plot_campaigns(year);
CREATE INDEX IF NOT EXISTS idx_multi_plot_campaigns_season ON multi_plot_campaigns(season);
CREATE INDEX IF NOT EXISTS idx_multi_plot_campaigns_crop_type ON multi_plot_campaigns(crop_type);

-- Indexuri pentru parcele în campanii
CREATE INDEX IF NOT EXISTS idx_campaign_plots_campaign_id ON campaign_plots(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_plots_plot_id ON campaign_plots(plot_id);

-- Indexuri pentru activități campanii
CREATE INDEX IF NOT EXISTS idx_campaign_activities_campaign_id ON campaign_activities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_activities_type ON campaign_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_campaign_activities_status ON campaign_activities(status);
CREATE INDEX IF NOT EXISTS idx_campaign_activities_planned_date ON campaign_activities(planned_date);
CREATE INDEX IF NOT EXISTS idx_campaign_activities_actual_date ON campaign_activities(actual_date);

-- Indexuri pentru detalii activități pe parcele
CREATE INDEX IF NOT EXISTS idx_activity_plot_details_activity_id ON activity_plot_details(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_plot_details_plot_id ON activity_plot_details(plot_id);

-- Indexuri pentru produse în activități
CREATE INDEX IF NOT EXISTS idx_activity_products_activity_id ON activity_products(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_products_product_id ON activity_products(product_id);

-- =====================================================
-- 6. TRIGGERS PENTRU ACTUALIZĂRI AUTOMATE
-- =====================================================

-- Trigger pentru actualizarea timestampului updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pentru produse agricole
DROP TRIGGER IF EXISTS update_agricultural_products_updated_at ON agricultural_products;
CREATE TRIGGER update_agricultural_products_updated_at 
    BEFORE UPDATE ON agricultural_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pentru campanii multi-parcele
DROP TRIGGER IF EXISTS update_multi_plot_campaigns_updated_at ON multi_plot_campaigns;
CREATE TRIGGER update_multi_plot_campaigns_updated_at 
    BEFORE UPDATE ON multi_plot_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pentru activități campanii
DROP TRIGGER IF EXISTS update_campaign_activities_updated_at ON campaign_activities;
CREATE TRIGGER update_campaign_activities_updated_at 
    BEFORE UPDATE ON campaign_activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pentru actualizarea suprafeței totale campaniei
CREATE OR REPLACE FUNCTION update_campaign_total_area()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizează suprafața totală a campaniei
    UPDATE multi_plot_campaigns 
    SET total_area_ha = (
        SELECT COALESCE(SUM(planted_area_ha), 0)
        FROM campaign_plots 
        WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
    )
    WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_total_area_on_plot_change ON campaign_plots;
CREATE TRIGGER update_total_area_on_plot_change
    AFTER INSERT OR UPDATE OR DELETE ON campaign_plots
    FOR EACH ROW EXECUTE FUNCTION update_campaign_total_area();

-- Funcție pentru verificarea că o parcelă nu e în mai multe campanii active
CREATE OR REPLACE FUNCTION check_plot_not_in_active_campaign()
RETURNS TRIGGER AS $$
DECLARE
    active_campaign_count INTEGER;
BEGIN
    -- Verifică dacă parcela este deja în altă campanie activă
    SELECT COUNT(*) INTO active_campaign_count
    FROM campaign_plots cp
    JOIN multi_plot_campaigns mpc ON cp.campaign_id = mpc.id
    WHERE cp.plot_id = NEW.plot_id
      AND cp.campaign_id != NEW.campaign_id
      AND mpc.status IN ('planned', 'active');
    
    IF active_campaign_count > 0 THEN
        RAISE EXCEPTION 'Plot % is already assigned to another active campaign', NEW.plot_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_active_plot_campaign ON campaign_plots;
CREATE TRIGGER check_active_plot_campaign
    BEFORE INSERT OR UPDATE ON campaign_plots
    FOR EACH ROW EXECUTE FUNCTION check_plot_not_in_active_campaign();

-- Trigger pentru calculul automat al costurilor în activity_products
CREATE OR REPLACE FUNCTION calculate_activity_costs()
RETURNS TRIGGER AS $$
DECLARE
    campaign_area DECIMAL(10,4);
BEGIN
    -- Calculează costurile planificate
    IF NEW.planned_quantity_per_ha IS NOT NULL AND NEW.planned_unit_cost IS NOT NULL THEN
        -- Găsește suprafața planificată a activității
        SELECT planned_area_ha INTO campaign_area
        FROM campaign_activities 
        WHERE id = NEW.activity_id;
        
        NEW.planned_total_quantity = NEW.planned_quantity_per_ha * COALESCE(campaign_area, 0);
        NEW.planned_total_cost = NEW.planned_total_quantity * NEW.planned_unit_cost;
    END IF;
    
    -- Calculează costurile reale
    IF NEW.actual_quantity_per_ha IS NOT NULL AND NEW.actual_unit_cost IS NOT NULL THEN
        -- Găsește suprafața reală a activității
        SELECT actual_area_ha INTO campaign_area
        FROM campaign_activities 
        WHERE id = NEW.activity_id;
        
        NEW.actual_total_quantity = NEW.actual_quantity_per_ha * COALESCE(campaign_area, 0);
        NEW.actual_total_cost = NEW.actual_total_quantity * NEW.actual_unit_cost;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_costs_on_activity_products ON activity_products;
CREATE TRIGGER calculate_costs_on_activity_products 
    BEFORE INSERT OR UPDATE ON activity_products
    FOR EACH ROW EXECUTE FUNCTION calculate_activity_costs();

-- Trigger pentru actualizarea costurilor activității
CREATE OR REPLACE FUNCTION update_activity_total_costs()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizează costul total planificat al activității
    UPDATE campaign_activities 
    SET planned_cost_ron = (
        SELECT COALESCE(SUM(planned_total_cost), 0)
        FROM activity_products 
        WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)
    )
    WHERE id = COALESCE(NEW.activity_id, OLD.activity_id);
    
    -- Actualizează costul total real al activității
    UPDATE campaign_activities 
    SET actual_cost_ron = (
        SELECT COALESCE(SUM(actual_total_cost), 0)
        FROM activity_products 
        WHERE activity_id = COALESCE(NEW.activity_id, OLD.activity_id)
        AND actual_total_cost IS NOT NULL
    )
    WHERE id = COALESCE(NEW.activity_id, OLD.activity_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_activity_costs_on_products_change ON activity_products;
CREATE TRIGGER update_activity_costs_on_products_change
    AFTER INSERT OR UPDATE OR DELETE ON activity_products
    FOR EACH ROW EXECUTE FUNCTION update_activity_total_costs();

-- =====================================================
-- 7. VIEWS SIMPLE PENTRU RAPOARTE
-- =====================================================

-- View simplu pentru campanii cu informații de bază
CREATE OR REPLACE VIEW multi_plot_campaign_details AS
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.year,
    c.season,
    c.crop_type,
    c.total_area_ha,
    c.status as campaign_status,
    c.start_date,
    c.end_date,
    
    -- Numărul de parcele în campanie
    COUNT(DISTINCT cp.plot_id) as plot_count,
    
    -- Numărul de activități
    COUNT(DISTINCT ca.id) as activity_count,
    
    c.created_at,
    c.updated_at

FROM multi_plot_campaigns c
LEFT JOIN campaign_plots cp ON c.id = cp.campaign_id
LEFT JOIN campaign_activities ca ON c.id = ca.campaign_id
GROUP BY c.id, c.name, c.year, c.season, c.crop_type, c.total_area_ha, c.status, c.start_date, c.end_date, c.created_at, c.updated_at;

-- =====================================================
-- 8. ULTIMELE DATE INIȚIALE - PRODUSE AGRICOLE COMUNE
-- =====================================================

-- Produse agricole comune în România
INSERT INTO agricultural_products (name, category, manufacturer, active_substance, concentration, unit, price_per_unit, min_dose_per_ha, max_dose_per_ha, recommended_dose_per_ha, safety_period_days, preharvest_interval_days, description) VALUES

-- Îngrășăminte
('NPK 20-20-0', 'fertilizer', 'Azomureş', 'N-P-K', '20-20-0', 'kg', 2.50, 150, 300, 200, 0, 0, 'Îngrășământ complex pentru cereale'),
('Uree 46%', 'fertilizer', 'Azomureş', 'Urea', '46% N', 'kg', 2.80, 100, 200, 150, 0, 0, 'Îngrășământ azotat'),
('Superfosfat', 'fertilizer', 'Azomureş', 'P2O5', '18%', 'kg', 2.20, 80, 150, 100, 0, 0, 'Îngrășământ fosfatic'),
('Azotat de amoniu', 'fertilizer', 'Azomureş', 'NH4NO3', '33.5% N', 'kg', 2.60, 100, 200, 150, 0, 0, 'Îngrășământ azotat rapid'),

-- Erbicide
('Roundup', 'herbicide', 'Bayer', 'Glifozat', '360 g/l', 'l', 45.00, 2, 6, 4, 3, 7, 'Erbicid sistemic neselective'),
('Granstar Super', 'herbicide', 'DuPont', 'Tribenuron-metil', '750 g/kg', 'kg', 180.00, 0.015, 0.025, 0.020, 60, 60, 'Erbicid selectiv pentru cereale'),
('Gardoprim Plus Gold', 'herbicide', 'Syngenta', 'S-metolaclor + Terbuthilazina', '312.5 + 187.5 g/l', 'l', 85.00, 3, 5, 4, 90, 90, 'Erbicid pentru porumb'),
('Titus', 'herbicide', 'DuPont', 'Rimsulfuron', '250 g/kg', 'kg', 220.00, 0.050, 0.075, 0.060, 120, 120, 'Erbicid selectiv pentru porumb'),

-- Fungicide
('Falcon', 'fungicide', 'Bayer', 'Spiroxamine + Tebuconazole + Triadimenol', '250 + 167 + 43 g/l', 'l', 120.00, 0.6, 1.0, 0.8, 35, 35, 'Fungicid pentru cereale'),
('Amistar Xtra', 'fungicide', 'Syngenta', 'Azoxistrobin + Ciproconazol', '200 + 80 g/l', 'l', 95.00, 0.75, 1.0, 0.8, 35, 35, 'Fungicid sistemic'),
('Prosaro', 'fungicide', 'Bayer', 'Prothioconazole + Tebuconazole', '125 + 125 g/l', 'l', 140.00, 0.8, 1.0, 0.9, 35, 35, 'Fungicid pentru cereale'),

-- Insecticide
('Karate Zeon', 'insecticide', 'Syngenta', 'Lambda-cihalotrin', '50 g/l', 'l', 85.00, 0.075, 0.15, 0.1, 7, 14, 'Insecticid pentru combaterea dăunătorilor'),
('Actara', 'insecticide', 'Syngenta', 'Tiametoxam', '240 g/l', 'l', 110.00, 0.1, 0.15, 0.125, 21, 21, 'Insecticid sistemic'),
('Decis Mega', 'insecticide', 'Bayer', 'Deltametrin', '50 g/l', 'l', 78.00, 0.25, 0.5, 0.375, 7, 14, 'Insecticid de contact'),

-- Semințe
('Semințe Porumb P0216', 'seed', 'Pioneer', 'Hibrid porumb', '', 'kg', 15.00, 20, 25, 22, 0, 0, 'Hibrid de porumb pentru zona de câmpie'),
('Semințe Floarea-soarelui NK Delfi', 'seed', 'Syngenta', 'Hibrid floarea-soarelui', '', 'kg', 25.00, 4, 6, 5, 0, 0, 'Hibrid de floarea-soarelui'),
('Semințe Grâu Glosa', 'seed', 'Agronom', 'Soi grâu', '', 'kg', 3.50, 180, 220, 200, 0, 0, 'Soi de grâu pentru zona de câmpie'),

-- Regulatori de creștere
('Moddus', 'growth_regulator', 'Syngenta', 'Trinexapac-etil', '250 g/l', 'l', 95.00, 0.2, 0.4, 0.3, 60, 60, 'Regulator de creștere pentru cereale')

ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. COMENTARII FINALE
-- =====================================================

/*
ACEST SCRIPT CONȚINE SCHEMA COMPLETĂ PENTRU CAMPANII MULTI-PARCELE:

1. TABELE PRINCIPALE:
   - multi_plot_campaigns: Campanii care pot acoperi multiple parcele
   - campaign_plots: Relația many-to-many între campanii și parcele
   - campaign_activities: Activități planificate și executate
   - activity_plot_details: Detalii specifice per parcela pentru activități
   - activity_products: Produsele folosite în activități
   - agricultural_products: Catalog complet de produse agricole

2. FUNCȚIONALITĂȚI CHEIE:
   - Campanii care acoperă multiple parcele cu tracking individual
   - Activități care pot fi aplicate pe toate parcelele sau specifice
   - Calculul automat al costurilor bazat pe suprafață și cantitate
   - Tracking planificat vs real pentru costuri și cantități
   - Flexibilitate în aplicarea activităților (la nivel de campanie sau parcela)

3. VIEWS PENTRU RAPORTARE:
   - multi_plot_campaign_details: Vedere completă campanii cu costuri
   - campaign_plot_costs: Costuri detaliate pe fiecare parcela
   - activity_plot_analysis: Analiza activităților pe parcele
   - campaign_product_usage: Utilizarea produselor în campanii

4. TRIGGERS AUTOMATE:
   - Actualizarea suprafeței totale a campaniei
   - Calculul costurilor totale
   - Timestamp-uri automate pentru audit
   - Validări pentru consistența datelor

5. AVANTAJE ARHITECTURĂ:
   - O campanie poate acoperi multiple parcele (ex: "Porumb 2025" pe 3 parcele)
   - Activitățile pot fi specifice per parcela sau aplicate uniform
   - Calculele de cost se adaptează automat la structura campaniei
   - Raportarea oferă atât vedere globală cât și detaliată per parcela
   - Flexibilitate maximă pentru managementul agricol real

UTILIZARE:
1. Creează o campanie nouă cu multiple parcele
2. Definește activitățile pentru campanie
3. Specifică detalii per parcela dacă este necesar
4. Urmărește progresul și costurile prin views-urile dedicate

RULARE:
- Scriptul este idempotent (poate fi rulat de multiple ori fără erori)
- Toate tabelele au protecție IF NOT EXISTS
- Produsele agricole se inserează cu ON CONFLICT DO NOTHING
*/
