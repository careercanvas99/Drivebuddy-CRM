
import React, { useState, useMemo } from 'react';
import { Trip, Driver, Customer, User, UserRole, CompanySettings } from '../types.ts';
import { ICONS } from '../constants.tsx';
import TripBookingModal from './TripBookingModal.tsx';
import { calculateFareInternal } from './TripEstimation.tsx';
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
      const dbUpdates: any = {};
      if (updates.customerId) dbUpdates.customer_id = updates.customerId;
      if (updates.driverId !== undefined) dbUpdates.driver_id = updates.driverId;
      if (updates.pickupLocation) dbUpdates.pickup_location = updates.pickupLocation;
      if (updates.dropLocation) dbUpdates.drop_location = updates.dropLocation;
      if (updates.tripType) dbUpdates.trip_type = updates.tripType;
      if (updates.startDateTime) dbUpdates.start_date_time = updates.startDateTime;
      if (updates.endDateTime) dbUpdates.end_date_time = updates.endDateTime;
      if (updates.billAmount !== undefined) dbUpdates.bill_amount = updates.billAmount;
      if (updates.cancelReason !== undefined) dbUpdates.cancel_reason = updates.cancelReason;
      if (updates.status) dbUpdates.status = updates.status;

      const { error } = await supabase
        .from('trips')
        .update(dbUpdates)
        .eq('id', tripId);

      if (error) throw error;

      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, ...updates } : t));
      if (selectedTrip?.id === tripId) {
        setSelectedTrip(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err: any) {
      alert(`Database Sync Error: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStartTrip = (trip: Trip) => {
    if (!trip.driverId) return alert('Cannot start journey: No driver assigned.');
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
      billAmount: billing.totalPrice 
    });
  };

  const handleCancelTrip = (trip: Trip) => {
    const reason = prompt('Cancellation Protocol: Please provide a reason:');
    if (reason === null) return;
    if (!reason.trim()) return alert('Reason is mandatory.');
    
    updateTripData(trip.id, { status: 'cancelled', cancelReason: reason });
  };

  const handleAssignDriver = (tripId: string, driverId: string) => {
    if (driverId === "") {
        updateTripData(tripId, { driverId: null, status: 'unassigned' });
    } else {
        updateTripData(tripId, { driverId, status: 'assigned' });
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('DANGER: Permanent deletion of trip record?')) return;
    
    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (error) throw error;
      setTrips(prev => prev.filter(t => t.id !== id));
      setSelectedTrip(null);
    } catch (err: any) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  const openEditModal = (trip: Trip) => {
    setEditFormData({
      pickupLocation: trip.pickupLocation,
      dropLocation: trip.dropLocation,
      tripType: trip.tripType,
      startDateTime: trip.startDateTime,
      driverId: trip.driverId || ''
    });
    setSelectedTrip(trip);
    setIsEditMode(true);
  };

  const handleSaveEdit = () => {
    if (selectedTrip) {
      updateTripData(selectedTrip.id, editFormData);
      setIsEditMode(false);
      setSelectedTrip(null);
    }
  };

  const busyDriverIds = useMemo(() => {
    return new Set(trips
      .filter(t => t.status === 'assigned' || t.status === 'started')
      .map(t => t.driverId)
      .filter(Boolean));
  }, [trips]);

  const availableDrivers = useMemo(() => {
    return drivers.filter(d => 
      d.status === 'available' && !busyDriverIds.has(d.id)
    );
  }, [drivers, busyDriverIds]);

  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const customer = customers.find(c => c.id === trip.customerId);
      const searchId = String(trip.displayId || '').toLowerCase();
      const clientName = String(customer?.name || 'Guest Client').toLowerCase();
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
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Trip Manifest Hub</h2>
          <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Manage Fleet Journeys & Client Dispatch</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          {canEdit && (
            <button 
              onClick={() => setShowBookingModal(true)} 
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-900/40"
            >
              {ICONS.Plus} Create Trip
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-950 p-6 rounded-[2.5rem] border border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-xl">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-700 uppercase px-2 tracking-widest">Search (Business ID / Client)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">{ICONS.Trips}</span>
            <input 
              type="text" 
              placeholder="e.g. TRIP-4501 or Client Name" 
              className="w-full bg-black border border-gray-900 rounded-xl pl-10 pr-4 py-3 text-[10px] font-bold text-white focus:border-purple-500 outline-none transition-all"
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-700 uppercase px-2 tracking-widest">Filter Status</label>
          <select 
            className="w-full bg-black border border-gray-900 rounded-xl px-4 py-3 text-[10px] font-bold text-white focus:border-purple-500 outline-none"
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">ALL STATUSES</option>
            <option value="unassigned">UNASSIGNED</option>
            <option value="assigned">ASSIGNED</option>
            <option value="started">IN PROGRESS</option>
            <option value="completed">COMPLETED</option>
            <option value="cancelled">CANCELLED</option>
          </select>
        </div>
        <div className="flex items-end">
          <button 
            onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all tracking-widest"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-gray-950 rounded-[3rem] border border-gray-900 overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] font-bold uppercase tracking-tight">
            <thead className="bg-black text-gray-600 border-b border-gray-900">
              <tr>
                <th className="p-6 font-black tracking-widest text-[9px]">Manifest ID</th>
                <th className="p-6 font-black tracking-widest text-[9px]">Customer Name</th>
                <th className="p-6 font-black tracking-widest text-[9px]">Pilot Allocation</th>
                <th className="p-6 font-black tracking-widest text-[9px]">State</th>
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
                      <div className="text-purple-500 font-mono font-bold text-[10px] mb-1">{trip.displayId}</div>
                      <div className="text-gray-500 text-[8px] tracking-widest">{(trip.tripType || '').replace('-', ' ')}</div>
                    </td>
                    <td className="p-6">
                      <div className="text-white mb-1 font-black">{customer?.name || 'GUEST CLIENT'}</div>
                      <div className="text-gray-700 font-mono text-[9px]">{customer?.mobile || 'NO CONTACT'}</div>
                    </td>
                    <td className="p-6">
                      {canEdit && (trip.status === 'unassigned' || trip.status === 'assigned') ? (
                        <select 
                          className="bg-black border border-gray-800 rounded-lg p-2 text-[9px] font-black text-purple-400 focus:border-purple-500 outline-none w-full"
                          onChange={(e) => handleAssignDriver(trip.id, e.target.value)}
                          value={trip.driverId || ''}
                        >
                          <option value="">-- SELECT PILOT --</option>
                          {availableDrivers.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.displayId})</option>
                          ))}
                          {trip.driverId && !availableDrivers.find(d => d.id === trip.driverId) && (
                             <option value={trip.driverId}>{driver?.name} ({driver?.displayId})</option>
                          )}
                        </select>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-gray-200">{driver?.name || 'NOT DISPATCHED'}</span>
                          <span className="text-[8px] text-purple-600 font-mono font-bold">{driver?.displayId || '---'}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                         <span className={`w-1.5 h-1.5 rounded-full ${
                           trip.status === 'completed' ? 'bg-emerald-500' : 
                           trip.status === 'started' ? 'bg-blue-500 animate-pulse' : 
                           trip.status === 'unassigned' ? 'bg-red-500' : 
                           trip.status === 'cancelled' ? 'bg-gray-600' : 'bg-yellow-500'
                         }`}></span>
                         <span className="text-white text-[9px] font-black">{(trip.status || 'PENDING').toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setSelectedTrip(trip)} className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-all shadow-sm" title="View Manifest">{ICONS.View}</button>
                        {canEdit && !['completed', 'cancelled'].includes(trip.status) && (
                          <button onClick={() => openEditModal(trip)} className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-blue-500 hover:text-white transition-all shadow-sm" title="Edit Trip">{ICONS.Edit}</button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDeleteTrip(trip.id)} className="p-3 bg-red-900/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm" title="Delete Permanent">{ICONS.Delete}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTrip && !isEditMode && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-4xl p-8 lg:p-12 animate-in zoom-in duration-300 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600"></div>
             
             <div className="flex justify-between items-start mb-10">
               <div>
                 <h3 className="text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-none">Trip Manifest</h3>
                 <p className="text-[10px] text-purple-500 font-mono font-bold mt-2 tracking-widest">BUSINESS ID: {selectedTrip.displayId}</p>
               </div>
               <button onClick={() => setSelectedTrip(null)} className="p-4 bg-gray-900 border border-gray-800 rounded-2xl text-gray-500 hover:text-white transition-all">✕</button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto max-h-[70vh] pb-10 custom-scrollbar">
                <div className="lg:col-span-2 space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-black/40 border border-gray-900 p-6 rounded-3xl">
                        <p className="text-[9px] text-gray-700 uppercase font-black tracking-widest mb-2">Customer Profile</p>
                        <h4 className="text-xl font-black text-white">{customers.find(c => c.id === selectedTrip.customerId)?.name || 'Guest User'}</h4>
                        <p className="text-xs text-gray-500 font-mono mt-1">{customers.find(c => c.id === selectedTrip.customerId)?.mobile}</p>
                      </div>
                      <div className="bg-black/40 border border-gray-900 p-6 rounded-3xl">
                        <p className="text-[9px] text-gray-700 uppercase font-black tracking-widest mb-2">Pilot Assignment</p>
                        <h4 className="text-xl font-black text-white">{drivers.find(d => d.id === selectedTrip.driverId)?.name || 'NOT ASSIGNED'}</h4>
                        <p className="text-xs text-purple-500 font-black mt-1 tracking-widest uppercase">{selectedTrip.status}</p>
                        <p className="text-[9px] text-gray-500 font-mono font-bold">{drivers.find(d => d.id === selectedTrip.driverId)?.displayId}</p>
                      </div>
                   </div>

                   <div className="bg-black/40 border border-gray-900 p-8 rounded-[2.5rem] relative">
                      <div className="absolute left-10 top-20 bottom-20 w-px bg-gray-800 border-dashed border-l"></div>
                      <div className="space-y-12">
                         <div className="flex gap-6 relative z-10">
                            <div className="w-5 h-5 bg-purple-600 rounded-full border-4 border-black shadow-[0_0_15px_#9333ea]"></div>
                            <div>
                               <p className="text-[9px] text-gray-700 uppercase font-black tracking-widest">Pickup Location</p>
                               <h5 className="text-sm font-bold text-white mt-1">{selectedTrip.pickupLocation}</h5>
                               <p className="text-[10px] text-gray-600 mt-2 font-mono">
                                 Scheduled: {selectedTrip.startDateTime ? new Date(selectedTrip.startDateTime).toLocaleString() : 'N/A'}
                               </p>
                            </div>
                         </div>
                         <div className="flex gap-6 relative z-10">
                            <div className="w-5 h-5 bg-blue-600 rounded-full border-4 border-black shadow-[0_0_15px_#2563eb]"></div>
                            <div>
                               <p className="text-[9px] text-gray-700 uppercase font-black tracking-widest">Drop Location</p>
                               <h5 className="text-sm font-bold text-white mt-1">{selectedTrip.dropLocation}</h5>
                               <p className="text-[10px] text-gray-600 mt-2 font-mono">
                                 {selectedTrip.endDateTime ? `Arrived: ${new Date(selectedTrip.endDateTime).toLocaleString()}` : 'JOURNEY PENDING'}
                               </p>
                            </div>
                         </div>
                      </div>
                   </div>

                   {selectedTrip.cancelReason && (
                     <div className="bg-red-950/20 border border-red-500/20 p-6 rounded-3xl">
                       <p className="text-[9px] text-red-500 uppercase font-black tracking-widest mb-2">Cancellation Log</p>
                       <p className="text-sm text-gray-300 font-medium italic">"{selectedTrip.cancelReason}"</p>
                     </div>
                   )}
                </div>

                <div className="space-y-6">
                   <div className="bg-purple-900/10 border border-purple-500/30 p-8 rounded-[3rem] text-center shadow-inner relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 scale-150">{ICONS.Finance}</div>
                      <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-3">Billing Status</p>
                      {selectedTrip.billAmount ? (
                        <>
                          <h4 className="text-5xl font-black text-white">₹{selectedTrip.billAmount}</h4>
                          <p className="text-[9px] text-gray-500 mt-4 uppercase font-black tracking-widest tracking-[0.2em]">Closed Invoice</p>
                        </>
                      ) : (
                        <p className="text-sm font-bold text-gray-600 py-4 uppercase tracking-tighter">Pro-forma Billing Pending</p>
                      )}
                   </div>

                   <div className="space-y-3">
                      <p className="text-[9px] text-gray-700 uppercase font-black tracking-widest px-4">Journey Controls</p>
                      <button 
                        disabled={selectedTrip.status !== 'assigned' || isUpdatingStatus}
                        onClick={() => handleStartTrip(selectedTrip)}
                        className={`w-full py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all ${
                          selectedTrip.status === 'assigned' ? 'bg-emerald-600 text-white shadow-emerald-950/40 active:scale-95' : 'bg-gray-900 text-gray-700 cursor-not-allowed opacity-50'
                        }`}
                      >
                        Start Journey
                      </button>
                      <button 
                        disabled={selectedTrip.status !== 'started' || isUpdatingStatus}
                        onClick={() => handleEndTrip(selectedTrip)}
                        className={`w-full py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all ${
                          selectedTrip.status === 'started' ? 'bg-red-600 text-white shadow-red-950/40 active:scale-95' : 'bg-gray-900 text-gray-700 cursor-not-allowed opacity-50'
                        }`}
                      >
                        End Journey
                      </button>
                      {['unassigned', 'assigned', 'started'].includes(selectedTrip.status) && (
                        <button 
                          disabled={isUpdatingStatus}
                          onClick={() => handleCancelTrip(selectedTrip)}
                          className="w-full py-5 bg-gray-900 text-gray-500 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:text-red-500 hover:bg-red-950/20 border border-gray-800 transition-all shadow-md"
                        >
                          Abort Trip
                        </button>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {isEditMode && selectedTrip && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Edit Manifest Data</h3>
                <button onClick={() => setIsEditMode(false)} className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-500 hover:text-white transition-all">✕</button>
             </div>

             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Pickup Address</label>
                      <input className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm outline-none text-white focus:border-purple-500" value={editFormData.pickupLocation} onChange={e => setEditFormData({...editFormData, pickupLocation: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Drop Address</label>
                      <input className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm outline-none text-white focus:border-purple-500" value={editFormData.dropLocation} onChange={e => setEditFormData({...editFormData, dropLocation: e.target.value})} />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Scheduled Start</label>
                      <input type="datetime-local" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm outline-none text-white focus:border-purple-500" value={editFormData.startDateTime ? editFormData.startDateTime.substring(0, 16) : ''} onChange={e => setEditFormData({...editFormData, startDateTime: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Allocate Driver</label>
                      <select className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none" value={editFormData.driverId} onChange={e => setEditFormData({...editFormData, driverId: e.target.value})}>
                        <option value="">-- UNASSIGNED --</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.displayId})</option>
                        ))}
                      </select>
                   </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button onClick={() => setIsEditMode(false)} className="flex-1 bg-gray-900 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-gray-400">Discard</button>
                  <button onClick={handleSaveEdit} className="flex-1 bg-purple-600 hover:bg-purple-700 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-white transition-all shadow-xl shadow-purple-900/40">Sync Updates</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {showBookingModal && canEdit && (
        <TripBookingModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} customers={customers} setCustomers={setCustomers} setTrips={setTrips} />
      )}
    </div>
  );
};

export default TripManagement;
