
import React, { useState, useEffect } from 'react';
import { Trip, Customer } from '../types.ts';
import { ICONS } from '../constants.tsx';

interface TripBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
}

const TripBookingModal: React.FC<TripBookingModalProps> = ({ isOpen, onClose, customers, setCustomers, setTrips }) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Resolve or Create Customer Identity
    let customer = customers.find(c => c.mobile === formData.mobileNumber);
    if (!customer) {
      customer = {
        id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        name: formData.customerName,
        mobile: formData.mobileNumber,
        homeAddress: '',
        officeAddress: '',
        vehicleModel: 'Standard Client'
      };
      setCustomers(prev => [...prev, customer!]);
    }

    // 2. Instantiate Trip Record
    const newTrip: Trip = {
      id: `TRIP-${Math.floor(10000 + Math.random() * 90000)}`,
      customerId: customer.id,
      pickupLocation: formData.pickupLocation,
      dropLocation: formData.tripType === 'one-way' ? formData.dropLocation : formData.pickupLocation,
      tripType: formData.tripType,
      startDateTime: `${formData.startDate}T${formData.startTime}`,
      endDateTime: `${formData.endDate}T${formData.endTime}`,
      status: 'unassigned',
      paymentStatus: 'pending',
      paymentMode: 'unpaid'
    };

    setTrips(prev => [newTrip, ...prev]);
    alert(`Success: Trip ${newTrip.id} registered for ${formData.customerName}`);
    onClose();
    setFormData({
      customerName: '',
      mobileNumber: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      tripType: 'one-way',
      pickupLocation: '',
      dropLocation: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[110] p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-2xl p-10 animate-in zoom-in duration-200 shadow-2xl relative overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-3xl font-black text-purple-500 tracking-tighter">New Trip Registry</h3>
            <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-1">Operational Dispatch Form</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-500 hover:text-white transition-all shadow-inner">
            {ICONS.Cancel}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-[0.2em]">Customer Name</label>
              <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} placeholder="e.g. John Smith" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-[0.2em]">Mobile Number</label>
              <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} placeholder="+91 00000 00000" />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-[0.2em]">Start Date</label>
              <input required type="date" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-[0.2em]">Start Time</label>
              <input required type="time" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-[0.2em]">End Date</label>
              <input required type="date" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-[0.2em]">End Time</label>
              <input required type="time" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-[0.2em]">Route Strategy</label>
              <div className="flex bg-gray-950 p-2 rounded-2xl border border-gray-800 shadow-inner">
                <button type="button" onClick={() => setFormData({...formData, tripType: 'one-way'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${formData.tripType === 'one-way' ? 'bg-purple-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-800'}`}>One-way</button>
                <button type="button" onClick={() => setFormData({...formData, tripType: 'round-trip'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest ${formData.tripType === 'round-trip' ? 'bg-purple-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-800'}`}>Round Trip</button>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-[0.2em]">Pickup Point</label>
              <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={formData.pickupLocation} onChange={e => setFormData({...formData, pickupLocation: e.target.value})} placeholder="Location, Landmarks" />
            </div>

            {formData.tripType === 'one-way' && (
              <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top duration-300">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-[0.2em]">Drop-off Point</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={formData.dropLocation} onChange={e => setFormData({...formData, dropLocation: e.target.value})} placeholder="Destination Details" />
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-900 hover:bg-gray-800 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest transition-all">Cancel</button>
            <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-purple-900/50 transition-all active:scale-95">Register Journey</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TripBookingModal;
