
import React, { useState, useMemo } from 'react';
import { Trip, Driver, Customer, TripStatus, User, UserRole, PaymentStatus, PaymentMode, CompanySettings } from '../types.ts';
import { ICONS } from '../constants.tsx';
import TripBookingModal from './TripBookingModal.tsx';
import { calculateFareInternal } from './TripEstimation.tsx';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase.js';

interface TripManagementProps {
  trips: Trip[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  drivers: Driver[];
  customers: Customer[];
  user: User;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  companySettings: CompanySettings;
}

const TripManagement: React.FC<TripManagementProps> = ({ trips, setTrips, drivers, customers, user, setCustomers, companySettings }) => {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<Trip | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Filter States
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');

  const isAdmin = user.role === UserRole.ADMIN;
  const canModify = [UserRole.ADMIN, UserRole.OPS_MANAGER, UserRole.OPERATION_EXECUTIVE].includes(user.role);

  const updateTripStatus = async (tripId: string, newStatus: TripStatus, extraFields: Partial<Trip> = {}) => {
    setIsUpdatingStatus(true);
    try {
      const updates: any = { 
        status: newStatus,
        ...extraFields
      };

      // Map to snake_case if updating database
      const dbUpdates: any = { status: newStatus };
      if (extraFields.billAmount) dbUpdates.bill_amount = extraFields.billAmount;
      if (extraFields.startDateTime) dbUpdates.start_date_time = extraFields.startDateTime;
      if (extraFields.endDateTime) dbUpdates.end_date_time = extraFields.endDateTime;
      if (extraFields.driverId) dbUpdates.driver_id = extraFields.driverId;

      const { error } = await supabase
        .from('trips')
        .update(dbUpdates)
        .eq('id', tripId);

      if (error) throw error;

      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, ...updates } : t));
      if (selectedTrip?.id === tripId) {
        setSelectedTrip(prev => prev ? { ...prev, ...updates } : null);
      }
      alert(`Trip status synchronized to: ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      alert(`Sync Error: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStartTrip = (trip: Trip) => {
    if (!trip.driverId) return alert('Assign a driver before starting the trip.');
    updateTripStatus(trip.id, 'started', { startDateTime: new Date().toISOString() });
  };

  const handleEndTrip = (trip: Trip) => {
    const endDateTime = new Date().toISOString();
    const billing = calculateFareInternal(
      new Date(trip.startDateTime),
      new Date(endDateTime),
      "No", "Instation", trip.tripType === 'one-way' ? "One Way" : "Round Trip"
    );
    updateTripStatus(trip.id, 'completed', { 
      endDateTime, 
      billAmount: billing.totalPrice,
      paymentStatus: 'pending'
    });
  };

  const handleAssignDriver = (tripId: string, driverId: string) => {
    if (!canModify || !driverId) return;
    updateTripStatus(tripId, 'assigned', { driverId });
  };

  const generateInvoicePDF = (trip: Trip) => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id === trip.customerId);
    const driver = drivers.find(d => d.id === trip.driverId);
    const finalAmount = trip.billAmount || 0;
    
    const billingDetails = calculateFareInternal(
      new Date(trip.startDateTime),
      new Date(trip.endDateTime),
      "No", "Instation", trip.tripType === 'one-way' ? "One Way" : "Round Trip"
    );

    const derivedBase = Math.round(finalAmount / 1.18);
    const derivedGst = finalAmount - derivedBase;

