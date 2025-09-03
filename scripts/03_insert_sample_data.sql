-- Insert sample branches
INSERT INTO branches (id, name, address, phone, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Pigtown Barbershop - Pusat', 'Jl. Sudirman No. 123, Jakarta Pusat', '021-12345678', 'active'),
('550e8400-e29b-41d4-a716-446655440002', 'Pigtown Barbershop - Utara', 'Jl. Kemang Raya No. 456, Jakarta Utara', '021-87654321', 'active'),
('550e8400-e29b-41d4-a716-446655440003', 'Pigtown Barbershop - Selatan', 'Jl. Fatmawati No. 789, Jakarta Selatan', '021-11223344', 'active');

-- Insert sample service categories
INSERT INTO service_categories (id, name, description, icon) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Potong Rambut', 'Layanan potong rambut berbagai gaya', 'scissors'),
('660e8400-e29b-41d4-a716-446655440002', 'Cukur', 'Layanan cukur jenggot dan kumis', 'razor'),
('660e8400-e29b-41d4-a716-446655440003', 'Keramas', 'Layanan keramas dan perawatan rambut', 'shampoo'),
('660e8400-e29b-41d4-a716-446655440004', 'Styling', 'Layanan styling dan penataan rambut', 'styling');

-- Insert sample services
INSERT INTO services (id, category_id, name, description, price, duration, commission_rate) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'Potong Rambut Basic', 'Potong rambut standar', 25000, 30, 10.00),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'Potong Rambut Premium', 'Potong rambut dengan styling', 45000, 45, 15.00),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', 'Potong Rambut Anak', 'Khusus untuk anak-anak', 20000, 25, 8.00),
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', 'Cukur Jenggot', 'Cukur jenggot bersih', 15000, 20, 8.00),
('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', 'Cukur + Perawatan', 'Cukur dengan perawatan wajah', 35000, 40, 12.00),
('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440003', 'Keramas Basic', 'Keramas dengan shampo', 10000, 15, 5.00),
('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440003', 'Keramas + Treatment', 'Keramas dengan treatment', 25000, 30, 10.00),
('770e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440004', 'Styling Gel', 'Styling rambut dengan gel', 15000, 10, 6.00),
('770e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440004', 'Styling Wax', 'Styling rambut dengan wax', 20000, 15, 8.00);

-- Insert sample shifts
INSERT INTO shifts (id, name, start_time, end_time, branch_id) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'Shift Pagi', '08:00:00', '16:00:00', '550e8400-e29b-41d4-a716-446655440001'),
('880e8400-e29b-41d4-a716-446655440002', 'Shift Siang', '12:00:00', '20:00:00', '550e8400-e29b-41d4-a716-446655440001'),
('880e8400-e29b-41d4-a716-446655440003', 'Shift Malam', '16:00:00', '00:00:00', '550e8400-e29b-41d4-a716-446655440001');

-- Insert sample users (owner and employees)
INSERT INTO users (id, email, name, role, phone, branch_id, position, salary, commission_rate, status) VALUES
('990e8400-e29b-41d4-a716-446655440001', 'owner@pigtownbarbershop.com', 'Owner Pigtown', 'owner', '081234567890', '550e8400-e29b-41d4-a716-446655440001', 'Owner', 0, 0, 'active'),
('990e8400-e29b-41d4-a716-446655440002', 'ahmad@pigtownbarbershop.com', 'Ahmad Barber', 'employee', '081234567891', '550e8400-e29b-41d4-a716-446655440001', 'Senior Barber', 3500000, 15.00, 'active'),
('990e8400-e29b-41d4-a716-446655440003', 'budi@pigtownbarbershop.com', 'Budi Stylist', 'employee', '081234567892', '550e8400-e29b-41d4-a716-446655440001', 'Hair Stylist', 3000000, 12.00, 'active'),
('990e8400-e29b-41d4-a716-446655440004', 'citra@pigtownbarbershop.com', 'Citra Cashier', 'cashier', '081234567893', '550e8400-e29b-41d4-a716-446655440001', 'Cashier', 2800000, 5.00, 'active'),
('990e8400-e29b-41d4-a716-446655440005', 'doni@pigtownbarbershop.com', 'Doni Barber', 'employee', '081234567894', '550e8400-e29b-41d4-a716-446655440002', 'Junior Barber', 2500000, 10.00, 'active');

-- Insert sample points for employees
INSERT INTO points (user_id, points_earned, points_type, description) VALUES
('990e8400-e29b-41d4-a716-446655440002', 150, 'transaction', 'Poin dari transaksi bulan ini'),
('990e8400-e29b-41d4-a716-446655440003', 120, 'transaction', 'Poin dari transaksi bulan ini'),
('990e8400-e29b-41d4-a716-446655440004', 80, 'transaction', 'Poin dari transaksi bulan ini'),
('990e8400-e29b-41d4-a716-446655440005', 95, 'transaction', 'Poin dari transaksi bulan ini'),
('990e8400-e29b-41d4-a716-446655440002', 50, 'bonus', 'Bonus kinerja terbaik'),
('990e8400-e29b-41d4-a716-446655440003', 30, 'bonus', 'Bonus pelayanan terbaik');

-- Insert sample receipt template
INSERT INTO receipt_templates (id, name, branch_id, header_text, footer_text, is_default) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', 'Template Default', '550e8400-e29b-41d4-a716-446655440001', 'PIGTOWN BARBERSHOP\nJl. Sudirman No. 123\nTelp: 021-12345678', 'Terima kasih atas kunjungan Anda!\nSampai jumpa lagi!', true);
