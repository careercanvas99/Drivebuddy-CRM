
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import { User, UserRole, Driver, Customer, Trip, Notification, CompanySettings, GitHubConfig, SupabaseConfig } from './types.ts';
import Login from './components/Login.tsx';
import Sidebar from './components/Sidebar.tsx';
import Navbar from './components/Navbar.tsx';
import Dashboard from './components/Dashboard.tsx';
import UserManagement from './components/UserManagement.tsx';
import TripManagement from './components/TripManagement.tsx';
import DriverManagement from './components/DriverManagement.tsx';
import CustomerManagement from './components/CustomerManagement.tsx';
import FinanceReports from './components/FinanceReports.tsx';
import CustomerDashboard from './components/CustomerDashboard.tsx';
import DriverDashboard from './components/DriverDashboard.tsx';
import TripEstimation from './components/TripEstimation.tsx';
import Settings from './components/Settings.tsx';
import { mockUsers, mockDrivers, mockCustomers, mockTrips } from './services/mockData.ts';

const ProtectedUserRoute: React.FC<{ user: User, children: React.ReactElement }> = ({ user, children }) => {
  if (user.role !== UserRole.ADMIN) {
    alert("Access Denied – Admin Only");
    return <Navigate to="/" replace />;
  }
  return children;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('db_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('db_company_public');
    const base: CompanySettings = {
      name: 'Drivebuddy Chauffeurs',
      address: 'Prestige Tech Park, Bangalore, KA 560103',
      mobile: '+91 80000 00000',
      logo: '',
      dbProvider: 'supabase',
      githubConfig: { repository: '', branch: 'main', filePath: 'data/db.json', token: '' },
      supabaseConfig: { 
        url: 'cvqpaleaybyiadhpfpyh',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cXBhbGVheWJ5aWFkaHBmcHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTgxNjUsImV4cCI6MjA4NDM3NDE2NX0.Pd5b_kMhmwWZ70u3C5QOhxmBu0iZS4-EznBwvY6hfYg',
        tableName: 'crm_state' 
      }
    };
    return saved ? { ...base, ...JSON.parse(saved) } : base;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('db_all_users');
    return saved ? JSON.parse(saved) : mockUsers;
  });

  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem('db_drivers');
    return saved ? JSON.parse(saved) : mockDrivers;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('db_customers');
    return saved ? JSON.parse(saved) : mockCustomers;
  });

  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('db_trips');
    return saved ? JSON.parse(saved) : mockTrips;
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error' | 'offline'>('offline');
  
  const isInitializing = useRef(true);
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushToCloud = useCallback(async () => {
    if (isInitializing.current || companySettings.dbProvider !== 'supabase') return;
    setSyncStatus('pending');

    const payload = { users, drivers, customers, trips, updatedAt: new Date().toISOString() };
    const tableName = companySettings.supabaseConfig?.tableName || 'crm_state';

    try {
      const { error } = await supabase
        .from(tableName)
        .upsert({ id: 1, payload }, { onConflict: 'id' });

      if (error) {
        console.error('Supabase Sync Error Details:', error.message, error.details, error.hint);
        throw error;
      }

      setSyncStatus('synced');
      setCompanySettings(prev => ({
        ...prev,
        supabaseConfig: { ...prev.supabaseConfig!, lastSync: new Date().toLocaleTimeString() }
      }));
    } catch (e: any) {
      console.error('Supabase Sync Error:', e.message || e);
      setSyncStatus('error');
    }
  }, [companySettings, users, drivers, customers, trips]);

  const initializeData = useCallback(async () => {
    if (companySettings.dbProvider === 'supabase') {
      setSyncStatus('pending');
      const tableName = companySettings.supabaseConfig?.tableName || 'crm_state';
      
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('payload')
          .eq('id', 1)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
             // Row not found, this is fine for first run
             isInitializing.current = false;
             await pushToCloud();
             return;
          }
          console.error('Supabase Initialization Error Details:', error.message, error.details, error.hint);
          throw error;
        }

        if (data?.payload) {
          const content = data.payload;
          if (content.users) setUsers(content.users);
          if (content.drivers) setDrivers(content.drivers);
          if (content.customers) setCustomers(content.customers);
          if (content.trips) setTrips(content.trips);
          setSyncStatus('synced');
        }
      } catch (e: any) { 
        console.error('Supabase Initialization Error:', e.message || e);
        setSyncStatus('error'); 
      }
    }
    isInitializing.current = false;
  }, [companySettings.dbProvider, companySettings.supabaseConfig, pushToCloud]);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  useEffect(() => {
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(() => {
      if (!isInitializing.current) pushToCloud();
    }, 2500);
    
    localStorage.setItem('db_all_users', JSON.stringify(users));
    localStorage.setItem('db_drivers', JSON.stringify(drivers));
    localStorage.setItem('db_customers', JSON.stringify(customers));
    localStorage.setItem('db_trips', JSON.stringify(trips));
  }, [users, drivers, customers, trips, pushToCloud]);

  useEffect(() => {
    localStorage.setItem('db_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    const { githubConfig, supabaseConfig, ...publicSettings } = companySettings;
    localStorage.setItem('db_company_public', JSON.stringify(publicSettings));
    localStorage.setItem('db_company_internal_supabase', JSON.stringify(supabaseConfig));
  }, [companySettings]);

  const handleLogin = (userData: User) => setUser(userData);
  const handleLogout = () => setUser(null);

  if (!user) return <Login onLogin={handleLogin} users={users} customers={customers} />;

  return (
    <HashRouter>
      <div className="flex h-screen bg-black overflow-hidden">
        <Sidebar role={user.role} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar 
            user={user} notifications={notifications} 
            setNotifications={setNotifications} syncStatus={syncStatus}
            dbProvider={companySettings.dbProvider}
          />
          
          <main className="flex-1 overflow-y-auto p-6 bg-black">
            <Routes>
              <Route path="/" element={<Dashboard users={users} drivers={drivers} trips={trips} customers={customers} setTrips={setTrips} setCustomers={setCustomers} />} />
              <Route path="/users" element={
                <ProtectedUserRoute user={user}>
                  <UserManagement users={users} setUsers={setUsers} currentUser={user} />
                </ProtectedUserRoute>
              } />
              <Route path="/drivers" element={<DriverManagement drivers={drivers} setDrivers={setDrivers} trips={trips} users={users} />} />
              <Route path="/customers" element={<CustomerManagement customers={customers} setCustomers={setCustomers} trips={trips} user={user} />} />
              <Route path="/trips" element={<TripManagement trips={trips} setTrips={setTrips} drivers={drivers} customers={customers} user={user} setCustomers={setCustomers} companySettings={companySettings} />} />
              <Route path="/finance" element={[UserRole.ADMIN, UserRole.FINANCE].includes(user.role) ? <FinanceReports trips={trips} drivers={drivers} /> : <Navigate to="/" replace />} />
              <Route path="/estimation" element={<TripEstimation />} />
              <Route path="/settings" element={user.role === UserRole.ADMIN ? <Settings settings={companySettings} setSettings={setCompanySettings} /> : <Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
