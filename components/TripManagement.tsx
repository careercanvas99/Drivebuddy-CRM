
import React, { useState, useMemo, useEffect } from 'react';
import { Trip, Driver, Customer, User, UserRole, CompanySettings } from '../types.ts';
import { ICONS } from '../constants.tsx';
import TripBookingModal from './TripBookingModal.tsx';
import { supabase } from '../lib/supabase.js';
import { generatePDFInvoice } from '../services/InvoiceService.ts';
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
  const [detailedTrip, setDetailedTrip] = useState<(Trip & { customer?: Customer, driver?: Driver }) | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // FETCH LIVE DATA ON VIEW
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
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          customer:customers(*),
          driver:drivers(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const t = data as any;
        // Fix: Map Supabase database properties (customer_name, mobile_number, etc.) to frontend interface properties
        setDetailedTrip({
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
          status: t.trip_status,
          cancelReason: t.cancel_reason,
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
          } : undefined
        } as any);
      }
    } catch (err: any) {
      alert(`Uplink Error: ${err.message}`);
      setViewingTripId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartTrip = async () => {
    if (!detailedTrip || !detailedTrip.driverId) return;
    setIsProcessing(true);
    const now = new Date().toISOString();

    try {
      // DB UPDATE 1: Trip Status
      const { error: tripError } = await supabase
        .from('trips')
        .update({ 
          trip_status: 'STARTED',
          start_time: now 
        })
        .eq('id', detailedTrip.id);
      if (tripError) throw tripError;

      // DB UPDATE 2: Driver Status
      const { error: driverError } = await supabase
        .from('drivers')
        .update({ status: 'Busy' })
        .eq('id', detailedTrip.driverId);
      if (driverError) throw driverError;

      alert("Mission Status: STARTED. Driver Selfie & Location Captured.");
      await fetchDetailedTrip(detailedTrip.id); // Re-fetch to sync state
    } catch (err: any) {
      alert(`Operation Failure: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndTrip = async () => {
    if (!detailedTrip || !detailedTrip.driverId) return;
    setIsProcessing(true);
    const now = new Date().toISOString();

    try {
      // 1. Calculate Billing via Internal Engine
      const start = new Date(detailedTrip.startDateTime);
      const end = new Date(now);
      const fare = calculateFareInternal(
        start, 
        end, 
        "No", 
        detailedTrip.tripRoute === 'Outstation' ? 'Outstation' : 'Instation', 
        detailedTrip.tripType === 'round-trip' ? 'Round Trip' : 'One Way'
      );

      // 2. DB UPDATE: Trip Manifest
      const { error: tripError } = await supabase
        .from('trips')
        .update({ 
          trip_status: 'COMPLETED',
          end_time: now,
          bill_amount: fare.totalPrice,
          base_fare: fare.basePrice,
          taxes: fare.gst
        })
        .eq('id', detailedTrip.id);
      if (tripError) throw tripError;

      // 3. DB UPDATE: Release Driver
      const { error: driverError } = await supabase
        .from('drivers')
        .update({ status: 'Available' })
        .eq('id', detailedTrip.driverId);
      if (driverError) throw driverError;

      alert(`Mission Accomplished. Final Fare: ₹${fare.totalPrice}`);
      await fetchDetailedTrip(detailedTrip.id);
    } catch (err: any) {
      alert(`Termination Failure: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '-- --';
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).replace(',', ' |');
  };

  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
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
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Active Fleet Missions</p>
        </div>
        <button onClick={() => setShowBookingModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl transition-all active:scale-95">
          {ICONS.Plus} Register New Manifest
        </button>
      </div>

      <div className="bg-gray-950 p-6 rounded-[2.5rem] border border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <option value="all">ALL STATUSES</option>
          <option value="NEW">ASSIGNED</option>
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
              <th className="p-6">Status</th>
              <th className="p-6 text-right">Operation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {filteredTrips.map(trip => (
              <tr key={trip.id} className="hover:bg-gray-900/40 transition-all group">
                <td className="p-6 text-purple-500 font-mono">{trip.displayId}</td>
                <td className="p-6 text-white">{customers.find(c => c.id === trip.customerId)?.name || 'GUEST'}</td>
                <td className="p-6">
                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black ${
                    trip.status === 'COMPLETED' ? 'bg-emerald-900/30 text-emerald-400' : 
                    trip.status === 'STARTED' ? 'bg-blue-900/30 text-blue-400 animate-pulse' : 
                    'bg-gray-800 text-gray-500'
                  }`}>{trip.status}</span>
                </td>
                <td className="p-6 text-right">
                  <button 
                    onClick={() => setViewingTripId(trip.id)} 
                    className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white hover:border-purple-500/50 transition-all"
                  >
                    {ICONS.View}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DETAILED TRIP INFORMATION PAGE (MODAL) */}
      {viewingTripId && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-xl flex items-center justify-center z-[150] p-4 animate-in fade-in duration-300">
          <div className="bg-gray-950 border border-gray-800 rounded-[4rem] w-full max-w-2xl p-10 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-purple-600 shadow-[0_0_20px_#9333ea]"></div>
            
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Mission Intelligence</h3>
                <p className="text-[10px] text-purple-500 font-black uppercase tracking-[0.4em] mt-3">Registry Profile: {detailedTrip?.displayId || 'LOADING'}</p>
              </div>
              <button onClick={() => setViewingTripId(null)} className="p-4 bg-gray-900 border border-gray-800 rounded-3xl text-gray-500 hover:text-white transition-all">✕</button>
            </div>

            {isProcessing && !detailedTrip ? (
              <div className="py-20 text-center text-purple-500 animate-pulse font-black uppercase text-xs tracking-widest">Accessing Secure Uplink...</div>
            ) : detailedTrip && (
              <div className="space-y-10">
                {/* 1. CUSTOMER INFO */}
                <section className="bg-black/40 border border-gray-900 rounded-[2.5rem] p-8 space-y-4">
                  <h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-2 px-2">Client Identity</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Full Name</p>
                      {/* Fix: Accessing frontend interface property 'name' instead of database property 'customer_name' */}
                      <p className="text-lg font-black text-white">{detailedTrip.customer?.name || 'System Guest'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Secure Mobile</p>
                      {/* Fix: Accessing frontend interface property 'mobile' instead of database property 'mobile_number' */}
                      <p className="text-lg font-black text-purple-400 font-mono">{detailedTrip.customer?.mobile || '--'}</p>
                    </div>
                  </div>
                </section>

                {/* 2. TRIP LOGISTICS */}
                <section className="bg-black/40 border border-gray-900 rounded-[2.5rem] p-8 space-y-6">
                  <h4 className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-2 px-2">Mission Parameters</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shadow-[0_0_10px_#10b981]"></div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Launch Point (Pickup)</p>
                        <p className="text-sm font-bold text-white">{detailedTrip.pickupLocation}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shadow-[0_0_10px_#3b82f6]"></div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Termination Target (Drop)</p>
                        <p className="text-sm font-bold text-white">{detailedTrip.dropLocation}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-900">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Mission Start</p>
                      <p className="text-xs font-black text-white">{formatDateTime(detailedTrip.startDateTime)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Mission End</p>
                      <p className="text-xs font-black text-white">{formatDateTime(detailedTrip.endDateTime)}</p>
                    </div>
                  </div>
                </section>

                {/* 3. FARE SECTION (Conditional) */}
                {detailedTrip.status === 'COMPLETED' && (
                  <section className="bg-emerald-950/10 border-2 border-emerald-500/20 rounded-[2.5rem] p-10 animate-in zoom-in">
                    <div className="text-center mb-8">
                      <h4 className="text-[10px] text-emerald-500 uppercase font-black tracking-[0.3em] mb-2">Final Fiscal Statement</h4>
                      <p className="text-6xl font-black text-white">₹{detailedTrip.billAmount?.toFixed(2)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest">
                       <div className="flex justify-between border-b border-gray-900 pb-2">
                         <span className="text-gray-500">Base Fare</span>
                         <span className="text-white">₹{(detailedTrip as any).base_fare || '0'}</span>
                       </div>
                       <div className="flex justify-between border-b border-gray-900 pb-2">
                         <span className="text-gray-500">Service GST</span>
                         <span className="text-white">₹{(detailedTrip as any).taxes || '0'}</span>
                       </div>
                    </div>
                  </section>
                )}

                {/* 4. ACTIONS */}
                <div className="flex gap-4 pt-4">
                  {detailedTrip.status === 'NEW' && (
                    <button 
                      disabled={isProcessing}
                      onClick={handleStartTrip}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest text-white shadow-2xl transition-all active:scale-95"
                    >
                      {isProcessing ? 'Uplink In Progress...' : 'Initiate Mission (Start)'}
                    </button>
                  )}
                  {detailedTrip.status === 'STARTED' && (
                    <button 
                      disabled={isProcessing}
                      onClick={handleEndTrip}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest text-white shadow-2xl transition-all active:scale-95"
                    >
                      {isProcessing ? 'Finalizing...' : 'Terminate Mission (End)'}
                    </button>
                  )}
                  <button 
                    onClick={() => setViewingTripId(null)} 
                    className="flex-1 bg-gray-900 hover:bg-gray-800 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest text-gray-500 transition-all"
                  >
                    Exit Terminal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showBookingModal && (
        <TripBookingModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} customers={customers} setCustomers={setCustomers} setTrips={setTrips} />
      )}
    </div>
  );
};

export default TripManagement;
