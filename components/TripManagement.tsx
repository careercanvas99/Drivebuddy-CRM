
import React, { useState, useMemo } from 'react';
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

  // Filter States
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');

  const isAdmin = user.role === UserRole.ADMIN;
  
  // Per requirements: Only Admin can modify history/records. 
  // Others have Read-Only + Export access.
  const canModify = isAdmin;

  const handleAssignDriver = (tripId: string, driverId: string) => {
    if (!canModify || !driverId) return;
    setTrips(prev => prev.map(t => 
      t.id === tripId ? { ...t, driverId, status: 'assigned' } : t
    ));
    if (selectedTrip && selectedTrip.id === tripId) {
      setSelectedTrip(prev => prev ? { ...prev, driverId, status: 'assigned' } : null);
    }
  };

  const handleCancelTrip = (tripId: string) => {
    if (!canModify) return;
    if (!cancelReason.trim()) return alert('Reason for cancellation is mandatory');
    setTrips(prev => prev.map(t => 
      t.id === tripId ? { ...t, status: 'cancelled', cancelReason: cancelReason.trim() } : t
    ));
    setSelectedTrip(null);
    setCancelReason('');
    setIsEditMode(false);
  };

  const handlePayment = (tripId: string, mode: PaymentMode) => {
    if (!canModify) return;
    setTrips(prev => prev.map(t => 
      t.id === tripId ? { ...t, paymentMode: mode, paymentStatus: 'collected' } : t
    ));
    setShowPaymentModal(null);
  };

  const generateInvoicePDF = (trip: Trip) => {
    const doc = new jsPDF();
    const customer = customers.find(c => c.id === trip.customerId);
    const driver = drivers.find(d => d.id === trip.driverId);
    const finalAmount = trip.billAmount || 0;
    
    // Billing Logic
    const billingDetails = calculateFareInternal(
      new Date(trip.startDateTime),
      new Date(trip.endDateTime),
      "No", "Instation", trip.tripType === 'one-way' ? "One Way" : "Round Trip"
    );

    const derivedBase = Math.round(finalAmount / 1.18);
    const derivedGst = finalAmount - derivedBase;

    // Header Setup
    let headerY = 15;
    if (companySettings.logo) {
      try {
        doc.addImage(companySettings.logo, 'PNG', 20, headerY, 40, 18);
        headerY += 25;
      } catch (e) { headerY += 5; }
    } else { headerY += 10; }

    // Company Info
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(companySettings.name, 20, headerY);
    doc.setFont("helvetica", "normal");
    const addressLines = doc.splitTextToSize(companySettings.address, 65);
    doc.text(addressLines, 20, headerY + 5);
    doc.text(`Mobile: ${companySettings.mobile}`, 20, headerY + 5 + (addressLines.length * 4));

    // Invoice Title & Meta
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(147, 51, 234); // Purple-600
    doc.text("INVOICE", 130, 30);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`ID: ${trip.id}`, 130, 40);
    doc.text(`Dated: ${new Date().toLocaleDateString()}`, 130, 45);

    headerY += 25 + (addressLines.length * 4);

    // Bill To & Trip Details section
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

    // Table Header
    doc.setFillColor(245, 245, 245);
    doc.rect(20, headerY, 170, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("SERVICE DESCRIPTION", 25, headerY + 6);
    doc.text("RATE LOGIC", 90, headerY + 6);
    doc.text("AMOUNT (INR)", 160, headerY + 6);

    // Table Content
    headerY += 15;
    doc.setFont("helvetica", "normal");
    doc.text("Professional Chauffeur Services", 25, headerY);
    doc.text(`${billingDetails.hours} hrs ${billingDetails.mins} mins`, 90, headerY);
    doc.text(derivedBase.toFixed(2), 160, headerY);

    // Summary Section
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

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("This is an electronically generated document. No signature required.", 105, 280, { align: "center" });

    doc.save(`Invoice_${trip.id}.pdf`);
  };

  // CSV Export Engine
  const downloadCSV = () => {
    const headers = [
      "Trip ID", 
      "Customer", 
      "Mobile", 
      "Driver", 
      "Pickup", 
      "Drop", 
      "Type", 
      "Status", 
      "Start Date & Time", 
      "End Date & Time", 
      "Duration (HH:MM)",
      "Base Amount", 
      "Total Amount"
    ];

    const rows = filteredTrips.map(t => {
      const cust = customers.find(c => c.id === t.customerId);
      const drv = drivers.find(d => d.id === t.driverId);
      const base = Math.round((t.billAmount || 0) / 1.18);
      
      let durationStr = "--";
      if (t.startDateTime && t.endDateTime && t.status === 'completed') {
        const billing = calculateFareInternal(
          new Date(t.startDateTime),
          new Date(t.endDateTime),
          "No", "Instation", t.tripType === 'one-way' ? "One Way" : "Round Trip"
        );
        durationStr = `${String(billing.hours).padStart(2, '0')}:${String(billing.mins).padStart(2, '0')}`;
      }

      return [
        t.id,
        cust?.name || 'Guest',
        cust?.mobile || '',
        drv?.name || 'Unassigned',
        `"${t.pickupLocation}"`,
        `"${t.dropLocation}"`,
        t.tripType,
        t.status,
        `"${new Date(t.startDateTime).toLocaleString()}"`,
        t.endDateTime ? `"${new Date(t.endDateTime).toLocaleString()}"` : '"--"',
        durationStr,
        base,
        t.billAmount || 0
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trip_history_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Advanced Filtering Logic
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const customer = customers.find(c => c.id === trip.customerId);
      const driver = drivers.find(d => d.id === trip.driverId);
      
      // Search Box
      const searchStr = `${trip.id} ${customer?.name || ''} ${driver?.name || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      // Status Filter
      const matchesStatus = filterStatus === 'all' || trip.status === filterStatus;
      
      // Type Filter
      const matchesType = filterType === 'all' || trip.tripType === filterType;
      
      // Driver Filter
      const matchesDriver = filterDriver === 'all' || trip.driverId === filterDriver;

      // Date Range Filter
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

      return matchesSearch && matchesStatus && matchesType && matchesDriver && matchesDate;
    });
  }, [trips, searchTerm, filterStatus, filterType, filterDriver, filterDateStart, filterDateEnd, customers, drivers]);

  const getBillingDetails = (trip: Trip) => {
    if (trip.status !== 'completed' || !trip.startDateTime || !trip.endDateTime) return null;
    const finalAmount = trip.billAmount || 0;
    const base = Math.round(finalAmount / 1.18);
    const gst = finalAmount - base;
    const durationData = calculateFareInternal(
      new Date(trip.startDateTime),
      new Date(trip.endDateTime),
      "No", "Instation", trip.tripType === 'one-way' ? "One Way" : "Round Trip"
    );
    return { ...durationData, basePrice: base, gst: gst, totalPrice: finalAmount };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Trip History & Operations</h2>
          <p className="text-gray-400 text-sm">Full operational audit log and dispatch control</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <button 
            onClick={downloadCSV}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 border border-gray-700 transition-all"
          >
            {ICONS.Reports} Export CSV
          </button>
          {isAdmin && (
            <button onClick={() => setShowBookingModal(true)} className="bg-purple-600 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap shadow-lg shadow-purple-900/40">
              {ICONS.Plus} New Trip
            </button>
          )}
        </div>
      </div>

      {/* Control Panel: Advanced Filters */}
      <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-500 uppercase px-2">Search</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">{ICONS.View}</div>
            <input 
              type="text" placeholder="ID/Customer..." 
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-xs focus:border-purple-500 outline-none"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-500 uppercase px-2">Status</label>
          <select 
            className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs focus:border-purple-500 outline-none"
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="unassigned">Unassigned</option>
            <option value="assigned">Assigned</option>
            <option value="started">Started</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-500 uppercase px-2">Driver</label>
          <select 
            className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs focus:border-purple-500 outline-none"
            value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)}
          >
            <option value="all">All Drivers</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-500 uppercase px-2">From Date</label>
          <input 
            type="date" className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs focus:border-purple-500 outline-none"
            value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-500 uppercase px-2">To Date</label>
          <input 
            type="date" className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs focus:border-purple-500 outline-none"
            value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <button 
            onClick={() => {
              setSearchTerm(''); setFilterStatus('all'); setFilterType('all');
              setFilterDriver('all'); setFilterDateStart(''); setFilterDateEnd('');
            }}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 text-[10px] font-black uppercase text-gray-400 hover:text-white transition-all"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-950 text-gray-400 border-b border-gray-800">
            <tr>
              <th className="p-4 font-medium text-[10px] uppercase">ID</th>
              <th className="p-4 font-medium text-[10px] uppercase">Client Info</th>
              <th className="p-4 font-medium text-[10px] uppercase">Assigned Driver</th>
              <th className="p-4 font-medium text-[10px] uppercase">Status</th>
              <th className="p-4 font-medium text-[10px] uppercase">Billing</th>
              <th className="p-4 font-medium text-[10px] uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredTrips.map(trip => (
              <tr key={trip.id} className="hover:bg-gray-800/50 transition-all">
                <td className="p-4 font-mono text-xs text-purple-400 font-bold">{trip.id}</td>
                <td className="p-4">
                  <div className="font-bold">{customers.find(c => c.id === trip.customerId)?.name || 'Guest'}</div>
                  <div className="text-[10px] text-gray-500">{new Date(trip.startDateTime).toLocaleDateString()}</div>
                </td>
                <td className="p-4 text-xs font-medium">
                  {drivers.find(d => d.id === trip.driverId)?.name || <span className="text-yellow-500/50 italic">Waiting...</span>}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                    trip.status === 'completed' ? 'bg-green-900/40 text-green-400 border border-green-500/20' :
                    trip.status === 'unassigned' ? 'bg-red-900/40 text-red-400 border border-red-500/20' :
                    trip.status === 'cancelled' ? 'bg-gray-800 text-gray-500 border border-gray-700' :
                    'bg-blue-900/40 text-blue-400 border border-blue-500/20'
                  }`}>{trip.status}</span>
                </td>
                <td className="p-4">
                  {trip.billAmount ? <span className="font-bold text-white">₹{trip.billAmount.toFixed(0)}</span> : <span className="text-gray-600">--</span>}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    {trip.status === 'completed' && (
                      <button onClick={() => generateInvoicePDF(trip)} className="text-gray-400 hover:text-white p-2 border border-gray-800 rounded" title="Download PDF">
                        {ICONS.Reports}
                      </button>
                    )}
                    <button onClick={() => { setSelectedTrip(trip); setIsEditMode(false); }} className="text-gray-400 hover:text-white p-2 border border-gray-800 rounded">
                      {ICONS.View}
                    </button>
                    {canModify && trip.status !== 'completed' && trip.status !== 'cancelled' && (
                      <button onClick={() => { setSelectedTrip(trip); setIsEditMode(true); }} className="text-purple-400 p-2 border border-purple-500/20 rounded">
                        {ICONS.Edit}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTrips.length === 0 && (
          <div className="p-12 text-center text-gray-500 italic">No records found matching your current filter criteria.</div>
        )}
      </div>

      {showPaymentModal && canModify && (
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

                 {selectedTrip.status === 'unassigned' && canModify && (
                    <div className="bg-yellow-900/10 border-2 border-dashed border-yellow-500/30 rounded-2xl p-6">
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

      {showBookingModal && isAdmin && (
        <TripBookingModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} customers={customers} setCustomers={setCustomers} setTrips={setTrips} />
      )}
    </div>
  );
};

export default TripManagement;
