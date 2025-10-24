-- Drop existing policies first
DROP POLICY IF EXISTS "Allow anon read access for login" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON users;

-- Create comprehensive policies for users table
-- Allow anonymous users to read users (for login and PIN authentication)
CREATE POLICY "Enable read access for all users" ON users
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert users (for employee management)
CREATE POLICY "Enable insert for authenticated users" ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update users
CREATE POLICY "Enable update for authenticated users" ON users
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete users
CREATE POLICY "Enable delete for authenticated users" ON users
    FOR DELETE
    TO authenticated
    USING (true);
