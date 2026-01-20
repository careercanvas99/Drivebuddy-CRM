
import React, { useState } from 'react';
import { Customer, Trip, User, UserRole } from '../types.ts';
import { ICONS } from '../constants.tsx';
import { supabase } from '../lib/supabase.js';

interface CustomerManagementProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  trips: Trip[];
  user: User;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, setCustomers, trips, user }) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    mobile: '',
    homeAddress: '',
    officeAddress: '',
    vehicleModel: ''
  });

  const isAdmin = user.role === UserRole.ADMIN;

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // DATABASE ENFORCED: Supabase handles UUID generation. 
      // Manual 'CUST-xxx' generation removed to prevent foreign key errors.
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: newCustomer.name,
          mobile: newCustomer.mobile,
          home_address: newCustomer.homeAddress,
          office_address: newCustomer.officeAddress,
          vehicle_model: newCustomer.vehicleModel
        }])
        .select();

      if (error) throw error;

      if (data) {
        const addedCust: Customer = {
          id: data[0].id,
          name: data[0].name,
          mobile: data[0].mobile,
          homeAddress: data[0].home_address || '',
          officeAddress: data[0].office_address || '',
          vehicleModel: data[0].vehicle_model || 'Standard'
        };
        setCustomers(prev => [...prev, addedCust]);
        alert('Client onboarding successful.');
      }
      setShowAddModal(false);
      setNewCustomer({ name: '', mobile: '', homeAddress: '', officeAddress: '', vehicleModel: '' });
    } catch (err: any) {
      alert(`Onboarding Failure: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer && isAdmin) {
      try {
        const { error } = await supabase
          .from('customers')
          .update({
            name: selectedCustomer.name,
            mobile: selectedCustomer.mobile,
            home_address: selectedCustomer.homeAddress,
            office_address: selectedCustomer.officeAddress,
            vehicle_model: selectedCustomer.vehicleModel
          })
          .eq('id', selectedCustomer.id);

        if (error) throw error;
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? selectedCustomer : c));
        alert('Profile updated.');
      } catch (err: any) {
        alert(`Update Error: ${err.message}`);
      }
      setSelectedCustomer(null);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('DANGER: Permanent deletion of client record? Existing trips for this customer will persist but display as Guest.')) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
        setCustomers(prev => prev.filter(c => c.id !== id));
      } catch (err: any) {
        alert(`Delete Error: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white">Client Registry</h2>
          <p className="text-gray-400 text-sm">Centralized customer profile management</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-900/40"
          >
            {ICONS.Plus} Register Client
          </button>
        )}
      </div>

      <div className="bg-gray-950 rounded-[2.5rem] border border-gray-900 overflow-hidden shadow-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-black text-gray-600 border-b border-gray-900 font-black uppercase text-[9px] tracking-widest">
            <tr>
              <th className="p-6">Client Name</th>
              <th className="p-6">Secure Contact</th>
              <th className="p-6">Primary Asset</th>
              <th className="p-6">Activity Index</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-gray-900/40 transition-colors group">
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-sm font-black text-purple-500 border border-gray-800">
                      {c.name.charAt(0)}
                    </div>
                    <span className="font-bold text-white">{c.name}</span>
                  </div>
                </td>
                <td className="p-6 text-purple-400 font-mono text-xs">{c.mobile}</td>
                <td className="p-6 text-xs text-gray-400 font-medium">{c.vehicleModel}</td>
                <td className="p-6">
                  <span className="px-3 py-1 bg-black rounded-lg border border-gray-800 text-[9px] font-black text-gray-500">
                    {trips.filter(t => t.customerId === c.id).length} TRIPS
                  </span>
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                    {isAdmin ? (
                      <>
                        <button 
                          onClick={() => setSelectedCustomer(c)} 
                          className="p-2 bg-gray-900 rounded-xl text-blue-500 hover:text-white transition-all"
                          title="Edit Profile"
                        >
                          {ICONS.Edit}
                        </button>
                        <button 
                          onClick={() => handleDeleteCustomer(c.id)} 
                          className="p-2 bg-gray-900 rounded-xl text-red-500 hover:text-white transition-all"
                          title="Delete Client"
                        >
                          {ICONS.Delete}
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-700 italic font-black uppercase tracking-tighter">Read Only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-lg p-10 animate-in zoom-in duration-200 shadow-2xl">
            <h3 className="text-3xl font-black mb-10 text-purple-500 uppercase tracking-tighter">Client Onboarding</h3>
            <form onSubmit={handleAddCustomer} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Full Name</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" placeholder="e.g. Rahul Sharma" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Mobile Number</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white font-mono shadow-inner" placeholder="+91 XXXXX XXXXX" value={newCustomer.mobile} onChange={e => setNewCustomer({...newCustomer, mobile: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Primary Vehicle</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" placeholder="e.g. Audi A4 (White)" value={newCustomer.vehicleModel} onChange={e => setNewCustomer({...newCustomer, vehicleModel: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-900 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-gray-400">Cancel</button>
                <button disabled={isSubmitting} type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-white shadow-xl shadow-purple-900/40">
                  {isSubmitting ? 'Syncing...' : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-lg p-10 animate-in zoom-in duration-200 shadow-2xl">
            <h3 className="text-3xl font-black mb-10 text-purple-500 uppercase tracking-tighter">Modify Profile</h3>
            <form onSubmit={handleUpdateCustomer} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Full Name</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white" value={selectedCustomer.name} onChange={e => setSelectedCustomer({...selectedCustomer, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Secure Contact</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white" value={selectedCustomer.mobile} onChange={e => setSelectedCustomer({...selectedCustomer, mobile: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Home Address</label>
                <textarea className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm h-24 focus:border-purple-500 outline-none text-white" value={selectedCustomer.homeAddress} onChange={e => setSelectedCustomer({...selectedCustomer, homeAddress: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setSelectedCustomer(null)} className="flex-1 bg-gray-900 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-gray-400">Discard</button>
                <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-white shadow-xl">Apply Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
