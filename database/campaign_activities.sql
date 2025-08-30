-- Tabel pentru activitățile campaniilor agricole
CREATE TYPE activity_type AS ENUM (
    'soil_preparation',    -- Pregătire teren
    'planting',           -- Semănat/plantat
    'fertilizing',        -- Fertilizare
    'spraying',           -- Stropit pesticide/erbicide
    'irrigation',         -- Irigare
    'weeding',           -- Plivit
    'harvesting',        -- Recoltare
    'field_inspection',   -- Inspecție câmp
    'maintenance',       -- Întreținere
    'other'              -- Alte activități
);

CREATE TYPE activity_status AS ENUM (
    'planned',           -- Planificată
    'in_progress',       -- În progres
    'completed',         -- Finalizată
    'overdue',          -- Întârziată
    'cancelled'         -- Anulată
);

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
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 3, -- 1=urgent, 2=high, 3=normal, 4=low, 5=very_low
    
    -- Resurse necesare
    required_equipment TEXT, -- Tractoare, semănătoare, etc.
    required_materials TEXT, -- Semințe, fertilizatori, etc.
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

-- Indexuri pentru performanță
CREATE INDEX idx_campaign_activities_campaign_id ON campaign_activities(campaign_id);
CREATE INDEX idx_campaign_activities_status ON campaign_activities(status);
CREATE INDEX idx_campaign_activities_planned_date ON campaign_activities(planned_date);
CREATE INDEX idx_campaign_activities_assigned_to ON campaign_activities(assigned_to_user_id);

-- Trigger pentru actualizarea automată a statusului
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

-- View pentru dashboard activități
CREATE VIEW activities_dashboard_view AS
SELECT 
    ca.id,
    ca.campaign_id,
    ca.activity_type,
    ca.status,
    ca.name,
    ca.planned_date,
    ca.priority,
    ca.estimated_cost_ron,
    ca.actual_cost_ron,
    
    -- Informații campanie
    cc.name as campaign_name,
    cc.crop_year,
    
    -- Informații fermă și parcelă
    f.name as farm_name,
    p.name as plot_name,
    p.calculated_area as plot_area,
    
    -- Informații cultură
    ct.name as crop_name,
    ct.category as crop_category,
    
    -- Responsabil
    u.full_name as assigned_to_name,
    
    -- Calculare zile până la deadline
    CASE 
        WHEN ca.planned_date >= CURRENT_DATE THEN ca.planned_date - CURRENT_DATE
        ELSE 0
    END as days_until_due,
    
    -- Status prioritate combinat
    CASE 
        WHEN ca.status = 'overdue' THEN 'overdue'
        WHEN ca.planned_date = CURRENT_DATE THEN 'today'
        WHEN ca.planned_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'urgent'
        WHEN ca.planned_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'soon'
        ELSE 'normal'
    END as urgency_status

FROM campaign_activities ca
JOIN cultivation_campaigns cc ON ca.campaign_id = cc.id
JOIN farms f ON cc.farm_id = f.id
JOIN plots p ON cc.plot_id = p.id
JOIN crop_types ct ON cc.crop_type_id = ct.id
LEFT JOIN users u ON ca.assigned_to_user_id = u.id
ORDER BY 
    CASE ca.status 
        WHEN 'overdue' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'planned' THEN 3
        ELSE 4
    END,
    ca.planned_date ASC,
    ca.priority ASC;
