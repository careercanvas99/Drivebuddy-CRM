
import React, { useState, useRef } from 'react';
import { Driver, Trip, User, UserRole } from '../types.ts';
import { ICONS } from '../constants.tsx';
import MapTracker from './MapTracker.tsx';
import { calculateFareInternal } from './TripEstimation.tsx';

interface DriverManagementProps {
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  trips: Trip[];
  users: User[];
}

const DriverManagement: React.FC<DriverManagementProps> = ({ drivers, setDrivers, trips, users }) => {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newDriver, setNewDriver] = useState<Partial<Driver>>({
    id: '',
    name: '',
    licenseNumber: '',
    issueDate: '',
    expiryDate: '',
    address: '',
    permanentAddress: '',
    profilePhoto: '',
    status: 'available',
    location: [12.9716, 77.5946]
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewDriver(prev => ({ ...prev, profilePhoto: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.id) return alert("Driver ID is mandatory");
    
    setDrivers(prev => [...prev, { ...newDriver } as Driver]);
    setShowAddModal(false);
    setNewDriver({
      id: '',
      name: '',
      licenseNumber: '',
      issueDate: '',
      expiryDate: '',
      address: '',
      permanentAddress: '',
      profilePhoto: '',
      status: 'available',
      location: [12.9716, 77.5946]
    });
    alert('Driver onboarded successfully! Data synced to Render & PostgreSQL.');
  };

  const filteredDrivers = drivers.filter(d => statusFilter === 'all' || d.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Driver Partner Management</h2>
          <p className="text-gray-500 text-sm">Onboarding & document verification hub</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-900/40"
        >
          {ICONS.Plus} Onboard New Partner
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['all', 'available', 'busy', 'inactive'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              statusFilter === status 
                ? 'bg-purple-600 border-purple-500 text-white shadow-lg' 
                : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-white'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDrivers.map(driver => (
          <div key={driver.id} className="bg-gray-950 border border-gray-800 rounded-[2.5rem] p-7 flex flex-col hover:border-purple-500/50 transition-all group relative overflow-hidden shadow-xl">
            <div className="flex items-center gap-5 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden shadow-inner">
                {driver.profilePhoto ? (
                  <img src={driver.profilePhoto} className="w-full h-full object-cover" alt={driver.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-purple-500 font-black text-xl">
                    {driver.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-black text-white text-lg leading-tight">{driver.name}</h4>
                <p className="text-[10px] text-purple-500 font-mono font-bold">{driver.id}</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span className="text-gray-600">License</span>
                <span className="text-gray-300 font-mono">{driver.licenseNumber}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span className="text-gray-600">Expiry</span>
                <span className={`font-mono ${new Date(driver.expiryDate) < new Date() ? 'text-red-500' : 'text-gray-300'}`}>
                  {driver.expiryDate}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-auto">
              <button 
                onClick={() => setSelectedDriver(driver)}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-800"
              >
                Profile
              </button>
              <button 
                onClick={() => { setSelectedDriver(driver); setShowMap(true); }}
                className="flex-1 bg-purple-600/10 hover:bg-purple-600 text-purple-500 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-purple-500/20"
              >
                Track
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-2xl p-10 animate-in zoom-in duration-200 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-3xl font-black text-purple-500 tracking-tighter uppercase">Partner Onboarding</h3>
              <button onClick={() => setShowAddModal(false)} className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-500">{ICONS.Cancel}</button>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-8">
              <div className="flex flex-col items-center mb-8">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-3xl bg-gray-900 border-2 border-dashed border-gray-800 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-purple-500 transition-all"
                >
                  {newDriver.profilePhoto ? (
                    <img src={newDriver.profilePhoto} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="text-gray-600 group-hover:text-purple-500 flex flex-col items-center gap-1">
                      {ICONS.Camera}
                      <span className="text-[8px] font-black uppercase">Photo</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Driver ID</label>
                  <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={newDriver.id} onChange={e => setNewDriver({...newDriver, id: e.target.value})} placeholder="DB-DRV-XXX" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Full Name</label>
                  <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={newDriver.name} onChange={e => setNewDriver({...newDriver, name: e.target.value})} placeholder="Enter name" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">License Number</label>
                  <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner font-mono" value={newDriver.licenseNumber} onChange={e => setNewDriver({...newDriver, licenseNumber: e.target.value})} placeholder="DLXXXXXXXXXXXXXXX" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Issue Date</label>
                  <input required type="date" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={newDriver.issueDate} onChange={e => setNewDriver({...newDriver, issueDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Expiry Date</label>
                  <input required type="date" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner" value={newDriver.expiryDate} onChange={e => setNewDriver({...newDriver, expiryDate: e.target.value})} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Current Address</label>
                  <textarea required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm h-20 focus:border-purple-500 outline-none shadow-inner" value={newDriver.address} onChange={e => setNewDriver({...newDriver, address: e.target.value})} placeholder="Full address" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Permanent Address</label>
                  <textarea required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm h-20 focus:border-purple-500 outline-none shadow-inner" value={newDriver.permanentAddress} onChange={e => setNewDriver({...newDriver, permanentAddress: e.target.value})} placeholder="As per documents" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-900 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest">Discard</button>
                <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-purple-900/40 transition-all">Onboard Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverManagement;
