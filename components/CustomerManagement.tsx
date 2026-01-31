
import React, { useState, useEffect } from 'react';
import { Customer, Trip, User, UserRole } from '../types.ts';
import { ICONS } from '../constants.tsx';
import { supabase } from '../lib/supabase.js';

interface CustomerManagementProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  trips: Trip[];
  user: User;
  users: User[];
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, setCustomers, trips, user, users }) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [originalMobile, setOriginalMobile] = useState(''); // Track the original mobile for user lookup
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Credentials state for editing
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [accountStatus, setAccountStatus] = useState<'Active' | 'Disabled'>('Active');

  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    mobile: '',
    homeAddress: '',
    officeAddress: '',
    vehicleModel: '',
    displayId: '' 
  });

  const canManageCredentials = [UserRole.ADMIN, UserRole.OPS_MANAGER].includes(user.role);

  // When a customer is selected for editing, find their linked user account
  useEffect(() => {
    if (selectedCustomer) {
      setOriginalMobile(selectedCustomer.mobile);
      const linkedUser = users.find(u => u.username === selectedCustomer.mobile || u.mobile === selectedCustomer.mobile);
      if (linkedUser) {
        setLoginId(linkedUser.username);
        setPassword(linkedUser.password || '');
        setAccountStatus(linkedUser.status);
      } else {
        setLoginId(selectedCustomer.mobile);
        setPassword('');
        setAccountStatus('Active');
      }
    }
  }, [selectedCustomer, users]);

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
    if (selectedCustomer && canManageCredentials) {
      setIsSubmitting(true);
      const customerCode = selectedCustomer.displayId && selectedCustomer.displayId.trim() !== '' ? selectedCustomer.displayId : undefined;

      try {
        // 1. Update Customer Table
        const { data: custData, error: custError } = await supabase
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

        if (custError) throw custError;

        // 2. Sync Credentials in Users Table
        if (loginId.trim() !== '') {
          // Check if user already exists based on original mobile or current name
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .or(`username.eq.${originalMobile},username.eq.${loginId}`)
            .maybeSingle();

          const userPayload = {
            name: selectedCustomer.name,
            username: loginId,
            password: password,
            role: UserRole.CUSTOMER,
            status: accountStatus,
            mobile: selectedCustomer.mobile
          };

          if (existingUser) {
            await supabase.from('users').update(userPayload).eq('id', existingUser.id);
          } else {
            await supabase.from('users').insert([userPayload]);
          }
        }
        
        if (custData) {
           const c = custData as any;
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
           alert('Global Client Registry Updated (Profile & Login).');
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
        {canManageCredentials && (
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
              <th className="p-6">Account Status</th>
              <th className="p-6">Missions</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {customers.map(c => {
              const linkedUser = users.find(u => u.username.toLowerCase() === c.mobile.toLowerCase() || (u.mobile && u.mobile.toLowerCase() === c.mobile.toLowerCase()));
              const hasLogin = !!linkedUser;
              const isActive = linkedUser?.status === 'Active';

              return (
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
                    {hasLogin ? (
                      <span className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                        {isActive ? 'Login Active' : 'Access Revoked'}
                      </span>
                    ) : (
                      <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">
                        No Credentials
                      </span>
                    )}
                  </td>
                  <td className="p-6">
                    <span className="px-3 py-1 bg-black rounded-lg border border-gray-800 text-[9px] font-black text-gray-500">
                      {trips.filter(t => t.customerId === c.id).length} LOGGED
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                      {canManageCredentials ? (
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
              );
            })}
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

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[110] p-4 backdrop-blur-md">
          <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-2xl p-12 animate-in zoom-in duration-200 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-3xl font-black text-purple-500 uppercase tracking-tighter leading-none">Edit Client Profile</h3>
                <p className="text-[9px] text-gray-600 uppercase font-black tracking-[0.4em] mt-3">Unified Identity & Access Terminal</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-6">
                  <h4 className="text-[10px] text-gray-600 uppercase font-black tracking-widest border-b border-gray-900 pb-2 mb-4">Personal Identity</h4>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] text-purple-500 uppercase px-3 font-black tracking-widest">Business ID</label>
                    <input className="w-full bg-black border border-purple-500/20 rounded-2xl p-4 text-sm font-mono focus:border-purple-500 outline-none text-white shadow-inner" value={selectedCustomer.displayId} onChange={e => setSelectedCustomer({...selectedCustomer, displayId: e.target.value})} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Full Name</label>
                    <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={selectedCustomer.name} onChange={e => setSelectedCustomer({...selectedCustomer, name: e.target.value})} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Mobile Number (Primary)</label>
                    <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white font-mono shadow-inner" value={selectedCustomer.mobile} onChange={e => setSelectedCustomer({...selectedCustomer, mobile: e.target.value})} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Vehicle Asset</label>
                    <input className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={selectedCustomer.vehicleModel} onChange={e => setSelectedCustomer({...selectedCustomer, vehicleModel: e.target.value})} />
                  </div>
                </section>

                <section className="bg-black/40 p-8 rounded-[2.5rem] border border-gray-900 space-y-6">
                  <h4 className="text-[10px] text-blue-500 uppercase font-black tracking-widest border-b border-gray-800 pb-2 mb-4 flex justify-between items-center">
                    Digital Access Credentials
                    <span className={`w-2 h-2 rounded-full ${accountStatus === 'Active' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></span>
                  </h4>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Login ID (Username)</label>
                    <input 
                      required 
                      className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm font-mono focus:border-blue-500 outline-none text-white shadow-inner" 
                      placeholder="Enter Username"
                      value={loginId} 
                      onChange={e => setLoginId(e.target.value)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Security Pass (Password)</label>
                    <input 
                      required 
                      type="text"
                      className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm font-mono focus:border-blue-500 outline-none text-white shadow-inner" 
                      placeholder="Set new password"
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Gateway Access Status</label>
                    <select 
                      className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm font-black uppercase text-white shadow-inner focus:border-blue-500 outline-none"
                      value={accountStatus}
                      onChange={e => setAccountStatus(e.target.value as any)}
                    >
                      <option value="Active">Operational (Active)</option>
                      <option value="Disabled">Revoked (Disabled)</option>
                    </select>
                  </div>

                  <div className="mt-6 p-4 bg-blue-950/10 border border-blue-500/20 rounded-2xl">
                    <p className="text-[8px] text-blue-400 font-bold uppercase leading-relaxed tracking-wider">
                      Updating these values will immediately affect the customer's ability to log in to the Pilot-Client terminal. Ensure the Login ID is unique.
                    </p>
                  </div>
                </section>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-900">
                <button type="button" onClick={() => setSelectedCustomer(null)} className="flex-1 bg-gray-900 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest text-white shadow-lg hover:bg-gray-800 transition-all">Abort Sync</button>
                <button disabled={isSubmitting} type="submit" className="flex-[2] bg-purple-600 hover:bg-purple-700 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-purple-900/40 text-white transition-all active:scale-95">
                  {isSubmitting ? 'Atomic Update in Progress...' : 'Finalize Global Registry Update'}
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
