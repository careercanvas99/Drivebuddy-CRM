
-- DRIVEBUDDY DEFINITIVE INFRASTRUCTURE REPAIR V71
-- TARGET: Drivebuddy Branding & Persistent Config

DO $$ 
BEGIN 
    -- 1. COMPANY SETTINGS TABLE
    CREATE TABLE IF NOT EXISTS public.company_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL DEFAULT 'Drivebuddy',
        address TEXT DEFAULT 'Drivebuddy HQ, Hyderabad, India',
        mobile TEXT DEFAULT '9493936084',
        logo TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Insert Default Branding if not present
    IF NOT EXISTS (SELECT 1 FROM public.company_settings LIMIT 1) THEN
        INSERT INTO public.company_settings (name, address, mobile) 
        VALUES ('Drivebuddy', 'Drivebuddy HQ, Hyderabad, India', '9493936084');
    END IF;

    -- 2. TRIP TABLE SCHEMA ALIGNMENT
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='payment_mode') THEN
        ALTER TABLE public.trips ADD COLUMN payment_mode TEXT DEFAULT 'Unpaid';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='total_amount') THEN
        ALTER TABLE public.trips ADD COLUMN total_amount NUMERIC;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='payment_status') THEN
        ALTER TABLE public.trips ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='end_time') THEN
        ALTER TABLE public.trips ADD COLUMN end_time TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='trip_route') THEN
        ALTER TABLE public.trips ADD COLUMN trip_route TEXT DEFAULT 'Instation';
    END IF;

    -- 3. MISSION AUDIT TRAIL
    CREATE TABLE IF NOT EXISTS public.trip_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        performed_by UUID REFERENCES public.users(id),
        reason TEXT,
        image_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
END $$;

-- 4. REAL-TIME SYNC ENHANCEMENT
ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER TABLE public.drivers REPLICA IDENTITY FULL;
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.company_settings REPLICA IDENTITY FULL;

-- 5. CRITICAL: REFRESH API SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- 6. GLOBAL PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
