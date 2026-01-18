
import React, { useState, useRef, useEffect } from 'react';
// Added TripStatus to the imports from ../types.ts
import { User, Trip, Driver, TripStatus } from '../types.ts';
import { ICONS } from '../constants.tsx';
import { calculateFareInternal } from './TripEstimation.tsx';

interface DriverDashboardProps {
  user: User;
  trips: Trip[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  onLogout: () => void;
}

const DriverDashboard: React.FC<DriverDashboardProps> = ({ user, trips, setTrips, drivers, setDrivers, onLogout }) => {
  const [activeSelfieType, setActiveSelfieType] = useState<'start' | 'end' | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [view, setView] = useState<'trip' | 'history'>('trip');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // CRITICAL: Filter trips strictly assigned to THIS driver
  const currentDriver = drivers.find(d => d.name === user.name || d.id === user.id);
  const myTrips = trips.filter(t => t.driverId === currentDriver?.id);
  const myActiveTrip = myTrips.find(t => (t.status === 'assigned' || t.status === 'started'));
  const myCompletedTrips = myTrips.filter(t => t.status === 'completed');

  // Real-time Location Tracking (Simulation)
  useEffect(() => {
    if (!myActiveTrip || !currentDriver) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDrivers(prev => prev.map(d => 
          d.id === currentDriver.id ? { ...d, location: [latitude, longitude] } : d
        ));
      },
      (err) => console.error("Tracking Error:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [myActiveTrip, currentDriver?.id]);

  const startCamera = async () => {
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Error accessing camera. Check permissions.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 300);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setCapturedImage(dataUrl);
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleTripAction = () => {
    if (!myActiveTrip || !capturedImage) return;

    const isStarting = activeSelfieType === 'start';
    // Explicitly typed newStatus as TripStatus to avoid assignment error
    const newStatus: TripStatus = isStarting ? 'started' : 'completed';
    const now = new Date();
    
    setTrips(prev => prev.map(t => {
      if (t.id === myActiveTrip.id) {
        // Explicitly typed the updated object as Trip
        const updated: Trip = { ...t, status: newStatus };
        if (isStarting) {
          updated.startSelfie = capturedImage;
          updated.startDateTime = now.toISOString();
        } else {
          updated.endSelfie = capturedImage;
          updated.endDateTime = now.toISOString();
          const billing = calculateFareInternal(new Date(t.startDateTime), now, "No", "Instation", t.tripType === 'one-way' ? "One Way" : "Round Trip");
          updated.billAmount = billing.totalPrice;
          updated.paymentStatus = 'pending';
        }
        return updated;
      }
      return t;
    }));
    
    if (!isStarting) setDrivers(prev => prev.map(d => d.id === currentDriver?.id ? { ...d, status: 'available' } : d));
    else setDrivers(prev => prev.map(d => d.id === currentDriver?.id ? { ...d, status: 'busy' } : d));
    
    setActiveSelfieType(null);
    setCapturedImage(null);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <nav className="h-16 border-b border-gray-800 px-6 flex items-center justify-between bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-xl font-black text-purple-500 tracking-tighter">DRIVEBUDDY</h1>
        <div className="flex items-center gap-3">
          <button onClick={onLogout} className="p-2 text-red-500 bg-gray-900 border border-gray-800 rounded-xl">{ICONS.Logout}</button>
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-black shadow-lg">
            {user.name.charAt(0)}
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-md mx-auto w-full">
        {view === 'trip' ? (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
              <h2 className="text-3xl font-black mb-1">Hello, Partner</h2>
              <p className="text-[10px] text-purple-500 font-black uppercase tracking-widest mb-6">Partner ID: {currentDriver?.id}</p>
              
              {myActiveTrip ? (
                <div className="space-y-6 animate-in slide-in-from-top">
                  <div className="bg-black/50 p-6 rounded-3xl border border-gray-800">
                    <p className="text-[10px] text-gray-500 uppercase font-black mb-4 tracking-widest">Active Journey</p>
                    <div className="flex gap-4 mb-6">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <div className="w-0.5 flex-1 bg-gray-800 my-1"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <p className="text-sm font-bold truncate">{myActiveTrip.pickupLocation}</p>
                        <p className="text-sm font-bold truncate">{myActiveTrip.dropLocation}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => { setActiveSelfieType(myActiveTrip.status === 'assigned' ? 'start' : 'end'); startCamera(); }}
                      className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 ${myActiveTrip.status === 'assigned' ? 'bg-green-600' : 'bg-blue-600'}`}
                    >
                      {ICONS.Camera} Verify {myActiveTrip.status === 'assigned' ? 'Start' : 'End'} Trip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center bg-black/40 rounded-3xl border border-gray-800">
                  <div className="text-gray-700 scale-[2.5] mb-8">{ICONS.Trips}</div>
                  <h3 className="text-lg font-bold">No Active Trips</h3>
                  <p className="text-xs text-gray-500 mt-2 px-8 leading-relaxed">Please wait while the office team assigns a journey to you.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-gray-950 border border-gray-800 p-6 rounded-[2rem] text-center">
                  <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Lifetime Trips</p>
                  <p className="text-2xl font-black text-white">{myCompletedTrips.length}</p>
               </div>
               <div className="bg-gray-950 border border-gray-800 p-6 rounded-[2rem] text-center">
                  <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Earnings</p>
                  <p className="text-2xl font-black text-green-500">₹{myCompletedTrips.reduce((acc, t) => acc + (t.billAmount || 0), 0).toFixed(0)}</p>
               </div>
            </div>
            
            <button 
              onClick={() => setView('history')}
              className="w-full bg-gray-900 border border-gray-800 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
            >
              View Earnings History
            </button>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom space-y-4">
             <button onClick={() => setView('trip')} className="text-[10px] font-black uppercase text-gray-500 hover:text-white mb-6">← Dashboard</button>
             <h2 className="text-2xl font-black mb-6">Completed Journeys</h2>
             {myCompletedTrips.length === 0 ? (
               <div className="p-12 text-center text-gray-600 italic">No historical records found.</div>
             ) : (
               myCompletedTrips.map(trip => (
                 <div key={trip.id} className="bg-gray-900 border border-gray-800 p-5 rounded-3xl shadow-md">
                   <div className="flex justify-between items-start mb-2">
                     <p className="text-[9px] text-purple-500 font-mono font-bold">{trip.id}</p>
                     <p className="text-[9px] text-gray-500 font-bold">{new Date(trip.endDateTime).toLocaleDateString()}</p>
                   </div>
                   <p className="text-xs font-bold text-gray-200 truncate mb-3">{trip.dropLocation}</p>
                   <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                     <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{trip.tripType}</span>
                     <span className="text-green-500 font-black text-sm">₹{trip.billAmount}</span>
                   </div>
                 </div>
               ))
             )}
          </div>
        )}
      </main>

      {activeSelfieType && (
        <div className="fixed inset-0 bg-black z-[110] flex flex-col p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-purple-500 uppercase">Verification</h3>
            <button onClick={() => setActiveSelfieType(null)} className="text-gray-500">{ICONS.Cancel}</button>
          </div>
          
          <div className="flex-1 bg-gray-900 rounded-[2.5rem] overflow-hidden border-2 border-purple-500/30 relative">
            {!capturedImage ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={capturedImage} className="w-full h-full object-cover" alt="Verification" />
            )}
          </div>
          
          <canvas ref={canvasRef} width="400" height="300" className="hidden" />

          <div className="mt-8 space-y-4">
            {!capturedImage ? (
              <button 
                onClick={capturePhoto}
                className="w-full bg-purple-600 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95"
              >
                Capture Photo
              </button>
            ) : (
              <div className="flex gap-4">
                <button onClick={() => { setCapturedImage(null); startCamera(); }} className="flex-1 bg-gray-900 py-5 rounded-[2rem] font-black uppercase text-[10px]">Retake</button>
                <button onClick={handleTripAction} className="flex-1 bg-green-600 py-5 rounded-[2rem] font-black uppercase text-[10px] shadow-xl">Confirm</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
