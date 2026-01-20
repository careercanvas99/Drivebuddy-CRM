
import React, { useRef, useState } from 'react';
import { CompanySettings } from '../types.ts';
import { ICONS } from '../constants.tsx';

interface SettingsProps {
  settings: CompanySettings;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const sqlSnippet = `-- 0. Clean Slate (Forceful)
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.crm_state CASCADE;

-- 1. Create state table for cloud sync
CREATE TABLE public.crm_state (
  id BIGINT PRIMARY KEY,
  payload JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create customers table
CREATE TABLE public.customers (
  id TEXT PRIMARY KEY,
  name TEXT,
  mobile TEXT,
  homeAddress TEXT,
  officeAddress TEXT,
  vehicleModel TEXT
);

-- 3. Create trips table
CREATE TABLE public.trips (
  id TEXT PRIMARY KEY,
  customerId TEXT REFERENCES public.customers(id),
  driverId TEXT,
  pickupLocation TEXT,
  dropLocation TEXT,
  tripType TEXT,
  startDateTime TEXT,
  endDateTime TEXT,
  status TEXT,
  billAmount FLOAT8,
  paymentStatus TEXT,
  paymentMode TEXT
);

-- 4. Create leads table
CREATE TABLE public.leads (
  id BIGSERIAL PRIMARY KEY,
  customer_id TEXT REFERENCES public.customers(id),
  status TEXT DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSnippet);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Settings</h2>
          <p className="text-gray-500 text-xs font-black uppercase tracking-[0.3em] mt-3">Brand Identity & Infrastructure</p>
        </div>
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded-[4rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="space-y-10 animate-in slide-in-from-left duration-500">
          <div className="flex flex-col md:flex-row items-center gap-12 pb-10 border-b border-gray-900">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-48 h-48 bg-gray-900 border-2 border-dashed border-gray-800 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-purple-500 transition-all shadow-inner"
            >
              {settings.logo ? (
                <img src={settings.logo} className="w-full h-full object-contain p-6" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-700 group-hover:text-purple-500">
                  {ICONS.Camera}
                  <span className="text-[10px] font-black uppercase tracking-widest">Upload Logo</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-3xl font-black text-white">Visual Branding</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xl">
                This logo and company details will be featured on all client-facing assets, 
                automated trip receipts, and official PDF invoices.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-600 uppercase font-black px-4 tracking-widest">Company Name</label>
              <input 
                name="name" 
                className="w-full bg-gray-900 border border-gray-800 rounded-[1.5rem] p-5 text-sm font-bold focus:border-purple-500 outline-none transition-all shadow-inner" 
                value={settings.name} 
                onChange={handleUpdate} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-600 uppercase font-black px-4 tracking-widest">Support Mobile</label>
              <input 
                name="mobile" 
                className="w-full bg-gray-900 border border-gray-800 rounded-[1.5rem] p-5 text-sm font-mono focus:border-purple-500 outline-none transition-all shadow-inner" 
                value={settings.mobile} 
                onChange={handleUpdate} 
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] text-gray-600 uppercase font-black px-4 tracking-widest">Business Address</label>
              <textarea 
                name="address" 
                className="w-full bg-gray-900 border border-gray-800 rounded-[1.5rem] p-6 text-sm h-32 focus:border-purple-500 outline-none transition-all shadow-inner leading-relaxed" 
                value={settings.address} 
                onChange={handleUpdate} 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-orange-950/20 border border-orange-500/30 rounded-[3rem] p-10 space-y-6">
        <div className="flex items-center gap-4 text-orange-500">
          <div className="p-3 bg-orange-500/10 rounded-2xl">{ICONS.Reports}</div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter">Infrastructure Rebuild</h3>
            <p className="text-xs text-orange-500/60 uppercase font-bold tracking-widest">Fix for Foreign Key Dependency Error</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-400 leading-relaxed">
          If you encountered the <span className="text-white font-bold">"cannot drop table because other objects depend on it"</span> error, use this updated script. It includes <span className="text-white font-mono">CASCADE</span> logic to automatically handle dependent tables like <span className="text-white font-mono">leads</span>.
        </p>

        <div className="relative group">
          <pre className="bg-black/80 border border-gray-800 rounded-2xl p-6 text-[10px] font-mono text-emerald-400 overflow-x-auto">
            {sqlSnippet}
          </pre>
          <button 
            onClick={copySql}
            className="absolute top-4 right-4 bg-gray-800 hover:bg-white hover:text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            {copyStatus === 'copied' ? 'Copied to Clipboard' : 'Copy SQL Script'}
          </button>
        </div>
      </div>

      <div className="bg-gray-900/30 p-8 rounded-[3rem] border border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className={`w-3 h-3 rounded-full bg-emerald-500 animate-pulse`}></div>
           <p className="text-xs text-gray-400 font-black uppercase tracking-[0.2em]">
             System Core Active: Infrastructure Health Check
           </p>
        </div>
        <div className="flex items-center gap-8 text-right">
           <div>
             <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Last Sync Check</p>
             <span className="text-xs text-white font-mono">{settings.supabaseConfig?.lastSync || 'Pending Setup'}</span>
           </div>
        </div>
      </div>
      
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
    </div>
  );
};

export default Settings;
