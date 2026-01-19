
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
    const id = `CUST-${Math.floor(100 + Math.random() * 900)}`;
    const customerData = { ...newCustomer, id } as Customer;

    try {
      const { error } = await supabase
        .from('customers')
        .insert([customerData]);

      if (error) {
        console.error('Supabase Save Error Details:', error.message, error.details, error.hint);
        alert('Failed to save data: ' + error.message);
      } else {
        alert('Customer saved successfully');
        setCustomers(prev => [...prev, customerData]);
        setShowAddModal(false);
        setNewCustomer({
          name: '',
          mobile: '',
          homeAddress: '',
          officeAddress: '',
          vehicleModel: ''
        });
      }
    } catch (err: any) {
      console.error('Save Catch Error:', err.message || err);
      alert('Failed to save data due to a connection error.');
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCustomer && isAdmin) {
      try {
        const { error } = await supabase
          .from('customers')
          .update(selectedCustomer)
          .eq('id', selectedCustomer.id);

        if (error) {
          console.error('Supabase Update Error Details:', error.message, error.details, error.hint);
          throw error;
        }
        
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? selectedCustomer : c));
        setSelectedCustomer(null);
        alert('Customer profile updated successfully');
      } catch (err: any) {
        alert('Update failed: ' + (err.message || err));
      }
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('DANGER: This will delete the customer and potentially orphan their history. Proceed?')) {
      try {
        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Supabase Delete Error Details:', error.message, error.details, error.hint);
          throw error;
        }
        
        setCustomers(prev => prev.filter(c => c.id !== id));
        alert('Customer deleted from registry');
      } catch (err: any) {
        alert('Deletion failed: ' + (err.message || err));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Client Registry</h2>
          <p className="text-gray-400 text-sm">Onboard and manage customer profiles</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all shadow-lg shadow-purple-900/40"
          >
            {ICONS.Plus} Register Customer
          </button>
        )}
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-950 text-gray-400 border-b border-gray-800">
            <tr>
              <th className="p-4 font-medium uppercase tracking-wider text-xs">Customer Name</th>
              <th className="p-4 font-medium uppercase tracking-wider text-xs">Contact Information</th>
              <th className="p-4 font-medium uppercase tracking-wider text-xs">Registered Vehicle</th>
              <th className="p-4 font-medium uppercase tracking-wider text-xs">Activity</th>
              <th className="p-4 font-medium uppercase tracking-wider text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-purple-500">
                      {c.name.charAt(0)}
                    </div>
                    <span className="font-bold">{c.name}</span>
                  </div>
                </td>
                <td className="p-4 text-purple-400 font-mono text-xs">{c.mobile}</td>
                <td className="p-4 text-xs text-gray-400">{c.vehicleModel}</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-gray-950 rounded border border-gray-800 text-[10px] font-bold">
                    {trips.filter(t => t.customerId === c.id).length} TRIPS
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-3">
                    {isAdmin ? (
                      <>
                        <button 
                          onClick={() => setSelectedCustomer(c)} 
                          className="text-purple-500 hover:text-purple-400"
                          title="Edit Profile"
                        >
                          {ICONS.Edit}
                        </button>
                        <button 
                          onClick={() => handleDeleteCustomer(c.id)} 
                          className="text-red-500 hover:text-red-400"
                          title="Delete Client"
                        >
                          {ICONS.Delete}
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-600 italic">View Only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Customer Modal */}
      {selectedCustomer && isAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-lg p-8 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6 text-purple-500">Modify Profile: {selectedCustomer.name}</h3>
            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Full Name</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={selectedCustomer.name} onChange={e => setSelectedCustomer({...selectedCustomer, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Mobile Access</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={selectedCustomer.mobile} onChange={e => setSelectedCustomer({...selectedCustomer, mobile: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Primary Vehicle</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={selectedCustomer.vehicleModel} onChange={e => setSelectedCustomer({...selectedCustomer, vehicleModel: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Home Residence</label>
                <textarea className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm h-20 focus:border-purple-500 outline-none" value={selectedCustomer.homeAddress} onChange={e => setSelectedCustomer({...selectedCustomer, homeAddress: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Corporate Address</label>
                <textarea className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm h-20 focus:border-purple-500 outline-none" value={selectedCustomer.officeAddress} onChange={e => setSelectedCustomer({...selectedCustomer, officeAddress: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button type="button" onClick={() => setSelectedCustomer(null)} className="bg-gray-900 py-3 rounded-xl font-bold">Discard</button>
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 py-3 rounded-xl font-bold shadow-lg shadow-purple-900/40">Apply Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && isAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-lg p-8 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6 text-purple-500">Onboard New Client</h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Customer Full Name</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" placeholder="e.g. Rahul Sharma" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Mobile (Linked to App)</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" placeholder="+91 XXXXX XXXXX" value={newCustomer.mobile} onChange={e => setNewCustomer({...newCustomer, mobile: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Vehicle Details</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" placeholder="e.g. Audi A4 (White)" value={newCustomer.vehicleModel} onChange={e => setNewCustomer({...newCustomer, vehicleModel: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="bg-gray-900 py-3 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 py-3 rounded-xl font-bold shadow-lg shadow-purple-900/40">Register Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
