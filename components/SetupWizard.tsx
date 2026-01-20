
import React, { useState } from 'react';

interface SetupWizardProps {
  onRetry: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onRetry }) => {
  const [copyStatus, setCopyStatus] = useState(false);

  const sqlScript = `-- DRIVEBUDDY PRODUCTION SQL (V9 - AUTO-MIGRATION & ID ENFORCEMENT)
-- 1. SETUP CORE SEQUENCES
CREATE SEQUENCE IF NOT EXISTS seq_staff_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_driver_code START 1;
CREATE SEQUENCE IF NOT EXISTS seq_trip_code START 4501;

-- 2. ENSURE COLUMNS EXIST (NON-DESTRUCTIVE)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='staff_code') THEN
    ALTER TABLE public.users ADD COLUMN staff_code TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='driver_code') THEN
    ALTER TABLE public.drivers ADD COLUMN driver_code TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='trip_code') THEN
    ALTER TABLE public.trips ADD COLUMN trip_code TEXT UNIQUE;
  END IF;
END $$;

-- 3. ID GENERATION FUNCTIONS
CREATE OR REPLACE FUNCTION public.fn_generate_staff_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.staff_code IS NULL THEN
    NEW.staff_code := 'DBDY-HYD-' || LPAD(nextval('seq_staff_code')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_generate_driver_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.driver_code IS NULL THEN
    NEW.driver_code := 'DBDY-HYD-DR-' || LPAD(nextval('seq_driver_code')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_generate_trip_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trip_code IS NULL THEN
    NEW.trip_code := 'TRIP-' || nextval('seq_trip_code')::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. APPLY TRIGGERS
DROP TRIGGER IF EXISTS trigger_generate_staff_code ON public.users;
CREATE TRIGGER trigger_generate_staff_code BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION fn_generate_staff_code();

DROP TRIGGER IF EXISTS trigger_generate_driver_code ON public.drivers;
CREATE TRIGGER trigger_generate_driver_code BEFORE INSERT ON public.drivers FOR EACH ROW EXECUTE FUNCTION fn_generate_driver_code();

DROP TRIGGER IF EXISTS trigger_generate_trip_code ON public.trips;
CREATE TRIGGER trigger_generate_trip_code BEFORE INSERT ON public.trips FOR EACH ROW EXECUTE FUNCTION fn_generate_trip_code();

-- 5. DATA MIGRATION (CRITICAL: REPAIRS EXISTING NULL IDs)
UPDATE public.users SET staff_code = 'DBDY-HYD-' || LPAD(nextval('seq_staff_code')::text, 3, '0') WHERE staff_code IS NULL;
UPDATE public.drivers SET driver_code = 'DBDY-HYD-DR-' || LPAD(nextval('seq_driver_code')::text, 3, '0') WHERE driver_code IS NULL;
UPDATE public.trips SET trip_code = 'TRIP-' || nextval('seq_trip_code') WHERE trip_code IS NULL;

-- 6. SECURITY PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;

-- 7. ENABLE REALTIME
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.users, public.drivers, public.trips;
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
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 leading-none text-purple-500">ID System Repair</h2>
          <p className="text-gray-600 text-[10px] uppercase tracking-[0.4em] font-black">PostgreSQL Sequential Logic Hub</p>
        </div>
        <div className="bg-black border border-gray-900 rounded-[2rem] p-6 text-left mb-10 shadow-inner overflow-hidden">
           <pre className="text-[9px] font-mono text-emerald-500 overflow-y-auto max-h-56 custom-scrollbar leading-relaxed">
             {sqlScript}
           </pre>
        </div>
        <div className="space-y-4">
          <button onClick={handleCopy} className="w-full bg-gray-900 text-white hover:bg-purple-600 border border-gray-800 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
            {copyStatus ? 'SQL Payload Copied' : 'Copy Repair SQL'}
          </button>
          <button onClick={onRetry} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-xl hover:bg-purple-50">
            Apply & Finalize Fix
          </button>
        </div>
        <p className="mt-8 text-[10px] text-gray-700 font-bold uppercase tracking-widest">
          Running this repairs any "PENDING" or UUID IDs in your tables.
        </p>
      </div>
    </div>
  );
};

export default SetupWizard;
