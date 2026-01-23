
import React, { useState } from 'react';

interface SetupWizardProps {
  onRetry: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onRetry }) => {
  const [copyStatus, setCopyStatus] = useState(false);

  const sqlScript = `-- DRIVEBUDDY PRODUCTION INFRASTRUCTURE (V22 - FINAL PERSISTENCE PROTOCOL)
-- 0. ENABLE SECURITY EXTENSION
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SETUP SEQUENCES FOR BUSINESS IDS
CREATE SEQUENCE IF NOT EXISTS seq_staff_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_driver_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_trip_code START 4501;
CREATE SEQUENCE IF NOT EXISTS seq_customer_code START 101;

-- 2. CREATE CORE TABLES WITH DEFAULT UUID GENERATION
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  mobile_number TEXT UNIQUE NOT NULL,
  home_address TEXT,
  office_address TEXT,
  vehicle_model TEXT DEFAULT 'Standard',
  customer_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT,
  address TEXT,
  staff_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  address TEXT,
  permanent_address TEXT,
  status TEXT DEFAULT 'available',
  location_lat FLOAT8,
  location_lng FLOAT8,
  driver_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  pickup_location TEXT NOT NULL,
  drop_location TEXT NOT NULL,
  trip_type TEXT NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  trip_status TEXT DEFAULT 'unassigned',
  cancel_reason TEXT,
  bill_amount FLOAT8,
  payment_status TEXT DEFAULT 'pending',
  payment_mode TEXT,
  trip_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MANDATORY REPAIR: ENSURE DEFAULTS FOR ALL TABLES (FIX FOR SAVING ISSUES)
ALTER TABLE public.customers ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.trips ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.drivers ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. ID GENERATION LOGIC (SQL-LEVEL TRIGGERS)
CREATE OR REPLACE FUNCTION public.fn_sync_standard_codes() RETURNS TRIGGER AS $$
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

DROP TRIGGER IF EXISTS tr_users_standard ON public.users;
CREATE TRIGGER tr_users_standard BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION fn_sync_standard_codes();

DROP TRIGGER IF EXISTS tr_drivers_standard ON public.drivers;
CREATE TRIGGER tr_drivers_standard BEFORE INSERT ON public.drivers FOR EACH ROW EXECUTE FUNCTION fn_sync_standard_codes();

DROP TRIGGER IF EXISTS tr_trips_standard ON public.trips;
CREATE TRIGGER tr_trips_standard BEFORE INSERT ON public.trips FOR EACH ROW EXECUTE FUNCTION fn_sync_standard_codes();

DROP TRIGGER IF EXISTS tr_customers_standard ON public.customers;
CREATE TRIGGER tr_customers_standard BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION fn_sync_standard_codes();

-- 5. ACCESS POLICIES
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;

-- 6. SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  return (
    <div className="h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-gray-950 border border-purple-600/20 rounded-[4rem] p-12 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-purple-600 shadow-[0_0_15px_#9333ea]"></div>
        <div className="mb-10 text-left">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 text-purple-500 leading-none">Infrastructure Sync</h2>
          <p className="text-gray-600 text-[10px] uppercase tracking-[0.4em] font-black">Finalizing standard SQL persistence protocol</p>
        </div>
        <div className="bg-black border border-gray-900 rounded-[2rem] p-6 text-left mb-10 overflow-hidden shadow-inner">
           <p className="text-[9px] text-emerald-500 font-bold mb-4 uppercase tracking-widest animate-pulse">Sync Payload Ready</p>
           <pre className="text-[9px] font-mono text-emerald-500/70 overflow-y-auto max-h-56 leading-relaxed custom-scrollbar">
             {sqlScript}
           </pre>
        </div>
        <div className="space-y-4">
          <button onClick={handleCopy} className="w-full bg-gray-900 text-white hover:bg-purple-600 border border-gray-800 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
            {copyStatus ? 'SQL Ready' : 'Copy Infrastructure SQL'}
          </button>
          <button onClick={onRetry} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-xl hover:bg-purple-50 text-purple-600">
            Fix & Reconnect SQL Hub
          </button>
        </div>
        <div className="mt-8 p-5 bg-purple-900/10 border border-purple-500/20 rounded-2xl text-left text-[10px] text-purple-400 font-bold uppercase tracking-widest leading-relaxed">
          Attention: Ensure these triggers are active in Supabase to enable auto-generation of TRIP-XXXX and staff IDs.
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
