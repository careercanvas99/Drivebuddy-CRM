
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Trip, Driver, Customer, User, UserRole, CompanySettings, TripLog } from '../types.ts';
import { ICONS } from '../constants.tsx';
import TripBookingModal from './TripBookingModal.tsx';
import { supabase } from '../lib/supabase.js';
import { calculateFareInternal } from './TripEstimation.tsx';

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
  
  // Selfie Modal State
  const [activeSelfieType, setActiveSelfieType] = useState<'start' | 'end' | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Modals for Actions
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState<{ type: 'REASSIGN' | 'DELETE', targetId?: string } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [pendingDriverId, setPendingDriverId] = useState<string | null>(null);

  const isAdminOrManager = [UserRole.ADMIN, UserRole.OPS_MANAGER].includes(user.role);
  const canControlMission = [UserRole.ADMIN, UserRole.OPS_MANAGER, UserRole.OPERATION_EXECUTIVE].includes(user.role);

  useEffect(() => {
    if (viewingTripId) {
      fetchDetailedTrip(viewingTripId);
    } else {
      setDetailedTrip(null);
    }
  }, [viewingTripId]);

  const fetchDetailedTrip = async (id: string) => {
    setIsProcessing(true);
    try {
      const { data: t, error } = await supabase
        .from('trips')
        .select(`
          *,
          customer:customers(*),
          driver:drivers(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch Audit Logs
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
          billAmount: t.bill_amount,
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
    } catch (err: any) {
      console.error(err);
      setViewingTripId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatMissionDate = (dateStr?: string) => {
    if (!dateStr) return 'Pending...';
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).replace(',', ' |');
  };

  const logAction = async (tripId: string, action: string, reason?: string) => {
    await supabase.from('trip_logs').insert([{
      trip_id: tripId,
      action,
      performed_by: user.id,
      reason
    }]);
  };

  // Selfie Protocol
  const startCamera = async () => {
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Security Error: Access to mission imaging denied.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 300);
        setCapturedImage(canvasRef.current.toDataURL('image/png'));
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleStartTrip = async () => {
    if (!detailedTrip || !detailedTrip.driverId || !capturedImage) return;
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      await supabase.from('trips').update({
        trip_status: 'STARTED',
        start_time: now
      }).eq('id', detailedTrip.id);

      await supabase.from('drivers').update({ status: 'Busy' }).eq('id', detailedTrip.driverId);

      await logAction(detailedTrip.id, 'TRIP_STARTED', 'Manual Staff Overide with Selfie Auth');
      
      setActiveSelfieType(null);
      setCapturedImage(null);
      alert('Mission INITIALIZED successfully.');
      fetchDetailedTrip(detailedTrip.id);
    } catch (err: any) {
      alert(`Sync Failure: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndTrip = async () => {
    if (!detailedTrip || !capturedImage) return;
    setIsProcessing(true);

    try {
      const now = new Date().toISOString();
      
      // Calculate Fare from Engine
      const billing = calculateFareInternal(
        new Date(detailedTrip.startDateTime),
        new Date(now),
        "No",
        detailedTrip.tripRoute,
        detailedTrip.tripType === 'one-way' ? "One Way" : "Round Trip"
      );

      await supabase.from('trips').update({
        trip_status: 'COMPLETED',
        end_time: now,
        bill_amount: billing.totalPrice,
        payment_status: 'pending'
      }).eq('id', detailedTrip.id);

      if (detailedTrip.driverId) {
        await supabase.from('drivers').update({ status: 'Available' }).eq('id', detailedTrip.driverId);
      }

      await logAction(detailedTrip.id, 'TRIP_COMPLETED', 'Manual Staff Overide with Selfie Auth');

      setActiveSelfieType(null);
      setCapturedImage(null);
      alert(`Mission TERMINATED. Final Payable: ₹${billing.totalPrice}`);
      fetchDetailedTrip(detailedTrip.id);
    } catch (err: any) {
      alert(`Sync Failure: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!detailedTrip) return;
    setIsProcessing(true);

    try {
      const { data: conflict } = await supabase
        .from('trips')
        .select('trip_code')
        .eq('driver_id', driverId)
        .in('trip_status', ['ASSIGNED', 'STARTED'])
        .maybeSingle();

      if (conflict) {
        alert(`SECURITY BREACH: Pilot already assigned to Manifest ${conflict.trip_code}.`);
        return;
      }

      const isReassignment = !!detailedTrip.driverId;
      if (isReassignment && detailedTrip.driverId) {
        await supabase.from('drivers').update({ status: 'Available' }).eq('id', detailedTrip.driverId);
      }

      await supabase.from('drivers').update({ status: 'Busy' }).eq('id', driverId);
      await supabase.from('trips').update({ driver_id: driverId, trip_status: 'ASSIGNED' }).eq('id', detailedTrip.id);

      await logAction(detailedTrip.id, isReassignment ? 'DRIVER_CHANGED' : 'DRIVER_ASSIGNED', isReassignment ? actionReason : undefined);
      
      alert('Mission Parameters Synchronized.');
      setShowAssignModal(false);
      setShowReasonModal(null);
      setActionReason('');
      fetchDetailedTrip(detailedTrip.id);
    } catch (err: any) {
      alert(`Sync Failure: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!detailedTrip || !actionReason) return;
    setIsProcessing(true);
    try {
      await supabase.from('trips').update({
        trip_status: 'DELETED',
        deleted_at: new Date().toISOString(),
        delete_reason: actionReason
      }).eq('id', detailedTrip.id);

      if (detailedTrip.driverId) {
        await supabase.from('drivers').update({ status: 'Available' }).eq('id', detailedTrip.driverId);
      }

      await logAction(detailedTrip.id, 'TRIP_DELETED', actionReason);
      alert('Manifest Archived successfully.');
      setShowReasonModal(null);
      setActionReason('');
      setViewingTripId(null);
    } catch (err: any) {
      alert(`Archive Failure: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
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
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Manifest Control</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Enterprise Mission Registry</p>
        </div>
        <button onClick={() => setShowBookingModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl transition-all">
          {ICONS.Plus} Register New Manifest
        </button>
      </div>

      <div className="bg-gray-950 p-6 rounded-[2.5rem] border border-gray-900 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">{ICONS.Trips}</span>
          <input 
            placeholder="Search Manifest ID or Client..." 
            className="w-full bg-black border border-gray-900 rounded-xl pl-12 pr-4 py-3 text-[10px] font-bold text-white outline-none focus:border-purple-500"
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="bg-black border border-gray-900 rounded-xl px-4 py-3 text-[10px] font-bold text-white outline-none"
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">ALL ACTIVE MISSIONS</option>
          <option value="NEW">NEW / UNASSIGNED</option>
          <option value="ASSIGNED">PILOT ASSIGNED</option>
          <option value="STARTED">IN PROGRESS</option>
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
              <th className="p-6">Pilot Allocation</th>
              <th className="p-6">Status</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {filteredTrips.map(trip => (
              <tr key={trip.id} className="hover:bg-gray-900/40 transition-all group">
                <td className="p-6 text-purple-500 font-mono">{trip.displayId}</td>
                <td className="p-6 text-white">{customers.find(c => c.id === trip.customerId)?.name || 'GUEST'}</td>
                <td className="p-6">
                  {trip.driverId ? (
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                       <span className="text-gray-300">{drivers.find(d => d.id === trip.driverId)?.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-700 italic">Unassigned</span>
                  )}
                </td>
                <td className="p-6">
                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black ${
                    trip.status === 'COMPLETED' ? 'bg-emerald-900/30 text-emerald-400' : 
                    trip.status === 'STARTED' ? 'bg-blue-900/30 text-blue-400 animate-pulse' : 
                    trip.status === 'ASSIGNED' ? 'bg-purple-900/30 text-purple-400' :
                    'bg-gray-800 text-gray-500'
                  }`}>{trip.status}</span>
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setViewingTripId(trip.id)} className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-all">{ICONS.View}</button>
                    {isAdminOrManager && (
                      <button onClick={() => { setDetailedTrip(trip as any); setShowReasonModal({ type: 'DELETE', targetId: trip.id }); }} className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all">{ICONS.Delete}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TRIP INFORMATION PAGE (MODAL) */}
      {viewingTripId && detailedTrip && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-xl flex items-center justify-center z-[150] p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-[3.5rem] w-full max-w-5xl p-10 shadow-2xl relative overflow-y-auto max-h-[95vh] custom-scrollbar">
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[160] flex items-center justify-center rounded-[3.5rem]">
                <div className="text-purple-500 font-black animate-pulse">RE-FETCHING SQL DATA...</div>
              </div>
            )}
            
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Mission Intelligence</h3>
                <p className="text-[10px] text-purple-500 font-black uppercase tracking-[0.4em] mt-3">Registry ID: {detailedTrip.displayId}</p>
              </div>
              <button onClick={() => setViewingTripId(null)} className="p-4 bg-gray-900 rounded-3xl text-gray-500 hover:text-white transition-all">✕</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               {/* Left Column: Personnel & Logistics */}
               <div className="lg:col-span-4 space-y-6">
                  <section className="bg-black/40 border border-gray-900 rounded-[2rem] p-6 shadow-inner">
                    <h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-4 flex items-center gap-2">{ICONS.Profile} Customer Information</h4>
                    <div className="space-y-1">
                      <p className="text-lg font-black text-white leading-tight">{detailedTrip.customer?.name}</p>
                      <p className="text-sm font-mono text-purple-400">{detailedTrip.customer?.mobile}</p>
                    </div>
                  </section>

                  <section className="bg-black/40 border border-gray-900 rounded-[2rem] p-6 shadow-inner">
                    <h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-4 flex items-center gap-2">{ICONS.Trips} Location Details</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[8px] text-gray-700 uppercase font-black mb-1">Pickup Logistics</p>
                        <p className="text-xs font-bold text-gray-300 leading-relaxed">{detailedTrip.pickupLocation}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-gray-700 uppercase font-black mb-1">Drop Logistics</p>
                        <p className="text-xs font-bold text-gray-300 leading-relaxed">{detailedTrip.dropLocation}</p>
                      </div>
                    </div>
                  </section>

                  <section className="bg-black/40 border border-gray-900 rounded-[2rem] p-6 shadow-inner">
                    <h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-4 flex items-center gap-2">{ICONS.History} Trip Timing</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[8px] text-gray-700 uppercase font-black mb-1">Manifest Start</p>
                        <p className="text-xs font-mono font-bold text-white">{formatMissionDate(detailedTrip.startDateTime)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-gray-700 uppercase font-black mb-1">Manifest Completion</p>
                        <p className="text-xs font-mono font-bold text-white">{formatMissionDate(detailedTrip.endDateTime)}</p>
                      </div>
                    </div>
                  </section>
               </div>

               {/* Center Column: Fare Breakdown & Actions */}
               <div className="lg:col-span-4 space-y-6">
                  {detailedTrip.status === 'COMPLETED' ? (
                    <section className="bg-purple-900/10 border-2 border-purple-500/20 rounded-[2rem] p-6 shadow-inner flex flex-col items-center">
                      <h4 className="text-[9px] text-purple-400 uppercase font-black tracking-widest mb-6">Trip Fare Section</h4>
                      <div className="w-full space-y-3 mb-8">
                         {(() => {
                            const fare = calculateFareInternal(
                              new Date(detailedTrip.startDateTime),
                              new Date(detailedTrip.endDateTime),
                              "No",
                              detailedTrip.tripRoute,
                              detailedTrip.tripType === 'one-way' ? "One Way" : "Round Trip"
                            );
                            return (
                              <>
                                <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold">
                                  <span>Base Fare</span>
                                  <span className="text-white">₹{Math.round(fare.basePrice * 0.6)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold">
                                  <span>Distance Fare</span>
                                  <span className="text-white">₹{Math.round(fare.basePrice * 0.3)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold">
                                  <span>Time Fare</span>
                                  <span className="text-white">₹{Math.round(fare.basePrice * 0.1)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-purple-400 uppercase font-bold pt-2 border-t border-purple-500/20">
                                  <span>Taxes (GST 18%)</span>
                                  <span>₹{fare.gst}</span>
                                </div>
                                <div className="pt-4 mt-4 border-t-2 border-dashed border-purple-500/40 text-center w-full">
                                   <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Total Payable Amount</p>
                                   <p className="text-4xl font-black text-white">₹ {fare.totalPrice}.00</p>
                                </div>
                              </>
                            );
                         })()}
                      </div>
                      <button className="w-full py-4 bg-purple-600 rounded-xl font-black uppercase text-[10px] tracking-widest text-white shadow-xl">Generate Invoice</button>
                    </section>
                  ) : (
                    <section className="bg-gray-900/30 border border-gray-800 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center space-y-4">
                       <div className="w-16 h-16 bg-gray-950 rounded-full flex items-center justify-center text-gray-700">₹</div>
                       <p className="text-[10px] text-gray-600 uppercase font-black leading-relaxed">Fare breakdown will be generated upon mission completion using the official estimation engine.</p>
                    </section>
                  )}

                  <section className="bg-black/40 border border-gray-900 rounded-[2rem] p-6 shadow-inner">
                    <h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-6 border-b border-gray-800 pb-2">Trip Actions</h4>
                    <div className="space-y-3">
                      {detailedTrip.status === 'ASSIGNED' && canControlMission && (
                        <button 
                          onClick={() => { setActiveSelfieType('start'); startCamera(); }}
                          className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] rounded-2xl shadow-xl transition-all tracking-widest"
                        >
                          Start Trip
                        </button>
                      )}
                      {detailedTrip.status === 'STARTED' && canControlMission && (
                        <button 
                          onClick={() => { setActiveSelfieType('end'); startCamera(); }}
                          className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] rounded-2xl shadow-xl transition-all tracking-widest"
                        >
                          End Trip
                        </button>
                      )}
                      {detailedTrip.status === 'COMPLETED' && (
                        <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-center">
                          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Mission Concluded</p>
                        </div>
                      )}
                      {!detailedTrip.driverId && (
                        <button onClick={() => setShowAssignModal(true)} className="w-full py-5 bg-purple-600 text-white font-black uppercase text-[10px] rounded-2xl shadow-xl">Allocate Pilot</button>
                      )}
                      <button onClick={() => setShowAssignModal(true)} className="w-full py-3 bg-gray-900 text-blue-500 font-black uppercase text-[9px] rounded-xl border border-gray-800 hover:bg-blue-600 hover:text-white transition-all tracking-widest">Reassign Pilot</button>
                    </div>
                  </section>
               </div>

               {/* Right Column: Audit Logs */}
               <div className="lg:col-span-4 bg-gray-900/30 border border-gray-800 rounded-[2rem] p-8 flex flex-col h-full">
                  <h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-6 flex items-center gap-2">{ICONS.History} Mission Audit Log</h4>
                  <div className="flex-1 space-y-6 overflow-y-auto pr-4 custom-scrollbar max-h-[500px]">
                    {detailedTrip.logs.map(log => (
                      <div key={log.id} className="relative pl-6 border-l border-gray-800 pb-4 last:pb-0">
                        <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-purple-600 shadow-sm"></div>
                        <p className="text-[10px] font-black text-white uppercase tracking-tight">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-[8px] text-gray-500 uppercase mt-1">By: {log.performer_name || 'System'} ({log.performer_id || 'ID-EXT'})</p>
                        <p className="text-[8px] text-gray-500 font-mono">{new Date(log.created_at).toLocaleString()}</p>
                        {log.reason && <p className="text-[9px] text-blue-400 mt-2 bg-blue-950/20 p-2 rounded-lg italic border border-blue-500/10 leading-relaxed">Note: {log.reason}</p>}
                      </div>
                    ))}
                    {detailedTrip.logs.length === 0 && <p className="text-xs text-gray-700 italic text-center py-10 uppercase font-black tracking-widest opacity-20">Registry Clean</p>}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* SELFIE VERIFICATION MODAL */}
      {activeSelfieType && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-2xl z-[300] flex flex-col p-8 items-center justify-center animate-in fade-in duration-300">
           <div className="max-w-md w-full bg-gray-950 border border-gray-800 rounded-[3rem] p-8 shadow-2xl relative">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-purple-500 uppercase tracking-tighter">Pilot Authentication</h3>
                <button onClick={() => setActiveSelfieType(null)} className="text-gray-500 p-2">✕</button>
              </div>
              
              <div className="aspect-[4/3] bg-black rounded-3xl overflow-hidden border-2 border-purple-500/30 relative shadow-inner mb-8">
                {!capturedImage ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={capturedImage} className="w-full h-full object-cover" alt="Verification Scan" />
                )}
              </div>
              
              <canvas ref={canvasRef} width="400" height="300" className="hidden" />

              <div className="space-y-4">
                {!capturedImage ? (
                  <button onClick={capturePhoto} className="w-full bg-purple-600 py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] text-white shadow-2xl shadow-purple-900/40">Initialize Identity Scan</button>
                ) : (
                  <div className="flex gap-4">
                    <button onClick={() => { setCapturedImage(null); startCamera(); }} className="flex-1 bg-gray-900 py-5 rounded-2xl font-black uppercase text-[10px] text-gray-400">Re-Scan</button>
                    <button 
                      disabled={isProcessing} 
                      onClick={activeSelfieType === 'start' ? handleStartTrip : handleEndTrip} 
                      className="flex-[2] bg-emerald-600 py-5 rounded-2xl font-black uppercase text-[10px] text-white shadow-xl shadow-emerald-900/40"
                    >
                      {isProcessing ? 'SYNCHRONIZING...' : 'Verify & Commit'}
                    </button>
                  </div>
                )}
              </div>
           </div>
        </div>
      )}

      {/* PILOT ALLOCATION MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-6 backdrop-blur-md">
          <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-xl p-10 shadow-2xl">
             <div className="flex justify-between items-center mb-10">
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Pilot Allocation Pool</h3>
               <button onClick={() => setShowAssignModal(false)} className="text-gray-500 font-bold">✕</button>
             </div>
             
             <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {drivers.filter(d => d.status === 'Available').map(driver => (
                  <div key={driver.id} className="bg-gray-900 p-6 rounded-[2rem] border border-gray-800 flex items-center justify-between group hover:border-purple-500 transition-all shadow-lg">
                    <div>
                      <p className="font-black text-white leading-tight">{driver.name}</p>
                      <p className="text-[9px] text-purple-500 font-mono font-bold">{driver.displayId}</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (detailedTrip?.driverId) {
                          setPendingDriverId(driver.id);
                          setShowReasonModal({ type: 'REASSIGN' });
                        } else {
                          handleAssignDriver(driver.id);
                        }
                      }}
                      className="px-5 py-2.5 bg-purple-600 text-white text-[9px] font-black uppercase rounded-xl shadow-lg transition-all active:scale-95"
                    >
                      Allocate
                    </button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* REASON MODAL */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-6 backdrop-blur-lg">
          <div className={`bg-gray-950 border rounded-[3rem] w-full max-w-md p-10 shadow-2xl ${showReasonModal.type === 'DELETE' ? 'border-red-500/30' : 'border-blue-500/30'}`}>
             <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4">
               {showReasonModal.type === 'REASSIGN' ? 'Pilot Reassignment Reason' : 'Mission Archive Reason'}
             </h3>
             <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-6">Security Authorization Required</p>
             <textarea 
               required
               placeholder="Mandatory justification..."
               className={`w-full bg-black border rounded-2xl p-4 text-sm text-white outline-none h-32 mb-6 ${showReasonModal.type === 'DELETE' ? 'border-red-500/30 focus:border-red-500' : 'border-blue-500/30 focus:border-blue-500'}`}
               value={actionReason}
               onChange={e => setActionReason(e.target.value)}
             />
             <div className="flex gap-4">
                <button onClick={() => setShowReasonModal(null)} className="flex-1 py-4 bg-gray-900 rounded-2xl font-black uppercase text-[10px] text-gray-500">Abort</button>
                <button 
                  disabled={!actionReason.trim() || isProcessing}
                  onClick={() => {
                    if (showReasonModal.type === 'REASSIGN' && pendingDriverId) {
                      handleAssignDriver(pendingDriverId);
                    } else {
                      handleDeleteTrip();
                    }
                  }}
                  className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] text-white shadow-xl ${showReasonModal.type === 'DELETE' ? 'bg-red-600' : 'bg-blue-600'}`}
                >
                  Confirm Operations
                </button>
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
