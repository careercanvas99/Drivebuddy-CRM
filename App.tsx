
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
import CustomerDashboard from './components/CustomerDashboard.tsx';
import DriverDashboard from './components/DriverDashboard.tsx';

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
      const { error: pingError } = await supabase.from('customers').select('id').limit(1);
      
      if (pingError) {
        if (pingError.code === '42P01' || pingError.message.includes('column "customer_name" does not exist')) {
          setSetupRequired(true);
          setSyncStatus('setup_required');
          setIsLoading(false);
          return;
        }
        throw pingError;
      }

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

      if (usersData) {
        setUsers(usersData.map((u: any) => ({
          id: u.id,
          displayId: u.staff_code || 'DBDY-HYD-PENDING', 
          username: u.username,
          password: u.password,
          role: u.role,
          name: u.name,
          mobile: u.mobile,
          address: u.address
        })));
      }

      if (driversData) {
        setDrivers(driversData.map((d: any) => ({
          id: d.id,
          displayId: d.driver_code || 'DBDY-HYD-DR-PENDING',
          name: d.name,
          licenseNumber: d.license_number,
          issueDate: d.issue_date,
          expiryDate: d.expiry_date,
          address: d.address || '',
          permanentAddress: d.permanent_address || '',
          status: d.status || 'available',
          location: [d.location_lat || 12.9716, d.location_lng || 77.5946]
        })));
      }

      if (customersData) {
        setCustomers(customersData.map((c: any) => ({
          id: c.id,
          displayId: c.customer_code || 'CUST-PENDING',
          name: c.customer_name,
          mobile: c.mobile_number,
          homeAddress: c.home_address || '',
          officeAddress: c.office_address || '',
          vehicleModel: c.vehicle_model || 'Standard'
        })));
      }

      if (tripsData) {
        setTrips(tripsData.map((t: any) => ({
          id: t.id,
          displayId: t.trip_code || 'TRIP-PENDING',
          customerId: t.customer_id,
          driverId: t.driver_id,
          pickupLocation: t.pickup_location,
          dropLocation: t.drop_location,
          tripType: t.trip_type,
          startDateTime: t.start_time,
          endDateTime: t.end_time,
          status: t.trip_status as any,
          cancelReason: t.cancel_reason,
          billAmount: t.bill_amount,
          paymentStatus: t.payment_status || 'pending',
          paymentMode: t.payment_mode
        })));
      }

      // Sync current logged-in user displayId
      if (user) {
        const currentUserData = usersData?.find(u => u.id === user.id);
        if (currentUserData) {
          setUser(prev => prev ? { ...prev, displayId: currentUserData.staff_code || prev.displayId } : null);
        }
      }

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
  }, [user?.id]);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('crm-persistence-sync')
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

  if (!user) return <Login onLogin={setUser} isCloudReachable={isCloudReachable} onRetry={fetchData} />;

  if (user.role === UserRole.CUSTOMER) {
    return (
      <CustomerDashboard 
        user={user} 
        trips={trips} 
        customers={customers} 
        setTrips={setTrips} 
        drivers={drivers} 
        onLogout={() => setUser(null)}
        companySettings={companySettings}
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
        onLogout={() => setUser(null)}
        companySettings={companySettings}
      />
    );
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-black overflow-hidden">
        <Sidebar user={user} onLogout={() => setUser(null)} />
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
              <Route path="/finance" element={[UserRole.ADMIN, UserRole.FINANCE].includes(user.role) ? <FinanceReports trips={trips} drivers={drivers} customers={customers} companySettings={companySettings} /> : <Navigate to="/" />} />
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
