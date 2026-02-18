
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Trip, Driver, Customer, User, UserRole, TripLog, CompanySettings, TripStatus } from '../types.ts';
import { ICONS } from '../constants.tsx';
import TripBookingModal from './TripBookingModal.tsx';
import { supabase } from '../lib/supabase.js';
import { calculateFareInternal } from './TripEstimation.tsx';
import { generatePDFInvoice } from '../services/InvoiceService.ts';

interface TripManagementProps {
  trips: Trip[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  customers: Customer[];
  user: User;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  companySettings: CompanySettings;
}

const TripManagement: React.FC<TripManagementProps> = ({ trips, setTrips, drivers, setDrivers, customers, user, setCustomers, companySettings }) => {
  const [viewingTripId, setViewingTripId] = useState<string | null>(null);
  const [detailedTrip, setDetailedTrip] = useState<(Trip & { customer?: Customer, driver?: Driver, logs: TripLog[] }) | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [activeSelfieType, setActiveSelfieType] = useState<'start' | 'end' | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<string>('Online');
  const [showFareConfirmation, setShowFareConfirmation] = useState<{ total: number, base: number, gst: number } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);

  /**
   * RBAC Protocol: Strictly validates if the user can execute mission actions
   */
  const canModifyTrip = (tripId?: string, driverId?: string) => {
    const isAuthorizedStaff = [UserRole.ADMIN, UserRole.OPS_MANAGER, UserRole.OPERATION_EXECUTIVE].includes(user.role);
    const isAssignedPilot = user.role === UserRole.DRIVER && user.driverId === driverId;
    return isAuthorizedStaff || isAssignedPilot;
  };

  useEffect(() => {
    if (viewingTripId) {
      fetchDetailedTrip(viewingTripId);
    }
  }, [viewingTripId]);

  const fetchDetailedTrip = async (id: string) => {
    setIsProcessing(true);
    try {
      const { data: t, error } = await supabase
        .from('trips')
        .select(`*, customer:customers(*), driver:drivers(*)`)
        .eq('id', id)
        .single();

      if (error) throw error;

      const { data: logsData } = await supabase
        .from('trip_logs')
        .select(`*, performer:users(name, staff_code)`)
        .eq('trip_id', id)
        .order('created_at', { ascending: false });

      if (t) {
        setDetailedTrip({
          ...t,
          displayId: t.trip_code,
          customerId: t.customer_id,
          driverId: t.driver_id,
          pickupLocation: t.pickup_location,
          dropLocation: t.drop_location,
          tripType: t.trip_type,
          tripRoute: t.trip_route,
          startDateTime: t.start_time,
          endDateTime: t.end_time,
          status: t.trip_status,
          totalAmount: t.total_amount,
          paymentMode: t.payment_mode,
          customer: t.customer ? {
            id: t.customer.id,
            displayId: t.customer.customer_code,
            name: t.customer.customer_name,
            mobile: t.customer.mobile_number,
            homeAddress: t.customer.home_address || '',
            officeAddress: t.customer.office_address || '',
            vehicleModel: t.customer.vehicle_model || 'Standard'
          } : undefined,
          driver: t.driver ? {
            id: t.driver.id,
            displayId: t.driver.driver_code,
            name: t.driver.name,
            licenseNumber: t.driver.license_number,
            issueDate: t.driver.issue_date,
            expiryDate: t.driver.expiry_date,
            address: t.driver.address || '',
            permanentAddress: t.driver.permanent_address || '',
            status: t.driver.status,
            location: [t.driver.location_lat || 17.3850, t.driver.location_lng || 78.4867]
          } : undefined,
          logs: (logsData || []).map((l: any) => ({
            ...l,
            performer_name: l.performer?.name,
            performer_id: l.performer?.staff_code
          }))
        } as any);
      }
    } catch (err) {
      console.error("Manifest Access Failure:", err);
      setViewingTripId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateStatus = async (tripId: string, newStatus: TripStatus) => {
    if (!canModifyTrip()) return;
    
    const reason = window.prompt(`Identify reason for Mission Status override to ${newStatus}:`, `Operational necessity`);
    if (reason === null) return; // User cancelled
    
    if (!window.confirm(`Finalize mission override to ${newStatus}? Audit ledger will be updated.`)) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('trips').update({ trip_status: newStatus }).eq('id', tripId);
      if (error) throw error;

      await supabase.from('trip_logs').insert([{
        trip_id: tripId,
        action: 'STATUS_OVERRIDE',
        performed_by: user.id,
        reason: reason || `Manual override to ${newStatus}`
      }]);

      // DRIVER STATUS SYNC: Release pilot if mission is closed
      if (['COMPLETED', 'CANCELLED'].includes(newStatus)) {
        const tripToUpdate = trips.find(t => t.id === tripId);
        if (tripToUpdate?.driverId) {
          await supabase.from('drivers').update({ status: 'Available' } as any).eq('id', tripToUpdate.driverId);
        }
      } else if (newStatus === 'STARTED') {
        const tripToUpdate = trips.find(t => t.id === tripId);
        if (tripToUpdate?.driverId) {
          await supabase.from('drivers').update({ status: 'Busy' } as any).eq('id', tripToUpdate.driverId);
        }
      }

      // Optimistic update for UI reflection
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, status: newStatus } : t));

