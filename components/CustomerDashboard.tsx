
import React, { useState } from 'react';
import { User, Trip, Customer, Driver } from '../types.ts';
import { ICONS } from '../constants.tsx';
import MapTracker from './MapTracker.tsx';
import { calculateFareInternal } from './TripEstimation.tsx';
import { supabase } from '../lib/supabase.js';

interface CustomerDashboardProps {
  user: User;
  trips: Trip[];
  customers: Customer[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  drivers: Driver[];
  onLogout: () => void;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user, trips, customers, setTrips, drivers, onLogout }) => {
  const [view, setView] = useState<'home' | 'book' | 'history' | 'payments' | 'trip-info'>('home');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const activeTrip = myTrips.find(t => t.status !== 'completed' && t.status !== 'cancelled');

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let customerId = myCustomerProfile?.id;

      // Ensure customer exists in the customers table
      if (!customerId) {
        const { data: newCust, error: custError } = await supabase
          .from('customers')
          .insert({ name: bookingForm.customerName, mobile: bookingForm.mobileNumber })
          .select().single();
        if (custError) throw custError;
        customerId = newCust.id;
      }

      // NO JS ID GENERATION. Let database trigger generate TRIP-XXXX.
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert({
          customer_id: customerId,
          pickup_location: bookingForm.pickup,
          drop_location: bookingForm.tripType === 'one-way' ? bookingForm.drop : bookingForm.pickup,
          trip_type: bookingForm.tripType,
          start_date_time: `${bookingForm.startDate}T${bookingForm.startTime}:00`,
          end_date_time: `${bookingForm.endDate}T${bookingForm.endTime}:00`,
          status: 'unassigned'
        })
        .select();

      if (tripError) throw tripError;

      if (tripData) {
        const mappedTrip: Trip = {
            id: tripData[0].id,
            displayId: tripData[0].trip_code, 
            customerId: tripData[0].customer_id,
            pickupLocation: tripData[0].pickup_location,
            dropLocation: tripData[0].drop_location,
            tripType: tripData[0].trip_type,
            startDateTime: tripData[0].start_date_time,
            endDateTime: tripData[0].end_date_time,
            status: tripData[0].status
        };
        setTrips(prev => [mappedTrip, ...prev]);
        alert(`Trip Registered: Business ID ${tripData[0].trip_code}`);
      }
      setView('home');
    } catch (err: any) {
      alert(`Dispatch Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTripAction = (tripId: string, action: 'started' | 'completed') => {
    // Note: In a production app, this would update Supabase via an API/Direct call
    // Currently handled in the CRM view or simulated here for immediate UI feedback
    const now = new Date();
    setTrips(prev => prev.map(t => {
      if (t.id === tripId) {
        const updated = { ...t, status: action };
        if (action === 'started') updated.startDateTime = now.toISOString();
        if (action === 'completed') {
           updated.endDateTime = now.toISOString();
           const billing = calculateFareInternal(new Date(t.startDateTime), now, "No", "Instation", t.tripType === 'one-way' ? "One Way" : "Round Trip");
           updated.billAmount = billing.totalPrice;
        }
        return updated;
      }
      return t;
    }));
    if (action === 'completed') setView('home');
  };

  const renderTripInfo = (trip: Trip) => {
    let currentBill = null;
    if (trip.startDateTime) {
      currentBill = calculateFareInternal(
        new Date(trip.startDateTime),
        trip.status === 'completed' ? new Date(trip.endDateTime) : new Date(),
        "No", "Instation", trip.tripType === 'one-way' ? "One Way" : "Round Trip"
      );
    }

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('home')} className="p-2 bg-gray-900 rounded-xl text-gray-500 hover:text-white">←</button>
          <h2 className="text-xl font-black">Trip Information</h2>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl p-8 space-y-8">
            <div className="flex justify-between items-center">
                <span className="text-[10px] text-purple-500 font-mono font-bold uppercase tracking-widest">ID: {trip.displayId}</span>
                <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-lg text-[10px] font-black uppercase tracking-widest">{trip.status}</span>
            </div>

            <div className="space-y-4">
                <div className="bg-black/40 p-5 rounded-3xl border border-gray-800">
                    <p className="text-[9px] text-gray-500 uppercase font-black mb-3">Journey Route</p>
                    <div className="space-y-3">
                        <p className="text-sm font-bold text-white"><span className="text-green-500 mr-2">●</span>{trip.pickupLocation}</p>
                        <p className="text-sm font-bold text-white"><span className="text-blue-500 mr-2">●</span>{trip.dropLocation}</p>
                    </div>
                </div>
            </div>

            {currentBill && (
              <div className="bg-purple-900/10 border-2 border-purple-500/20 p-8 rounded-[2rem] text-center shadow-inner">
                <p className="text-xs text-purple-400 uppercase font-black mb-1 tracking-widest">Live Billing</p>
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
      <nav className="h-16 border-b border-gray-800 px-6 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        <h1 className="text-xl font-black text-purple-500 tracking-tighter">DRIVEBUDDY</h1>
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="p-2 text-red-500 bg-gray-950 border border-gray-800 rounded-xl">{ICONS.Logout}</button>
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-black text-sm">
            {user.name.charAt(0)}
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-lg mx-auto w-full">
        {view === 'home' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-600 to-blue-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
              <h2 className="text-4xl font-black leading-none">Hello,<br/>{user.name.split(' ')[0]}</h2>
              <p className="text-purple-100 mt-3 text-sm font-medium opacity-80">Premium Professional Chauffeurs</p>
              <button onClick={() => setView('book')} className="mt-10 w-full bg-white text-purple-700 font-black py-5 rounded-3xl shadow-2xl transition-all flex items-center justify-center gap-3 text-lg">{ICONS.Plus} Book a Trip</button>
            </div>

            {activeTrip && (
              <div onClick={() => { setView('trip-info'); }} className="bg-gray-950 border-2 border-purple-500/30 rounded-[2.5rem] p-8 cursor-pointer hover:bg-gray-900 transition-all group shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Ongoing Journey</p>
                  <p className="font-bold text-lg leading-tight truncate max-w-[150px]">{activeTrip.displayId}</p>
                </div>
                <div className="text-purple-500 group-hover:translate-x-1 transition-transform">{ICONS.View}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-5">
              <button onClick={() => setView('history')} className="bg-gray-950 border border-gray-800 p-8 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 hover:bg-gray-900 transition-all group">
                <div className="p-4 bg-gray-900 rounded-[1.5rem] text-purple-500">{ICONS.History}</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">Trips</span>
              </button>
              <button onClick={() => setView('payments')} className="bg-gray-950 border border-gray-800 p-8 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 hover:bg-gray-900 transition-all group">
                <div className="p-4 bg-gray-900 rounded-[1.5rem] text-blue-500">{ICONS.Finance}</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">Wallet</span>
              </button>
            </div>
          </div>
        )}

        {view === 'trip-info' && activeTrip && renderTripInfo(activeTrip)}

        {view === 'book' && (
          <div className="animate-in slide-in-from-bottom duration-400">
            <div className="flex justify-between items-center mb-10">
               <h2 className="text-3xl font-black tracking-tighter uppercase">Trip Request</h2>
               <button onClick={() => setView('home')} className="text-gray-500 font-black text-[10px] uppercase px-4 py-2 border border-gray-800 rounded-2xl hover:text-white transition-all">Cancel</button>
            </div>
            
            <form onSubmit={handleBookingSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Client Name</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={bookingForm.customerName} onChange={e => setBookingForm({...bookingForm, customerName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Secure Contact</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={bookingForm.mobileNumber} onChange={e => setBookingForm({...bookingForm, mobileNumber: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Date</label>
                  <input required type="date" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={bookingForm.startDate} onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Time</label>
                  <input required type="time" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={bookingForm.startTime} onChange={e => setBookingForm({...bookingForm, startTime: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Journey Pattern</label>
                <div className="flex bg-gray-950 p-2 rounded-[1.5rem] border border-gray-800 shadow-inner">
                  <button type="button" onClick={() => setBookingForm({...bookingForm, tripType: 'one-way'})} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all tracking-widest ${bookingForm.tripType === 'one-way' ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/40' : 'text-gray-500'}`}>One-way</button>
                  <button type="button" onClick={() => setBookingForm({...bookingForm, tripType: 'round-trip'})} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all tracking-widest ${bookingForm.tripType === 'round-trip' ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/40' : 'text-gray-500'}`}>Round Trip</button>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Pickup Detail</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" placeholder="Detailed Address" value={bookingForm.pickup} onChange={e => setBookingForm({...bookingForm, pickup: e.target.value})} />
                </div>
                {bookingForm.tripType === 'one-way' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top duration-300">
                    <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Destination Detail</label>
                    <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" placeholder="Destination Address" value={bookingForm.drop} onChange={e => setBookingForm({...bookingForm, drop: e.target.value})} />
                  </div>
                )}
              </div>

              <button disabled={isSubmitting} type="submit" className="w-full bg-purple-600 hover:bg-purple-700 py-6 rounded-[2.5rem] font-black shadow-2xl shadow-purple-950/50 transition-all active:scale-95 text-lg mt-8 uppercase tracking-[0.2em]">
                {isSubmitting ? 'Syncing...' : 'Confirm Request'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;
