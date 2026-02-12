
import React, { useState, useRef, useEffect } from 'react';
import { User, Trip, Driver, TripStatus, CompanySettings, Customer } from '../types.ts';
import { ICONS } from '../constants.tsx';
import { calculateFareInternal } from './TripEstimation.tsx';
import { supabase } from '../lib/supabase.js';
import { generatePDFInvoice } from '../services/InvoiceService.ts';

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
  const [isLoadingMissions, setIsLoadingMissions] = useState(true);
  const [assignedTrips, setAssignedTrips] = useState<(Trip & { customer?: Customer })[]>([]);
  const [paymentMode, setPaymentMode] = useState<string>('Online');
  const [showFareConfirmation, setShowFareConfirmation] = useState<{ total: number, base: number, gst: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchMissions();
  }, [user.driverId]);

  const fetchMissions = async () => {
    if (!user.driverId) return;
    setIsLoadingMissions(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*, customer:customers(*)')
        .eq('driver_id', user.driverId)
        .in('trip_status', ['ASSIGNED', 'STARTED', 'COMPLETED'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setAssignedTrips(data.map((t: any) => ({
          id: t.id,
          displayId: t.trip_code,
          customerId: t.customer_id,
          driverId: t.driver_id,
          pickupLocation: t.pickup_location,
          dropLocation: t.drop_location,
          tripType: t.trip_type,
          tripRoute: t.trip_route,
          startDateTime: t.start_time,
          endDateTime: t.end_time,
          status: t.trip_status as any,
          totalAmount: t.total_amount, 
          paymentMode: t.payment_mode,
          customer: t.customer ? {
            id: t.customer.id,
            name: t.customer.customer_name,
            mobile: t.customer.mobile_number,
            vehicleModel: t.customer.vehicle_model
          } : undefined
        })));
      }
    } catch (err) { console.error("Manifest Retrieval Failure:", err); } finally { setIsLoadingMissions(false); }
  };

  const uploadSelfie = async (base64: string, tripId: string, action: string): Promise<string | null> => {
    try {
      const fileName = `trips/${tripId}/${action.toLowerCase()}_${Date.now()}.jpg`;
      const response = await fetch(base64);
      const blob = await response.blob();
      
      // CRITICAL: Point to 'trip-images' bucket
      const { data, error } = await supabase.storage.from('trip-images').upload(fileName, blob, { 
        contentType: 'image/jpeg', 
        upsert: true 
      });
      
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('trip-images').getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch (err) {
      console.error("Biometric Storage Failure:", err);
      return null;
    }
  };

  const startCamera = async () => {
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { alert("Camera Protocol Blocked. Grant Permissions."); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 300);
        setCapturedImage(canvasRef.current.toDataURL('image/jpeg'));
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    }
  };

  const handleStartTrip = async () => {
    const myActiveTrip = assignedTrips.find(t => t.status === 'ASSIGNED');
    if (!myActiveTrip || !capturedImage || !user.driverId) return;
    setIsUpdating(true);
    try {
      const imageUrl = await uploadSelfie(capturedImage, myActiveTrip.id, 'START');
      const now = new Date().toISOString();
      const { error: tripError } = await supabase.from('trips').update({ trip_status: 'STARTED', start_time: now }).eq('id', myActiveTrip.id);
      if (tripError) throw tripError;
      await supabase.from('drivers').update({ status: 'Busy' } as any).eq('id', user.driverId);
      await supabase.from('trip_logs').insert([{ trip_id: myActiveTrip.id, action: 'TRIP_STARTED', image_url: imageUrl, performed_by: user.id }]);
      setActiveSelfieType(null);
      setCapturedImage(null);
      fetchMissions();
    } catch (err: any) { alert(`Sync Failure: ${err.message}`); } finally { setIsUpdating(false); }
  };

  const handleInitializeEnd = () => {
    const myActiveTrip = assignedTrips.find(t => t.status === 'STARTED');
    if (!myActiveTrip) return;
    const now = new Date().toISOString();
    const billing = calculateFareInternal(
      new Date(myActiveTrip.startDateTime || now), 
      new Date(now), 
      "No", 
      myActiveTrip.tripRoute, 
      myActiveTrip.tripType === 'one-way' ? "One Way" : "Round Trip"
    );
    setShowFareConfirmation({ total: billing.totalPrice, base: billing.basePrice, gst: billing.gst });
  };

  const handleConfirmEndTrip = async () => {
    const myActiveTrip = assignedTrips.find(t => t.status === 'STARTED');
    if (!myActiveTrip || !showFareConfirmation || !capturedImage || !user.driverId) return;
    setIsUpdating(true);
    try {
      const imageUrl = await uploadSelfie(capturedImage, myActiveTrip.id, 'END');
      const now = new Date().toISOString();
      
      // Atomic Update: Trip Completion & Fare Storage
      const { error: tripError } = await supabase.from('trips').update({
        trip_status: 'COMPLETED',
        end_time: now,
        total_amount: showFareConfirmation.total, 
        payment_mode: paymentMode,               
        payment_status: 'pending'
      }).eq('id', myActiveTrip.id);
      
      if (tripError) throw tripError;

      // Atomic Update: Driver Availability
      await supabase.from('drivers').update({ status: 'Available' } as any).eq('id', user.driverId);

      // Audit Log
      await supabase.from('trip_logs').insert([{ 
        trip_id: myActiveTrip.id, 
        action: 'TRIP_FINALIZED', 
        image_url: imageUrl, 
        performed_by: user.id, 
        reason: `Mission finalized via pilot terminal. Amount: ₹${showFareConfirmation.total}` 
      }]);
      
      // AUTOMATIC INVOICE GENERATION
      const finalManifest = { 
        ...myActiveTrip, 
        status: 'COMPLETED' as TripStatus, 
        totalAmount: showFareConfirmation.total, 
        endDateTime: now 
      };
      
      generatePDFInvoice(
        finalManifest,
        myActiveTrip.customer,
        companySettings,
        drivers.find(d => d.id === user.driverId)
      );

      setShowFareConfirmation(null);
      setActiveSelfieType(null);
      setCapturedImage(null);
      fetchMissions();
      alert("Mission Finished. Biometric invoice generated.");
    } catch (err: any) { 
      alert(`Terminal Sync Failure: ${err.message}`); 
    } finally { 
      setIsUpdating(false); 
    }
  };

  const myActiveTrip = assignedTrips.find(t => t.status === 'ASSIGNED' || t.status === 'STARTED');
  const myCompletedTrips = assignedTrips.filter(t => t.status === 'COMPLETED');

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <nav className="h-16 border-b border-gray-800 px-6 flex items-center justify-between bg-gray-950/80 sticky top-0 z-50 backdrop-blur-md shadow-2xl">
        <h1 className="text-xl font-black text-purple-500 tracking-tighter uppercase italic">Drivebuddy</h1>
        <div className="flex items-center gap-3">
          <button onClick={onLogout} className="p-2 text-red-500 bg-gray-900 border border-gray-800 rounded-xl">{ICONS.Logout}</button>
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-black shadow-xl uppercase">{user.name.charAt(0)}</div>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-lg mx-auto w-full space-y-8 pb-12">
        <div className="flex bg-gray-900 p-1.5 rounded-2xl border border-gray-800 shadow-inner">
          <button onClick={() => setView('terminal')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'terminal' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500'}`}>Terminal</button>
          <button onClick={() => setView('missions')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'missions' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500'}`}>Archives</button>
          <button onClick={() => setView('wallet')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'wallet' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500'}`}>Ledger</button>
        </div>

        {view === 'terminal' && (
          <div className="space-y-6 animate-in slide-in-from-left duration-300">
            {isLoadingMissions ? (
               <div className="py-24 text-center animate-pulse text-gray-700 font-black uppercase text-[10px] tracking-[0.4em]">Uplinking...</div>
            ) : myActiveTrip ? (
              <div className="bg-gray-900 border border-gray-800 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-purple-600 shadow-[0_0_15px_#9333ea]"></div>
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{myActiveTrip.displayId}</h2>
                   <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${myActiveTrip.status === 'STARTED' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white animate-pulse'}`}>{myActiveTrip.status}</span>
                </div>
                
                <div className="bg-black/50 p-6 rounded-3xl border border-gray-800 shadow-inner space-y-6">
                  <section>
                    <p className="text-[9px] text-gray-600 font-black uppercase mb-3 tracking-widest">Client Identity</p>
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500 font-black text-xl uppercase">{myActiveTrip.customer?.name.charAt(0)}</div>
                       <div><p className="text-lg font-black text-white leading-tight">{myActiveTrip.customer?.name}</p><p className="text-[10px] text-purple-500 font-mono tracking-widest">{myActiveTrip.customer?.mobile}</p></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div><p className="text-[9px] text-gray-700 font-black uppercase mb-1">Logistics Hubs</p><p className="text-xs font-bold text-gray-300">{myActiveTrip.pickupLocation} → {myActiveTrip.dropLocation}</p></div>
                  </section>
                  
                  {myActiveTrip.status === 'STARTED' && (
                    <div className="space-y-2 mt-4 pt-6 border-t border-gray-800">
                       <label className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Collection Mode</label>
                       <select className="w-full bg-black border border-gray-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-purple-500" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                         <option value="Cash">Cash Protocol</option><option value="Online">Online / UPI Transfer</option><option value="UPI">Direct UPI</option><option value="Card">Terminal Card</option>
                       </select>
                    </div>
                  )}

                  {myActiveTrip.status === 'ASSIGNED' ? (
                    <button onClick={() => { setActiveSelfieType('start'); startCamera(); }} className="w-full py-6 bg-emerald-600 rounded-3xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">
                      {ICONS.Camera} Start Protocol
                    </button>
                  ) : (
                    <button onClick={handleInitializeEnd} className="w-full py-6 bg-red-600 rounded-3xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">
                      {ICONS.Check} End Protocol
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-24 text-center bg-gray-900/30 rounded-[3.5rem] border border-gray-800 border-dashed">
                <div className="text-gray-800 mb-4 scale-150">{ICONS.Trips}</div>
                <h3 className="text-lg font-bold uppercase tracking-tighter text-gray-600">Terminal Idle</h3>
                <p className="text-[10px] text-gray-700 mt-2 px-12 font-black uppercase tracking-widest leading-relaxed">Waiting for Mission Uplink.</p>
              </div>
            )}
          </div>
        )}

        {view === 'missions' && (
           <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <h2 className="text-xl font-black uppercase tracking-tighter mb-4">Mission Archives</h2>
              {myCompletedTrips.length === 0 ? <div className="p-20 text-center text-gray-800 italic border border-gray-900 rounded-[2.5rem] font-black uppercase text-[9px] tracking-widest">Registry Empty.</div> : myCompletedTrips.map(trip => (
                <div key={trip.id} className="bg-gray-950 border border-gray-800 p-6 rounded-[2rem] shadow-lg flex justify-between items-center group hover:border-purple-500/30 transition-all">
                  <div><p className="text-[9px] text-purple-500 font-mono font-bold tracking-widest">{trip.displayId}</p><p className="text-sm font-bold text-gray-300 mt-1 truncate max-w-[180px]">{trip.dropLocation}</p></div>
                  <div className="text-right">
                    <p className="text-white font-black text-sm">₹{trip.totalAmount || 0}</p>
                    <button onClick={() => generatePDFInvoice(trip, trip.customer, companySettings, drivers.find(d => d.id === user.driverId))} className="text-[8px] font-black uppercase text-purple-400 hover:text-white transition-colors">Duplicate</button>
                  </div>
                </div>
              ))}
           </div>
        )}

        {view === 'wallet' && (
           <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
             <h2 className="text-xl font-black uppercase tracking-tighter mb-4">Financial Ledger</h2>
             {myCompletedTrips.map(trip => (
               <div key={trip.id} className="bg-gray-950 border border-gray-800 p-7 rounded-[2.5rem] shadow-2xl flex justify-between items-center group hover:border-emerald-500/30 transition-all">
                 <div className="space-y-1"><p className="text-[9px] text-purple-500 font-mono font-bold tracking-widest">{trip.displayId}</p><p className="text-[10px] text-white font-black uppercase tracking-widest">{trip.paymentMode || 'SETTLED'}</p></div>
                 <div className="text-right">
                    <p className="text-emerald-500 font-black text-2xl leading-none">₹{trip.totalAmount || 0}</p>
                    <p className="text-[8px] text-gray-700 font-black mt-1 uppercase tracking-widest">Accounted</p>
                 </div>
               </div>
             ))}
             {myCompletedTrips.length === 0 && <div className="p-20 text-center text-gray-800 italic border border-gray-900 rounded-[2.5rem] font-black uppercase text-[9px] tracking-widest">No Transactions.</div>}
           </div>
        )}
      </main>

      {showFareConfirmation && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col p-6 animate-in slide-in-from-bottom duration-400 backdrop-blur-xl">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-emerald-500 uppercase tracking-tighter leading-none">Fare Summary</h3>
              <button onClick={() => setShowFareConfirmation(null)} className="text-gray-500 p-2 font-bold text-2xl">✕</button>
           </div>
           
           <div className="flex-1 bg-gray-900 rounded-[3rem] border border-gray-800 shadow-2xl p-10 flex flex-col items-center justify-center space-y-8 text-center">
              <div>
                 <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-2">Final Payable Amount</p>
                 <h4 className="text-7xl font-black text-white leading-none">₹{showFareConfirmation.total}</h4>
              </div>
              <div className="w-full space-y-4 max-w-sm text-left">
                 <div className="flex justify-between font-black uppercase tracking-widest text-[11px]"><span className="text-gray-500">Base Fare</span><span className="text-white">₹{showFareConfirmation.base}</span></div>
                 <div className="flex justify-between font-black uppercase tracking-widest text-[11px] pt-4 border-t border-gray-800"><span className="text-gray-500">GST (18%)</span><span className="text-emerald-500">₹{showFareConfirmation.gst}</span></div>
                 <div className="flex justify-between font-black uppercase tracking-widest text-[11px] pt-4 border-t border-gray-800"><span className="text-gray-500">Method</span><span className="text-purple-400 font-black">{paymentMode}</span></div>
              </div>
           </div>
           <div className="mt-10">
              <button onClick={() => { setActiveSelfieType('end'); startCamera(); }} className="w-full bg-emerald-600 py-7 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[12px] text-white shadow-2xl active:scale-95 transition-all">
                 Capture Identity & Finish Mission
              </button>
           </div>
        </div>
      )}

      {activeSelfieType && (
        <div className="fixed inset-0 bg-black z-[400] flex flex-col p-6 animate-in slide-in-from-bottom duration-400 backdrop-blur-xl">
          <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-purple-500 uppercase tracking-tighter leading-none">Identity Validation Scan</h3><button onClick={() => { setActiveSelfieType(null); setCapturedImage(null); }} className="text-gray-500 p-2 font-bold text-2xl font-mono">✕</button></div>
          <div className="flex-1 bg-gray-900 rounded-[3rem] overflow-hidden border-2 border-purple-500/30 relative shadow-2xl shadow-purple-900/10">
            {!capturedImage ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /> : <img src={capturedImage} className="w-full h-full object-cover" alt="Scan Results" />}
          </div>
          <canvas ref={canvasRef} width="400" height="300" className="hidden" />
          <div className="mt-10 space-y-4">
            {!capturedImage ? <button onClick={capturePhoto} className="w-full bg-purple-600 py-7 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[12px] text-white shadow-2xl">Initialize Scan</button> : (
              <div className="flex gap-4">
                <button onClick={() => { setCapturedImage(null); startCamera(); }} className="flex-1 bg-gray-900 py-6 rounded-[2.5rem] font-black uppercase text-[10px] text-gray-500 border border-gray-800">Abort</button>
                <button disabled={isUpdating} onClick={activeSelfieType === 'start' ? handleStartTrip : handleConfirmEndTrip} className="flex-1 bg-emerald-600 py-6 rounded-[2.5rem] font-black uppercase text-[10px] text-white shadow-xl transition-all">{isUpdating ? 'SYNCING...' : 'Confirm & Commit'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
