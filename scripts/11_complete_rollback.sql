-- ========================================
-- COMPLETE ROLLBACK - KEMBALIKAN KE AWAL
-- ========================================
-- Rollback semua perubahan constraint dan policy
-- ========================================

-- 1. ROLLBACK FOREIGN KEY CONSTRAINTS ke NO ACTION (default)
-- Transactions
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_cashier_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_cashier_id_fkey 
FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE NO ACTION;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_server_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_server_id_fkey 
FOREIGN KEY (server_id) REFERENCES users(id) ON DELETE NO ACTION;

-- Transaction items
ALTER TABLE transaction_items DROP CONSTRAINT IF EXISTS transaction_items_barber_id_fkey;
ALTER TABLE transaction_items ADD CONSTRAINT transaction_items_barber_id_fkey 
FOREIGN KEY (barber_id) REFERENCES users(id) ON DELETE NO ACTION;

-- Commission rules (kembalikan ke NO ACTION juga)
ALTER TABLE commission_rules DROP CONSTRAINT IF EXISTS commission_rules_user_id_fkey;
ALTER TABLE commission_rules ADD CONSTRAINT commission_rules_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION;

-- Kasbon
ALTER TABLE kasbon DROP CONSTRAINT IF EXISTS kasbon_user_id_fkey;
ALTER TABLE kasbon ADD CONSTRAINT kasbon_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION;

ALTER TABLE kasbon DROP CONSTRAINT IF EXISTS kasbon_approved_by_fkey;
ALTER TABLE kasbon ADD CONSTRAINT kasbon_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE NO ACTION;

-- Expenses
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_approved_by_fkey;
ALTER TABLE expenses ADD CONSTRAINT expenses_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE NO ACTION;

-- Branches
ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_manager_id_fkey;
ALTER TABLE branches ADD CONSTRAINT branches_manager_id_fkey 
FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE NO ACTION;

-- Overtime records
ALTER TABLE overtime_records DROP CONSTRAINT IF EXISTS overtime_records_approved_by_fkey;
ALTER TABLE overtime_records ADD CONSTRAINT overtime_records_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE NO ACTION;

-- Performance reviews
ALTER TABLE performance_reviews DROP CONSTRAINT IF EXISTS performance_reviews_reviewer_id_fkey;
ALTER TABLE performance_reviews ADD CONSTRAINT performance_reviews_reviewer_id_fkey 
FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE NO ACTION;

-- Salary adjustments
ALTER TABLE salary_adjustments DROP CONSTRAINT IF EXISTS salary_adjustments_approved_by_fkey;
ALTER TABLE salary_adjustments ADD CONSTRAINT salary_adjustments_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE NO ACTION;

-- 2. ROLLBACK RLS POLICIES - Drop semua yang baru
DROP POLICY IF EXISTS "users_policy_select" ON users;
DROP POLICY IF EXISTS "users_policy_insert" ON users;
DROP POLICY IF EXISTS "users_policy_update" ON users;
DROP POLICY IF EXISTS "users_policy_delete" ON users;
DROP POLICY IF EXISTS "Allow public read access to users" ON users;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON users;

-- 3. Buat policy ORIGINAL (dari script 06 dan 07)
CREATE POLICY "Allow anon read access for login" ON users
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow authenticated users to read users" ON users
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow users to update own profile" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to insert users" ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 4. Verifikasi
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confdeltype AS on_delete_action,
    CASE confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS on_delete_type
FROM pg_constraint
WHERE confrelid = 'users'::regclass
  AND conname LIKE '%cashier%' OR conname LIKE '%server%' OR conname LIKE '%approved%'
ORDER BY conrelid::regclass::text;

SELECT 
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- ========================================
-- SELESAI - KEMBALI KE KONDISI AWAL
-- ========================================
