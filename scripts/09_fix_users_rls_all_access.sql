-- ========================================
-- FIX USERS RLS - ALLOW ALL ACCESS
-- ========================================
-- RLS terlalu ketat, karyawan tidak bisa dibaca
-- Kita buat policy yang lebih permisif untuk admin/owner
-- ========================================

-- 1. Drop semua policy yang ada
DROP POLICY IF EXISTS "Allow anon read access for login" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON users;

-- 2. Buat policy baru yang permisif

-- Allow ALL users to read (untuk login + list karyawan)
CREATE POLICY "users_select_policy" ON users
    FOR SELECT
    USING (true);

-- Allow authenticated users to INSERT (untuk tambah karyawan)
CREATE POLICY "users_insert_policy" ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to UPDATE (untuk edit karyawan)
CREATE POLICY "users_update_policy" ON users
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to DELETE (untuk hapus karyawan)
CREATE POLICY "users_delete_policy" ON users
    FOR DELETE
    TO authenticated
    USING (true);

-- 3. Verifikasi RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- ========================================
-- SELESAI
-- ========================================
-- Sekarang users table bisa:
-- ✅ SELECT - semua orang (untuk login & list)
-- ✅ INSERT - authenticated users
-- ✅ UPDATE - authenticated users  
-- ✅ DELETE - authenticated users
-- ========================================
