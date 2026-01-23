
import React, { useState, useMemo } from 'react';
import { Trip, Driver, Customer, User, UserRole, CompanySettings } from '../types.ts';
import { ICONS } from '../constants.tsx';
import TripBookingModal from './TripBookingModal.tsx';
import { calculateFareInternal } from './TripEstimation.tsx';
import { supabase } from '../lib/supabase.js';
import { generatePDFInvoice } from '../services/InvoiceService.ts';

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
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [editFormData, setEditFormData] = useState<Partial<Trip>>({});

  const userRoleStr = String(user.role || '').toLowerCase();
  const isAdmin = userRoleStr === UserRole.ADMIN.toLowerCase();
  
  const canEdit = [
    UserRole.ADMIN.toLowerCase(), 
    UserRole.OPERATION_EXECUTIVE.toLowerCase(), 
    UserRole.OPS_MANAGER.toLowerCase()
  ].includes(userRoleStr);

  const updateTripData = async (tripId: string, updates: Partial<Trip>) => {
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          customer_id: updates.customerId,
          driver_id: updates.driverId,
          trip_status: updates.status,
          start_time: updates.startDateTime,
          end_time: updates.endDateTime,
          bill_amount: updates.billAmount,
          cancel_reason: updates.cancelReason,
          trip_code: updates.displayId || undefined,
          payment_mode: updates.paymentMode,
          payment_status: updates.paymentStatus
        } as any)
        .eq('id', tripId);

      if (error) throw error;

      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, ...updates } : t));
      
      if (updates.status === 'completed') {
        const tripToInvoice = trips.find(t => t.id === tripId);
        if (tripToInvoice) {
          const fullTrip = { ...tripToInvoice, ...updates };
          const cust = customers.find(c => c.id === fullTrip.customerId);
          const drv = drivers.find(d => d.id === fullTrip.driverId);
          generatePDFInvoice(fullTrip, cust, companySettings, drv);
        }
      }

      if (selectedTrip?.id === tripId) {
        setSelectedTrip(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err: any) {
      alert(`Sync Error: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStartTrip = (trip: Trip) => {
    if (!trip.driverId) return alert('Protocol Denied: No Pilot allocated.');
    updateTripData(trip.id, { status: 'started', startDateTime: new Date().toISOString() });
  };

  const handleEndTrip = (trip: Trip) => {
    const endDateTime = new Date().toISOString();
    const billing = calculateFareInternal(
      new Date(trip.startDateTime),
      new Date(endDateTime),
      "No", "Instation", trip.tripType === 'one-way' ? "One Way" : "Round Trip"
    );
    updateTripData(trip.id, { 
      status: 'completed', 
      endDateTime, 
      billAmount: Math.round(billing.totalPrice * 1.15) 
    });
  };

  const handleCancelTrip = (trip: Trip) => {
    const reason = prompt('Cancellation Reason:');
    if (!reason) return;
    updateTripData(trip.id, { status: 'cancelled', cancelReason: reason });
  };

  const handleAssignDriver = (tripId: string, driverId: string) => {
    if (driverId === "") {
        updateTripData(tripId, { driverId: undefined, status: 'unassigned' });
    } else {
        updateTripData(tripId, { driverId, status: 'assigned' });
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('DANGER: Permanent deletion?')) return;
    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (error) throw error;
      setTrips(prev => prev.filter(t => t.id !== id));
      setSelectedTrip(null);
    } catch (err: any) {
      alert(`Deletion Error: ${err.message}`);
    }
  };

  const openEditModal = (trip: Trip) => {
    setEditFormData({
      pickupLocation: trip.pickupLocation,
      dropLocation: trip.dropLocation,
      tripType: trip.tripType,
      startDateTime: trip.startDateTime,
      driverId: trip.driverId || '',
      displayId: trip.displayId
    });
    setSelectedTrip(trip);
    setIsEditMode(true);
  };

  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const customer = customers.find(c => c.id === trip.customerId);
      const searchId = String(trip.displayId || '').toLowerCase();
      const clientName = String(customer?.name || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchId.includes(term) || clientName.includes(term);
      const matchesStatus = filterStatus === 'all' || trip.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [trips, searchTerm, filterStatus, customers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Manifest Hub</h2>
          <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Enterprise Mission Management</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => setShowBookingModal(true)} 
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-900/40"
          >
            {ICONS.Plus} New Booking
          </button>
        )}
      </div>

      <div className="bg-gray-950 p-6 rounded-[2.5rem] border border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-xl">
        <input 
          type="text" 
          placeholder="Search TRIP-XXXX or Client" 
          className="w-full bg-black border border-gray-900 rounded-xl px-4 py-3 text-[10px] font-bold text-white outline-none"
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="w-full bg-black border border-gray-900 rounded-xl px-4 py-3 text-[10px] font-bold text-white outline-none"
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">ALL REGISTRIES</option>
          <option value="unassigned">UNASSIGNED</option>
          <option value="assigned">ASSIGNED</option>
          <option value="started">IN PROGRESS</option>
          <option value="completed">COMPLETED</option>
          <option value="cancelled">CANCELLED</option>
        </select>
        <button onClick={() => { setSearchTerm(''); setFilterStatus('all'); }} className="bg-gray-900 border border-gray-800 rounded-xl py-3 text-[9px] font-black uppercase text-gray-500 tracking-widest">Reset</button>
      </div>

      <div className="bg-gray-950 rounded-[3rem] border border-gray-900 overflow-hidden shadow-2xl relative">
        <table className="w-full text-left text-[11px] font-bold uppercase tracking-tight">
          <thead className="bg-black text-gray-600 border-b border-gray-900 font-black tracking-widest text-[9px]">
            <tr>
              <th className="p-6">Manifest ID</th>
              <th className="p-6">Client Profile</th>
              <th className="p-6">Pilot</th>
              <th className="p-6">State</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {filteredTrips.map(trip => {
              const customer = customers.find(c => c.id === trip.customerId);
              const driver = drivers.find(d => d.id === trip.driverId);
              return (
                <tr key={trip.id} className="hover:bg-gray-900/40 transition-all group">
                  <td className="p-6 text-purple-500 font-mono font-bold text-[10px]">{trip.displayId}</td>
                  <td className="p-6">
                    <div className="text-white font-black">{customer?.name || 'GUEST'}</div>
                    <div className="text-gray-700 font-mono text-[9px]">{customer?.displayId}</div>
                  </td>
                  <td className="p-6">
                    {canEdit && (trip.status === 'unassigned' || trip.status === 'assigned') ? (
                      <select 
                        className="bg-black border border-gray-800 rounded-lg p-2 text-[9px] font-black text-purple-400 outline-none w-full"
                        onChange={(e) => handleAssignDriver(trip.id, e.target.value)}
                        value={trip.driverId || ''}
                      >
                        <option value="">-- ALLOCATE --</option>
                        {drivers.filter(d => d.status === 'available').map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-200">{driver?.name || 'NONE'}</span>
                    )}
                  </td>
                  <td className="p-6">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${
                      trip.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400' : 
                      trip.status === 'started' ? 'bg-blue-900/30 text-blue-400 animate-pulse' : 
                      'bg-gray-800 text-gray-500'
                    }`}>{trip.status?.toUpperCase()}</span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedTrip(trip)} className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-all shadow-sm">{ICONS.View}</button>
                      {isAdmin && <button onClick={() => handleDeleteTrip(trip.id)} className="p-3 bg-red-900/10 border border-red-500/20 rounded-xl text-red-500 transition-all shadow-sm">{ICONS.Delete}</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showBookingModal && canEdit && (
        <TripBookingModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} customers={customers} setCustomers={setCustomers} setTrips={setTrips} />
      )}
    </div>
  );
};

export default TripManagement;
