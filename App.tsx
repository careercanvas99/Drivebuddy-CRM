
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import { User, UserRole, Driver, Customer, Trip, Notification, CompanySettings } from './types.ts';
import Login from './components/Login.tsx';
import Sidebar from './components/Sidebar.tsx';
import Navbar from './components/Navbar.tsx';
import Dashboard from './components/Dashboard.tsx';
import UserManagement from './components/UserManagement.tsx';
import TripManagement from './components/TripManagement.tsx';
import DriverManagement from './components/DriverManagement.tsx';
import CustomerManagement from './components/CustomerManagement.tsx';
import FinanceReports from './components/FinanceReports.tsx';
import TripEstimation from './components/TripEstimation.tsx';
import Settings from './components/Settings.tsx';
import SetupWizard from './components/SetupWizard.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [isCloudReachable, setIsCloudReachable] = useState(true);
  
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: 'Drivebuddy Chauffeurs',
    address: 'Prestige Tech Park, Bangalore, KA 560103',
    mobile: '+91 80000 00000',
    dbProvider: 'supabase',
  });

  const [users, setUsers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error' | 'setup_required'>('pending');

  const fetchData = useCallback(async () => {
    setSyncStatus('pending');
    try {
      // 1. Connectivity & Schema Check
      // We check for 'users' table specifically. 
      // PGRST205 = Schema cache not found (PostgREST error)
      // 42P01 = Table does not exist (PostgreSQL error)
      const { data: pingData, error: pingError } = await supabase.from('users').select('id').limit(1);
      
      if (pingError) {
        if (pingError.code === '42P01' || pingError.code === 'PGRST205') {
          console.warn("Database tables missing or cache not refreshed. Redirecting to setup.");
          setSetupRequired(true);
          setSyncStatus('setup_required');
          setIsLoading(false);
          return;
        }
        throw pingError;
      }

      // 2. Parallel Fetch
      const [
        { data: usersData },
        { data: driversData },
        { data: customersData },
        { data: tripsData }
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('drivers').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('trips').select('*').order('created_at', { ascending: false })
      ]);

      // 3. Handle Empty User Table (Initial State)
      if (usersData && usersData.length === 0) {
        setSetupRequired(true);
        setSyncStatus('setup_required');
        setIsLoading(false);
        return;
      }

      if (usersData) setUsers(usersData as User[]);
      if (driversData) setDrivers(driversData as Driver[]);
      if (customersData) setCustomers(customersData as Customer[]);
      if (tripsData) setTrips(tripsData as Trip[]);

      setSyncStatus('synced');
      setIsCloudReachable(true);
      setSetupRequired(false);
    } catch (e: any) {
      console.error("Infrastructure Sync Error:", e);
      if (e instanceof TypeError && e.message.includes('fetch')) {
        setIsCloudReachable(false);
      }
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('ops-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center space-y-8">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-purple-500/10 rounded-full"></div>
          <div className="w-16 h-16 border-t-2 border-purple-500 rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-white font-black uppercase text-[10px] tracking-[0.5em] animate-pulse">Establishing Secure Uplink</p>
      </div>
    );
  }

  if (setupRequired) return <SetupWizard onRetry={fetchData} />;

  if (!user) return (
    <div className="relative">
      {!isCloudReachable && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white p-2 text-center text-[10px] font-black uppercase tracking-widest z-[200]">
          API Gateway Blocked. Check AdBlockers/VPN.
        </div>
      )}
      <Login onLogin={setUser} isCloudReachable={isCloudReachable} onRetry={fetchData} />
    </div>
  );

  return (
    <HashRouter>
      <div className="flex h-screen bg-black overflow-hidden">
        <Sidebar role={user.role} onLogout={() => setUser(null)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar 
            user={user} notifications={notifications} 
            setNotifications={setNotifications} syncStatus={syncStatus}
            dbProvider={companySettings.dbProvider}
          />
          <main className="flex-1 overflow-y-auto p-6 bg-black">
            <Routes>
              <Route path="/" element={<Dashboard users={users} drivers={drivers} trips={trips} customers={customers} setTrips={setTrips} setCustomers={setCustomers} />} />
              <Route path="/users" element={user.role === UserRole.ADMIN ? <UserManagement users={users} setUsers={setUsers} currentUser={user} /> : <Navigate to="/" />} />
              <Route path="/drivers" element={<DriverManagement drivers={drivers} setDrivers={setDrivers} trips={trips} users={users} />} />
              <Route path="/customers" element={<CustomerManagement customers={customers} setCustomers={setCustomers} trips={trips} user={user} />} />
              <Route path="/trips" element={<TripManagement trips={trips} setTrips={setTrips} drivers={drivers} customers={customers} user={user} setCustomers={setCustomers} companySettings={companySettings} />} />
              <Route path="/finance" element={[UserRole.ADMIN, UserRole.FINANCE].includes(user.role) ? <FinanceReports trips={trips} drivers={drivers} /> : <Navigate to="/" />} />
              <Route path="/estimation" element={<TripEstimation />} />
              <Route path="/settings" element={user.role === UserRole.ADMIN ? <Settings settings={companySettings} setSettings={setCompanySettings} /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
