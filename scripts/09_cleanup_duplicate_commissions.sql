-- Script untuk membersihkan duplikat komisi
-- Hanya menyimpan 1 komisi per user_id + service_id (yang terbaru)

-- Cek duplikat terlebih dahulu
SELECT 
    user_id, 
    service_id, 
    COUNT(*) as jumlah_duplikat
FROM commission_rules
GROUP BY user_id, service_id
HAVING COUNT(*) > 1
ORDER BY jumlah_duplikat DESC;

-- Hapus duplikat, simpan hanya yang terbaru (berdasarkan created_at)
WITH duplicates AS (
    SELECT 
        id,
        user_id,
        service_id,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, service_id 
            ORDER BY created_at DESC
        ) as row_num
    FROM commission_rules
)
DELETE FROM commission_rules
WHERE id IN (
    SELECT id 
    FROM duplicates 
    WHERE row_num > 1
);

-- Verifikasi tidak ada duplikat lagi
SELECT 
    user_id, 
    service_id, 
    COUNT(*) as jumlah
FROM commission_rules
GROUP BY user_id, service_id
HAVING COUNT(*) > 1;

-- Hasil query terakhir harus kosong (0 rows) jika tidak ada duplikat
