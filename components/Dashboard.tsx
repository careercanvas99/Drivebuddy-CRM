
import React, { useState, useEffect } from 'react';
import { User, Driver, Trip, Customer } from '../types.ts';
import { ICONS } from '../constants.tsx';
import TripBookingModal from './TripBookingModal.tsx';
import MapTracker from './MapTracker.tsx';
import { supabase } from '../lib/supabase.js';

interface DashboardProps {
  users: User[];
  drivers: Driver[];
  trips: Trip[];
  customers: Customer[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const Dashboard: React.FC<DashboardProps> = ({ users, drivers, trips, customers, setTrips, setCustomers }) => {
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState<Driver[]>(drivers);

  // REAL-TIME LOCATION TRACKING (STRICT SQL PULL - 1 Minute Frequency)
  useEffect(() => {
    const fetchLatestLocations = async () => {
      // Pull from driver_locations for historical/trace or latest drivers update
      // For simplicity in Dashboard, we read latest driver profile coordinates which are updated by Pilot terminal
      const { data, error } = await supabase.from('drivers').select('*');
      if (data && !error) {
        setActiveDrivers(data.map((d: any) => ({
          id: d.id,
          displayId: d.driver_code || 'DBDY-HYD-DR-000',
          name: d.name,
          licenseNumber: d.license_number,
          issueDate: d.issue_date,
          expiryDate: d.expiry_date,
          address: d.address || '',
          permanentAddress: d.permanent_address || '',
          status: d.status || 'Available',
          location: [d.location_lat || 12.9716, d.location_lng || 77.5946]
        })));
      }
    };

    const interval = setInterval(fetchLatestLocations, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setActiveDrivers(drivers);
  }, [drivers]);

  const stats = [
    { label: 'Active Drivers', value: drivers.filter(d => d.status !== 'Inactive').length, icon: ICONS.Drivers, color: 'text-green-500' },
    { label: 'Pending Trips', value: trips.filter(t => t.status === 'NEW').length, icon: ICONS.Trips, color: 'text-yellow-500' },
    { label: 'Total Customers', value: customers.length, icon: ICONS.Users, color: 'text-purple-500' },
    { label: 'Completed Trips', value: trips.filter(t => t.status === 'COMPLETED').length, icon: ICONS.History, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Operational Overview</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Real-time Fleet Intelligence</p>
        </div>
        <button 
          onClick={() => setShowBookingModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-900/40"
        >
          {ICONS.Plus} New Trip Booking
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-gray-900 p-6 rounded-[2rem] border border-gray-800 hover:border-purple-500/50 transition-all group shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-3xl font-black mt-1 text-white">{stat.value}</h3>
              </div>
              <div className={`p-4 bg-black rounded-2xl ${stat.color} group-hover:scale-110 transition-transform shadow-inner`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-950 rounded-[2.5rem] border border-gray-900 overflow-hidden shadow-2xl h-[500px]">
          <div className="p-6 border-b border-gray-900 flex justify-between items-center bg-black/20">
            <h3 className="font-black text-white uppercase text-xs tracking-widest">Global Fleet Map</h3>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Live Tracking Enabled</span>
          </div>
          <div className="flex-1 h-full pb-16">
            <MapTracker drivers={activeDrivers} />
          </div>
        </div>

        <div className="bg-gray-950 rounded-[2.5rem] border border-gray-900 p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[500px]">
          <div className="flex items-center justify-between border-b border-gray-900 pb-4">
             <h3 className="font-black text-white uppercase text-xs tracking-widest">Security Alerts</h3>
             <span className="p-2 bg-red-950/40 text-red-500 rounded-xl">{ICONS.Notifications}</span>
          </div>
          <div className="space-y-4">
            {drivers.filter(d => {
              const daysLeft = Math.ceil((new Date(d.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              return daysLeft < 30;
            }).map(driver => {
              const daysLeft = Math.ceil((new Date(driver.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              return (
                <div key={driver.id} className="flex items-center justify-between p-4 bg-red-950/10 border border-red-500/20 rounded-2xl group hover:bg-red-950/20 transition-all">
                  <div>
                    <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1">License Expiring</p>
                    <p className="text-sm font-bold text-white leading-none">{driver.name}</p>
                    <p className="text-[8px] text-gray-500 font-mono mt-1">{driver.displayId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-red-500 leading-none">{daysLeft}d</p>
                    <p className="text-[8px] text-gray-600 uppercase font-black mt-1">Remaining</p>
                  </div>
                </div>
              );
            }).slice(0, 5)}
          </div>
        </div>
      </div>

      {showBookingModal && (
        <TripBookingModal 
          isOpen={showBookingModal} 
          onClose={() => setShowBookingModal(false)} 
          customers={customers} 
          setCustomers={setCustomers} 
          setTrips={setTrips} 
        />
      )}
    </div>
  );
};

export default Dashboard;
