
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
    address: 'Drivebuddy HQ, Hyderabad, India',
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
        if (pingError.code === '42P01') {
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
          displayId: u.staff_code || 'DBDY-HYD-000', 
          username: u.username,
          password: u.password,
          role: u.role as UserRole,
          name: u.name,
          mobile: u.mobile,
          address: u.address,
          status: (u.status as 'Active' | 'Disabled') || 'Active'
        })));
      }

      if (driversData) {
        setDrivers(driversData.map((d: any) => ({
          id: d.id,
          displayId: d.driver_code || 'DBDY-HYD-DR-000',
          name: d.name,
          licenseNumber: d.license_number,
          issueDate: d.issue_date,
          expiryDate: d.expiry_date,
          address: d.address || '',
          permanentAddress: d.permanent_address || '',
          status: d.status as any,
          location: [d.location_lat || 17.3850, d.location_lng || 78.4867]
        })));
      }

      if (customersData) {
        setCustomers(customersData.map((c: any) => ({
          id: c.id,
          displayId: c.customer_code || 'CUST-000',
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
          displayId: t.trip_code || 'TRIP-000',
          customerId: t.customer_id,
          driverId: t.driver_id,
          pickupLocation: t.pickup_location,
          dropLocation: t.drop_location,
          tripType: t.trip_type as any,
          tripRoute: t.trip_route || 'Instation',
          startDateTime: t.start_time,
          endDateTime: t.end_time,
          status: t.trip_status as any,
          cancelReason: t.cancel_reason,
          billAmount: t.bill_amount,
          paymentStatus: t.payment_status as any,
          paymentMode: t.payment_mode as any
        })));
      }

      setSyncStatus('synced');
      setIsCloudReachable(true);
      setSetupRequired(false);
    } catch (e: any) {
      console.error("Critical Uplink Failure:", e);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('sql-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center font-black uppercase tracking-widest text-[10px] text-purple-500 animate-pulse">Establishing Uplink...</div>;
  if (setupRequired) return <SetupWizard onRetry={fetchData} />;
  if (!user) return <Login onLogin={setUser} isCloudReachable={isCloudReachable} onRetry={fetchData} />;

  const isStaff = [UserRole.ADMIN, UserRole.OPS_MANAGER, UserRole.OPERATION_EXECUTIVE, UserRole.FINANCE].includes(user.role);

  return (
    <HashRouter>
      <div className="flex h-screen bg-black overflow-hidden">
        {isStaff && <Sidebar user={user} onLogout={() => setUser(null)} />}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isStaff && <Navbar user={user} notifications={notifications} setNotifications={setNotifications} syncStatus={syncStatus} />}
          <main className="flex-1 overflow-y-auto bg-black">
            <Routes>
              {isStaff ? (
                <>
                  <Route path="/" element={<Dashboard users={users} drivers={drivers} trips={trips} customers={customers} setTrips={setTrips} setCustomers={setCustomers} currentUser={user} />} />
                  <Route path="/users" element={<UserManagement users={users} setUsers={setUsers} currentUser={user} />} />
                  <Route path="/drivers" element={<DriverManagement drivers={drivers} setDrivers={setDrivers} trips={trips} users={users} currentUser={user} />} />
                  <Route path="/customers" element={<CustomerManagement customers={customers} setCustomers={setCustomers} trips={trips} user={user} users={users} />} />
                  <Route path="/trips" element={<TripManagement trips={trips} setTrips={setTrips} drivers={drivers} setDrivers={setDrivers} customers={customers} user={user} setCustomers={setCustomers} companySettings={companySettings} />} />
                  <Route path="/finance" element={<FinanceReports trips={trips} drivers={drivers} customers={customers} companySettings={companySettings} />} />
                  <Route path="/estimation" element={<TripEstimation />} />
                  <Route path="/settings" element={<Settings settings={companySettings} setSettings={setCompanySettings} />} />
                </>
              ) : user.role === UserRole.DRIVER ? (
                <Route path="*" element={<DriverDashboard user={user} trips={trips} setTrips={setTrips} drivers={drivers} setDrivers={setDrivers} onLogout={() => setUser(null)} companySettings={companySettings} />} />
              ) : (
                <Route path="*" element={<CustomerDashboard user={user} trips={trips} customers={customers} setTrips={setTrips} drivers={drivers} onLogout={() => setUser(null)} companySettings={companySettings} />} />
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
