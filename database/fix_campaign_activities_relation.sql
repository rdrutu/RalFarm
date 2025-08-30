-- =====================================================
-- FIX RELAȚIA CAMPAIGN_ACTIVITIES -> MULTI_PLOT_CAMPAIGNS
-- =====================================================

-- 1. Elimină constrangerea existentă (dacă există)
ALTER TABLE campaign_activities 
DROP CONSTRAINT IF EXISTS campaign_activities_campaign_id_fkey;

-- 2. Adaugă noua constrangere către multi_plot_campaigns
ALTER TABLE campaign_activities 
ADD CONSTRAINT campaign_activities_campaign_id_fkey 
FOREIGN KEY (campaign_id) REFERENCES multi_plot_campaigns(id) ON DELETE CASCADE;

-- 3. Actualizează indexul pentru performanță
DROP INDEX IF EXISTS idx_campaign_activities_campaign_id;
CREATE INDEX idx_campaign_activities_campaign_id ON campaign_activities(campaign_id);

-- 4. Verifică structura actualizată
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='campaign_activities'
AND kcu.column_name = 'campaign_id';
