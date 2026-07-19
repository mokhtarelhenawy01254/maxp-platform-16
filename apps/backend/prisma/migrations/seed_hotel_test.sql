-- Create test company
INSERT INTO companies (id, name, slug, email, phone, currency, "isActive", "createdAt", "updatedAt")
VALUES ('hotel-test-company', 'فندق السلام', 'hotel-salam-test', 'hotel@test.com', '01000000000', 'EGP', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create admin user for the company
INSERT INTO users (id, email, password, "firstName", "lastName", role, "companyId", "isActive", "isEmailVerified", "timezone", "createdAt", "updatedAt")
VALUES ('hotel-test-user', 'admin@hotelsalam.com', '$2b$10$d0BvX42URCz3oDDhhghAD.f2KaoMgh0rVSMD3h.fBdJDVQTX/PoKG', 'محمود', 'السيد', 'admin', 'hotel-test-company', true, false, 'Africa/Cairo', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