      alert(`Mission registry updated to ${newStatus}. Registry Synchronized.`);
    } catch (err: any) {
      alert(`Status Sync Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * HH:MM Duration Formatter
   */
  const getDurationString = (start: string, end?: string) => {
    if (!start || !end) return "N/A";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff < 0) return "00:00";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const formatTimestamp = (ts: string | null | undefined) => {
    if (!ts) return "---";
    const date = new Date(ts);
    return date.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };

  const handleExportCSV = () => {
    const headers = ["Trip ID", "Client", "Pilot", "Start Time", "End Time", "Status", "Duration (HH:MM)", "Total (INR)"];
    const rows = filteredTrips.map(t => {
      const pilot = drivers.find(d => d.id === t.driverId);
      return [
        t.displayId,
        customers.find(c => c.id === t.customerId)?.name || "Guest",
        pilot?.name || "Unassigned",
        formatTimestamp(t.startDateTime),
        formatTimestamp(t.endDateTime),
        t.status,
        getDurationString(t.startDateTime, t.endDateTime),
        t.totalAmount || 0
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Manifest_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uploadSelfie = async (base64: string, tripId: string, action: string): Promise<string | null> => {
    try {
      const fileName = `trips/${tripId}/${action.toLowerCase()}_${Date.now()}.jpg`;
      const response = await fetch(base64);
      const blob = await response.blob();
      
      const { data, error } = await supabase.storage.from('trip-images').upload(fileName, blob, { 
        contentType: 'image/jpeg', 
        upsert: true 
      });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage.from('trip-images').getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch (err) {
      console.error("Critical Storage Fault:", err);
      return null;
    }
  };

  const handleStartTrip = async () => {
    if (!detailedTrip || !detailedTrip.driverId || !capturedImage || !canModifyTrip(detailedTrip.id, detailedTrip.driverId)) return;
    setIsProcessing(true);
    try {
      const imageUrl = await uploadSelfie(capturedImage, detailedTrip.id, 'START');
      const now = new Date().toISOString();
      const { error: tripError } = await supabase.from('trips').update({ trip_status: 'STARTED', start_time: now }).eq('id', detailedTrip.id);
      if (tripError) throw tripError;
      await supabase.from('drivers').update({ status: 'Busy' } as any).eq('id', detailedTrip.driverId);
      await supabase.from('trip_logs').insert([{ trip_id: detailedTrip.id, action: 'TRIP_STARTED', image_url: imageUrl, performed_by: user.id, reason: 'Terminal Authorization' }]);
      
      // Update UI
      setTrips(prev => prev.map(t => t.id === detailedTrip.id ? { ...t, status: 'STARTED', startDateTime: now } : t));

      setActiveSelfieType(null);
      setCapturedImage(null);
      fetchDetailedTrip(detailedTrip.id);
    } catch (err: any) { alert(`Start Protocol Failed: ${err.message}`); } finally { setIsProcessing(false); }
  };

  const handleInitializeEnd = () => {
    if (!detailedTrip || detailedTrip.status !== 'STARTED') return;
    const now = new Date().toISOString();
    const billing = calculateFareInternal(
      new Date(detailedTrip.startDateTime || now),
      new Date(now),
      "No",
      detailedTrip.tripRoute,
      detailedTrip.tripType === 'one-way' ? "One Way" : "Round Trip"
    );
    setShowFareConfirmation({ total: billing.totalPrice, base: billing.basePrice, gst: billing.gst });
  };

  const handleConfirmEndTrip = async () => {
    if (!detailedTrip || !showFareConfirmation || !capturedImage || !canModifyTrip(detailedTrip.id, detailedTrip.driverId)) return;
    setIsProcessing(true);
    try {
      const imageUrl = await uploadSelfie(capturedImage, detailedTrip.id, 'END');
      const now = new Date().toISOString();
      
      const { error: tripError } = await supabase.from('trips').update({
        trip_status: 'COMPLETED',
        end_time: now,
        total_amount: showFareConfirmation.total, 
        payment_mode: paymentMode,               
        payment_status: 'pending'
      }).eq('id', detailedTrip.id);
      
      if (tripError) throw tripError;

      if (detailedTrip.driverId) {
        await supabase.from('drivers').update({ status: 'Available' } as any).eq('id', detailedTrip.driverId);
      }

      await supabase.from('trip_logs').insert([{
        trip_id: detailedTrip.id,
        action: 'TRIP_FINALIZED',
        image_url: imageUrl,
        performed_by: user.id,
        reason: `Final Amount: INR ${showFareConfirmation.total}`
      }]);

      const finalManifest = { 
        ...detailedTrip, 
        status: 'COMPLETED' as TripStatus, 
        totalAmount: showFareConfirmation.total, 
        endDateTime: now 
      };

      // UI Update
      setTrips(prev => prev.map(t => t.id === detailedTrip.id ? { ...t, status: 'COMPLETED', endDateTime: now, totalAmount: showFareConfirmation.total } : t));

      generatePDFInvoice(finalManifest, detailedTrip.customer, companySettings, detailedTrip.driver);

      setShowFareConfirmation(null);
      setActiveSelfieType(null);
      setCapturedImage(null);
      fetchDetailedTrip(detailedTrip.id);
      alert("Mission Finished. Biometric invoice generated.");
    } catch (err: any) { 
      alert(`Finalization Failure: ${err.message}`); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const startCamera = async () => {
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { alert("Identity sensor access blocked."); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 300);
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 260, 400, 40);
        ctx.fillStyle = "white";
        ctx.font = "10px monospace";
        ctx.fillText(`BIOMETRIC ID: ${detailedTrip?.displayId || 'UNKNOWN'}`, 10, 275);
        ctx.fillText(`TIMESTAMP: ${new Date().toLocaleString()}`, 10, 288);
        setCapturedImage(canvasRef.current.toDataURL('image/jpeg'));
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    }
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!detailedTrip || !canModifyTrip()) return;
    setIsProcessing(true);
    try {
      if (detailedTrip.driverId) await supabase.from('drivers').update({ status: 'Available' } as any).eq('id', detailedTrip.driverId);
      await supabase.from('drivers').update({ status: 'Busy' } as any).eq('id', driverId);
      await supabase.from('trips').update({ driver_id: driverId, trip_status: 'ASSIGNED' } as any).eq('id', detailedTrip.id);
      await supabase.from('trip_logs').insert([{ trip_id: detailedTrip.id, action: 'DRIVER_ASSIGNED', performed_by: user.id }]);
      
      // UI Update
      setTrips(prev => prev.map(t => t.id === detailedTrip.id ? { ...t, status: 'ASSIGNED', driverId: driverId } : t));

      setShowAssignModal(false);
      fetchDetailedTrip(detailedTrip.id);
    } catch (err: any) { alert(`Allocation Failure: ${err.message}`); } finally { setIsProcessing(false); }
  };

  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      if (trip.status === 'DELETED') return false;
      const customer = customers.find(c => c.id === trip.customerId);
      const term = searchTerm.toLowerCase();
      const matchesSearch = (trip.displayId?.toLowerCase() || '').includes(term) || (customer?.name?.toLowerCase() || '').includes(term);
      const matchesStatus = filterStatus === 'all' || trip.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [trips, searchTerm, filterStatus, customers]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Manifest Control</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Registry Manifest (Real-time Sync)</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportCSV} className="bg-gray-900 border border-gray-800 text-gray-400 px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl transition-all hover:text-white">
            {ICONS.Reports} Export CSV
          </button>
          <button onClick={() => setShowBookingModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl transition-all">
            {ICONS.Plus} New Manifest
          </button>
        </div>
      </div>

      <div className="bg-gray-950 p-6 rounded-[2.5rem] border border-gray-900 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-2xl">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">{ICONS.Trips}</span>
          <input placeholder="Search Registry..." className="w-full bg-black border border-gray-900 rounded-xl pl-12 pr-4 py-3 text-[10px] font-bold text-white outline-none focus:border-purple-500 shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="bg-black border border-gray-900 rounded-xl px-4 py-3 text-[10px] font-bold text-white outline-none shadow-inner" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">ALL ACTIVE MISSIONS</option>
          <option value="NEW">NEW</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="STARTED">STARTED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      <div className="bg-gray-950 rounded-[3rem] border border-gray-900 overflow-hidden shadow-2xl">
        <table className="w-full text-left text-[11px] font-bold uppercase">
          <thead className="bg-black text-gray-600 border-b border-gray-900 text-[9px] font-black tracking-widest">
            <tr>
              <th className="p-6">ID</th>
              <th className="p-6">Client</th>
              <th className="p-6">Pilot</th>
              <th className="p-6">Start Time</th>
              <th className="p-6">End Time</th>
              <th className="p-6">Status</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {filteredTrips.map(trip => {
              const assignedDriver = drivers.find(d => d.id === trip.driverId);
              return (
                <tr key={trip.id} className="hover:bg-gray-900/40 transition-all group">
                  <td className="p-6 text-purple-500 font-mono">{trip.displayId}</td>
                  <td className="p-6 text-white">{customers.find(c => c.id === trip.customerId)?.name || 'GUEST'}</td>
                  <td className="p-6 text-gray-400">
                    {assignedDriver ? (
                      <span className="text-purple-400 font-bold">{assignedDriver.name}</span>
                    ) : (
                      <span className="text-gray-700 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="p-6 text-gray-500 font-mono text-[10px]">{formatTimestamp(trip.startDateTime)}</td>
                  <td className="p-6 text-gray-500 font-mono text-[10px]">{formatTimestamp(trip.endDateTime)}</td>
                  <td className="p-6">
                    {canModifyTrip(trip.id, trip.driverId) ? (
                      <select 
                        value={trip.status} 
                        onChange={(e) => handleUpdateStatus(trip.id, e.target.value as TripStatus)}
                        className={`bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-[8px] font-black outline-none transition-all cursor-pointer hover:border-purple-500/50 ${trip.status === 'COMPLETED' ? 'text-emerald-400' : trip.status === 'STARTED' ? 'text-blue-400' : trip.status === 'CANCELLED' ? 'text-red-400' : 'text-purple-400'}`}
                      >
                        <option value="NEW">NEW</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="STARTED">STARTED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded-lg text-[8px] font-black ${trip.status === 'COMPLETED' ? 'bg-emerald-900/30 text-emerald-400' : trip.status === 'STARTED' ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>{trip.status}</span>
                    )}
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => setViewingTripId(trip.id)} className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-all shadow-md">{ICONS.View}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewingTripId && detailedTrip && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-xl flex items-center justify-center z-[150] p-4 animate-in fade-in duration-300">
          <div className="bg-gray-950 border border-gray-800 rounded-[3.5rem] w-full max-w-6xl p-10 shadow-2xl relative overflow-y-auto max-h-[95vh] custom-scrollbar">
            <div className="flex justify-between items-start mb-8">
              <div><h3 className="text-4xl font-black text-white uppercase tracking-tighter">Mission Intelligence</h3><p className="text-[10px] text-purple-500 font-black uppercase tracking-[0.4em] mt-3">ID: {detailedTrip.displayId}</p></div>
              <button onClick={() => setViewingTripId(null)} className="p-4 bg-gray-900 rounded-3xl text-gray-500 hover:text-white transition-all">✕</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-4 space-y-6">
                  <section className="bg-black/40 border border-gray-900 rounded-[2rem] p-6 shadow-inner"><h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-4 flex items-center gap-2">{ICONS.Profile} Client</h4><p className="text-lg font-black text-white">{detailedTrip.customer?.name}</p><p className="text-sm font-mono text-purple-400">{detailedTrip.customer?.mobile}</p></section>
                  <section className="bg-black/40 border border-gray-900 rounded-[2rem] p-6 shadow-inner"><h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-4 flex items-center gap-2">{ICONS.Drivers} Pilot</h4><p className="text-lg font-black text-white">{detailedTrip.driver?.name || 'Unassigned'}</p><p className="text-sm font-mono text-purple-400">{detailedTrip.driver?.displayId}</p></section>
                  <section className="bg-black/40 border border-gray-900 rounded-[2rem] p-6 shadow-inner">
                    <h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-4">Logistics Timeline</h4>
                    <div className="space-y-3">
                       <div className="flex justify-between items-center"><span className="text-[8px] text-gray-700 font-black uppercase">Mission Start</span><span className="text-[10px] font-mono text-emerald-500">{formatTimestamp(detailedTrip.startDateTime)}</span></div>
                       <div className="flex justify-between items-center"><span className="text-[8px] text-gray-700 font-black uppercase">Mission End</span><span className="text-[10px] font-mono text-red-400">{formatTimestamp(detailedTrip.endDateTime)}</span></div>
                       <div className="flex justify-between items-center pt-2 border-t border-gray-800/50"><span className="text-[8px] text-gray-700 font-black uppercase">Net Duration</span><span className="text-[10px] font-mono text-white">{getDurationString(detailedTrip.startDateTime, detailedTrip.endDateTime)}</span></div>
                    </div>
                  </section>
                  <section className="bg-black/40 border border-gray-900 rounded-[2rem] p-6 shadow-inner"><h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-4">Hub Logistics</h4><div className="space-y-2"><p className="text-[8px] text-gray-700 font-black uppercase">Pickup</p><p className="text-xs text-gray-300 leading-tight">{detailedTrip.pickupLocation}</p><p className="text-[8px] text-gray-700 font-black uppercase mt-3">Destination</p><p className="text-xs text-gray-300 leading-tight">{detailedTrip.dropLocation}</p></div></section>
               </div>
               <div className="lg:col-span-4 space-y-6">
                  <section className="bg-black/40 border border-gray-900 rounded-[2rem] p-6 shadow-inner">
                    <h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-6">Security Terminal</h4>
                    <div className="space-y-4">
                      {detailedTrip.status === 'ASSIGNED' && canModifyTrip(detailedTrip.id, detailedTrip.driverId) && (
                        <button onClick={() => { setActiveSelfieType('start'); startCamera(); }} className="w-full py-5 bg-emerald-600 text-white font-black uppercase text-[10px] rounded-2xl shadow-xl tracking-widest hover:scale-95 transition-transform">Validate Identity & Start</button>
                      )}
                      {detailedTrip.status === 'STARTED' && canModifyTrip(detailedTrip.id, detailedTrip.driverId) && (
                        <div className="space-y-4">
                           <div className="space-y-2"><label className="text-[8px] text-gray-500 font-black uppercase tracking-widest px-2">Payment Collection Mode</label><select className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs text-white outline-none font-bold" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}><option value="Cash">Cash Protocol</option><option value="Online">Online / Digital</option><option value="UPI">Direct UPI Transfer</option><option value="Card">Terminal Card</option></select></div>
                           <button onClick={handleInitializeEnd} className="w-full py-5 bg-red-600 text-white font-black uppercase text-[10px] rounded-2xl shadow-xl tracking-widest hover:scale-95 transition-transform">Calculate Fare & End Mission</button>
                        </div>
                      )}
                      {!detailedTrip.driverId && [UserRole.ADMIN, UserRole.OPS_MANAGER, UserRole.OPERATION_EXECUTIVE].includes(user.role) && (
                        <button onClick={() => setShowAssignModal(true)} className="w-full py-5 bg-purple-600 text-white font-black uppercase text-[10px] rounded-2xl shadow-xl tracking-widest">Allocate Pilot</button>
                      )}
                      {detailedTrip.status === 'COMPLETED' && (
                        <div className="p-8 bg-emerald-950/10 border-2 border-emerald-500/20 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden">
                           <p className="text-[10px] text-emerald-500 uppercase font-black mb-2 tracking-widest leading-none">Mission Settled Account</p>
                           <h4 className="text-5xl font-black text-white leading-none">₹ {detailedTrip.totalAmount}</h4>
                           <div className="mt-8 pt-8 border-t border-emerald-500/10 space-y-3 text-left">
                              <div className="flex justify-between text-[10px] uppercase font-black"><span className="text-gray-500">Method</span><span className="text-white">{detailedTrip.paymentMode}</span></div>
                              <div className="flex justify-between text-[10px] uppercase font-black"><span className="text-gray-500">Duration</span><span className="text-white">{getDurationString(detailedTrip.startDateTime, detailedTrip.endDateTime)}</span></div>
                              <button onClick={() => generatePDFInvoice(detailedTrip, detailedTrip.customer, companySettings, detailedTrip.driver)} className="w-full mt-4 py-3 bg-gray-900 text-purple-400 font-black uppercase text-[9px] rounded-xl border border-purple-500/20 hover:bg-purple-600 hover:text-white transition-all">Download Biometric Receipt</button>
                           </div>
                        </div>
                      )}
                    </div>
                  </section>
               </div>
               <div className="lg:col-span-4 bg-gray-900/30 border border-gray-800 rounded-[2rem] p-8 flex flex-col h-full shadow-inner">
                  <h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-6 flex items-center gap-2">{ICONS.History} Biometric Audit Logs</h4>
                  <div className="flex-1 space-y-6 overflow-y-auto pr-4 custom-scrollbar max-h-[500px]">
                    {detailedTrip.logs.length === 0 ? (
                      <p className="text-[10px] text-gray-700 italic font-black uppercase tracking-widest text-center mt-20">No audit records found.</p>
                    ) : detailedTrip.logs.map(log => (
                      <div key={log.id} className="relative pl-6 border-l border-gray-800 pb-6">
                        <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-purple-600 shadow-[0_0_10px_#9333ea]"></div>
                        <p className="text-[10px] font-black text-white uppercase leading-none">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-[8px] text-gray-500 uppercase mt-1.5 font-bold">BY: {log.performer_name || 'System'}</p>
                        <p className="text-[8px] text-gray-600 font-mono mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                        {log.reason && <p className="text-[9px] text-gray-400 mt-2 italic border-l-2 border-purple-500/30 pl-3">{log.reason}</p>}
                        {log.image_url && [UserRole.ADMIN, UserRole.OPS_MANAGER, UserRole.OPERATION_EXECUTIVE].includes(user.role) && (
                          <div className="mt-3 group relative cursor-pointer" onClick={() => window.open(log.image_url, '_blank')}>
                            <img src={log.image_url} className="w-full h-32 object-cover rounded-xl border border-gray-800 hover:border-purple-500 transition-all shadow-md" alt="Audit Evidence" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl"><span className="text-[8px] font-black uppercase text-white tracking-widest">Verify Evidence Photo</span></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {showFareConfirmation && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-2xl z-[300] flex flex-col p-8 items-center justify-center animate-in zoom-in duration-200">
           <div className="max-w-md w-full bg-gray-950 border-2 border-emerald-500/20 rounded-[3rem] p-10 shadow-2xl relative text-center">
              <h3 className="text-2xl font-black text-emerald-500 uppercase tracking-tighter mb-8">Manifest Settlement</h3>
              <div className="space-y-6 mb-10">
                 <div><p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Final Manifest Amount</p><p className="text-6xl font-black text-white">₹{showFareConfirmation.total}</p></div>
                 <div className="bg-black/50 rounded-2xl p-6 space-y-3 border border-gray-900 shadow-inner text-left">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest"><span className="text-gray-500">Base Fare</span><span className="text-white">₹{showFareConfirmation.base}</span></div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest pt-2 border-t border-gray-800/50"><span className="text-gray-500">GST (18%)</span><span className="text-emerald-500">₹{showFareConfirmation.gst}</span></div>
                 </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowFareConfirmation(null)} className="flex-1 bg-gray-900 py-5 rounded-2xl font-black uppercase text-[10px] text-gray-400 hover:bg-gray-800 transition-all">Abort</button>
                <button onClick={() => { setActiveSelfieType('end'); startCamera(); }} className="flex-[2] bg-emerald-600 py-5 rounded-2xl font-black uppercase text-[10px] text-white shadow-xl hover:bg-emerald-700 transition-all">Confirm Biometrics & Sync</button>
              </div>
           </div>
        </div>
      )}

      {activeSelfieType && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-2xl z-[400] flex flex-col p-8 items-center justify-center animate-in zoom-in duration-200">
           <div className="max-w-md w-full bg-gray-950 border border-gray-800 rounded-[3rem] p-8 shadow-2xl relative">
              <h3 className="text-2xl font-black text-purple-500 uppercase tracking-tighter mb-6">Identity Validation</h3>
              <div className="aspect-[4/3] bg-black rounded-3xl overflow-hidden border-2 border-purple-500/30 relative shadow-inner mb-8">
                {!capturedImage ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /> : <img src={capturedImage} className="w-full h-full object-cover" alt="Identity Verification" />}
              </div>
              <canvas ref={canvasRef} width="400" height="300" className="hidden" />
              <div className="space-y-4">
                {!capturedImage ? <button onClick={capturePhoto} className="w-full bg-purple-600 py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] text-white shadow-2xl active:scale-95 transition-transform">Capture Identity Scan</button> : (
                  <div className="flex gap-4">
                    <button onClick={() => { setCapturedImage(null); startCamera(); }} className="flex-1 bg-gray-900 py-5 rounded-2xl font-black uppercase text-[10px] text-gray-400">Re-Scan</button>
                    <button disabled={isProcessing} onClick={activeSelfieType === 'start' ? handleStartTrip : handleConfirmEndTrip} className="flex-[2] bg-emerald-600 py-5 rounded-2xl font-black uppercase text-[10px] text-white shadow-xl hover:bg-emerald-700 transition-all">{isProcessing ? 'SYNCHRONIZING...' : 'Confirm & Persist'}</button>
                  </div>
                )}
              </div>
           </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-6 backdrop-blur-md">
          <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-xl p-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
             <div className="flex justify-between items-center mb-10"><h3 className="text-2xl font-black text-white uppercase tracking-tighter">Pilot Allocation</h3><button onClick={() => setShowAssignModal(false)} className="text-gray-500 font-bold font-mono">✕</button></div>
             <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {drivers.filter(d => d.status === 'Available').map(driver => (
                  <div key={driver.id} className="bg-gray-900 p-6 rounded-[2rem] border border-gray-800 flex items-center justify-between group hover:border-purple-500 transition-all shadow-lg">
                    <div><p className="font-black text-white leading-tight">{driver.name}</p><p className="text-[9px] text-purple-500 font-mono font-bold">{driver.displayId}</p></div>
                    <button onClick={() => handleAssignDriver(driver.id)} className="px-5 py-2.5 bg-purple-600 text-white text-[9px] font-black uppercase rounded-xl shadow-lg">Allocate</button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {showBookingModal && (
        <TripBookingModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} customers={customers} setCustomers={setCustomers} setTrips={setTrips} currentUserId={user.id} />
      )}
    </div>
  );
};

export default TripManagement;
