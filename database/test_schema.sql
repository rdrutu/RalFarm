-- =====================================================
-- SCRIPT DE TEST PENTRU SCHEMA RALFARM
-- Verifică că toate tabelele se creează corect
-- =====================================================

-- Test 1: Verifică că toate extensiile sunt disponibile
SELECT 
    name,
    installed_version,
    default_version
FROM pg_available_extensions 
WHERE name IN ('uuid-ossp', 'postgis');

-- Test 2: Verifică că toate tipurile ENUM s-au creat
SELECT 
    typname AS enum_name,
    array_agg(enumlabel ORDER BY enumsortorder) AS enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE typname IN (
    'user_role', 'status_type', 'plot_status', 'rent_type', 
    'campaign_status', 'stock_movement_type', 'cost_category', 
    'cost_type', 'contract_type', 'operation_type', 'invoice_status'
)
GROUP BY typname
ORDER BY typname;

-- Test 3: Verifică că toate tabelele s-au creat
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename IN (
        'companies', 'users', 'farms', 'user_farm_assignments',
        'crop_types', 'plots', 'cultivation_campaigns', 'farm_stocks',
        'stock_movements', 'expenses', 'employees', 'employee_timesheets',
        'agricultural_operations', 'operation_plots', 'customers',
        'sales_invoices', 'sales_invoice_lines'
    )
ORDER BY tablename;

-- Test 4: Verifică relațiile foreign key
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Test 5: Verifică indexurile
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Test 6: Verifică view-urile
SELECT 
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public'
    AND viewname IN ('campaign_profit_view', 'farm_profit_view');

-- Test 7: Verifică funcțiile și trigger-urile
SELECT 
    proname AS function_name,
    prosrc AS function_source
FROM pg_proc 
WHERE proname IN ('update_updated_at_column', 'update_farm_stock_on_movement', 'calculate_plot_area');

-- Test 8: Test inserare date de bază
BEGIN;

-- Testează inserarea unei companii
INSERT INTO companies (name, legal_name, cui, email) VALUES 
('Test Farm SRL', 'SC TEST FARM SRL', 'RO12345678', 'test@testfarm.ro');

-- Testează inserarea unui user
INSERT INTO users (company_id, username, email, password_hash, full_name, role) 
SELECT id, 'testuser', 'user@testfarm.ro', '$2b$10$test', 'Test User', 'admin_farm'
FROM companies WHERE cui = 'RO12345678';

-- Testează inserarea unei ferme
INSERT INTO farms (company_id, name, address, total_area) 
SELECT id, 'Ferma de Test', 'Str. Test, nr. 1', 100.50
FROM companies WHERE cui = 'RO12345678';

-- Testează inserarea unei parcele
INSERT INTO plots (farm_id, name, calculated_area, rent_type, rent_amount) 
SELECT id, 'Parcela Nord', 25.75, 'fixed_amount', 5000.00
FROM farms WHERE name = 'Ferma de Test';

-- Testează inserarea unei campanii
INSERT INTO cultivation_campaigns (farm_id, plot_id, crop_type_id, name, crop_year, planted_area, status)
SELECT 
    f.id,
    p.id,
    ct.id,
    'Porumb 2025 Nord',
    2025,
    25.75,
    'planned'
FROM farms f
JOIN plots p ON f.id = p.farm_id
JOIN crop_types ct ON ct.name = 'Porumb'
WHERE f.name = 'Ferma de Test' AND p.name = 'Parcela Nord';

-- Verifică că datele s-au inserat corect
SELECT 
    c.name as company_name,
    f.name as farm_name,
    p.name as plot_name,
    cc.name as campaign_name,
    ct.name as crop_name
FROM companies c
JOIN farms f ON c.id = f.company_id
JOIN plots p ON f.id = p.farm_id
JOIN cultivation_campaigns cc ON p.id = cc.plot_id
JOIN crop_types ct ON cc.crop_type_id = ct.id
WHERE c.cui = 'RO12345678';

ROLLBACK; -- Nu salvăm datele de test

-- Test 9: Verifică constraint-urile
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type IN ('UNIQUE', 'CHECK')
ORDER BY tc.table_name;

-- Mesaj final
SELECT 'Schema RalFarm testată cu succes!' AS status;
