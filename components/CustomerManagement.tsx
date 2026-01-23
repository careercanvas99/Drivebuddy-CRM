
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
    vehicleModel: '',
    displayId: '' 
  });

  const isAdmin = user.role === UserRole.ADMIN;

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const customerCode = newCustomer.displayId && newCustomer.displayId.trim() !== '' ? newCustomer.displayId : undefined;

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          customer_name: newCustomer.name,
          mobile_number: newCustomer.mobile,
          home_address: newCustomer.homeAddress,
          office_address: newCustomer.officeAddress,
          vehicle_model: newCustomer.vehicleModel,
          customer_code: customerCode
        }] as any)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const c = data as any;
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
        alert('Client Protocol Synchronized.');
      }
      setShowAddModal(false);
      setNewCustomer({ name: '', mobile: '', homeAddress: '', officeAddress: '', vehicleModel: '', displayId: '' });
    } catch (err: any) {
      alert(`Persistence Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer && isAdmin) {
      setIsSubmitting(true);
      const customerCode = selectedCustomer.displayId && selectedCustomer.displayId.trim() !== '' ? selectedCustomer.displayId : undefined;

      try {
        const { data, error } = await supabase
          .from('customers')
          .update({
            customer_name: selectedCustomer.name,
            mobile_number: selectedCustomer.mobile,
            home_address: selectedCustomer.homeAddress,
            office_address: selectedCustomer.officeAddress,
            vehicle_model: selectedCustomer.vehicleModel,
            customer_code: customerCode
          } as any)
          .eq('id', selectedCustomer.id)
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
           const c = data as any;
           const updated: Customer = {
              id: c.id,
              displayId: c.customer_code,
              name: c.customer_name,
              mobile: c.mobile_number,
              homeAddress: c.home_address || '',
              officeAddress: c.office_address || '',
              vehicleModel: c.vehicle_model || 'Standard'
           };
           setCustomers(prev => prev.map(cust => cust.id === updated.id ? updated : cust));
           alert('Client Manifest Updated.');
        }
      } catch (err: any) {
        alert(`Persistence Update Error: ${err.message}`);
      } finally {
        setIsSubmitting(false);
        setSelectedCustomer(null);
      }
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('DANGER: Permanent deletion of client profile? Relational logs will be archived.')) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
        setCustomers(prev => prev.filter(c => c.id !== id));
      } catch (err: any) {
        alert(`Deletion Violation: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Client Hub</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Personnel Registry</p>
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
              <th className="p-6">Client / ID</th>
              <th className="p-6">Secure Mobile</th>
              <th className="p-6">Asset Detail</th>
              <th className="p-6">Missions</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-gray-900/40 transition-colors group">
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-sm font-black text-purple-500 border border-gray-800 shadow-inner">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white">{c.name}</div>
                      <div className="text-[9px] text-purple-500 font-mono font-bold tracking-widest">{c.displayId}</div>
                    </div>
                  </div>
                </td>
                <td className="p-6 text-purple-400 font-mono text-xs">{c.mobile}</td>
                <td className="p-6">
                  <div className="text-xs text-gray-400 font-medium">{c.vehicleModel}</div>
                  <div className="text-[9px] text-gray-600 truncate max-w-[150px] uppercase font-bold tracking-tighter">{c.homeAddress || 'Location withheld'}</div>
                </td>
                <td className="p-6">
                  <span className="px-3 py-1 bg-black rounded-lg border border-gray-800 text-[9px] font-black text-gray-500">
                    {trips.filter(t => t.customerId === c.id).length} LOGGED
                  </span>
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                    {isAdmin ? (
                      <>
                        <button onClick={() => setSelectedCustomer(c)} className="p-2.5 bg-gray-900 rounded-xl text-blue-500 hover:text-white transition-all shadow-sm">{ICONS.Edit}</button>
                        <button onClick={() => handleDeleteCustomer(c.id)} className="p-2.5 bg-gray-900 rounded-xl text-red-500 hover:text-white transition-all shadow-sm">{ICONS.Delete}</button>
                      </>
                    ) : (
                      <span className="text-[9px] text-gray-700 italic font-black uppercase tracking-widest">Locked</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[110] p-4 backdrop-blur-md">
          <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-lg p-10 animate-in zoom-in duration-200 shadow-2xl">
            <h3 className="text-3xl font-black mb-10 text-purple-500 uppercase tracking-tighter">Client Onboarding</h3>
            <form onSubmit={handleAddCustomer} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-purple-500 uppercase px-3 font-black tracking-widest">Business ID (Manual)</label>
                <input className="w-full bg-black border border-purple-500/20 rounded-2xl p-4 text-sm font-mono focus:border-purple-500 outline-none text-white shadow-inner" placeholder="e.g. CUST-1001" value={newCustomer.displayId} onChange={e => setNewCustomer({...newCustomer, displayId: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Full Name</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Mobile Number</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white font-mono shadow-inner" value={newCustomer.mobile} onChange={e => setNewCustomer({...newCustomer, mobile: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Vehicle Model</label>
                <input className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" placeholder="e.g. Toyota Camry" value={newCustomer.vehicleModel} onChange={e => setNewCustomer({...newCustomer, vehicleModel: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-900 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-white">Discard</button>
                <button disabled={isSubmitting} type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-purple-900/40 text-white">
                  {isSubmitting ? 'Syncing...' : 'Register Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
