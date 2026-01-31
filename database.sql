
-- DRIVEBUDDY DEFINITIVE INFRASTRUCTURE SCRIPT V50
-- TARGET: Mission Override Protocol & Unified Audit Registry

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CREATE SEQUENCES FOR BUSINESS IDS
CREATE SEQUENCE IF NOT EXISTS seq_staff_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_driver_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_trip_code START 4501;
CREATE SEQUENCE IF NOT EXISTS seq_customer_code START 101;

-- 3. MASTER TABLES (With V50 Column Verification)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_code TEXT UNIQUE,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, 
    mobile TEXT,
    address TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code TEXT UNIQUE,
    customer_name TEXT NOT NULL,
    mobile_number TEXT UNIQUE NOT NULL,
    home_address TEXT,
    office_address TEXT,
    vehicle_model TEXT DEFAULT 'Standard',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- V50 Repair for Customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vehicle_model TEXT DEFAULT 'Standard';

CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_code TEXT UNIQUE,
    name TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    address TEXT,
    permanent_address TEXT,
    status TEXT DEFAULT 'Available',
    location_lat FLOAT8 DEFAULT 17.3850,
    location_lng FLOAT8 DEFAULT 78.4867,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- V50 Repair for Drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Available';

CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_code TEXT UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    pickup_location TEXT NOT NULL,
    drop_location TEXT NOT NULL,
    trip_type TEXT DEFAULT 'one-way',
    trip_route TEXT DEFAULT 'Instation',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    trip_status TEXT DEFAULT 'NEW',
    cancel_reason TEXT,
    bill_amount FLOAT8,
    payment_status TEXT DEFAULT 'pending',
    payment_mode TEXT,
    deleted_at TIMESTAMPTZ,
    delete_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- V50 Repair for Trips
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS trip_route TEXT DEFAULT 'Instation';

CREATE TABLE IF NOT EXISTS public.trip_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES public.users(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. V50 CREDENTIAL SYNC & ID GENERATION PROTOCOL
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON public.customers(mobile_number);

-- 5. BUSINESS ID GENERATION LOGIC V50
CREATE OR REPLACE FUNCTION public.fn_generate_business_id_v50() RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'users' AND (NEW.staff_code IS NULL OR NEW.staff_code = '') THEN
    NEW.staff_code := 'DBDY-HYD-' || LPAD(nextval('seq_staff_code')::text, 3, '0');
  ELSIF TG_TABLE_NAME = 'drivers' AND (NEW.driver_code IS NULL OR NEW.driver_code = '') THEN
    NEW.driver_code := 'DBDY-HYD-DR-' || LPAD(nextval('seq_driver_code')::text, 3, '0');
  ELSIF TG_TABLE_NAME = 'trips' AND (NEW.trip_code IS NULL OR NEW.trip_code = '') THEN
    NEW.trip_code := 'TRIP-' || nextval('seq_trip_code')::text;
  ELSIF TG_TABLE_NAME = 'customers' AND (NEW.customer_code IS NULL OR NEW.customer_code = '') THEN
    NEW.customer_code := 'CUST-' || nextval('seq_customer_code')::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. ATTACH TRIGGERS
DROP TRIGGER IF EXISTS tr_users_code ON public.users;
CREATE TRIGGER tr_users_code BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION fn_generate_business_id_v50();

DROP TRIGGER IF EXISTS tr_drivers_code ON public.drivers;
CREATE TRIGGER tr_drivers_code BEFORE INSERT ON public.drivers FOR EACH ROW EXECUTE FUNCTION fn_generate_business_id_v50();

DROP TRIGGER IF EXISTS tr_trips_code ON public.trips;
CREATE TRIGGER tr_trips_code BEFORE INSERT ON public.trips FOR EACH ROW EXECUTE FUNCTION fn_generate_business_id_v50();

DROP TRIGGER IF EXISTS tr_customers_code ON public.customers;
CREATE TRIGGER tr_customers_code BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION fn_generate_business_id_v50();

-- 7. INITIAL DATA RESET (Gopal's Verified Credentials)
DELETE FROM public.users WHERE username = '9876543210';
INSERT INTO public.users (name, username, password, role, status) 
VALUES ('Gopal', '9876543210', 'Gopal@123', 'Customer', 'Active');

-- 8. PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
NOTIFY pgrst, 'reload schema';
