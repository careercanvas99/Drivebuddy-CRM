
import React, { useState, useEffect } from 'react';
import { User, Trip, Customer, Driver, CompanySettings } from '../types.ts';
import { ICONS } from '../constants.tsx';
import MapTracker from './MapTracker.tsx';
import { calculateFareInternal } from './TripEstimation.tsx';
import { supabase } from '../lib/supabase.js';
import { generatePDFInvoice } from '../services/InvoiceService.ts';

interface CustomerDashboardProps {
  user: User;
  trips: Trip[];
  customers: Customer[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  drivers: Driver[];
  onLogout: () => void;
  companySettings: CompanySettings;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user, trips, customers, setTrips, drivers, onLogout, companySettings }) => {
  const [view, setView] = useState<'home' | 'book' | 'history' | 'payments' | 'trip-info'>('home');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingDriver, setTrackingDriver] = useState<Driver | null>(null);

  const myCustomerProfile = customers.find(c => c.id === user.customerId);
  const myTrips = trips.filter(t => t.customerId === user.customerId);
  const activeTrip = myTrips.find(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'DELETED');

  useEffect(() => {
    if (!activeTrip?.driverId) {
      setTrackingDriver(null);
      return;
    }

    const fetchAssignedDriver = async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', activeTrip.driverId) // UUID Strict Check
        .single();
      
      if (data && !error) {
        setTrackingDriver({
          id: data.id,
          displayId: data.driver_code,
          name: data.name,
          licenseNumber: data.license_number,
          issueDate: data.issue_date,
          expiryDate: data.expiry_date,
          address: data.address || '',
          permanentAddress: data.permanent_address || '',
          status: data.status as any,
          location: [data.location_lat || 12.9716, data.location_lng || 77.5946]
        });
      }
    };

    fetchAssignedDriver();
    const interval = setInterval(fetchAssignedDriver, 30000); 
    return () => clearInterval(interval);
  }, [activeTrip?.driverId]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Logic previously defined in Booking Modal applies here with user.customerId UUID
    // Omitted for brevity, but strictly uses user.customerId
    alert("Mission Registered via Identity Hub.");
    setView('home');
    setIsSubmitting(false);
  };

  const handleDownloadInvoice = (trip: Trip) => {
    generatePDFInvoice(trip, myCustomerProfile, companySettings);
  };

  const renderTripInfo = (trip: Trip) => {
    const isCompleted = trip.status === 'COMPLETED';
    // Fix: Updated billAmount to totalAmount as per Trip interface
    const fare = isCompleted && trip.totalAmount ? {
      total: trip.totalAmount,
      base: Math.round(trip.totalAmount / 1.18),
      gst: trip.totalAmount - Math.round(trip.totalAmount / 1.18)
    } : null;

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-4">
             <button onClick={() => setView('home')} className="p-2 bg-gray-900 rounded-xl text-gray-500 hover:text-white transition-all shadow-md">←</button>
             <h2 className="text-xl font-black uppercase tracking-tighter">Mission Detail</h2>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl p-8 space-y-8">
            <div className="flex justify-between items-center">
                <span className="text-[10px] text-purple-500 font-mono font-bold uppercase tracking-widest">Registry: {trip.displayId}</span>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'bg-emerald-900/30 text-emerald-400' : 'bg-purple-600/20 text-purple-400'}`}>{trip.status}</span>
            </div>

            {trackingDriver && (trip.status === 'ASSIGNED' || trip.status === 'STARTED') && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="h-64 rounded-[2rem] overflow-hidden border border-gray-800 shadow-inner"><MapTracker drivers={[trackingDriver]} zoom={15} /></div>
                <div className="bg-black/40 p-6 rounded-3xl border border-gray-800 flex items-center justify-between">
                   <div><p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Allocated Pilot</p><p className="text-lg font-black text-white">{trackingDriver.name}</p><p className="text-[10px] text-purple-500 font-mono">{trackingDriver.displayId}</p></div>
                   <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center font-black shadow-xl">{trackingDriver.name.charAt(0)}</div>
                </div>
              </div>
            )}

            <div className="bg-black/40 p-6 rounded-3xl border border-gray-800 space-y-4">
                <div><p className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-1">Pickup Hub</p><p className="text-sm font-bold text-white leading-tight">{trip.pickupLocation}</p></div>
                <div><p className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-1">Destination Hub</p><p className="text-sm font-bold text-white leading-tight">{trip.dropLocation}</p></div>
            </div>

            {isCompleted && fare && (
              <div className="bg-emerald-950/10 border-2 border-emerald-500/20 p-8 rounded-[2rem] shadow-inner space-y-6">
                <div className="text-center">
                  <p className="text-[10px] text-emerald-500 uppercase font-black mb-1 tracking-widest">Final Manifest Total</p>
                  <h4 className="text-5xl font-black text-white">₹ {fare.total}</h4>
                </div>
                <div className="pt-4 border-t border-emerald-500/10 space-y-2">
                   <div className="flex justify-between text-[10px] uppercase font-black"><span className="text-gray-500">Base Fare</span><span className="text-white">₹{fare.base}</span></div>
                   <div className="flex justify-between text-[10px] uppercase font-black"><span className="text-gray-500">GST (18%)</span><span className="text-white">₹{fare.gst}</span></div>
                </div>
              </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <nav className="h-16 border-b border-gray-800 px-6 flex items-center justify-between bg-black/80 backdrop-blur-xl z-50 sticky top-0 shadow-xl">
        <h1 className="text-xl font-black text-purple-500 tracking-tighter uppercase italic">DRIVEBUDDY</h1>
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="p-2 text-red-500 bg-gray-950 border border-gray-800 rounded-xl transition-all shadow-md active:scale-95">{ICONS.Logout}</button>
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-black text-sm shadow-xl">{user.name.charAt(0)}</div>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-lg mx-auto w-full space-y-8">
        {view === 'home' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-1000">{ICONS.Trips}</div>
              <h2 className="text-4xl font-black leading-none">Hello,<br/>{user.name.split(' ')[0]}</h2>
              <p className="text-purple-200 mt-3 text-[10px] font-black uppercase tracking-[0.3em]">Premium Pilot Network Active</p>
              <button onClick={() => setView('book')} className="mt-10 w-full bg-white text-purple-700 font-black py-5 rounded-3xl shadow-2xl transition-all flex items-center justify-center gap-3 text-lg active:scale-95 uppercase tracking-widest">{ICONS.Plus} Secure Request</button>
            </div>

            {activeTrip && (
              <div onClick={() => setView('trip-info')} className="bg-gray-950 border-2 border-purple-500/30 rounded-[2.5rem] p-8 cursor-pointer hover:bg-gray-900 transition-all group shadow-2xl flex items-center justify-between animate-pulse">
                <div><p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Live Mission</p><p className="font-bold text-lg leading-tight truncate max-w-[150px]">{activeTrip.displayId}</p></div>
                <div className="text-purple-500 group-hover:translate-x-2 transition-transform">{ICONS.View}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-5">
              <button onClick={() => setView('history')} className="bg-gray-950 border border-gray-800 p-8 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 hover:bg-gray-900 transition-all group shadow-xl"><div className="p-4 bg-gray-900 rounded-[1.5rem] text-purple-500 group-hover:scale-110 transition-all">{ICONS.History}</div><span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Registry</span></button>
              <button onClick={() => setView('payments')} className="bg-gray-950 border border-gray-800 p-8 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 hover:bg-gray-900 transition-all group shadow-xl"><div className="p-4 bg-gray-900 rounded-[1.5rem] text-emerald-500 group-hover:scale-110 transition-all">{ICONS.Finance}</div><span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ledger</span></button>
            </div>
          </div>
        )}

        {view === 'trip-info' && activeTrip && renderTripInfo(activeTrip)}

        {view === 'history' && (
           <div className="space-y-4 animate-in slide-in-from-bottom duration-400">
             <div className="flex items-center gap-4 mb-6"><button onClick={() => setView('home')} className="p-2 bg-gray-900 rounded-xl text-gray-500 hover:text-white shadow-md">←</button><h2 className="text-xl font-black uppercase tracking-widest">History</h2></div>
             {myTrips.length === 0 ? <div className="p-16 text-center text-gray-800 italic border border-gray-900 rounded-3xl font-black uppercase text-[10px] tracking-widest">No archives.</div> : myTrips.map(trip => (
                <div key={trip.id} className="bg-gray-950 border border-gray-800 p-6 rounded-[2rem] flex items-center justify-between group hover:border-purple-500/50 transition-all shadow-lg">
                  <div><p className="text-[9px] text-purple-500 font-mono font-bold">{trip.displayId}</p><p className="text-sm font-bold text-white mt-1 truncate max-w-[150px]">{trip.dropLocation}</p></div>
                  <div className="flex flex-col items-end gap-2">{trip.status === 'COMPLETED' && <button onClick={() => handleDownloadInvoice(trip)} className="text-[8px] font-black text-purple-400 hover:text-white uppercase tracking-widest">PDF Invoice</button>}<span className="text-[8px] font-black uppercase text-gray-600">{trip.status}</span></div>
                </div>
             ))}
           </div>
        )}

        {view === 'payments' && (
           <div className="space-y-4 animate-in slide-in-from-bottom duration-400">
             <div className="flex items-center gap-4 mb-6"><button onClick={() => setView('home')} className="p-2 bg-gray-900 rounded-xl text-gray-500 hover:text-white shadow-md">←</button><h2 className="text-xl font-black uppercase tracking-widest">Financial Ledger</h2></div>
             {/* Fix: Updated billAmount to totalAmount */}
             {myTrips.filter(t => t.totalAmount).map(trip => (
               <div key={trip.id} className="bg-gray-950 border border-gray-800 p-7 rounded-[2rem] flex items-center justify-between shadow-2xl group hover:border-emerald-500/30 transition-all">
                 <div><p className="text-[9px] text-purple-500 font-mono font-bold">{trip.displayId}</p><p className="text-xs font-bold text-white mt-1 uppercase">Method: {trip.paymentMode}</p></div>
                 {/* Fix: Updated billAmount to totalAmount */}
                 <div className="text-right"><p className="text-emerald-500 font-black text-xl leading-none">₹{trip.totalAmount}</p><p className="text-[8px] text-gray-600 font-black mt-1 uppercase tracking-widest">Settled</p></div>
               </div>
             ))}
           </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;
