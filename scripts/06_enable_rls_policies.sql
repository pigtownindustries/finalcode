-- Enable RLS (Row Level Security) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE kasbon ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;

-- Policy untuk users table (allow read untuk semua authenticated users dan anon untuk login)
-- Allow anonymous users to read users table for login purposes
CREATE POLICY "Allow anon read access for login" ON users
    FOR SELECT
    TO anon
    USING (true);

-- Allow authenticated users to read all users
CREATE POLICY "Allow authenticated users to read users" ON users
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "Allow users to update own profile" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = id::text);

-- Allow authenticated users to insert users (for employee management)
CREATE POLICY "Allow authenticated users to insert users" ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy untuk branches table
CREATE POLICY "Allow anon read branches" ON branches
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow authenticated read branches" ON branches
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated modify branches" ON branches
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy untuk transactions table
CREATE POLICY "Allow anon read transactions" ON transactions
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow authenticated all on transactions" ON transactions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy untuk transaction_items table
CREATE POLICY "Allow anon read transaction_items" ON transaction_items
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow authenticated all on transaction_items" ON transaction_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy untuk attendance table
CREATE POLICY "Allow anon read attendance" ON attendance
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow authenticated all on attendance" ON attendance
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy untuk expenses table
CREATE POLICY "Allow anon read expenses" ON expenses
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow authenticated all on expenses" ON expenses
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy untuk services table
CREATE POLICY "Allow anon read services" ON services
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow authenticated all on services" ON services
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy untuk kasbon table
CREATE POLICY "Allow anon read kasbon" ON kasbon
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow authenticated all on kasbon" ON kasbon
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy untuk points table
CREATE POLICY "Allow anon read points" ON points
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow authenticated all on points" ON points
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
