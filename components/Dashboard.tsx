
import React, { useState, useEffect, useRef } from 'react';
import { User, Driver, Trip, Customer, UserRole } from '../types.ts';
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
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ users, drivers, trips, customers, setTrips, setCustomers, currentUser }) => {
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState<Driver[]>(drivers);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [highlightedDriverId, setHighlightedDriverId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const driverListRef = useRef<HTMLDivElement>(null);

  const canCancel = [UserRole.ADMIN, UserRole.OPS_MANAGER, UserRole.OPERATION_EXECUTIVE].includes(currentUser.role);

  useEffect(() => {
    const fetchLatestLocations = async () => {
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
          location: [d.location_lat || 17.3850, d.location_lng || 78.4867]
        })));
      }
    };

    const interval = setInterval(fetchLatestLocations, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setActiveDrivers(drivers);
  }, [drivers]);

  const handleDriverMarkerClick = (driverId: string) => {
    setHighlightedDriverId(driverId);
    // Auto-scroll logic if needed
    const element = document.getElementById(`driver-item-${driverId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCancelTrip = async () => {
    if (!selectedTripId || !canCancel) return;
    
    if (!window.confirm("CRITICAL: Terminate selected mission immediately? This status change will be logged for audit.")) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ trip_status: 'CANCELLED' })
        .eq('id', selectedTripId);

      if (error) throw error;

      await supabase.from('trip_logs').insert([{
        trip_id: selectedTripId,
        action: 'TRIP_CANCELLED',
        performed_by: currentUser.id,
        reason: 'Dashboard Quick Override'
      }]);

      const tripToUpdate = trips.find(t => t.id === selectedTripId);
      if (tripToUpdate?.driverId) {
        await supabase.from('drivers').update({ status: 'Available' } as any).eq('id', tripToUpdate.driverId);
      }

      // Optimistic update for UI
      setTrips(prev => prev.map(t => t.id === selectedTripId ? { ...t, status: 'CANCELLED' } : t));

      setSelectedTripId(null);
      alert("Mission Aborted. Registry updated.");
    } catch (err: any) {
      alert(`Abortion Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const activeMissions = trips.filter(t => ['NEW', 'ASSIGNED', 'STARTED'].includes(t.status)).slice(0, 10);

  const stats = [
    { label: 'Active Pilots', value: drivers.filter(d => d.status !== 'Inactive').length, icon: ICONS.Drivers, color: 'text-green-500' },
    { label: 'Pending Missions', value: trips.filter(t => t.status === 'NEW').length, icon: ICONS.Trips, color: 'text-yellow-500' },
    { label: 'Total Clients', value: customers.length, icon: ICONS.Users, color: 'text-purple-500' },
    { label: 'Missions Finished', value: trips.filter(t => t.status === 'COMPLETED').length, icon: ICONS.History, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Operational Overview</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Real-time Fleet Intelligence</p>
        </div>
        <div className="flex gap-3">
          {selectedTripId && canCancel && (
            <button 
              onClick={handleCancelTrip}
              disabled={isProcessing}
              className="bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-500 hover:text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all animate-in slide-in-from-right duration-300"
            >
              {ICONS.Cancel} {isProcessing ? 'Aborting...' : 'Abort Selected'}
            </button>
          )}
          <button 
            onClick={() => setShowBookingModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-900/40"
          >
            {ICONS.Plus} New Mission Launch
          </button>
        </div>
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
        <div className="lg:col-span-2 bg-gray-950 rounded-[2.5rem] border border-gray-900 overflow-hidden shadow-2xl h-[500px] flex flex-col">
          <div className="p-6 border-b border-gray-900 flex justify-between items-center bg-black/20">
            <h3 className="font-black text-white uppercase text-xs tracking-widest">Global Fleet Map</h3>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Live Tracking Enabled</span>
          </div>
          <div className="flex-1 min-h-0">
            <MapTracker drivers={activeDrivers} trips={trips} customers={customers} onDriverClick={handleDriverMarkerClick} />
          </div>
        </div>

        <div className="bg-gray-950 rounded-[2.5rem] border border-gray-900 flex flex-col shadow-2xl overflow-hidden h-[500px]">
          <div className="p-6 border-b border-gray-900 flex items-center justify-between bg-black/20">
             <h3 className="font-black text-white uppercase text-xs tracking-widest">Active Manifest</h3>
             <span className="p-2 bg-purple-950/40 text-purple-500 rounded-xl">{ICONS.Trips}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {activeMissions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="text-gray-800 grayscale">{ICONS.Trips}</div>
                <p className="text-[9px] font-black uppercase text-gray-700 tracking-widest">No Active Missions Found</p>
              </div>
            ) : activeMissions.map(trip => {
              const assignedPilot = drivers.find(d => d.id === trip.driverId);
              return (
                <div 
                  key={trip.id} 
                  onClick={() => setSelectedTripId(selectedTripId === trip.id ? null : trip.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    selectedTripId === trip.id 
                      ? 'bg-purple-600/10 border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.1)]' 
                      : 'bg-black/40 border-gray-900 hover:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[10px] font-black text-white uppercase">{customers.find(c => c.id === trip.customerId)?.name || 'Guest'}</p>
                      {assignedPilot && (
                        <p className="text-[8px] font-bold text-purple-500 mt-0.5">PILOT: {assignedPilot.name}</p>
                      )}
                    </div>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${trip.status === 'STARTED' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
                      {trip.status}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-500 font-mono tracking-tight truncate">{trip.pickupLocation}</p>
                  <div className="mt-3 flex justify-between items-center">
                    <p className="text-[8px] text-purple-500 font-black tracking-widest">{trip.displayId}</p>
                    <div className={`w-3 h-3 rounded-full border-2 border-gray-800 flex items-center justify-center transition-all ${selectedTripId === trip.id ? 'bg-purple-500 border-purple-500' : ''}`}>
                      {selectedTripId === trip.id && <div className="w-1 h-1 bg-white rounded-full"></div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {activeMissions.length > 0 && (
            <div className="p-4 border-t border-gray-900 bg-black/40 text-center">
               <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Click card to select mission</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-950 rounded-[2.5rem] border border-gray-900 p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-900 pb-4">
             <h3 className="font-black text-white uppercase text-xs tracking-widest">Fleet Personnel Status</h3>
             <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Click map marker to highlight</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar" ref={driverListRef}>
             {activeDrivers.map(driver => (
               <div 
                 id={`driver-item-${driver.id}`}
                 key={driver.id} 
                 className={`p-4 rounded-2xl border transition-all ${highlightedDriverId === driver.id ? 'bg-purple-950/20 border-purple-500 scale-[1.02] shadow-[0_0_15px_rgba(147,51,234,0.1)]' : 'bg-black/40 border-gray-900'}`}
               >
                 <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${driver.status === 'Available' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {driver.name.charAt(0)}
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-white uppercase">{driver.name}</p>
                       <p className="text-[8px] text-gray-500 font-mono">{driver.displayId}</p>
                     </div>
                   </div>
                   <div className={`w-2 h-2 rounded-full ${driver.status === 'Available' ? 'bg-emerald-500' : 'bg-blue-500'} animate-pulse`}></div>
                 </div>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-gray-950 rounded-[2.5rem] border border-gray-900 p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-900 pb-4">
             <h3 className="font-black text-white uppercase text-xs tracking-widest">Compliance Alerts</h3>
             <span className="p-2 bg-red-950/40 text-red-500 rounded-xl">{ICONS.Notifications}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
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
            }).slice(0, 6)}
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
          currentUserId={currentUser.id}
        />
      )}
    </div>
  );
};

export default Dashboard;
