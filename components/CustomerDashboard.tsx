
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

  const [bookingForm, setBookingForm] = useState({
    customerName: user.name,
    mobileNumber: user.mobile || user.username,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    tripType: 'one-way' as 'one-way' | 'round-trip',
    pickup: '',
    drop: ''
  });

  const myCustomerProfile = customers.find(c => c.mobile === user.username || c.mobile === user.mobile);
  const myTrips = trips.filter(t => t.customerId === myCustomerProfile?.id);
  // Fix: Comparing against 'COMPLETED' and 'CANCELLED' to match TripStatus definition
  const activeTrip = myTrips.find(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

  useEffect(() => {
    if (!activeTrip?.driverId) {
      setTrackingDriver(null);
      return;
    }

    const fetchDriverLocation = async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', activeTrip.driverId)
        .single();
      
      if (data && !error) {
        setTrackingDriver({
          id: data.id,
          displayId: data.driver_code || 'DBDY-HYD-DR-000',
          name: data.name,
          licenseNumber: data.license_number,
          issueDate: data.issue_date,
          expiryDate: data.expiry_date,
          address: data.address || '',
          permanentAddress: data.permanent_address || '',
          status: data.status || 'Available',
          location: [data.location_lat || 12.9716, data.location_lng || 77.5946]
        });
      }
    };

    fetchDriverLocation();
    const interval = setInterval(fetchDriverLocation, 300000); 
    return () => clearInterval(interval);
  }, [activeTrip?.driverId]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let customerId: string | null = null;
      
      // SQL STEP 1: Verification
      const { data: existing, error: findError } = await supabase
        .from('customers')
        .select('id')
        .eq('mobile_number', bookingForm.mobileNumber)
        .maybeSingle();
      
      if (findError) throw findError;

      if (existing) {
        customerId = existing.id;
      } else {
        // SQL STEP 2: Atomic Client Registration
        const { data: newCust, error: custError } = await supabase
          .from('customers')
          .insert([{
            customer_name: bookingForm.customerName,
            mobile_number: bookingForm.mobileNumber,
            vehicle_model: 'Standard'
          }] as any)
          .select()
          .single();
        if (custError) throw custError;
        customerId = (newCust as any).id;
      }

      if (!customerId) throw new Error("Sync Fail: Secure Client Identification could not be established.");

      // SQL STEP 3: Linked Mission Registry
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert([{
          customer_id: customerId,
          pickup_location: bookingForm.pickup,
          drop_location: bookingForm.tripType === 'one-way' ? bookingForm.drop : bookingForm.pickup,
          trip_type: bookingForm.tripType,
          start_time: `${bookingForm.startDate}T${bookingForm.startTime}:00`,
          end_time: `${bookingForm.endDate}T${bookingForm.endTime}:00`,
          trip_status: 'unassigned'
        }] as any)
        .select()
        .single();

      if (tripError) throw tripError;

      if (tripData) {
        const t = tripData as any;
        // Fix: Added missing tripRoute property to satisfy Trip interface
        const mappedTrip: Trip = {
            id: t.id,
            displayId: t.trip_code, 
            customerId: t.customer_id,
            pickupLocation: t.pickup_location,
            dropLocation: t.drop_location,
            tripType: t.trip_type,
            tripRoute: t.trip_route || 'Instation',
            startDateTime: t.start_time,
            endDateTime: t.end_time,
            status: t.trip_status as any
        };
        setTrips(prev => [mappedTrip, ...prev]);
        alert(`Mission Logged Successfully: ${t.trip_code}`);
      }
      setView('home');
    } catch (err: any) {
      alert(`Critical Sync Failure: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadInvoice = (trip: Trip) => {
    generatePDFInvoice(trip, myCustomerProfile, companySettings);
  };

  const renderTripInfo = (trip: Trip) => {
    let currentBill = null;
    if (trip.startDateTime) {
      currentBill = calculateFareInternal(
        new Date(trip.startDateTime),
        // Fix: Comparing against 'COMPLETED' to match TripStatus definition
        trip.status === 'COMPLETED' ? new Date(trip.endDateTime) : new Date(),
        "No", "Instation", trip.tripType === 'one-way' ? "One Way" : "Round Trip"
      );
    }

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <button onClick={() => setView('home')} className="p-2 bg-gray-900 rounded-xl text-gray-500 hover:text-white">←</button>
             <h2 className="text-xl font-black">Mission Intelligence</h2>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl p-8 space-y-8">
            <div className="flex justify-between items-center">
                <span className="text-[10px] text-purple-500 font-mono font-bold uppercase tracking-widest">ID: {trip.displayId}</span>
                <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-lg text-[10px] font-black uppercase tracking-widest">{trip.status}</span>
            </div>

            {/* Fix: Comparing against 'STARTED' to match TripStatus definition */}
            {trackingDriver && trip.status === 'STARTED' && (
              <div className="h-64 rounded-3xl overflow-hidden border border-gray-800 shadow-inner">
                <MapTracker drivers={[trackingDriver]} zoom={15} />
              </div>
            )}

            <div className="space-y-4">
                <div className="bg-black/40 p-5 rounded-3xl border border-gray-800">
                    <p className="text-[9px] text-gray-500 uppercase font-black mb-3">Journey Logistics</p>
                    <div className="space-y-3">
                        <p className="text-sm font-bold text-white"><span className="text-green-500 mr-2">●</span>{trip.pickupLocation}</p>
                        <p className="text-sm font-bold text-white"><span className="text-blue-500 mr-2">●</span>{trip.dropLocation}</p>
                    </div>
                </div>
            </div>

            {currentBill && (
              <div className="bg-purple-900/10 border-2 border-purple-500/20 p-8 rounded-[2rem] text-center shadow-inner">
                {/* Fix: Comparing against 'COMPLETED' to match TripStatus definition */}
                <p className="text-xs text-purple-400 uppercase font-black mb-1 tracking-widest">{trip.status === 'COMPLETED' ? 'Final Invoice' : 'Real-time Estimate'}</p>
                <h4 className="text-5xl font-black text-white">₹ {currentBill.totalPrice}</h4>
                <p className="text-[10px] text-gray-500 mt-2 italic font-medium uppercase tracking-tighter">({currentBill.hours}h {currentBill.mins}m Duration)</p>
              </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <nav className="h-16 border-b border-gray-800 px-6 flex items-center justify-between bg-black/80 backdrop-blur-xl z-50 sticky top-0">
        <h1 className="text-xl font-black text-purple-500 tracking-tighter uppercase italic">DRIVEBUDDY</h1>
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="p-2 text-red-500 bg-gray-950 border border-gray-800 rounded-xl transition-all shadow-md active:scale-95">{ICONS.Logout}</button>
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-black text-sm shadow-xl">
            {user.name.charAt(0)}
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-lg mx-auto w-full">
        {view === 'home' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-600 to-blue-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
              <h2 className="text-4xl font-black leading-none">Hello,<br/>{user.name.split(' ')[0]}</h2>
              <p className="text-purple-100 mt-3 text-sm font-medium opacity-80 uppercase tracking-widest">Premium Chauffeur Network</p>
              <button onClick={() => setView('book')} className="mt-10 w-full bg-white text-purple-700 font-black py-5 rounded-3xl shadow-2xl transition-all flex items-center justify-center gap-3 text-lg active:scale-95 uppercase tracking-widest">{ICONS.Plus} Request Pilot</button>
            </div>

            {activeTrip && (
              <div onClick={() => { setView('trip-info'); }} className="bg-gray-950 border-2 border-purple-500/30 rounded-[2.5rem] p-8 cursor-pointer hover:bg-gray-900 transition-all group shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Active Manifest</p>
                  <p className="font-bold text-lg leading-tight truncate max-w-[150px]">{activeTrip.displayId}</p>
                </div>
                <div className="text-purple-500 group-hover:translate-x-1 transition-transform">{ICONS.View}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-5">
              <button onClick={() => setView('history')} className="bg-gray-950 border border-gray-800 p-8 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 hover:bg-gray-900 transition-all group shadow-xl">
                <div className="p-4 bg-gray-900 rounded-[1.5rem] text-purple-500 transition-transform group-hover:scale-110">{ICONS.History}</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">Missions</span>
              </button>
              <button onClick={() => setView('payments')} className="bg-gray-950 border border-gray-800 p-8 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 hover:bg-gray-900 transition-all group shadow-xl">
                <div className="p-4 bg-gray-900 rounded-[1.5rem] text-blue-500 transition-transform group-hover:scale-110">{ICONS.Finance}</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">Ledger</span>
              </button>
            </div>
          </div>
        )}

        {view === 'trip-info' && activeTrip && renderTripInfo(activeTrip)}

        {view === 'history' && (
           <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
             <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setView('home')} className="p-2 bg-gray-900 rounded-xl text-gray-500 hover:text-white transition-all shadow-md">←</button>
                <h2 className="text-xl font-black uppercase tracking-widest">History</h2>
             </div>
             {myTrips.length === 0 ? (
               <div className="p-12 text-center text-gray-700 italic border border-gray-900 rounded-3xl font-black uppercase text-[10px] tracking-widest">Registry Empty</div>
             ) : (
               myTrips.map(trip => (
                 <div key={trip.id} className="bg-gray-950 border border-gray-800 p-6 rounded-[2rem] flex items-center justify-between group hover:border-purple-500/50 transition-all shadow-lg">
                   <div>
                     <p className="text-[9px] text-purple-500 font-mono font-bold">{trip.displayId}</p>
                     <p className="text-sm font-bold text-white mt-1 truncate max-w-[150px]">{trip.dropLocation}</p>
                     <p className="text-[8px] text-gray-600 mt-1 uppercase font-black">{trip.status}</p>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                     {trip.billAmount && (
                       <span className="text-emerald-500 font-black text-sm">₹{trip.billAmount}</span>
                     )}
                     {/* Fix: Comparing against 'COMPLETED' to match TripStatus definition */}
                     {trip.status === 'COMPLETED' && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(trip); }} 
                         className="text-[8px] font-black text-purple-400 hover:text-white uppercase tracking-widest"
                       >
                         Receipt
                       </button>
                     )}
                   </div>
                 </div>
               ))
             )}
           </div>
        )}

        {view === 'payments' && (
           <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
             <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setView('home')} className="p-2 bg-gray-900 rounded-xl text-gray-500 hover:text-white shadow-md">←</button>
                <h2 className="text-xl font-black uppercase tracking-widest">Financial Ledger</h2>
             </div>
             {myTrips.filter(t => t.billAmount).length === 0 ? (
               <div className="p-12 text-center text-gray-700 italic border border-gray-900 rounded-3xl font-black uppercase text-[10px] tracking-widest">No transaction logs</div>
             ) : (
               myTrips.filter(t => t.billAmount).map(trip => (
                 <div key={trip.id} className="bg-gray-950 border border-gray-800 p-6 rounded-[2rem] flex items-center justify-between group hover:border-purple-500/50 transition-all shadow-lg">
                   <div>
                     <p className="text-[9px] text-purple-500 font-mono font-bold">{trip.displayId}</p>
                     <p className="text-xs font-bold text-white mt-1 uppercase tracking-tighter">Mode: {trip.paymentMode || 'N/A'}</p>
                     <p className="text-[8px] text-gray-600 mt-1 uppercase font-black">{trip.paymentStatus || 'PENDING'}</p>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                     <span className="text-emerald-500 font-black text-sm">₹{trip.billAmount}</span>
                   </div>
                 </div>
               ))
             )}
           </div>
        )}

        {view === 'book' && (
          <div className="animate-in slide-in-from-bottom duration-400">
            <div className="flex justify-between items-center mb-10">
               <h2 className="text-3xl font-black tracking-tighter uppercase">Mission Launch</h2>
               <button onClick={() => setView('home')} className="text-gray-500 font-black text-[10px] uppercase px-4 py-2 border border-gray-800 rounded-2xl hover:text-white transition-all shadow-md">Cancel</button>
            </div>
            
            <form onSubmit={handleBookingSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Full Name</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={bookingForm.customerName} onChange={e => setBookingForm({...bookingForm, customerName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Secure Mobile</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner font-mono" value={bookingForm.mobileNumber} onChange={e => setBookingForm({...bookingForm, mobileNumber: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Start Date</label>
                  <input required type="date" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={bookingForm.startDate} onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Launch Time</label>
                  <input required type="time" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={bookingForm.startTime} onChange={e => setBookingForm({...bookingForm, startTime: e.target.value})} />
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Pickup Logistics</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={bookingForm.pickup} onChange={e => setBookingForm({...bookingForm, pickup: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Destination Profile</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={bookingForm.drop} onChange={e => setBookingForm({...bookingForm, drop: e.target.value})} />
                </div>
              </div>

              <button disabled={isSubmitting} type="submit" className="w-full bg-purple-600 hover:bg-purple-700 py-6 rounded-[2.5rem] font-black shadow-2xl shadow-purple-950/50 transition-all active:scale-95 text-lg mt-8 uppercase tracking-[0.2em] text-white">
                {isSubmitting ? 'Syncing...' : 'Confirm Dispatch'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;
