
import React, { useState } from 'react';
import { Driver, Trip, User, UserRole } from '../types.ts';
import { ICONS } from '../constants.tsx';
import { supabase } from '../lib/supabase.js';

interface DriverManagementProps {
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  trips: Trip[];
  users: User[];
  currentUser?: User;
}

const DriverManagement: React.FC<DriverManagementProps> = ({ drivers, setDrivers, trips, users, currentUser }) => {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Driver>>({
    name: '',
    licenseNumber: '',
    issueDate: '',
    expiryDate: '',
    address: '',
    permanentAddress: '',
    status: 'Available',
    displayId: '' 
  });

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOrEditDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const dbPayload = {
        name: formData.name,
        license_number: formData.licenseNumber,
        issue_date: formData.issueDate || null,
        expiry_date: formData.expiryDate || null,
        address: formData.address,
        permanent_address: formData.permanentAddress,
        status: formData.status,
        driver_code: formData.displayId || undefined
      };

      let result;
      if (selectedDriver) {
        const { data, error } = await supabase
          .from('drivers')
          .update(dbPayload as any)
          .eq('id', selectedDriver.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('drivers')
          .insert([dbPayload] as any)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      const updatedDriver: Driver = {
        id: result.id,
        displayId: result.driver_code,
        name: result.name,
        licenseNumber: result.license_number,
        issueDate: result.issue_date,
        expiryDate: result.expiry_date,
        address: result.address || '',
        permanentAddress: result.permanent_address || '',
        status: result.status as any,
        location: [result.location_lat || 17.3850, result.location_lng || 78.4867]
      };

      if (selectedDriver) {
        setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
      } else {
        setDrivers(prev => [...prev, updatedDriver]);
      }

      setShowAddModal(false);
      setSelectedDriver(null);
      alert('Pilot Registry Synchronized with SQL backend.');
    } catch (err: any) {
      alert(`Persistence Error: ${err.message}`);
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('DANGER: Permanently revoke pilot credentials?')) return;
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
      setDrivers(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      alert(`Deletion Error: ${err.message}`);
    }
  };

  const openEditModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setFormData({
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      issueDate: driver.issueDate,
      expiryDate: driver.expiryDate,
      address: driver.address,
      permanentAddress: driver.permanentAddress,
      status: driver.status,
      displayId: driver.displayId
    });
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Pilot Registry</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Personnel Credentials</p>
        </div>
        <button onClick={() => { 
          setSelectedDriver(null); 
          setFormData({ name: '', licenseNumber: '', issueDate: '', expiryDate: '', address: '', permanentAddress: '', status: 'Available', displayId: '' }); 
          setShowAddModal(true); 
        }} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl transition-all">
          {ICONS.Plus} Register Pilot
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map(driver => (
          <div key={driver.id} className="bg-gray-950 border border-gray-800 rounded-[2.5rem] p-7 shadow-xl group hover:border-purple-500/50 transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-purple-500 font-black text-xl shadow-inner uppercase">
                  {driver.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-white text-lg">{driver.name}</h4>
                  <p className="text-[10px] text-purple-500 font-mono font-bold tracking-widest">{driver.displayId}</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-8">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-gray-600">Status</span>
                  <span className={driver.status === 'Available' ? 'text-emerald-500' : 'text-blue-500'}>{driver.status}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-gray-600">License</span>
                  <span className="text-gray-300 font-mono">{driver.licenseNumber}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-gray-600">Missions</span>
                  <span className="text-white bg-gray-900 px-2 py-0.5 rounded-md">{trips.filter(t => t.driverId === driver.id && t.status === 'COMPLETED').length}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => openEditModal(driver)} className="flex-1 bg-gray-900 py-3 rounded-xl text-blue-500 hover:text-white transition-all border border-gray-800 font-black uppercase text-[10px] tracking-widest">{ICONS.Edit} Edit Profile</button>
              {isAdmin && (
                <button onClick={() => handleDeleteDriver(driver.id)} className="px-5 bg-gray-900 py-3 rounded-xl text-red-500 hover:bg-red-600/10 transition-all border border-gray-800">{ICONS.Delete}</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[110] p-4 backdrop-blur-md">
          <div className="bg-gray-950 border border-gray-800 rounded-[4rem] w-full max-w-2xl p-12 shadow-2xl overflow-y-auto max-h-[95vh] animate-in zoom-in duration-200">
            <h3 className="text-4xl font-black text-purple-500 uppercase tracking-tighter mb-10 leading-none">
              {selectedDriver ? 'Edit Pilot Credentials' : 'Pilot Registration'}
            </h3>
            
            <form onSubmit={handleAddOrEditDriver} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-600 uppercase font-black px-4 tracking-widest">Staff Code</label>
                  <input name="displayId" className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm text-white font-mono" placeholder="DBDY-HYD-DR-XXX" value={formData.displayId} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-600 uppercase font-black px-4 tracking-widest">Full Name</label>
                  <input required name="name" className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm text-white" placeholder="Professional Name" value={formData.name} onChange={handleFormChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-600 uppercase font-black px-4 tracking-widest">DL Number</label>
                  <input required name="licenseNumber" className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm text-white font-mono" placeholder="License Number" value={formData.licenseNumber} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-600 uppercase font-black px-4 tracking-widest">Status</label>
                  <select name="status" className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm text-white" value={formData.status} onChange={handleFormChange}>
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-600 uppercase font-black px-4 tracking-widest">Issue Date</label>
                  <input type="date" name="issueDate" className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm text-white" value={formData.issueDate} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-600 uppercase font-black px-4 tracking-widest">Expiry Date</label>
                  <input required type="date" name="expiryDate" className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm text-white" value={formData.expiryDate} onChange={handleFormChange} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-600 uppercase font-black px-4 tracking-widest">Local Address</label>
                  <input name="address" className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm text-white" placeholder="Current residential address" value={formData.address} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-600 uppercase font-black px-4 tracking-widest">Permanent Registry Address</label>
                  <input name="permanentAddress" className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm text-white" placeholder="Home address" value={formData.permanentAddress} onChange={handleFormChange} />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-900 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest text-white hover:bg-gray-800 transition-all">Discard</button>
                <button disabled={isSubmitting} type="submit" className="flex-1 bg-purple-600 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest text-white shadow-2xl transition-all">
                  {isSubmitting ? 'Syncing...' : 'Save Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverManagement;
