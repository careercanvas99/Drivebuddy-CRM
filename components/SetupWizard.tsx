
import React, { useState } from 'react';

interface SetupWizardProps {
  onRetry: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onRetry }) => {
  const [copyStatus, setCopyStatus] = useState(false);

  const sqlScript = `-- NUCLEAR INFRASTRUCTURE REBUILD (V5 - NATIVE UUID)
-- 1. SETUP ENVIRONMENT
SET search_path TO public, extensions;

-- 2. FORCE CLEANUP
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 3. CREATE CORE TABLES USING NATIVE gen_random_uuid()
-- Note: gen_random_uuid() is built-in to Postgres 13+ and does not require extensions.
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  home_address TEXT,
  office_address TEXT,
  vehicle_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'available',
  location_lat FLOAT8 DEFAULT 12.9716,
  location_lng FLOAT8 DEFAULT 77.5946,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  driver_id UUID REFERENCES public.drivers(id),
  pickup_location TEXT NOT NULL,
  drop_location TEXT NOT NULL,
  trip_type TEXT NOT NULL,
  start_date_time TIMESTAMPTZ,
  end_date_time TIMESTAMPTZ,
  status TEXT DEFAULT 'unassigned',
  bill_amount FLOAT8 DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INSERT ADMIN ACCOUNT (Username is lowercase 'admin')
INSERT INTO public.users (username, password, role, name)
VALUES ('admin', 'password', 'Admin', 'Global Administrator');

-- 5. PERMISSIONS & SECURITY
-- Explicitly disable RLS for initial setup
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;

-- Grant permissions to the public API roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 6. ENABLE REALTIME
-- Check if publication exists first, or just recreate
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.users, public.customers, public.drivers, public.trips;

-- 7. FORCE API CACHE REFRESH
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
        
        <div className="mb-10">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 leading-none">Infrastructure Nucleus</h2>
          <p className="text-gray-600 text-[10px] uppercase tracking-[0.4em] font-black">Native PostgreSQL Build (V5)</p>
        </div>
        
        <div className="bg-black border border-gray-900 rounded-[2rem] p-6 text-left mb-10 shadow-inner">
           <pre className="text-[9px] font-mono text-emerald-500 overflow-y-auto max-h-56 custom-scrollbar leading-relaxed">
             {sqlScript}
           </pre>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleCopy}
            className="w-full bg-gray-900 text-white hover:bg-purple-600 border border-gray-800 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
          >
            {copyStatus ? 'SQL Payload Copied' : 'Copy Updated SQL Script'}
          </button>

          <button 
            onClick={onRetry}
            className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-xl hover:bg-purple-50"
          >
            I've Run the Script - Try Login
          </button>
        </div>
        
        <p className="mt-10 text-[9px] text-gray-700 font-black uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
          Paste script into Supabase SQL Editor and click RUN. <br/>This version uses native UUID functions.
        </p>
      </div>
    </div>
  );
};

export default SetupWizard;
