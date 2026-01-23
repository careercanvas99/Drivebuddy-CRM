
import React, { useState } from 'react';
import { Trip, Customer } from '../types.ts';
import { supabase } from '../lib/supabase.js';

interface TripBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
}

const TripBookingModal: React.FC<TripBookingModalProps> = ({ isOpen, onClose, customers, setCustomers, setTrips }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    mobileNumber: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    tripType: 'one-way' as 'one-way' | 'round-trip',
    pickupLocation: '',
    dropLocation: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let customerId: string | null = null;
      
      // STEP 1: Check if Customer Exists (SQL Protocol)
      const { data: existingCustomer, error: findError } = await supabase
        .from('customers')
        .select('id')
        .eq('mobile_number', formData.mobileNumber)
        .maybeSingle();

      if (findError) throw findError;

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // STEP 2: If Not Exists -> Insert Customer (SQL Protocol)
        const { data: newCust, error: custError } = await supabase
          .from('customers')
          .insert([{
            customer_name: formData.customerName,
            mobile_number: formData.mobileNumber,
            vehicle_model: 'Standard'
          }] as any)
          .select()
          .single();
        
        if (custError) throw custError;
        
        const c = newCust as any;
        customerId = c.id;
        
        // Update local state to include new customer
        const addedCust: Customer = {
          id: c.id,
          displayId: c.customer_code,
          name: c.customer_name,
          mobile: c.mobile_number,
          homeAddress: c.home_address || '',
          officeAddress: c.office_address || '',
          vehicleModel: c.vehicle_model || 'Standard'
        };
        setCustomers(prev => [...prev, addedCust]);
      }

      if (!customerId) throw new Error("Internal Sequence Error: Customer ID missing after registration.");

      // STEP 3: Create Trip Using customer_id (SQL Protocol)
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert([{
          customer_id: customerId,
          pickup_location: formData.pickupLocation,
          drop_location: formData.tripType === 'one-way' ? formData.dropLocation : formData.pickupLocation,
          trip_type: formData.tripType,
          start_time: `${formData.startDate}T${formData.startTime}:00`,
          end_time: `${formData.endDate}T${formData.endTime}:00`,
          trip_status: 'unassigned'
        }] as any)
        .select()
        .single();

      if (tripError) throw tripError;

      if (tripData) {
        const t = tripData as any;
        const mappedTrip: Trip = {
            id: t.id,
            displayId: t.trip_code, 
            customerId: t.customer_id,
            pickupLocation: t.pickup_location,
            dropLocation: t.drop_location,
            tripType: t.trip_type,
            startDateTime: t.start_time,
            endDateTime: t.end_time,
            status: t.trip_status as any
        };
        setTrips(prev => [mappedTrip, ...prev]);
        alert(`Mission Logged Successfully: ${t.trip_code}`);
      }

      onClose();
    } catch (err: any) {
      alert(`Persistence Failure: ${err.message}`);
      console.error("SQL Save Error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-3xl font-black text-purple-500 uppercase tracking-tighter">Manifest Entry</h3>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Operational Protocol Registry</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-500 hover:text-white transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Client Name</label>
              <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Mobile Number</label>
              <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner font-mono" value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Launch Date</label>
              <input required type="date" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner text-white" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Time</label>
              <input required type="time" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner text-white" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Est. Return Date</label>
              <input required type="date" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner text-white" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Time</label>
              <input required type="time" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner text-white" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Pattern</label>
            <div className="flex bg-gray-900 p-2 rounded-2xl border border-gray-800 shadow-inner">
              <button type="button" onClick={() => setFormData({...formData, tripType: 'one-way'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${formData.tripType === 'one-way' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}>One-way</button>
              <button type="button" onClick={() => setFormData({...formData, tripType: 'round-trip'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${formData.tripType === 'round-trip' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-600 hover:text-white'}`}>Round Trip</button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Pickup Address</label>
              <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm outline-none text-white shadow-inner" value={formData.pickupLocation} onChange={e => setFormData({...formData, pickupLocation: e.target.value})} />
            </div>
            {formData.tripType === 'one-way' && (
              <div className="space-y-2 animate-in slide-in-from-top duration-300">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Destination</label>
                <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm outline-none text-white shadow-inner" value={formData.dropLocation} onChange={e => setFormData({...formData, dropLocation: e.target.value})} />
              </div>
            )}
          </div>
          
          <div className="flex gap-4 pt-6">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-900 hover:bg-gray-800 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-gray-400">Discard</button>
            <button disabled={isSubmitting} type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-purple-950/40 disabled:opacity-50 text-white transition-all active:scale-95">
              {isSubmitting ? 'Processing...' : 'Register Mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TripBookingModal;
