
import React, { useState } from 'react';
import { User, Trip, Customer, Driver } from '../types.ts';
import { ICONS } from '../constants.tsx';
import MapTracker from './MapTracker.tsx';
import { calculateFareInternal } from './TripEstimation.tsx';

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
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Mandatory Booking Form Fields
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

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTrip: Trip = {
      id: `TRIP-${Math.floor(10000 + Math.random() * 90000)}`,
      customerId: myCustomerProfile?.id || `CUST-${Date.now()}`,
      pickupLocation: bookingForm.pickup,
      dropLocation: bookingForm.tripType === 'one-way' ? bookingForm.drop : bookingForm.pickup,
      tripType: bookingForm.tripType,
      startDateTime: `${bookingForm.startDate}T${bookingForm.startTime}`,
      endDateTime: `${bookingForm.endDate}T${bookingForm.endTime}`,
      status: 'unassigned'
    };

    setTrips(prev => [newTrip, ...prev]);
    alert('Trip Booked Successfully! Office users can now view this in their dashboard.');
    setView('home');
  };

  const handleTripAction = (tripId: string, action: 'started' | 'completed') => {
    const now = new Date();
    setTrips(prev => prev.map(t => {
      if (t.id === tripId) {
        const updated = { ...t, status: action };
        if (action === 'started') {
          updated.startDateTime = now.toISOString();
        } else if (action === 'completed') {
          updated.endDateTime = now.toISOString();
          const billing = calculateFareInternal(
            new Date(t.startDateTime),
            now,
            "No",
            "Instation",
            t.tripType === 'one-way' ? "One Way" : "Round Trip"
          );
          updated.billAmount = billing.totalPrice;
          updated.paymentStatus = 'collected';
        }
        return updated;
      }
      return t;
    }));
    if (action === 'completed') setView('home');
  };

  const renderTripInfo = (trip: Trip) => {
    const driver = drivers.find(d => d.id === trip.driverId);
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

        <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 p-4 rounded-2xl border border-gray-800">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Customer</p>
                <p className="text-sm font-bold truncate">{bookingForm.customerName}</p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-gray-800">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Mobile</p>
                <p className="text-sm font-mono">{bookingForm.mobileNumber}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <div className="w-0.5 flex-1 bg-gray-800"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-black">Pickup</p>
                    <p className="text-sm font-bold">{trip.pickupLocation}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-black">Drop-off</p>
                    <p className="text-sm font-bold">{trip.dropLocation}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-950 p-5 rounded-3xl border border-gray-800">
               <div className="flex justify-between items-center mb-1">
                 <p className="text-[10px] text-gray-500 uppercase font-black">Journey Timing</p>
                 <span className="text-[10px] bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded font-bold uppercase">{trip.status}</span>
               </div>
               <div className="flex justify-between">
                 <p className="text-xs font-bold">{new Date(trip.startDateTime).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>
                 <p className="text-xs font-bold">{trip.endDateTime ? new Date(trip.endDateTime).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : 'In Progress'}</p>
               </div>
            </div>

            {currentBill && (
              <div className="bg-purple-900/10 border-2 border-purple-500/20 p-8 rounded-[2rem] text-center shadow-inner">
                <p className="text-xs text-purple-400 uppercase font-black mb-1 tracking-widest">Bill Amount Calculation</p>
                <h4 className="text-5xl font-black text-white">₹ {currentBill.totalPrice}</h4>
                <p className="text-[10px] text-gray-500 mt-2 italic font-medium uppercase tracking-tighter">({currentBill.hours}h {currentBill.mins}m Duration • GST Incl.)</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button 
                disabled={trip.status !== 'assigned'}
                onClick={() => handleTripAction(trip.id, 'started')}
                className={`py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all ${trip.status === 'assigned' ? 'bg-green-600 shadow-xl shadow-green-950/40 active:scale-95' : 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'}`}
              >
                Start Trip
              </button>
              <button 
                disabled={trip.status !== 'started'}
                onClick={() => handleTripAction(trip.id, 'completed')}
                className={`py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all ${trip.status === 'started' ? 'bg-red-600 shadow-xl shadow-red-950/40 active:scale-95' : 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'}`}
              >
                End Trip
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Nav */}
      <nav className="h-16 border-b border-gray-800 px-6 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        <h1 className="text-xl font-black text-purple-500 tracking-tighter">DRIVEBUDDY</h1>
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="p-2 text-red-500 bg-gray-950 border border-gray-800 rounded-xl hover:bg-red-950/40 transition-all">
            {ICONS.Logout}
          </button>
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-black text-sm shadow-xl shadow-purple-900/40">
            {user.name.charAt(0)}
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-lg mx-auto w-full">
        {view === 'home' && (
          <div className="space-y-6">
            {/* Main Action Header */}
            <div className="bg-gradient-to-br from-purple-600 to-blue-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-10 scale-[3] pointer-events-none group-hover:rotate-12 transition-transform">{ICONS.Trips}</div>
              <h2 className="text-4xl font-black leading-none">Hello,<br/>{user.name.split(' ')[0]}</h2>
              <p className="text-purple-100 mt-3 text-sm font-medium opacity-80">Premium Professional Chauffeurs</p>
              <button 
                onClick={() => setView('book')}
                className="mt-10 w-full bg-white text-purple-700 font-black py-5 rounded-3xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 text-lg"
              >
                {ICONS.Plus} Book a Trip
              </button>
            </div>

            {/* Active Trip Quick Access */}
            {activeTrip && (
              <div 
                onClick={() => { setSelectedTripId(activeTrip.id); setView('trip-info'); }}
                className="bg-gray-950 border-2 border-purple-500/30 rounded-[2.5rem] p-8 cursor-pointer hover:bg-gray-900 transition-all group shadow-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-gray-900 rounded-[1.5rem] flex items-center justify-center border border-gray-800 text-purple-500">
                    {ICONS.Trips}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Ongoing Journey</p>
                    <p className="font-bold text-lg leading-tight truncate max-w-[150px]">{activeTrip.dropLocation}</p>
                  </div>
                </div>
                <div className="text-purple-500 group-hover:translate-x-1 transition-transform">{ICONS.View}</div>
              </div>
            )}

            {/* Menu Grid */}
            <div className="grid grid-cols-2 gap-5">
              <button onClick={() => setView('history')} className="bg-gray-950 border border-gray-800 p-8 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 hover:bg-gray-900 transition-all group">
                <div className="p-4 bg-gray-900 rounded-[1.5rem] text-purple-500 group-hover:scale-110 transition-transform">{ICONS.History}</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">View Old Trips</span>
              </button>
              <button onClick={() => setView('payments')} className="bg-gray-950 border border-gray-800 p-8 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 hover:bg-gray-900 transition-all group">
                <div className="p-4 bg-gray-900 rounded-[1.5rem] text-blue-500 group-hover:scale-110 transition-transform">{ICONS.Finance}</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">Payment History</span>
              </button>
            </div>
          </div>
        )}

        {view === 'trip-info' && activeTrip && renderTripInfo(activeTrip)}

        {view === 'book' && (
          <div className="animate-in slide-in-from-bottom duration-400">
            <div className="flex justify-between items-center mb-10">
               <h2 className="text-3xl font-black tracking-tighter">Trip Booking</h2>
               <button onClick={() => setView('home')} className="text-gray-500 font-black text-[10px] uppercase px-4 py-2 border border-gray-800 rounded-2xl hover:text-white transition-all">Cancel</button>
            </div>
            
            <form onSubmit={handleBookingSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Customer Name</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none transition-all shadow-inner" value={bookingForm.customerName} onChange={e => setBookingForm({...bookingForm, customerName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Mobile Number</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none transition-all shadow-inner" value={bookingForm.mobileNumber} onChange={e => setBookingForm({...bookingForm, mobileNumber: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Start Date</label>
                  <input required type="date" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={bookingForm.startDate} onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Start Time</label>
                  <input required type="time" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={bookingForm.startTime} onChange={e => setBookingForm({...bookingForm, startTime: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">End Date</label>
                  <input required type="date" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={bookingForm.endDate} onChange={e => setBookingForm({...bookingForm, endDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">End Time</label>
                  <input required type="time" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={bookingForm.endTime} onChange={e => setBookingForm({...bookingForm, endTime: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Trip Type Selection</label>
                <div className="flex bg-gray-950 p-2 rounded-[1.5rem] border border-gray-800 shadow-inner">
                  <button type="button" onClick={() => setBookingForm({...bookingForm, tripType: 'one-way'})} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all tracking-widest ${bookingForm.tripType === 'one-way' ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/40' : 'text-gray-500'}`}>One-way</button>
                  <button type="button" onClick={() => setBookingForm({...bookingForm, tripType: 'round-trip'})} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all tracking-widest ${bookingForm.tripType === 'round-trip' ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/40' : 'text-gray-500'}`}>Round Trip</button>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Pickup Location</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" placeholder="Detailed Address" value={bookingForm.pickup} onChange={e => setBookingForm({...bookingForm, pickup: e.target.value})} />
                </div>
                {bookingForm.tripType === 'one-way' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top duration-300">
                    <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Drop Location</label>
                    <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" placeholder="Destination Address" value={bookingForm.drop} onChange={e => setBookingForm({...bookingForm, drop: e.target.value})} />
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 py-6 rounded-[2.5rem] font-black shadow-2xl shadow-purple-950/50 transition-all active:scale-95 text-lg mt-8 uppercase tracking-[0.2em]">Confirm Booking</button>
            </form>
          </div>
        )}

        {view === 'history' && (
          <div className="animate-in slide-in-from-bottom duration-400">
            <button onClick={() => setView('home')} className="mb-8 text-gray-500 font-black text-[10px] uppercase border border-gray-800 px-4 py-2 rounded-2xl hover:text-white transition-all">← Dashboard</button>
            <h2 className="text-3xl font-black mb-8 tracking-tighter">Old Trip Records</h2>
            <div className="space-y-5">
              {myTrips.filter(t => t.status === 'completed').length === 0 ? (
                <div className="bg-gray-950 border border-gray-800 rounded-[2.5rem] p-16 text-center text-gray-600 italic">No historical records found in registry.</div>
              ) : (
                myTrips.filter(t => t.status === 'completed').map(trip => (
                  <div key={trip.id} className="bg-gray-950 border border-gray-800 p-8 rounded-[2.5rem] hover:border-purple-500/50 transition-all cursor-pointer shadow-xl group">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{new Date(trip.startDateTime).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}</p>
                      <p className="text-green-500 font-black text-lg group-hover:scale-110 transition-transform">₹ {trip.billAmount}</p>
                    </div>
                    <p className="font-bold text-lg truncate text-gray-100">{trip.dropLocation}</p>
                    <div className="flex justify-between mt-5 items-center">
                       <p className="text-[9px] text-gray-700 uppercase font-black tracking-widest">{trip.tripType}</p>
                       <span className="text-[10px] text-purple-600 font-mono font-bold">UID: {trip.id}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'payments' && (
          <div className="animate-in slide-in-from-bottom duration-400">
            <button onClick={() => setView('home')} className="mb-8 text-gray-500 font-black text-[10px] uppercase border border-gray-800 px-4 py-2 rounded-2xl hover:text-white transition-all">← Dashboard</button>
            <h2 className="text-3xl font-black mb-8 tracking-tighter">Payment Ledger</h2>
            <div className="bg-gradient-to-br from-emerald-600 to-green-800 rounded-[3.5rem] p-12 text-center shadow-2xl mb-12">
              <div className="text-white/70 mb-2 uppercase text-[10px] font-black tracking-widest">Aggregated Investment</div>
              <h4 className="text-6xl font-black text-white">₹ {myTrips.filter(t => t.status === 'completed').reduce((acc, t) => acc + (t.billAmount || 0), 0).toLocaleString()}</h4>
            </div>
            <div className="space-y-4">
               {myTrips.filter(t => t.billAmount).map(t => (
                 <div key={t.id} className="bg-gray-950 border border-gray-800 p-6 rounded-3xl flex justify-between items-center shadow-md">
                   <div>
                     <p className="text-sm font-black text-white uppercase tracking-tighter">{new Date(t.startDateTime).toLocaleDateString()}</p>
                     <p className="text-[10px] text-gray-500 font-mono">{t.id}</p>
                   </div>
                   <div className="text-right">
                     <p className="font-black text-green-500 text-xl leading-none">₹ {t.billAmount}</p>
                     <p className="text-[9px] text-gray-700 uppercase font-black mt-2">Processed</p>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <footer className="h-24 border-t border-gray-800 bg-black flex items-center justify-around px-8 sticky bottom-0 z-50">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-2 transition-all ${view === 'home' ? 'text-purple-500 scale-110' : 'text-gray-600 hover:text-gray-300'}`}>
          {ICONS.Dashboard}
          <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
        </button>
        <button onClick={() => setView('book')} className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-white -mt-14 border-4 border-black shadow-2xl transition-all group-hover:scale-110 group-hover:rotate-6">
            {ICONS.Plus}
          </div>
          <span className="text-[9px] font-black uppercase text-purple-500 tracking-tighter">New Book</span>
        </button>
        <button onClick={() => setView('history')} className={`flex flex-col items-center gap-2 transition-all ${view === 'history' ? 'text-purple-500 scale-110' : 'text-gray-600 hover:text-gray-300'}`}>
          {ICONS.History}
          <span className="text-[9px] font-black uppercase tracking-tighter">Old Trips</span>
        </button>
      </footer>
    </div>
  );
};

export default CustomerDashboard;
