
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, AppData, Trip, Driver, StorageConfig } from './types';
import { GitHubService } from './services/githubService';
import AuthScreen from './components/AuthScreen';
import AdminDashboard from './components/AdminDashboard';
import DriverPortal from './components/DriverPortal';
import CustomerPortal from './components/CustomerPortal';
import CloudStorageSetup from './components/CloudStorageSetup';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { Loader2, AlertCircle, Database } from 'lucide-react';

const DEFAULT_CONFIG: StorageConfig = {
  owner: '',
  repo: 'drivebuddy-db',
  branch: 'main',
  folderPath: '/crm-data/',
  token: '',
  isConnected: false
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [storageConfig, setStorageConfig] = useState<StorageConfig>(() => {
    const saved = localStorage.getItem('db_storage_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'STORAGE_SETUP'>('DASHBOARD');

  const github = storageConfig.isConnected ? new GitHubService(storageConfig) : null;

  const loadAllData = useCallback(async () => {
    if (!github) return;
    setLoading(true);
    try {
      const freshData = await github.fetchAllData();
      setData(freshData);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(`Storage Error: ${err.message}. Ensure GitHub is configured correctly in Settings.`);
    } finally {
      setLoading(false);
    }
  }, [storageConfig.isConnected]);

  // High-frequency tracking: Refresh every 15 seconds for live feel
  useEffect(() => {
    let interval: any;
    if (storageConfig.isConnected) {
      loadAllData();
      interval = setInterval(loadAllData, 15000);
    }
    return () => clearInterval(interval);
  }, [storageConfig.isConnected, loadAllData]);

  const handleLogin = (u: User) => {
    setUser(u);
  };

  const handleLogout = () => {
    setUser(null);
    setData(null);
    setCurrentView('DASHBOARD');
  };

  const updateStorageConfig = (newConfig: StorageConfig) => {
    setStorageConfig(newConfig);
    localStorage.setItem('db_storage_config', JSON.stringify(newConfig));
    setError(null);
  };

  const updateTrips = async (newTrips: Trip[]) => {
    if (!github || !data) return;
    try {
      await github.updateData('trips', newTrips);
      setData(prev => prev ? { ...prev, trips: newTrips } : null);
    } catch (err: any) {
      alert("Failed to save trips: " + err.message);
    }
  };

  const updateDrivers = async (newDrivers: Driver[]) => {
    if (!github || !data) return;
    try {
      await github.updateData('drivers', newDrivers);
      setData(prev => prev ? { ...prev, drivers: newDrivers } : null);
    } catch (err: any) {
      alert("Failed to update driver status: " + err.message);
    }
  };

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const renderDashboard = () => {
    if (currentView === 'STORAGE_SETUP' && user.role === UserRole.ADMIN) {
      return <CloudStorageSetup config={storageConfig} onUpdateConfig={updateStorageConfig} />;
    }

    if (!storageConfig.isConnected) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <Database className="w-16 h-16 text-slate-800 mb-6" />
          <h1 className="text-2xl font-bold mb-4 text-white uppercase tracking-tighter italic">Command Core Offline</h1>
          <p className="text-slate-500 max-w-md mb-8 font-medium">
            {user.role === UserRole.ADMIN 
              ? "Storage relay not detected. Connect to GitHub Cloud to enable enterprise synchronization."
              : "System storage is currently restricted. Please contact your dispatch administrator."}
          </p>
          {user.role === UserRole.ADMIN && (
            <button 
              onClick={() => setCurrentView('STORAGE_SETUP')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-2xl shadow-purple-900/30"
            >
              Establish Cloud Link
            </button>
          )}
        </div>
      );
    }

    if (loading && !data) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-purple-400">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] italic">Synchronizing Assets...</p>
        </div>
      );
    }

    if (!data) return null;

    switch (user.role) {
      case UserRole.ADMIN:
      case UserRole.OPERATIONS:
      case UserRole.MANAGER:
      case UserRole.FINANCE:
        return (
          <AdminDashboard 
            user={user} 
            data={data} 
            onUpdateTrips={updateTrips}
            onUpdateDrivers={updateDrivers}
          />
        );
      case UserRole.DRIVER:
        return (
          <DriverPortal 
            user={user} 
            data={data} 
            onUpdateTrips={updateTrips}
            onUpdateDrivers={updateDrivers}
          />
        );
      case UserRole.CUSTOMER:
        return (
          <CustomerPortal 
            user={user} 
            data={data} 
            onUpdateTrips={updateTrips}
          />
        );
      default:
        return <div className="p-8">Access Denied</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-inter">
      <Sidebar 
        role={user.role} 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        onLogout={handleLogout}
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar 
          user={user} 
          notifications={data?.notifications || []} 
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-12">
          {!storageConfig.isConnected && user.role !== UserRole.ADMIN && (
             <div className="mb-8 bg-red-500/10 border border-red-500/30 p-5 rounded-2xl flex items-center gap-4">
               <AlertCircle className="w-6 h-6 text-red-500" />
               <p className="text-xs font-black text-red-400 uppercase tracking-widest">Global Relay Fault: Persistent data storage inactive.</p>
             </div>
          )}
          {renderDashboard()}
        </main>
      </div>
    </div>
  );
};

export default App;
