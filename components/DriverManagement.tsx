
import React, { useState, useEffect } from 'react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [driverHistory, setDriverHistory] = useState<any[]>([]);
  
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [accountStatus, setAccountStatus] = useState<'Active' | 'Disabled'>('Active');
  const [originalUsername, setOriginalUsername] = useState('');

  const [formData, setFormData] = useState<Partial<Driver> & { mobile?: string }>({
    name: '',
    licenseNumber: '',
    issueDate: '',
    expiryDate: '',
    address: '',
    permanentAddress: '',
    status: 'Available',
    displayId: '',
    mobile: ''
  });

  const canManageCredentials = currentUser && [UserRole.ADMIN, UserRole.OPS_MANAGER].includes(currentUser.role);
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  useEffect(() => {
    if (selectedDriver) {
      const linkedUser = users.find(u => u.name === selectedDriver.name || u.displayId === selectedDriver.displayId);
      if (linkedUser) {
        setLoginId(linkedUser.username);
        setPassword(linkedUser.password || '');
        setAccountStatus(linkedUser.status);
        setOriginalUsername(linkedUser.username);
        setFormData(prev => ({ ...prev, mobile: linkedUser.mobile || '' }));
      } else {
        setLoginId('');
        setPassword('');
        setAccountStatus('Active');
        setOriginalUsername('');
      }
      fetchDriverHistory(selectedDriver.id);
    } else {
      setDriverHistory([]);
    }
  }, [selectedDriver, users]);

  const fetchDriverHistory = async (driverId: string) => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`*, customer:customers(customer_name)`)
        .eq('driver_id', driverId)
        .eq('trip_status', 'COMPLETED')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setDriverHistory(data || []);
    } catch (err) {
      console.error("Mission Log Retrieval Failure:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleToggleDriverAccount = async (driver: Driver) => {
    if (!isAdmin) return;
    const linkedUser = users.find(u => u.name === driver.name || u.displayId === driver.displayId);
    if (!linkedUser) {
      alert("System Error: No credential record mapped to this identity.");
      return;
    }

    const newStatus = linkedUser.status === 'Active' ? 'Disabled' : 'Active';
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', linkedUser.id);
      if (error) throw error;
      alert(`Pilot access has been ${newStatus === 'Active' ? 'RESTORED' : 'REVOKED'}.`);
    } catch (err: any) {
      alert(`Status Fault: ${err.message}`);
    }
  };

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
        const { data, error } = await supabase.from('drivers').update(dbPayload as any).eq('id', selectedDriver.id).select().single();
        if (error) throw error;
        result = data;
        if (canManageCredentials && loginId.trim() !== '') {
          const { data: existingUser } = await supabase.from('users').select('id').or(`username.eq.${originalUsername},username.eq.${loginId}`).maybeSingle();
          const userPayload = { name: formData.name, username: loginId, password: password, role: UserRole.DRIVER, status: accountStatus, mobile: formData.mobile, staff_code: result.driver_code };
          if (existingUser) { await supabase.from('users').update(userPayload).eq('id', existingUser.id); } 
          else { await supabase.from('users').insert([userPayload]); }
        }
      } else {
        const { data, error } = await supabase.from('drivers').insert([dbPayload] as any).select().single();
        if (error) throw error;
        result = data;
      }

      const updatedDriver: Driver = {
        id: result.id, displayId: result.driver_code, name: result.name, licenseNumber: result.license_number,
        issueDate: result.issue_date, expiryDate: result.expiry_date, address: result.address || '',
        permanentAddress: result.permanent_address || '', status: result.status as any,
        location: [result.location_lat || 17.3850, result.location_lng || 78.4867]
      };

      if (selectedDriver) { setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d)); } 
      else { setDrivers(prev => [...prev, updatedDriver]); }

      setShowAddModal(false);
      setSelectedDriver(null);
      alert('Pilot Registry Synchronized.');
    } catch (err: any) { alert(`Persistence Fault: ${err.message}`); } finally { setIsSubmitting(false); }
  };

  const handleDeleteDriver = async (id: string) => {
    if (currentUser?.role !== UserRole.ADMIN) return;
    const confirmed = window.confirm(
      'CRITICAL: Purge pilot record from global registry? This action archives mission biometric links permanently.'
    );
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
      setDrivers(prev => prev.filter(d => d.id !== id));
      alert('Pilot record purged successfully.');
    } catch (err: any) { alert(`Deletion Error: ${err.message}`); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Pilot Registry</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Global Operational Staff</p>
        </div>
        <button onClick={() => { 
          setSelectedDriver(null); 
          setFormData({ name: '', licenseNumber: '', issueDate: '', expiryDate: '', address: '', permanentAddress: '', status: 'Available', displayId: '', mobile: '' }); 
          setShowAddModal(true); 
        }} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl transition-all">
          {ICONS.Plus} Register Pilot
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map(driver => {
          const linkedUser = users.find(u => u.name === driver.name || u.displayId === driver.displayId);
          const isActive = linkedUser?.status === 'Active';

          return (
            <div key={driver.id} className="bg-gray-950 border border-gray-800 rounded-[2.5rem] p-7 shadow-xl group hover:border-purple-500/50 transition-all flex flex-col justify-between h-full relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-purple-500 font-black text-lg shadow-inner uppercase">
                    {driver.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-white text-lg leading-tight truncate max-w-[120px]">{driver.name}</h4>
                      {isAdmin && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleDriverAccount(driver); }}
                          className={`w-8 h-4 rounded-full relative transition-all duration-300 ${isActive ? 'bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-gray-700'}`}
                          title={isActive ? "Disable Access" : "Grant Access"}
                        >
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 ${isActive ? 'left-4.5' : 'left-0.5'}`}></div>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-purple-500 font-mono font-bold tracking-widest">{driver.displayId}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="space-y-3 mb-8 bg-black/40 p-4 rounded-2xl border border-gray-900 shadow-inner">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-gray-600">Duty Status</span>
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
                <button onClick={() => { setSelectedDriver(driver); setShowAddModal(true); }} className="flex-1 bg-gray-900 py-3 rounded-xl text-blue-500 hover:text-white transition-all border border-gray-800 font-black uppercase text-[10px] tracking-widest">{ICONS.Edit} Profile Hub</button>
                {isAdmin && (
                  <button onClick={() => handleDeleteDriver(driver.id)} className="px-5 bg-gray-900 py-3 rounded-xl text-red-500 hover:bg-red-600 transition-all border border-gray-800">{ICONS.Delete}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[110] p-4 backdrop-blur-md">
          <div className="bg-gray-950 border border-gray-800 rounded-[4rem] w-full max-w-5xl p-12 shadow-2xl overflow-y-auto max-h-[95vh] animate-in zoom-in duration-200 custom-scrollbar">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-4xl font-black text-purple-500 uppercase tracking-tighter leading-none">
                  {selectedDriver ? 'Pilot Dossier' : 'Registration Hub'}
                </h3>
                <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.4em] mt-3">Unified Identity Management</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-500 hover:text-white transition-all">✕</button>
            </div>
            
            <form onSubmit={handleAddOrEditDriver} className="space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <h4 className="text-[10px] text-gray-600 uppercase font-black tracking-widest border-b border-gray-900 pb-2">Operational Identity</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-purple-500 uppercase px-3 font-black tracking-widest">Pilot Code</label>
                      <input name="displayId" className="w-full bg-black border border-purple-500/20 rounded-2xl p-4 text-sm text-white font-mono focus:border-purple-500 outline-none shadow-inner" placeholder="DBDY-HYD-DR-XXX" value={formData.displayId} onChange={handleFormChange} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Full Name</label>
                      <input required name="name" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white focus:border-purple-500 outline-none shadow-inner" placeholder="Legal Name" value={formData.name} onChange={handleFormChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">License Number</label>
                      <input required name="licenseNumber" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white font-mono focus:border-purple-500 outline-none shadow-inner" placeholder="DL-XXXX" value={formData.licenseNumber} onChange={handleFormChange} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Contact Number</label>
                      <input name="mobile" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white font-mono focus:border-purple-500 outline-none shadow-inner" placeholder="+91 XXXXX XXXXX" value={formData.mobile} onChange={handleFormChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">License Expiry</label>
                      <input required type="date" name="expiryDate" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white focus:border-purple-500 outline-none shadow-inner" value={formData.expiryDate} onChange={handleFormChange} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-600 uppercase px-3 font-black tracking-widest">Duty Status</label>
                      <select name="status" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white font-black uppercase outline-none shadow-inner" value={formData.status} onChange={handleFormChange}>
                        <option value="Available">Operational (Available)</option>
                        <option value="Busy">In-Mission (Busy)</option>
                        <option value="Inactive">Ground (Inactive)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={`space-y-8 p-8 rounded-[2.5rem] border ${canManageCredentials ? 'bg-black/40 border-gray-900 shadow-inner' : 'bg-gray-900/10 border-gray-800 grayscale'}`}>
                  <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                    <h4 className="text-[10px] text-blue-500 uppercase font-black tracking-widest">Access Credentials</h4>
                    {canManageCredentials && (
                       <span className={`w-2 h-2 rounded-full ${accountStatus === 'Active' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></span>
                    )}
                  </div>
                  {canManageCredentials ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Pilot Login ID</label>
                        <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm font-mono focus:border-blue-500 outline-none text-white shadow-inner" placeholder="Unique ID" value={loginId} onChange={e => setLoginId(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Security Token</label>
                        <input required type="text" className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm font-mono focus:border-blue-500 outline-none text-white shadow-inner" placeholder="Passphrase" value={password} onChange={e => setPassword(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Gateway Access Control</label>
                        <select className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm font-black uppercase text-white shadow-inner focus:border-blue-500 outline-none" value={accountStatus} onChange={e => setAccountStatus(e.target.value as any)}>
                          <option value="Active">Operational (Active)</option>
                          <option value="Disabled">Revoked (Disabled)</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-30">
                       <div className="text-gray-700">{ICONS.Cancel}</div>
                       <p className="text-[9px] text-gray-700 font-black uppercase tracking-widest">Staff Authorization Required</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedDriver && (
                <div className="space-y-6 pt-10 border-t border-gray-900">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] text-purple-400 uppercase font-black tracking-[0.2em]">Pilot Mission Ledger (Last 10)</h4>
                    <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Registry Sync: Active</span>
                  </div>
                  
                  {isLoadingHistory ? (
                    <div className="py-16 flex flex-col items-center justify-center space-y-4">
                       <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                       <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest animate-pulse">Retrieving Manifest History...</span>
                    </div>
                  ) : driverHistory.length === 0 ? (
                    <div className="py-16 bg-black/40 rounded-[2.5rem] border border-gray-900 border-dashed text-center shadow-inner">
                       <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.2em]">No mission history archived for this identity.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in slide-in-from-bottom duration-500">
                      {driverHistory.map((trip) => (
                        <div key={trip.id} className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6 group hover:border-purple-500/30 transition-all shadow-lg flex flex-col justify-between">
                           <div>
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="text-[10px] text-purple-500 font-mono font-bold tracking-widest mb-1">{trip.trip_code}</p>
                                  <p className="text-sm font-black text-white uppercase leading-tight">{trip.customer?.customer_name || 'GUEST CLIENT'}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-emerald-500 font-black text-sm block">₹{trip.total_amount || 0}</span>
                                  <span className="text-[8px] text-gray-600 uppercase font-black">Settled</span>
                                </div>
                              </div>
                              <div className="space-y-2 text-[9px] text-gray-400 font-bold uppercase border-t border-gray-800/50 pt-4">
                                <p className="truncate"><span className="text-gray-600">Hub A:</span> {trip.pickup_location}</p>
                                <p className="truncate"><span className="text-gray-600">Hub B:</span> {trip.drop_location}</p>
                              </div>
                           </div>
                           <div className="mt-4 flex justify-between items-center text-[8px] text-gray-700 font-black uppercase">
                              <span>Finished: {new Date(trip.end_time).toLocaleDateString()}</span>
                              <span className="text-purple-500/50">{trip.trip_route}</span>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-900">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-900 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest text-white hover:bg-gray-800 transition-all">Abort Sync</button>
                <button disabled={isSubmitting} type="submit" className="flex-[2] bg-purple-600 hover:bg-purple-700 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest text-white shadow-2xl transition-all active:scale-95">
                  {isSubmitting ? 'Syncing Pipeline...' : 'Finalize Registry Update'}
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
