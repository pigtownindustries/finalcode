-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kasbon_updated_at BEFORE UPDATE ON kasbon FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receipt_templates_updated_at BEFORE UPDATE ON receipt_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate total work minutes
CREATE OR REPLACE FUNCTION calculate_work_minutes(
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    total_break_minutes INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
BEGIN
    IF check_in_time IS NULL OR check_out_time IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN EXTRACT(EPOCH FROM (check_out_time - check_in_time))/60 - COALESCE(total_break_minutes, 0);
END;
$$ LANGUAGE plpgsql;
