
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, Driver, Customer, Trip, Notification, CompanySettings, GitHubConfig } from './types.ts';
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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('db_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('db_company_public');
    const base = {
      name: 'Drivebuddy Chauffeurs',
      address: 'Prestige Tech Park, Bangalore, KA 560103',
      mobile: '+91 80000 00000',
      logo: '',
      githubConfig: {
        repository: '',
        branch: 'main',
        filePath: 'data/db.json',
        token: ''
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
  const [isGitHubSyncActive, setIsGitHubSyncActive] = useState(false);

  // GitHub Data Handshake
  const initializeFromGitHub = useCallback(async () => {
    const config = companySettings.githubConfig;
    if (!config?.repository || !config?.token) return;

    console.log('[GitHub Sync] Fetching production data from repository...');
    try {
      const url = `https://api.github.com/repos/${config.repository}/contents/${config.filePath}?ref=${config.branch}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(atob(data.content));
        
        // Populate state with cloud data
        if (content.users) setUsers(content.users);
        if (content.drivers) setDrivers(content.drivers);
        if (content.customers) setCustomers(content.customers);
        if (content.trips) setTrips(content.trips);
        
        setIsGitHubSyncActive(true);
        console.log('[GitHub Sync] Handshake Successful. State synchronized.');
      }
    } catch (error) {
      console.error('[GitHub Sync] Error during initialization:', error);
    }
  }, [companySettings.githubConfig]);

  useEffect(() => {
    initializeFromGitHub();
  }, [initializeFromGitHub]);

  const pushToGitHub = async () => {
    const config = companySettings.githubConfig;
    if (!config?.repository || !config?.token) return;

    console.log('[GitHub Sync] Preparing Git Commit...');
    try {
      const url = `https://api.github.com/repos/${config.repository}/contents/${config.filePath}?ref=${config.branch}`;
      
      // 1. Get current SHA
      const getResponse = await fetch(url, {
        headers: { 'Authorization': `token ${config.token}` }
      });
      let sha = '';
      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
      }

      // 2. Prepare Payload
      const payload = {
        users,
        drivers,
        customers,
        trips,
        updatedAt: new Date().toISOString()
      };

      // 3. Push Commit
      const putResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `CRM Sync: Operational Update ${new Date().toLocaleTimeString()}`,
          content: btoa(JSON.stringify(payload, null, 2)),
          sha: sha || undefined,
          branch: config.branch
        })
      });

      if (putResponse.ok) {
        console.log('[GitHub Sync] Data persisted to Repository.');
      }
    } catch (error) {
      console.error('[GitHub Sync] Commit Failed:', error);
    }
  };

  useEffect(() => {
    localStorage.setItem('db_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    const { githubConfig, ...publicSettings } = companySettings;
    localStorage.setItem('db_company_public', JSON.stringify(publicSettings));
  }, [companySettings]);

  useEffect(() => {
    localStorage.setItem('db_all_users', JSON.stringify(users));
    if (isGitHubSyncActive) pushToGitHub();
  }, [users]);

  useEffect(() => {
    localStorage.setItem('db_drivers', JSON.stringify(drivers));
    if (isGitHubSyncActive) pushToGitHub();
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem('db_customers', JSON.stringify(customers));
    if (isGitHubSyncActive) pushToGitHub();
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('db_trips', JSON.stringify(trips));
    if (isGitHubSyncActive) pushToGitHub();
  }, [trips]);

  const handleLogin = (userData: User) => setUser(userData);
  const handleLogout = () => setUser(null);

  if (!user) return <Login onLogin={handleLogin} />;

  const renderContent = () => {
    if (user.role === UserRole.CUSTOMER) {
      return (
        <CustomerDashboard 
          user={user} 
          trips={trips} 
          customers={customers} 
          setTrips={setTrips} 
          drivers={drivers} 
          onLogout={handleLogout} 
        />
      );
    }
    if (user.role === UserRole.DRIVER) {
      return (
        <DriverDashboard 
          user={user} 
          trips={trips} 
          setTrips={setTrips} 
          drivers={drivers} 
          setDrivers={setDrivers} 
          onLogout={handleLogout} 
        />
      );
    }
    
    return (
      <div className="flex h-screen bg-black overflow-hidden">
        <Sidebar role={user.role} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar user={user} notifications={notifications} setNotifications={setNotifications} />
          
          {/* GitHub Connection Banner */}
          {!isGitHubSyncActive && user.role === UserRole.ADMIN && (
            <div className="bg-purple-500/10 border-b border-purple-500/20 px-6 py-2 flex items-center justify-between">
               <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                 GitHub Cloud Sync Inactive. Configure Repository in Settings for Remote Persistence.
               </p>
               <button onClick={() => window.location.hash = '/settings'} className="text-[9px] bg-purple-500 text-white px-3 py-1 rounded-full font-black uppercase">Setup Sync</button>
            </div>
          )}

          <main className="flex-1 overflow-y-auto p-6 bg-black">
            <Routes>
              <Route path="/" element={<Dashboard users={users} drivers={drivers} trips={trips} customers={customers} setTrips={setTrips} setCustomers={setCustomers} />} />
              <Route path="/users" element={<UserManagement users={users} setUsers={setUsers} />} />
              <Route path="/drivers" element={<DriverManagement drivers={drivers} setDrivers={setDrivers} trips={trips} users={users} />} />
              <Route path="/customers" element={<CustomerManagement customers={customers} setCustomers={setCustomers} trips={trips} user={user} />} />
              <Route path="/trips" element={<TripManagement trips={trips} setTrips={setTrips} drivers={drivers} customers={customers} user={user} setCustomers={setCustomers} companySettings={companySettings} />} />
              <Route path="/finance" element={<FinanceReports trips={trips} drivers={drivers} />} />
              <Route path="/estimation" element={<TripEstimation />} />
              <Route path="/settings" element={<Settings settings={companySettings} setSettings={setCompanySettings} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    );
  };

  return (
    <HashRouter>
      {renderContent()}
    </HashRouter>
  );
};

export default App;