    let headerY = 15;
    if (companySettings.logo) {
      try {
        doc.addImage(companySettings.logo, 'PNG', 20, headerY, 40, 18);
        headerY += 25;
      } catch (e) { headerY += 5; }
    } else { headerY += 10; }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(companySettings.name, 20, headerY);
    doc.setFont("helvetica", "normal");
    const addressLines = doc.splitTextToSize(companySettings.address, 65);
    doc.text(addressLines, 20, headerY + 5);
    doc.text(`Mobile: ${companySettings.mobile}`, 20, headerY + 5 + (addressLines.length * 4));

    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(147, 51, 234); 
    doc.text("INVOICE", 130, 30);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`ID: ${trip.id}`, 130, 40);
    doc.text(`Dated: ${new Date().toLocaleDateString()}`, 130, 45);

    headerY += 25 + (addressLines.length * 4);

    doc.setDrawColor(230, 230, 230);
    doc.line(20, headerY, 190, headerY);
    
    headerY += 10;
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 20, headerY);
    doc.setFont("helvetica", "normal");
    doc.text(customer?.name || "Guest Client", 20, headerY + 5);
    doc.text(customer?.mobile || "N/A", 20, headerY + 10);
    doc.text(customer?.homeAddress || "N/A", 20, headerY + 15);

    doc.setFont("helvetica", "bold");
    doc.text("TRIP SUMMARY:", 110, headerY);
    doc.setFont("helvetica", "normal");
    doc.text(`Type: ${trip.tripType.toUpperCase()} (${billingDetails.hours}h ${billingDetails.mins}m)`, 110, headerY + 5);
    doc.text(`Driver: ${driver?.name || 'Assigned'}`, 110, headerY + 10);
    doc.text(`Pickup: ${trip.pickupLocation}`, 110, headerY + 15);
    doc.text(`Drop: ${trip.dropLocation}`, 110, headerY + 20);

    headerY += 35;

    doc.setFillColor(245, 245, 245);
    doc.rect(20, headerY, 170, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("SERVICE DESCRIPTION", 25, headerY + 6);
    doc.text("RATE LOGIC", 90, headerY + 6);
    doc.text("AMOUNT (INR)", 160, headerY + 6);

    headerY += 15;
    doc.setFont("helvetica", "normal");
    doc.text("Professional Chauffeur Services", 25, headerY);
    doc.text(`${billingDetails.hours} hrs ${billingDetails.mins} mins`, 90, headerY);
    doc.text(derivedBase.toFixed(2), 160, headerY);

    headerY += 20;
    doc.line(110, headerY, 190, headerY);
    headerY += 10;
    doc.text("Sub-total:", 130, headerY);
    doc.text(derivedBase.toFixed(2), 160, headerY);
    
    headerY += 6;
    doc.text("GST (18%):", 130, headerY);
    doc.text(derivedGst.toFixed(2), 160, headerY);

    headerY += 10;
    doc.setFillColor(147, 51, 234);
    doc.rect(125, headerY - 5, 65, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL:", 130, headerY + 1.5);
    doc.text(`INR ${finalAmount.toFixed(2)}`, 160, headerY + 1.5);

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("This is an electronically generated document. No signature required.", 105, 280, { align: "center" });

    doc.save(`Invoice_${trip.id}.pdf`);
  };

  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const customer = customers.find(c => c.id === trip.customerId);
      const driver = drivers.find(d => d.id === trip.driverId);
      const searchStr = `${trip.id} ${customer?.name || ''} ${driver?.name || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || trip.status === filterStatus;
      const matchesDriver = filterDriver === 'all' || trip.driverId === filterDriver;
      let matchesDate = true;
      const tripDate = new Date(trip.startDateTime).getTime();
      if (filterDateStart) {
        const start = new Date(filterDateStart).getTime();
        if (tripDate < start) matchesDate = false;
      }
      if (filterDateEnd) {
        const end = new Date(filterDateEnd).setHours(23, 59, 59, 999);
        if (tripDate > end) matchesDate = false;
      }
      return matchesSearch && matchesStatus && matchesDriver && matchesDate;
    });
  }, [trips, searchTerm, filterStatus, filterDriver, filterDateStart, filterDateEnd, customers, drivers]);

  const getBillingDetails = (trip: Trip) => {
    if (!trip.startDateTime) return null;
    const calcEnd = trip.endDateTime ? new Date(trip.endDateTime) : new Date();
    const billing = calculateFareInternal(
      new Date(trip.startDateTime),
      calcEnd,
      "No", "Instation", trip.tripType === 'one-way' ? "One Way" : "Round Trip"
    );
    const finalAmount = trip.billAmount || billing.totalPrice;
    const base = Math.round(finalAmount / 1.18);
    return { ...billing, basePrice: base, gst: finalAmount - base, totalPrice: finalAmount };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Fleet Dispatch Hub</h2>
          <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Global Trip Registry & Manifest Control</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          {isAdmin && (
            <button onClick={() => setShowBookingModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-950/40">
              {ICONS.Plus} Register New Journey
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-950 p-6 rounded-[2.5rem] border border-gray-800 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-700 uppercase px-2 tracking-widest">Search Registry</label>
          <input 
            type="text" placeholder="ID / CLIENT NAME..." 
            className="w-full bg-black border border-gray-900 rounded-xl px-4 py-3 text-[10px] font-bold text-white focus:border-purple-500 outline-none"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-700 uppercase px-2 tracking-widest">Fleet Status</label>
          <select 
            className="w-full bg-black border border-gray-900 rounded-xl px-4 py-3 text-[10px] font-bold text-white focus:border-purple-500 outline-none"
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">ALL TRIP STATES</option>
            <option value="unassigned">UNASSIGNED</option>
            <option value="assigned">ASSIGNED</option>
            <option value="started">IN PROGRESS</option>
            <option value="completed">COMPLETED</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-700 uppercase px-2 tracking-widest">Time range start</label>
          <input type="date" className="w-full bg-black border border-gray-900 rounded-xl px-4 py-3 text-[10px] font-bold text-white focus:border-purple-500 outline-none" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button 
            onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterDriver('all'); setFilterDateStart(''); setFilterDateEnd(''); }}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all tracking-widest"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="bg-gray-950 rounded-[3rem] border border-gray-900 overflow-hidden shadow-2xl">
        <table className="w-full text-left text-[11px] font-bold uppercase tracking-tight">
          <thead className="bg-black text-gray-600 border-b border-gray-900">
            <tr>
              <th className="p-6 font-black tracking-widest text-[9px]">ID / Manifest</th>
              <th className="p-6 font-black tracking-widest text-[9px]">Customer Details</th>
              <th className="p-6 font-black tracking-widest text-[9px]">Pilot / Status</th>
              <th className="p-6 font-black tracking-widest text-[9px]">Billing Est.</th>
              <th className="p-6 font-black tracking-widest text-[9px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {filteredTrips.map(trip => {
              const customer = customers.find(c => c.id === trip.customerId);
              const driver = drivers.find(d => d.id === trip.driverId);
              return (
                <tr key={trip.id} className="hover:bg-gray-900/40 transition-all group">
                  <td className="p-6">
                    <div className="text-purple-500 font-mono text-[10px] mb-1">{trip.id}</div>
                    <div className="text-gray-500 text-[8px] tracking-widest">{trip.tripType.replace('-', ' ')}</div>
                  </td>
                  <td className="p-6">
                    <div className="text-white mb-1">{customer?.name || 'GUEST USER'}</div>
                    <div className="text-gray-700 font-mono text-[9px]">{customer?.mobile || 'NO CONTACT'}</div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                       <span className={`w-1.5 h-1.5 rounded-full ${
                         trip.status === 'completed' ? 'bg-emerald-500' : 
                         trip.status === 'started' ? 'bg-blue-500 animate-pulse' : 
                         trip.status === 'unassigned' ? 'bg-red-500' : 'bg-yellow-500'
                       }`}></span>
                       <span className="text-white text-[9px] font-black">{trip.status.toUpperCase()}</span>
                    </div>
                    <div className="text-gray-600 text-[8px]">{driver?.name || 'WAITING FOR DISPATCH'}</div>
                  </td>
                  <td className="p-6">
                    <div className="text-white">₹{trip.billAmount || 'LIVE TALLY'}</div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-3 opacity-30 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedTrip(trip)} className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-500 hover:text-white transition-all">{ICONS.View}</button>
                      {canModify && trip.status !== 'completed' && (
                        <button onClick={() => { setSelectedTrip(trip); setIsEditMode(true); }} className="p-3 bg-purple-900/10 border border-purple-500/20 rounded-xl text-purple-500 hover:bg-purple-600 hover:text-white transition-all">{ICONS.Edit}</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedTrip && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-4xl p-10 animate-in zoom-in duration-300 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600"></div>
             
             <div className="flex justify-between items-start mb-12">
               <div>
                 <h3 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Trip Manifest</h3>
                 <p className="text-[10px] text-purple-500 font-mono font-bold mt-2 tracking-widest">REFERENCE ID: {selectedTrip.id}</p>
               </div>
               <button onClick={() => { setSelectedTrip(null); setIsEditMode(false); }} className="p-4 bg-gray-900 border border-gray-800 rounded-2xl text-gray-500 hover:text-white transition-all">✕</button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 overflow-y-auto max-h-[60vh] pb-10 custom-scrollbar">
                <div className="lg:col-span-2 space-y-10">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="bg-black/40 border border-gray-900 p-6 rounded-3xl">
                        <p className="text-[9px] text-gray-700 uppercase font-black tracking-widest mb-2">Customer Profile</p>
                        <h4 className="text-xl font-black text-white">{customers.find(c => c.id === selectedTrip.customerId)?.name}</h4>
                        <p className="text-xs text-gray-500 font-mono mt-1">{customers.find(c => c.id === selectedTrip.customerId)?.mobile}</p>
                      </div>
                      <div className="bg-black/40 border border-gray-900 p-6 rounded-3xl">
                        <p className="text-[9px] text-gray-700 uppercase font-black tracking-widest mb-2">Pilot Assignment</p>
                        <h4 className="text-xl font-black text-white">{drivers.find(d => d.id === selectedTrip.driverId)?.name || 'NONE ASSIGNED'}</h4>
                        <p className="text-xs text-purple-500 font-black mt-1 tracking-widest uppercase">{selectedTrip.status}</p>
                      </div>
                   </div>

                   <div className="bg-black/40 border border-gray-900 p-8 rounded-[2.5rem] relative">
                      <div className="absolute left-10 top-20 bottom-20 w-px bg-gray-800 border-dashed border-l"></div>
                      <div className="space-y-12">
                         <div className="flex gap-6 relative z-10">
                            <div className="w-5 h-5 bg-purple-600 rounded-full border-4 border-black shadow-[0_0_15px_#9333ea]"></div>
                            <div>
                               <p className="text-[9px] text-gray-700 uppercase font-black tracking-widest">Origin Point</p>
                               <h5 className="text-sm font-bold text-white mt-1">{selectedTrip.pickupLocation}</h5>
                               <p className="text-[10px] text-gray-600 mt-2 font-mono">{new Date(selectedTrip.startDateTime).toLocaleString()}</p>
                            </div>
                         </div>
                         <div className="flex gap-6 relative z-10">
                            <div className="w-5 h-5 bg-blue-600 rounded-full border-4 border-black shadow-[0_0_15px_#2563eb]"></div>
                            <div>
                               <p className="text-[9px] text-gray-700 uppercase font-black tracking-widest">Destination Point</p>
                               <h5 className="text-sm font-bold text-white mt-1">{selectedTrip.dropLocation}</h5>
                               <p className="text-[10px] text-gray-600 mt-2 font-mono">{selectedTrip.endDateTime ? new Date(selectedTrip.endDateTime).toLocaleString() : 'PENDING TERMINATION'}</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="bg-purple-900/10 border border-purple-500/30 p-8 rounded-[3rem] text-center shadow-inner relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform scale-150">{ICONS.Finance}</div>
                      <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-3">Tally Sheet Estimation</p>
                      {(() => {
                        const bill = getBillingDetails(selectedTrip);
                        if (!bill) return <h4 className="text-gray-600 font-black">---</h4>;
                        return (
                          <>
                            <h4 className="text-5xl font-black text-white">₹{bill.totalPrice.toFixed(0)}</h4>
                            <div className="mt-6 pt-6 border-t border-purple-500/20 space-y-2 text-left">
                               <div className="flex justify-between text-[9px] font-black uppercase text-gray-500">
                                 <span>Duration</span>
                                 <span className="text-white">{bill.hours}h {bill.mins}m</span>
                               </div>
                               <div className="flex justify-between text-[9px] font-black uppercase text-gray-500">
                                 <span>Base Total</span>
                                 <span className="text-white">₹{bill.basePrice.toFixed(0)}</span>
                               </div>
                               <div className="flex justify-between text-[9px] font-black uppercase text-purple-400">
                                 <span>GST (18%)</span>
                                 <span>₹{bill.gst.toFixed(0)}</span>
                               </div>
                            </div>
                          </>
                        );
                      })()}
                   </div>

                   <div className="space-y-3">
                      <p className="text-[9px] text-gray-700 uppercase font-black tracking-widest px-4">Operational Controls</p>
                      <button 
                        disabled={selectedTrip.status !== 'assigned' || isUpdatingStatus}
                        onClick={() => handleStartTrip(selectedTrip)}
                        className={`w-full py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl ${
                          selectedTrip.status === 'assigned' ? 'bg-emerald-600 text-white shadow-emerald-950/40 active:scale-95' : 'bg-gray-900 text-gray-700 cursor-not-allowed'
                        }`}
                      >
                        {isUpdatingStatus ? 'Syncing...' : 'Start Trip'}
                      </button>
                      <button 
                        disabled={selectedTrip.status !== 'started' || isUpdatingStatus}
                        onClick={() => handleEndTrip(selectedTrip)}
                        className={`w-full py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl ${
                          selectedTrip.status === 'started' ? 'bg-red-600 text-white shadow-red-950/40 active:scale-95' : 'bg-gray-900 text-gray-700 cursor-not-allowed'
                        }`}
                      >
                        {isUpdatingStatus ? 'Syncing...' : 'End Trip'}
                      </button>
                      {selectedTrip.status === 'completed' && (
                        <button 
                          onClick={() => generateInvoicePDF(selectedTrip)}
                          className="w-full py-5 bg-white text-black rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-purple-50 active:scale-95 transition-all"
                        >
                          Generate PDF Invoice
                        </button>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {showBookingModal && isAdmin && (
        <TripBookingModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} customers={customers} setCustomers={setCustomers} setTrips={setTrips} />
      )}
    </div>
  );
};

export default TripManagement;
