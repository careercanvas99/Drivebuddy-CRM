
import React, { useState, useRef } from 'react';
import { Driver, Trip, User, UserRole } from '../types.ts';
import { ICONS } from '../constants.tsx';
import { supabase } from '../lib/supabase.js';

interface DriverManagementProps {
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  trips: Trip[];
  users: User[];
}

const DriverManagement: React.FC<DriverManagementProps> = ({ drivers, setDrivers, trips, users }) => {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState<Partial<Driver>>({
    name: '',
    licenseNumber: '',
    issueDate: '',
    expiryDate: '',
    address: '',
    permanentAddress: '',
    status: 'available',
    displayId: '',
    location: [12.9716, 77.5946]
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOrEditDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (selectedDriver) {
        // SQL SYNC: Update existing pilot registry
        // Fix: Cast update payload to any to avoid property casing mismatches with Driver interface
        const { data, error } = await supabase
          .from('drivers')
          .update({
            name: formData.name,
            license_number: formData.licenseNumber,
            issue_date: formData.issueDate,
            expiry_date: formData.expiryDate,
            status: formData.status,
            driver_code: formData.displayId || undefined 
          } as any)
          .eq('id', selectedDriver.id)
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          // Fix: Cast response to any for mapping snake_case to camelCase Driver object
          const d = data as any;
          const updated: Driver = {
            id: d.id,
            displayId: d.driver_code,
            name: d.name,
            licenseNumber: d.license_number,
            issueDate: d.issue_date,
            expiryDate: d.expiry_date,
            address: d.address || '',
            permanentAddress: d.permanent_address || '',
            status: d.status as 'available' | 'busy' | 'inactive',
            location: [d.location_lat || 12.9716, d.location_lng || 77.5946]
          };
          setDrivers(prev => prev.map(drv => drv.id === selectedDriver.id ? updated : drv));
          alert('Pilot Registry Synchronized successfully.');
        }
      } else {
        // SQL SYNC: Register new pilot
        // Fix: Cast insert payload to any to avoid property casing mismatches
        const { data, error } = await supabase
          .from('drivers')
          .insert([{
            name: formData.name,
            license_number: formData.licenseNumber,
            issue_date: formData.issueDate,
            expiry_date: formData.expiryDate,
            status: formData.status,
            driver_code: formData.displayId || undefined,
            location_lat: formData.location?.[0],
            location_lng: formData.location?.[1]
          }] as any)
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
            // Fix: Cast response to any for mapping snake_case to camelCase Driver object
            const d = data as any;
            const addedDriver: Driver = {
                id: d.id,
                displayId: d.driver_code,
                name: d.name,
                licenseNumber: d.license_number,
                issueDate: d.issue_date,
                expiryDate: d.expiry_date,
                address: d.address || '',
                permanentAddress: d.permanent_address || '',
                status: d.status as 'available' | 'busy' | 'inactive',
                location: [d.location_lat || 12.9716, d.location_lng || 77.5946]
            };
            setDrivers(prev => [...prev, addedDriver]);
            alert(`Pilot Registered: Business ID ${d.driver_code}`);
        }
      }
      
      setShowAddModal(false);
      setSelectedDriver(null);
      setFormData({
        name: '',
        licenseNumber: '',
        issueDate: '',
        expiryDate: '',
        address: '',
        permanentAddress: '',
        status: 'available',
        displayId: '',
        location: [12.9716, 77.5946]
      });
    } catch (err: any) {
      alert(`Onboarding/Edit Error: ${err.message}. ${err.code === '23505' ? 'This ID or License is already registered.' : ''}`);
    } finally {
      setIsSubmitting(false);
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
      displayId: driver.displayId,
      location: driver.location
    });
    setShowAddModal(true);
  };

  const filteredDrivers = drivers.filter(d => statusFilter === 'all' || d.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Pilot Registry</h2>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Driver Partner Fleet Management</p>
        </div>
        <button 
          onClick={() => { setSelectedDriver(null); setShowAddModal(true); setFormData({ name: '', licenseNumber: '', issueDate: '', expiryDate: '', address: '', permanentAddress: '', status: 'available', displayId: '', location: [12.9716, 77.5946] }); }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-900/40"
        >
          {ICONS.Plus} Onboard Partner
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
                <div className="w-full h-full flex items-center justify-center text-purple-500 font-black text-xl">
                  {driver.name.charAt(0)}
                </div>
              </div>
              <div>
                <h4 className="font-black text-white text-lg leading-tight">{driver.name}</h4>
                <p className="text-[10px] text-purple-500 font-mono font-bold tracking-widest uppercase">{driver.displayId}</p>
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
                onClick={() => openEditModal(driver)}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-800"
              >
                Modify Registry
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-2xl p-10 animate-in zoom-in duration-200 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-3xl font-black text-purple-500 tracking-tighter uppercase">{selectedDriver ? 'Modify Registry' : 'Partner Onboarding'}</h3>
              <button onClick={() => { setShowAddModal(false); setSelectedDriver(null); }} className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-500">✕</button>
            </div>

            <form onSubmit={handleAddOrEditDriver} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Full Name</label>
                  <input required name="name" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner text-white" value={formData.name} onChange={handleFormChange} placeholder="Enter name" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] text-purple-500 uppercase px-3 font-black tracking-widest">Pilot Business ID (Override)</label>
                  <input name="displayId" className="w-full bg-gray-900 border border-purple-500/20 rounded-2xl p-4 text-sm font-mono focus:border-purple-500 outline-none text-white shadow-inner" value={formData.displayId} onChange={handleFormChange} placeholder="e.g. DBDY-HYD-DR-001" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">License Number</label>
                  <input required name="licenseNumber" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner font-mono text-white" value={formData.licenseNumber} onChange={handleFormChange} placeholder="DLXXXXXXXXXXXXXXX" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Issue Date</label>
                  <input required name="issueDate" type="date" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner text-white" value={formData.issueDate} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Expiry Date</label>
                  <input required name="expiryDate" type="date" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner text-white" value={formData.expiryDate} onChange={handleFormChange} />
                </div>
                <div className="space-y-2 md:col-span-2">
                   <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Partner Status</label>
                   <select name="status" className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none shadow-inner text-white" value={formData.status} onChange={handleFormChange}>
                     <option value="available">Available</option>
                     <option value="busy">In Transit (Busy)</option>
                     <option value="inactive">Suspended (Inactive)</option>
                   </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowAddModal(false); setSelectedDriver(null); }} className="flex-1 bg-gray-900 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-white">Discard</button>
                <button disabled={isSubmitting} type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-purple-900/40 transition-all disabled:opacity-50 text-white">
                   {isSubmitting ? 'Syncing...' : (selectedDriver ? 'Save Registry' : 'Onboard Partner')}
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
