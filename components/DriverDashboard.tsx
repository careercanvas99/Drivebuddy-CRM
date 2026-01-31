
import React, { useState, useRef, useEffect } from 'react';
import { User, Trip, Driver, TripStatus, CompanySettings, PaymentMode } from '../types.ts';
import { ICONS } from '../constants.tsx';
import { calculateFareInternal } from './TripEstimation.tsx';
import { supabase } from '../lib/supabase.js';

interface DriverDashboardProps {
  user: User;
  trips: Trip[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  onLogout: () => void;
  companySettings: CompanySettings;
}

const DriverDashboard: React.FC<DriverDashboardProps> = ({ user, trips, setTrips, drivers, setDrivers, onLogout, companySettings }) => {
  const [activeSelfieType, setActiveSelfieType] = useState<'start' | 'end' | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [view, setView] = useState<'terminal' | 'missions' | 'wallet'>('terminal');
  const [isUpdating, setIsUpdating] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('online');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentDriver = drivers.find(d => d.id === user.id);
  const myTrips = trips.filter(t => t.driverId === currentDriver?.id);
  const myActiveTrip = myTrips.find(t => (t.status === 'NEW' && t.driverId === user.id) || t.status === 'STARTED');
  const myCompletedTrips = myTrips.filter(t => t.status === 'COMPLETED');
  const myAssignedTrips = myTrips.filter(t => t.status === 'NEW' && t.driverId === user.id);

  // REAL-TIME LOCATION TRACKING (STRICT SQL SYNC)
  useEffect(() => {
    if (!currentDriver) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        
        // Update Local State for immediate UI feedback
        setDrivers(prev => prev.map(d => 
          d.id === currentDriver.id ? { ...d, location: [latitude, longitude] } : d
        ));
        
        // PERSIST TO SQL: driver_locations table
        await supabase.from('driver_locations').insert([{
          driver_id: currentDriver.id,
          latitude,
          longitude
        }]);

        // Update driver's main coordinates
        await supabase.from('drivers').update({
          location_lat: latitude,
          location_lng: longitude
        } as any).eq('id', currentDriver.id);
      },
      (err) => console.error("Location Tracking Violation:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [currentDriver?.id]);

  const startCamera = async () => {
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera Protocol Error.");
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

  const handleTripAction = async () => {
    if (!myActiveTrip || !capturedImage) return;
    setIsUpdating(true);

    const isStarting = activeSelfieType === 'start';
    const newStatus: TripStatus = isStarting ? 'STARTED' : 'COMPLETED';
    const now = new Date().toISOString();
    
    try {
      const dbUpdates: any = { trip_status: newStatus };
      if (isStarting) {
        dbUpdates.start_time = now;
      } else {
        dbUpdates.end_time = now;
        const billing = calculateFareInternal(new Date(myActiveTrip.startDateTime), new Date(now), "No", "Instation", myActiveTrip.tripType === 'one-way' ? "One Way" : "Round Trip");
        const finalAmount = Math.round(billing.totalPrice * 1.15);
        dbUpdates.bill_amount = finalAmount;
        dbUpdates.payment_status = 'pending';
        dbUpdates.payment_mode = paymentMode;
      }

      // SQL SYNC: Update Manifest
      const { error } = await supabase.from('trips').update(dbUpdates).eq('id', myActiveTrip.id);
      if (error) throw error;

      // SQL SYNC: Update Pilot Status
      const newDriverStatus = isStarting ? 'Busy' : 'Available';
      await supabase.from('drivers').update({ status: newDriverStatus } as any).eq('id', currentDriver?.id);

      setActiveSelfieType(null);
      setCapturedImage(null);
      alert(`Manifest Update Synchronized: ${newStatus}`);
    } catch (err: any) {
      alert(`Manifest Update Failure: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <nav className="h-16 border-b border-gray-800 px-6 flex items-center justify-between bg-gray-950/80 sticky top-0 z-50 shadow-2xl">
        <h1 className="text-xl font-black text-purple-500 tracking-tighter">DRIVEBUDDY</h1>
        <div className="flex items-center gap-3">
          <button onClick={onLogout} className="p-2 text-red-500 bg-gray-900 border border-gray-800 rounded-xl transition-all">{ICONS.Logout}</button>
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-black shadow-xl">
            {user.name.charAt(0)}
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6 max-md mx-auto w-full">
        <div className="flex bg-gray-900 p-1.5 rounded-2xl mb-8 border border-gray-800 shadow-inner">
          <button onClick={() => setView('terminal')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'terminal' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500'}`}>Terminal</button>
          <button onClick={() => setView('missions')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'missions' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500'}`}>Missions</button>
          <button onClick={() => setView('wallet')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'wallet' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500'}`}>Wallet</button>
        </div>

        {view === 'terminal' && (
          <div className="space-y-6 animate-in slide-in-from-left duration-500">
            <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-purple-600 shadow-[0_0_10px_#9333ea]"></div>
              <h2 className="text-3xl font-black mb-1">Status: {(currentDriver?.status || 'Available').toUpperCase()}</h2>
              <p className="text-[10px] text-purple-500 font-black uppercase tracking-widest mb-6">ID: {user.displayId}</p>
              
              {myActiveTrip ? (
                <div className="space-y-6">
                  <div className="bg-black/50 p-6 rounded-3xl border border-gray-800 shadow-inner">
                    <p className="text-[10px] text-gray-500 uppercase font-black mb-4 tracking-widest flex items-center gap-2">
                       <span className={`w-1.5 h-1.5 rounded-full ${myActiveTrip.status === 'STARTED' ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'} `}></span> {(myActiveTrip.status || 'NEW').toUpperCase()} MANIFEST
                    </p>
                    <div className="space-y-4 mb-8">
                        <div>
                          <p className="text-[9px] text-gray-600 font-black uppercase mb-1">Pickup</p>
                          <p className="text-sm font-bold truncate leading-tight">{myActiveTrip.pickupLocation}</p>
                        </div>
                    </div>

                    <button 
                      onClick={() => { setActiveSelfieType(myActiveTrip.status === 'NEW' ? 'start' : 'end'); startCamera(); }}
                      className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${myActiveTrip.status === 'NEW' ? 'bg-emerald-600' : 'bg-blue-600'}`}
                    >
                      {ICONS.Camera} Authenticate {myActiveTrip.status === 'NEW' ? 'Trip Start' : 'Complete Trip'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center bg-black/40 rounded-3xl border border-gray-800 border-dashed">
                  <h3 className="text-lg font-bold uppercase tracking-tighter">Standby Protocol</h3>
                  <p className="text-xs text-gray-500 mt-2 px-8 leading-relaxed font-medium">Monitoring global dispatch.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'missions' && (
           <div className="animate-in slide-in-from-right duration-500 space-y-4">
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">Assigned Missions</h2>
              {myAssignedTrips.length === 0 ? (
                <div className="p-16 text-center text-gray-700 italic border border-gray-900 rounded-[2.5rem]">No pending missions.</div>
              ) : (
                myAssignedTrips.map(trip => (
                  <div key={trip.id} className="bg-gray-900 border border-gray-800 p-6 rounded-[2rem] shadow-xl">
                    <p className="text-[10px] text-purple-500 font-mono font-bold tracking-widest">{trip.displayId}</p>
                    <p className="text-sm font-bold text-gray-200 mb-2">{trip.pickupLocation}</p>
                  </div>
                ))
              )}
           </div>
        )}

        {view === 'wallet' && (
           <div className="animate-in slide-in-from-bottom duration-500 space-y-4">
             <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">Trip Payments</h2>
             {myCompletedTrips.map(trip => (
               <div key={trip.id} className="bg-gray-900 border border-gray-800 p-6 rounded-[2rem] shadow-xl flex justify-between items-center group">
                 <div className="space-y-1">
                   <p className="text-[9px] text-purple-500 font-mono font-bold tracking-widest">{trip.displayId}</p>
                   <p className="text-[10px] text-white font-black uppercase tracking-widest">{trip.paymentMode?.toUpperCase() || 'UNSETTLED'}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-emerald-500 font-black text-lg">₹{trip.billAmount}</p>
                 </div>
               </div>
             ))}
           </div>
        )}
      </main>

      {activeSelfieType && (
        <div className="fixed inset-0 bg-black z-[120] flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black text-purple-500 uppercase tracking-tighter">Authentication</h3>
            <button onClick={() => setActiveSelfieType(null)} className="text-gray-500 p-2">✕</button>
          </div>
          <div className="flex-1 bg-gray-900 rounded-[3rem] overflow-hidden border-2 border-purple-500/30 relative shadow-2xl">
            {!capturedImage ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={capturedImage} className="w-full h-full object-cover" alt="Authentication Capture" />
            )}
          </div>
          <canvas ref={canvasRef} width="400" height="300" className="hidden" />
          <div className="mt-10 space-y-4">
            {!capturedImage ? (
              <button onClick={capturePhoto} className="w-full bg-purple-600 py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-[11px] text-white shadow-2xl">Capture Identity Scan</button>
            ) : (
              <div className="flex gap-4">
                <button onClick={() => { setCapturedImage(null); startCamera(); }} className="flex-1 bg-gray-900 py-6 rounded-[2.5rem] font-black uppercase text-[10px] text-gray-400">Reset</button>
                <button disabled={isUpdating} onClick={handleTripAction} className="flex-1 bg-emerald-600 py-6 rounded-[2.5rem] font-black uppercase text-[10px] text-white shadow-xl">
                  {isUpdating ? 'UPLOADING...' : 'CONFIRM MANIFEST'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
