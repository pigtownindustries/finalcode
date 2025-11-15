-- ========================================
-- FIX DELETE EMPLOYEE - SAFE DELETE  
-- ========================================
-- Script ini akan mengubah foreign key constraint
-- agar saat employee dihapus, data TIDAK ikut terhapus
-- Data penting seperti transaksi tetap tersimpan untuk catatan
-- 
-- Jalankan di Supabase SQL Editor
-- ========================================

-- 1. Transactions - SET NULL (catatan transaksi tetap ada, cashier_id jadi NULL)
DO $$ 
BEGIN
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_cashier_id_fkey;
    ALTER TABLE transactions ADD CONSTRAINT transactions_cashier_id_fkey 
    FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Transactions constraint updated';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Transactions: %', SQLERRM;
END $$;

-- 2. Commission rules - CASCADE (aturan komisi boleh dihapus)
DO $$ 
BEGIN
    ALTER TABLE commission_rules DROP CONSTRAINT IF EXISTS commission_rules_user_id_fkey;
    ALTER TABLE commission_rules ADD CONSTRAINT commission_rules_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Commission rules constraint updated';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Commission rules: %', SQLERRM;
END $$;

-- 3. Kasbon - SET NULL (user_id di kasbon, catatan hutang tetap ada)
DO $$ 
BEGIN
    ALTER TABLE kasbon DROP CONSTRAINT IF EXISTS kasbon_user_id_fkey;
    ALTER TABLE kasbon ADD CONSTRAINT kasbon_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Kasbon constraint updated';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Kasbon: %', SQLERRM;
END $$;

-- 4. Kasbon approved_by - SET NULL (siapa yang approve juga di-set null)
DO $$ 
BEGIN
    ALTER TABLE kasbon DROP CONSTRAINT IF EXISTS kasbon_approved_by_fkey;
    ALTER TABLE kasbon ADD CONSTRAINT kasbon_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Kasbon approved_by constraint updated';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Kasbon approved_by: %', SQLERRM;
END $$;

-- 5. Expenses approved_by - SET NULL (catatan pengeluaran tetap ada)
DO $$ 
BEGIN
    ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_approved_by_fkey;
    ALTER TABLE expenses ADD CONSTRAINT expenses_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Expenses constraint updated';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Expenses: %', SQLERRM;
END $$;

-- 6. Branches manager_id - SET NULL (cabang tetap ada meski manager dihapus)
DO $$ 
BEGIN
    ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_manager_id_fkey;
    ALTER TABLE branches ADD CONSTRAINT branches_manager_id_fkey 
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Branches manager constraint updated';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Branches manager: %', SQLERRM;
END $$;

-- 7. Transaction items barber_id - SET NULL (transaksi tetap ada, barber_id jadi NULL)
DO $$ 
BEGIN
    ALTER TABLE transaction_items DROP CONSTRAINT IF EXISTS transaction_items_barber_id_fkey;
    ALTER TABLE transaction_items ADD CONSTRAINT transaction_items_barber_id_fkey 
    FOREIGN KEY (barber_id) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Transaction items barber constraint updated';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Transaction items barber: %', SQLERRM;
END $$;

-- 8. Transactions server_id - SET NULL (transaksi tetap ada, server_id jadi NULL)
DO $$ 
BEGIN
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_server_id_fkey;
    ALTER TABLE transactions ADD CONSTRAINT transactions_server_id_fkey 
    FOREIGN KEY (server_id) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Transactions server constraint updated';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Transactions server: %', SQLERRM;
END $$;

-- 9. Overtime records approved_by - SET NULL (catatan overtime tetap ada)
DO $$ 
BEGIN
    ALTER TABLE overtime_records DROP CONSTRAINT IF EXISTS overtime_records_approved_by_fkey;
    ALTER TABLE overtime_records ADD CONSTRAINT overtime_records_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Overtime records approved_by constraint updated';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Overtime records approved_by: %', SQLERRM;
END $$;

-- 10. Performance reviews reviewer_id - SET NULL (review tetap ada)
DO $$ 
BEGIN
    ALTER TABLE performance_reviews DROP CONSTRAINT IF EXISTS performance_reviews_reviewer_id_fkey;
    ALTER TABLE performance_reviews ADD CONSTRAINT performance_reviews_reviewer_id_fkey 
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Performance reviews reviewer constraint updated';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Performance reviews reviewer: %', SQLERRM;
END $$;

-- 11. Salary adjustments approved_by - SET NULL (catatan adjustment tetap ada)
DO $$ 
BEGIN
    ALTER TABLE salary_adjustments DROP CONSTRAINT IF EXISTS salary_adjustments_approved_by_fkey;
    ALTER TABLE salary_adjustments ADD CONSTRAINT salary_adjustments_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Salary adjustments approved_by constraint updated';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Salary adjustments approved_by: %', SQLERRM;
END $$;

-- 12. Verifikasi constraints
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS foreign_table,
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
ORDER BY conrelid::regclass::text;

-- ========================================
-- SELESAI
-- ========================================
-- Sekarang saat employee dihapus:
-- ✅ Transactions tetap ADA (cashier_id & server_id → NULL) - PENDAPATAN AMAN
-- ✅ Transaction items tetap ADA (barber_id → NULL) - DETAIL LAYANAN AMAN
-- ✅ Kasbon tetap ADA (user_id & approved_by → NULL) - CATATAN HUTANG AMAN
-- ✅ Expenses tetap ADA (approved_by → NULL) - PENGELUARAN AMAN
-- ✅ Branches tetap ADA (manager_id → NULL) - CABANG AMAN
-- ✅ Overtime records tetap ADA (approved_by → NULL) - LEMBUR AMAN
-- ✅ Performance reviews tetap ADA (reviewer_id → NULL) - REVIEW AMAN
-- ✅ Salary adjustments tetap ADA (approved_by → NULL) - ADJUSTMENT GAJI AMAN
-- ❌ Commission rules DIHAPUS (tidak kritis)
-- ❌ Attendance DIHAPUS (tidak kritis)
-- ❌ Employee skills DIHAPUS (tidak kritis)
-- ❌ Points DIHAPUS (tidak kritis)
-- ❌ Payrolls DIHAPUS (tidak kritis)
-- ❌ Overtime records user DIHAPUS (CASCADE, hanya approved_by yang SET NULL)
-- ❌ Performance reviews user DIHAPUS (CASCADE, hanya reviewer_id yang SET NULL)
-- ❌ Salary adjustments user DIHAPUS (CASCADE, hanya approved_by yang SET NULL)
-- 
-- DATA KEUANGAN DAN PENDAPATAN TOKO TETAP TERSIMPAN! ✅
-- ========================================
