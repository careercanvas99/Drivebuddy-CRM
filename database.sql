
-- DRIVEBUDDY DEFINITIVE INFRASTRUCTURE REPAIR V65
-- TARGET: Mission Logic, Biometrics, Storage Provisioning, and PostgREST Cache Refresh

DO $$ 
BEGIN 
    -- 1. TRIP TABLE SCHEMA ALIGNMENT
    -- We use Numeric for total_amount to handle decimal fiscal data accurately
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

    -- 2. MISSION AUDIT TRAIL
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

-- 3. STORAGE PROVISIONING: CREATE 'trip-images' BUCKET
-- This ensures the bucket exists in the storage schema and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-images', 'trip-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. STORAGE SECURITY POLICIES
-- Allow public access to biometric proof images
CREATE POLICY "Allow Public Proof Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'trip-images');

-- Allow any authenticated user (Admin/Driver) to upload proofs
CREATE POLICY "Allow Authenticated Proof Upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'trip-images');

-- 5. CRITICAL: REFRESH API SCHEMA CACHE
-- This resolves the "column not found in schema cache" error immediately
NOTIFY pgrst, 'reload schema';

-- 6. GLOBAL PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, postgres, service_role;
