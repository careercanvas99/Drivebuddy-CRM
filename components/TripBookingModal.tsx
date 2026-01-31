
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
    tripRoute: 'Instation' as 'Instation' | 'Outstation',
    tripType: 'one-way' as 'one-way' | 'round-trip',
    pickupLocation: '',
    dropLocation: '',
    vehicleModel: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let customerId: string | null = null;
      
      // 1. ATOMIC CUSTOMER UPSERT
      const { data: existing, error: findError } = await supabase
        .from('customers')
        .select('id')
        .eq('mobile_number', formData.mobileNumber)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        customerId = existing.id;
        await supabase
          .from('customers')
          .update({ 
            customer_name: formData.customerName,
            vehicle_model: formData.vehicleModel 
          } as any)
          .eq('id', customerId);
      } else {
        const { data: newCust, error: custError } = await supabase
          .from('customers')
          .insert([{
            customer_name: formData.customerName,
            mobile_number: formData.mobileNumber,
            vehicle_model: formData.vehicleModel || 'Standard'
          }] as any)
          .select()
          .single();
        
        if (custError) throw custError;
        customerId = (newCust as any).id;
      }

      if (!customerId) throw new Error("Manifest Sync Error: Client ID could not be generated.");

      // 2. MISSION REGISTRY CREATION
      const tripPayload = {
        customer_id: customerId,
        pickup_location: formData.pickupLocation,
        drop_location: formData.tripType === 'one-way' ? formData.dropLocation : formData.pickupLocation,
        trip_type: formData.tripType,
        trip_route: formData.tripRoute,
        start_time: `${formData.startDate}T${formData.startTime}:00`,
        end_time: `${formData.endDate}T${formData.endTime}:00`,
        trip_status: 'NEW'
      };

      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert([tripPayload] as any)
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
            tripRoute: t.trip_route || 'Instation',
            startDateTime: t.start_time,
            endDateTime: t.end_time,
            status: t.trip_status as any
        };
        setTrips(prev => [mappedTrip, ...prev]);
        alert(`Mission Registry Authenticated: ${t.trip_code}`);
      }

      onClose();
    } catch (err: any) {
      alert(`Manifest Core Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-[4rem] w-full max-w-2xl p-10 shadow-2xl overflow-y-auto max-h-[95vh] animate-in zoom-in duration-300 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-purple-600 shadow-[0_0_20px_#9333ea]"></div>
        
        <div className="flex justify-between items-start mb-10">
          <div>
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Manifest Command</h3>
            <p className="text-[10px] text-purple-500 font-black uppercase tracking-[0.4em] mt-3">Mission Launch Terminal</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-500 hover:text-white transition-all active:scale-90 font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 p-8 rounded-[2.5rem] border border-gray-900 shadow-inner">
            <div className="space-y-2">
              <label className="text-[9px] text-gray-600 uppercase px-4 font-black tracking-widest">Client Name</label>
              <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm text-white focus:border-purple-500 outline-none" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-gray-600 uppercase px-4 font-black tracking-widest">Mobile Number</label>
              <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm text-white focus:border-purple-500 outline-none font-mono" value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[9px] text-gray-600 uppercase px-4 font-black tracking-widest">Vehicle Asset Model</label>
              <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm text-white focus:border-purple-500 outline-none" placeholder="e.g. Mercedes-Benz GLE / Toyota Fortuner" value={formData.vehicleModel} onChange={e => setFormData({...formData, vehicleModel: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[9px] text-gray-600 uppercase px-4 font-black tracking-widest">Start Schedule</label>
              <div className="flex gap-2">
                <input required type="date" className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-3 text-[11px] text-white focus:border-purple-500 outline-none" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                <input required type="time" className="w-24 bg-gray-900 border border-gray-800 rounded-xl p-3 text-[11px] text-white focus:border-purple-500 outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-gray-600 uppercase px-4 font-black tracking-widest">End Schedule</label>
              <div className="flex gap-2">
                <input required type="date" className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-3 text-[11px] text-white focus:border-purple-500 outline-none" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                <input required type="time" className="w-24 bg-gray-900 border border-gray-800 rounded-xl p-3 text-[11px] text-white focus:border-purple-500 outline-none" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[9px] text-gray-600 uppercase px-4 font-black tracking-widest">Mission Route</label>
              <div className="flex bg-gray-900 p-2 rounded-2xl border border-gray-800">
                <button type="button" onClick={() => setFormData({...formData, tripRoute: 'Instation'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.tripRoute === 'Instation' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-600'}`}>Instation</button>
                <button type="button" onClick={() => setFormData({...formData, tripRoute: 'Outstation'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.tripRoute === 'Outstation' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-600'}`}>Outstation</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-gray-600 uppercase px-4 font-black tracking-widest">Mission Pattern</label>
              <div className="flex bg-gray-900 p-2 rounded-2xl border border-gray-800">
                <button type="button" onClick={() => setFormData({...formData, tripType: 'one-way'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.tripType === 'one-way' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-600'}`}>One-way</button>
                <button type="button" onClick={() => setFormData({...formData, tripType: 'round-trip'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.tripType === 'round-trip' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-600'}`}>Round Trip</button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] text-gray-600 uppercase px-4 font-black tracking-widest">Pickup Logistics</label>
              <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm text-white focus:border-purple-500 outline-none" placeholder="Exact address" value={formData.pickupLocation} onChange={e => setFormData({...formData, pickupLocation: e.target.value})} />
            </div>
            {formData.tripType === 'one-way' && (
              <div className="space-y-2 animate-in slide-in-from-top duration-300">
                <label className="text-[9px] text-gray-600 uppercase px-4 font-black tracking-widest">Drop Logistics</label>
                <input required className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm text-white focus:border-purple-500 outline-none" placeholder="Target address" value={formData.dropLocation} onChange={e => setFormData({...formData, dropLocation: e.target.value})} />
              </div>
            )}
          </div>
          
          <div className="flex gap-4 pt-4 border-t border-gray-900">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-900 hover:bg-gray-800 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest text-gray-500 transition-all">Abort</button>
            <button disabled={isSubmitting} type="submit" className="flex-[2] bg-purple-600 hover:bg-purple-700 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-purple-950/40 text-white transition-all">
              {isSubmitting ? 'Syncing...' : 'Register Mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TripBookingModal;
