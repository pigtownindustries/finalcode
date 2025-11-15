-- ========================================
-- CLEAN ALL POLICIES AND CREATE FRESH
-- ========================================
-- Hapus semua policy lama dan buat yang baru bersih
-- ========================================

-- 1. Drop SEMUA policy yang ada (banyak duplikat)
DROP POLICY IF EXISTS "Allow anon read access for login" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON users;
DROP POLICY IF EXISTS "Allow public read access to users" ON users;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- 2. Buat policy baru yang BERSIH dan SIMPLE
CREATE POLICY "users_policy_select" ON users
    FOR SELECT
    USING (true);

CREATE POLICY "users_policy_insert" ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "users_policy_update" ON users
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "users_policy_delete" ON users
    FOR DELETE
    TO authenticated
    USING (true);

-- 3. Verifikasi policies (harusnya cuma 4 policy)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- ========================================
-- SELESAI - Policy bersih dan simple
-- ========================================
-- SELECT: Semua orang bisa read (untuk login)
-- INSERT/UPDATE/DELETE: Authenticated users only
-- ========================================
