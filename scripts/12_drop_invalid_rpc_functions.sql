-- ========================================
-- DROP INVALID RPC FUNCTIONS
-- ========================================
-- Drop RPC functions yang masih pakai kolom 'role' yang tidak ada
-- ========================================

-- Drop function jika ada
DROP FUNCTION IF EXISTS get_users_with_point_totals();
DROP FUNCTION IF EXISTS get_users_with_point_totals;

-- Verifikasi tidak ada function lagi
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%user%'
  AND routine_definition LIKE '%role%';

-- ========================================
-- SELESAI
-- ========================================
-- RPC function yang invalid sudah dihapus
-- Code sudah diubah untuk query langsung tanpa RPC
-- ========================================
