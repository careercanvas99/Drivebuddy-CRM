
import React, { useState } from 'react';
import { Trip, User, AppData } from '../types';
import { MapPin, Plus, History, Clock, Map as MapIcon } from 'lucide-react';

interface CustomerPortalProps {
  user: User;
  data: AppData;
  onUpdateTrips: (trips: Trip[]) => Promise<void>;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ user, data, onUpdateTrips }) => {
  const [showBooking, setShowBooking] = useState(false);
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');

  const customerTrips = data.trips.filter(t => t.customerId === user.id);

  const handleBook = async () => {
    if (!pickup || !drop) return;

    const newTrip: Trip = {
      id: `TRP${Math.floor(Math.random() * 9000) + 1000}`,
      customerId: user.id,
      status: 'PENDING',
      pickup,
      drop,
      dateTime: new Date().toISOString(),
      basePrice: 250, // Default base price for mock
      logs: [{ timestamp: new Date().toISOString(), user: user.username, action: 'Customer booked trip' }]
    };

    await onUpdateTrips([...data.trips, newTrip]);
    setShowBooking(false);
    setPickup('');
    setDrop('');
    alert("Trip Booked Successfully!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-br from-purple-700 to-indigo-900 p-8 rounded-3xl text-white shadow-xl shadow-purple-900/20 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold mb-2">Book Your Next Ride</h2>
          <p className="text-purple-100 max-w-sm mb-6 opacity-80">Drivebuddy connects you with professional drivers instantly.</p>
          <button 
            onClick={() => setShowBooking(true)}
            className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Start Booking
          </button>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-purple-500" /> Trip History
          </h3>
          <button className="text-xs text-purple-400 uppercase font-bold tracking-widest hover:underline">View All</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customerTrips.length === 0 ? (
            <div className="col-span-2 text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
              <p className="text-slate-500">Your trip history is empty.</p>
            </div>
          ) : (
            customerTrips.map(trip => (
              <div key={trip.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl group hover:border-purple-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      trip.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 
                      trip.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {trip.status}
                    </span>
                    <span className="text-slate-500 text-xs">#{trip.id}</span>
                  </div>
                  {trip.status === 'STARTED' && (
                    <button className="text-purple-400 flex items-center gap-1 text-xs font-bold bg-purple-500/10 px-2 py-1 rounded">
                      <MapIcon className="w-3 h-3" /> Track
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pickup</p>
                      <p className="text-sm font-semibold">{trip.pickup}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <MapPin className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Drop</p>
                      <p className="text-sm font-semibold">{trip.drop}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-500">{new Date(trip.dateTime).toLocaleDateString()}</span>
                  <span className="text-lg font-bold text-white">₹{trip.finalPrice || trip.basePrice || '---'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showBooking && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold mb-6">New Booking</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pickup Location</label>
                <input 
                  type="text" 
                  value={pickup} 
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Street, Landmark, City"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Drop Destination</label>
                <input 
                  type="text" 
                  value={drop} 
                  onChange={(e) => setDrop(e.target.value)}
                  placeholder="Office, Home, Airport"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
              
              <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-xl flex items-start gap-3 mt-4">
                <Clock className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-purple-200">Estimated Pickup: 15 mins</p>
                  <p className="text-xs text-purple-400/80">Drivers are active in your area.</p>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setShowBooking(false)}
                  className="flex-1 py-3 border border-slate-700 rounded-xl text-slate-400 font-bold hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBook}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-900/20 transition-all"
                >
                  Book Trip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;
