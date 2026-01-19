
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
        url: 'sdpszoukdobcznfzhasi',
        anonKey: 'sb_publishable_3A1GdmCQnhgrCC-j2qTNoQ_I3xw_AxA',
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

  const formatSupabaseUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://${url}.supabase.co`;
  };

  const pushToCloud = useCallback(async () => {
    if (isInitializing.current || companySettings.dbProvider !== 'supabase') return;
    setSyncStatus('pending');

    const payload = { users, drivers, customers, trips, updatedAt: new Date().toISOString() };
    const config = companySettings.supabaseConfig!;
    const fullUrl = formatSupabaseUrl(config.url);

    try {
      // Direct PostgREST Upsert via Supabase REST API
      const response = await fetch(`${fullUrl}/rest/v1/${config.tableName}?id=eq.1`, {
        method: 'PATCH',
        headers: { 
          'apikey': config.anonKey, 
          'Authorization': `Bearer ${config.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ payload })
      });

      if (response.status === 404 || response.status === 204 || response.ok) {
        // If 204 or 200, it's a success. If 404 on PATCH, we might need to POST first (seed)
        if (response.status === 404 || (response.ok && response.status !== 204 && response.status !== 200)) {
           await fetch(`${fullUrl}/rest/v1/${config.tableName}`, {
            method: 'POST',
            headers: { 
              'apikey': config.anonKey, 
              'Authorization': `Bearer ${config.anonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: 1, payload })
          });
        }
        setSyncStatus('synced');
      } else {
        throw new Error('Supabase Sync Failed');
      }
    } catch (e) {
      setSyncStatus('error');
    }
  }, [companySettings, users, drivers, customers, trips]);

  const initializeData = useCallback(async () => {
    if (companySettings.dbProvider === 'supabase') {
      const config = companySettings.supabaseConfig;
      const fullUrl = formatSupabaseUrl(config?.url || '');
      if (!fullUrl || !config?.anonKey) { isInitializing.current = false; return; }
      
      setSyncStatus('pending');
      try {
        const response = await fetch(`${fullUrl}/rest/v1/${config.tableName}?id=eq.1&select=payload`, {
          headers: { 'apikey': config.anonKey, 'Authorization': `Bearer ${config.anonKey}` }
        });
        if (response.ok) {
          const result = await response.json();
          if (result && result.length > 0) {
            const content = result[0].payload;
            if (content.users) setUsers(content.users);
            if (content.drivers) setDrivers(content.drivers);
            if (content.customers) setCustomers(content.customers);
            if (content.trips) setTrips(content.trips);
            setSyncStatus('synced');
          } else {
            // New project, seed current state
            isInitializing.current = false;
            pushToCloud();
          }
        } else {
          setSyncStatus('error');
        }
      } catch (e) { 
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
