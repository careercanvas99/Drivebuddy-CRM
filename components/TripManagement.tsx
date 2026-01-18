
import React, { useState } from 'react';
import { Trip, Driver, Customer, TripStatus, User, UserRole, PaymentStatus, PaymentMode, CompanySettings } from '../types.ts';
import { ICONS } from '../constants.tsx';
import TripBookingModal from './TripBookingModal.tsx';
import { calculateFareInternal } from './TripEstimation.tsx';
import { jsPDF } from 'jspdf';

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

  const isAdmin = user.role === UserRole.ADMIN;
  const canEdit = [UserRole.ADMIN, UserRole.OPERATION_EXECUTIVE, UserRole.OPS_MANAGER].includes(user.role);

  const handleAssignDriver = (tripId: string, driverId: string) => {
    if (!driverId) return;
    setTrips(prev => prev.map(t => 
      t.id === tripId ? { ...t, driverId, status: 'assigned' } : t
    ));
    if (selectedTrip && selectedTrip.id === tripId) {
      setSelectedTrip(prev => prev ? { ...prev, driverId, status: 'assigned' } : null);
    }
  };

  const generateInvoicePDF = (trip: Trip) => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id === trip.customerId);
    
    // CRITICAL FIX: Use the stored billAmount as the Absolute Source of Truth
    const finalAmount = trip.billAmount || 0;
    
    // Get breakdown details for duration display
    const billingDetails = calculateFareInternal(
      new Date(trip.startDateTime),
      new Date(trip.endDateTime),
      "No", "Instation", trip.tripType === 'one-way' ? "One Way" : "Round Trip"
    );

    // If the stored amount differs from calculated, we derive the breakdown from the stored amount
    // to maintain logical consistency on the document (GST 18%)
    const derivedBase = Math.round(finalAmount / 1.18);
    const derivedGst = finalAmount - derivedBase;

    // --- Header (Top Left - Logo and Address) ---
    let headerY = 15;
    if (companySettings.logo) {
      try {
        doc.addImage(companySettings.logo, 'PNG', 20, headerY, 45, 20);
        headerY += 28;
      } catch (e) { 
        console.error("Logo failed to render", e); 
        headerY += 5;
      }
    } else {
        headerY += 10;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const addressLines = doc.splitTextToSize(companySettings.address, 70);
    doc.text(addressLines, 20, headerY);
    headerY += (addressLines.length * 5);
    doc.text(`Contact: ${companySettings.mobile}`, 20, headerY);

    // --- Invoice Title (Top Right) ---
    doc.setTextColor(0);
    doc.setFontSize(30);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 130, 30);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice No: ${trip.id}`, 130, 40);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 130, 45);

    // --- Client Info ---
    doc.setDrawColor(230);
    doc.line(20, 70, 190, 70);
    
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 20, 80);
    doc.setFont("helvetica", "normal");
    doc.text(customer?.name || "Valued Client", 20, 85);
    doc.text(customer?.mobile || "", 20, 90);
    doc.text(`Vehicle: ${customer?.vehicleModel || "Standard"}`, 20, 95);

    // --- Trip Details ---
    doc.setFont("helvetica", "bold");
    doc.text("JOURNEY DETAILS:", 110, 80);
    doc.setFont("helvetica", "normal");
    doc.text(`From: ${trip.pickupLocation}`, 110, 85);
    doc.text(`To: ${trip.dropLocation}`, 110, 90);
    doc.text(`Start: ${new Date(trip.startDateTime).toLocaleString()}`, 110, 95);
    doc.text(`End: ${new Date(trip.endDateTime).toLocaleString()}`, 110, 100);

    // --- Billing Table ---
    doc.setFillColor(245);
    doc.rect(20, 110, 170, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("Description", 25, 117);
    doc.text("Rate Type", 90, 117);
    doc.text("Duration", 130, 117);
    doc.text("Amount", 165, 117);

    doc.setFont("helvetica", "normal");
    doc.text(`Professional Chauffeur Services (${trip.tripType})`, 25, 130);
    doc.text(trip.tripType === 'one-way' ? "One Way" : "Round Trip", 90, 130);
    doc.text(`${billingDetails.hours}h ${billingDetails.mins}m`, 130, 130);
    doc.text(`INR ${derivedBase.toFixed(0)}`, 165, 130);

    // --- Totals ---
    doc.line(20, 145, 190, 145);
    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", 140, 155);
    doc.text(`INR ${derivedBase.toFixed(0)}`, 165, 155);
    
    doc.text("GST (18%):", 140, 160);
    doc.text(`INR ${derivedGst.toFixed(0)}`, 165, 160);
    
    doc.setFontSize(14);
    doc.text("Total:", 140, 170);
    doc.text(`INR ${finalAmount.toFixed(0)}`, 165, 170);

    // --- Footer ---
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    doc.text("Thank you for choosing Drivebuddy. This is a computer generated invoice.", 105, 210, { align: "center" });

    doc.save(`Invoice_${trip.id}.pdf`);
  };

  const handleCancelTrip = (tripId: string) => {
    if (!cancelReason.trim()) return alert('Reason for cancellation is mandatory');
    setTrips(prev => prev.map(t => 
      t.id === tripId ? { ...t, status: 'cancelled', cancelReason: cancelReason.trim() } : t
    ));
    setSelectedTrip(null);
    setCancelReason('');
    setIsEditMode(false);
  };

  const handlePayment = (tripId: string, mode: PaymentMode) => {
    setTrips(prev => prev.map(t => 
      t.id === tripId ? { ...t, paymentMode: mode, paymentStatus: 'collected' } : t
    ));
    setShowPaymentModal(null);
  };

  const filteredTrips = trips.filter(trip => {
    const customer = customers.find(c => c.id === trip.customerId);
    const searchStr = `${trip.id} ${customer?.name || ''}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const getBillingDetails = (trip: Trip) => {
    if (trip.status !== 'completed' || !trip.startDateTime || !trip.endDateTime) return null;
    
    // Primary Source of Truth: trip.billAmount
    const finalAmount = trip.billAmount || 0;
    const base = Math.round(finalAmount / 1.18);
    const gst = finalAmount - base;

    const durationData = calculateFareInternal(
      new Date(trip.startDateTime),
      new Date(trip.endDateTime),
      "No",
      "Instation",
      trip.tripType === 'one-way' ? "One Way" : "Round Trip"
    );

    return {
      ...durationData,
      basePrice: base,
      gst: gst,
      totalPrice: finalAmount
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Trip Operations</h2>
          <p className="text-gray-400 text-sm">Manage, track and audit all journey records</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              {ICONS.View}
            </div>
            <input 
              type="text" 
              placeholder="Search ID or Customer..." 
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-purple-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setShowBookingModal(true)} className="bg-purple-600 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
            {ICONS.Plus} New Trip
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-950 text-gray-400 border-b border-gray-800">
            <tr>
              <th className="p-4 font-medium">Trip ID</th>
              <th className="p-4 font-medium">Customer</th>
              <th className="p-4 font-medium">Driver</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Billing</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredTrips.map(trip => (
              <tr key={trip.id} className="hover:bg-gray-800/50 transition-all">
                <td className="p-4 font-mono text-xs text-purple-400 font-bold">{trip.id}</td>
                <td className="p-4 font-medium">{customers.find(c => c.id === trip.customerId)?.name || 'Guest'}</td>
                <td className="p-4 text-xs">{drivers.find(d => d.id === trip.driverId)?.name || <span className="text-yellow-500 italic">Unassigned</span>}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    trip.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                    trip.status === 'unassigned' ? 'bg-red-900/50 text-red-400' :
                    'bg-blue-900/50 text-blue-400'
                  }`}>{trip.status}</span>
                </td>
                <td className="p-4">
                  {trip.billAmount ? <span className="font-bold text-green-500">₹{trip.billAmount.toFixed(0)}</span> : '--'}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    {trip.status === 'completed' && (
                      <button 
                        onClick={() => generateInvoicePDF(trip)} 
                        className="text-white hover:bg-white/10 p-2 rounded-lg border border-gray-800 transition-all"
                        title="Download PDF Bill"
                      >
                        {ICONS.Reports}
                      </button>
                    )}
                    {trip.status === 'completed' && trip.paymentStatus !== 'collected' && (
                      <button onClick={() => setShowPaymentModal(trip)} className="text-green-500 hover:bg-green-600 hover:text-white p-2 rounded-lg transition-all">
                        {ICONS.Finance}
                      </button>
                    )}
                    <button onClick={() => { setSelectedTrip(trip); setIsEditMode(false); }} className="text-gray-400 hover:text-white p-2">
                      {ICONS.View}
                    </button>
                    {canEdit && trip.status !== 'completed' && trip.status !== 'cancelled' && (
                      <button onClick={() => { setSelectedTrip(trip); setIsEditMode(true); }} className="text-purple-400 p-2">
                        {ICONS.Edit}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Process Payment</h3>
            <p className="text-sm text-gray-500 mb-6">Record collection for Trip <span className="text-purple-500 font-mono">{showPaymentModal.id}</span></p>
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8 text-center">
              <p className="text-xs text-gray-500 uppercase font-black mb-1">Total Receivable</p>
              <h4 className="text-4xl font-black text-white">₹ {showPaymentModal.billAmount?.toFixed(0)}</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handlePayment(showPaymentModal.id, 'cash')} className="bg-gray-900 border border-gray-800 py-4 rounded-2xl font-bold flex flex-col items-center gap-2">
                <div className="text-green-500">{ICONS.Finance}</div>Cash
              </button>
              <button onClick={() => handlePayment(showPaymentModal.id, 'online')} className="bg-purple-600 py-4 rounded-2xl font-bold flex flex-col items-center gap-2">
                <div className="text-white">{ICONS.Reports}</div>Online
              </button>
            </div>
            <button onClick={() => setShowPaymentModal(null)} className="w-full mt-6 text-gray-500 text-sm font-bold uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      )}

      {selectedTrip && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
             <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900">
              <h3 className="text-xl font-bold">{isEditMode ? 'Modify Trip Status' : `Trip Manifest: ${selectedTrip.id}`}</h3>
              <button onClick={() => { setSelectedTrip(null); setIsEditMode(false); }} className="text-gray-500 hover:text-white">{ICONS.Cancel}</button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10 overflow-y-auto max-h-[75vh]">
              <div className="space-y-6">
                 <div>
                    <h4 className="text-xs font-black text-gray-500 uppercase mb-4">Evidence & Location</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="aspect-[4/3] bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden flex flex-col items-center justify-center p-2">
                          <p className="text-[8px] text-gray-600 uppercase font-black mb-2">Start Verification</p>
                          {selectedTrip.startSelfie ? <img src={selectedTrip.startSelfie} className="w-full h-full object-cover rounded-lg" /> : <div className="text-[10px] text-gray-700 italic">Pending...</div>}
                       </div>
                       <div className="aspect-[4/3] bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden flex flex-col items-center justify-center p-2">
                          <p className="text-[8px] text-gray-600 uppercase font-black mb-2">End Verification</p>
                          {selectedTrip.endSelfie ? <img src={selectedTrip.endSelfie} className="w-full h-full object-cover rounded-lg" /> : <div className="text-[10px] text-gray-700 italic">Pending...</div>}
                       </div>
                    </div>
                 </div>
                 
                 <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase mb-4">Journey Path</h4>
                    <div className="space-y-3">
                       <div className="flex gap-3">
                         <div className="text-purple-500">{ICONS.Trips}</div>
                         <div>
                            <p className="text-[10px] text-gray-500 uppercase font-black">Pickup</p>
                            <p className="text-sm font-bold">{selectedTrip.pickupLocation}</p>
                         </div>
                       </div>
                       <div className="flex gap-3">
                         <div className="text-blue-500">{ICONS.Trips}</div>
                         <div>
                            <p className="text-[10px] text-gray-500 uppercase font-black">Destination</p>
                            <p className="text-sm font-bold">{selectedTrip.dropLocation}</p>
                         </div>
                       </div>
                    </div>
                 </div>

                 {selectedTrip.status === 'unassigned' && (
                    <div className="bg-yellow-900/10 border-2 border-dashed border-yellow-500/30 rounded-2xl p-6 animate-pulse">
                      <h4 className="text-[10px] font-black text-yellow-500 uppercase mb-4">Assign Driver Partner</h4>
                      <select 
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-yellow-500 outline-none"
                        onChange={(e) => handleAssignDriver(selectedTrip.id, e.target.value)}
                        value={selectedTrip.driverId || ''}
                      >
                        <option value="">Choose Available Driver...</option>
                        {drivers.filter(d => d.status === 'available').map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                        ))}
                      </select>
                    </div>
                 )}
              </div>
              
              <div className="space-y-8">
                 {!isEditMode ? (
                   <>
                     <div className="bg-purple-900/10 border border-purple-500/20 rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-xs font-black text-purple-500 uppercase">Settlement Summary</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${selectedTrip.paymentStatus === 'collected' ? 'bg-green-500 text-black' : 'bg-yellow-500 text-black'}`}>
                            {selectedTrip.paymentStatus || 'UNPAID'}
                          </span>
                        </div>
                        <h4 className="text-4xl font-black text-white">₹ {selectedTrip.billAmount?.toFixed(0) || '0.00'}</h4>
                        
                        {selectedTrip.status === 'completed' && (
                          <div className="mt-6 space-y-2 border-t border-purple-500/20 pt-4">
                            <p className="text-[10px] text-purple-400 font-black uppercase">Automated Billing Logs</p>
                            {(() => {
                              const b = getBillingDetails(selectedTrip);
                              if (!b) return null;
                              return (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-gray-400">
                                    <span>Total Duration:</span>
                                    <span className="text-white font-bold">{b.hours}h {b.mins}m</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-gray-400">
                                    <span>Base Rate:</span>
                                    <span className="text-white">₹ {b.basePrice.toFixed(0)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-purple-400 font-bold">
                                    <span>GST (18%):</span>
                                    <span>₹ {b.gst.toFixed(0)}</span>
                                  </div>
                                </div>
                              );
                            })()}
                            <button 
                              onClick={() => generateInvoicePDF(selectedTrip)}
                              className="w-full mt-4 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              Generate PDF Invoice
                            </button>
                          </div>
                        )}
                     </div>
                     <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase mb-4">Service Stakeholders</h4>
                        <div className="flex items-center gap-4 mb-4">
                           <div className="w-10 h-10 rounded-full bg-gray-950 flex items-center justify-center text-xs font-bold text-purple-500 border border-gray-800">
                             {customers.find(c => c.id === selectedTrip.customerId)?.name.charAt(0) || 'G'}
                           </div>
                           <div>
                              <p className="text-[10px] text-gray-500 uppercase font-black">Client</p>
                              <p className="text-sm font-bold">{customers.find(c => c.id === selectedTrip.customerId)?.name || 'Guest User'}</p>
                           </div>
                        </div>
                     </div>
                   </>
                 ) : (
                   <div className="space-y-6">
                     <h4 className="text-xs font-black text-red-500 uppercase">Emergency Termination</h4>
                     <textarea className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm h-32 focus:border-red-500 outline-none" placeholder="Cancellation reasoning..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                     <button onClick={() => handleCancelTrip(selectedTrip.id)} className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-xl text-sm font-bold shadow-lg shadow-red-900/30 transition-all">Execute Cancellation</button>
                   </div>
                 )}
              </div>
            </div>
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
