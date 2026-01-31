
import React, { useState } from 'react';
import { User, UserRole } from '../types.ts';
import { ICONS } from '../constants.tsx';
import { supabase } from '../lib/supabase.js';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    username: '',
    password: '',
    role: UserRole.OPERATION_EXECUTIVE,
    staffCode: '',
    status: 'Active' as 'Active' | 'Disabled'
  });

  if (currentUser.role !== UserRole.ADMIN) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="text-red-500 bg-red-500/10 p-6 rounded-[2rem] border border-red-500/20">
          {ICONS.Cancel}
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Access Denied</h2>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Level 1 Admin Clearances Required</p>
      </div>
    );
  }

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload: any = {
        name: formData.name,
        mobile: formData.mobile,
        address: formData.address,
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        staff_code: formData.staffCode || undefined,
        status: formData.status
      };

      if (editingUser) {
        const { error } = await supabase.from('users').update(payload).eq('id', editingUser.id);
        if (error) throw error;
        alert('User credentials synchronized.');
      } else {
        const { error } = await supabase.from('users').insert([payload]);
        if (error) throw error;
        alert('New account commissioned successfully.');
      }
      setShowModal(false);
      setEditingUser(null);
    } catch (err: any) {
      alert(`Account Sync Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('DANGER: Terminate all access for this user? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      alert('Credentials purged from registry.');
    } catch (err: any) {
      alert(`Purge Error: ${err.message}`);
    }
  };

  const toggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'Active' ? 'Disabled' : 'Active';
    try {
      const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', user.id);
      if (error) throw error;
    } catch (err: any) {
      alert(`Status Toggle Fail: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Credential Registry</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Global Account Management (Staff & Clients)</p>
        </div>
        <button 
          onClick={() => { 
            setEditingUser(null); 
            setShowModal(true); 
            setFormData({ name: '', mobile: '', address: '', username: '', password: '', role: UserRole.OPERATION_EXECUTIVE, staffCode: '', status: 'Active' }); 
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-900/40"
        >
          {ICONS.Plus} Create Login Account
        </button>
      </div>

      <div className="bg-gray-950 rounded-[2.5rem] border border-gray-900 overflow-hidden shadow-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-black text-gray-600 border-b border-gray-900 font-black uppercase text-[9px] tracking-widest">
            <tr>
              <th className="p-6">User / Identity</th>
              <th className="p-6">Role</th>
              <th className="p-6">Login ID (Username)</th>
              <th className="p-6 text-center">Gateway Status</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-900/40 transition-colors group">
                <td className="p-6">
                   <div className="font-bold text-white">{u.name}</div>
                   <div className="text-[10px] text-purple-500 font-mono font-bold tracking-widest">{u.displayId || 'DBDY-EXT-ACC'}</div>
                </td>
                <td className="p-6">
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${
                    u.role === UserRole.ADMIN ? 'bg-purple-900/20 text-purple-400 border-purple-500/20' :
                    u.role === UserRole.CUSTOMER ? 'bg-blue-900/20 text-blue-400 border-blue-500/20' :
                    'bg-gray-900 text-gray-400 border-gray-800'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-6 text-gray-400 font-mono text-xs">{u.username}</td>
                <td className="p-6 text-center">
                  <button 
                    onClick={() => toggleUserStatus(u)}
                    className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${
                      u.status === 'Active' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'
                    }`}
                  >
                    {u.status}
                  </button>
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { 
                      setEditingUser(u); 
                      setFormData({ 
                        name: u.name,
                        username: u.username,
                        password: u.password || '',
                        role: u.role,
                        mobile: u.mobile || '',
                        address: u.address || '',
                        staffCode: u.displayId,
                        status: u.status || 'Active'
                      }); 
                      setShowModal(true); 
                    }} className="text-blue-500 transition-transform hover:scale-125 p-2 bg-gray-900 rounded-lg border border-gray-800">{ICONS.Edit}</button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-500 transition-transform hover:scale-125 p-2 bg-gray-900 rounded-lg border border-gray-800">{ICONS.Delete}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[110] p-4 backdrop-blur-md">
          <div className="bg-gray-950 border border-gray-800 rounded-[3rem] w-full max-w-lg p-10 animate-in zoom-in duration-200 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-3xl font-black text-purple-500 uppercase tracking-tighter mb-10 leading-none">
              {editingUser ? 'Update Credentials' : 'New User Account'}
            </h3>
            <form onSubmit={handleAddOrUpdate} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] text-gray-500 uppercase px-4 font-black tracking-widest">Internal ID / Code</label>
                  <input className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white font-mono shadow-inner focus:border-purple-500 outline-none" placeholder="DBDY-HYD-001" value={formData.staffCode} onChange={e => setFormData({...formData, staffCode: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-gray-600 uppercase font-black px-4 tracking-widest">Account Status</label>
                  <select className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white shadow-inner focus:border-purple-500 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-gray-600 uppercase font-black px-2 tracking-widest">Full Name (Display)</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white shadow-inner focus:border-purple-500 outline-none" placeholder="e.g. Animesh Basak" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] text-gray-600 uppercase font-black px-2 tracking-widest">Login ID (Username)</label>
                  <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white font-mono shadow-inner focus:border-purple-500 outline-none" placeholder="Mobile or Nickname" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-gray-600 uppercase font-black px-2 tracking-widest">Security Pass</label>
                  <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white shadow-inner focus:border-purple-500 outline-none font-mono" type="text" placeholder="Minimum 6 chars" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-gray-600 uppercase font-black px-2 tracking-widest">Permission Level (Role)</label>
                <select className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white shadow-inner focus:border-purple-500 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                  <option value={UserRole.ADMIN}>Admin</option>
                  <option value={UserRole.CUSTOMER}>Customer (Client Account)</option>
                  <option value={UserRole.DRIVER}>Driver (Pilot Account)</option>
                  <option value={UserRole.OPS_MANAGER}>Ops-Manager</option>
                  <option value={UserRole.OPERATION_EXECUTIVE}>Operation Executive</option>
                  <option value={UserRole.FINANCE}>Finance</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-900 py-5 rounded-[2rem] font-black uppercase text-[10px] text-gray-500 hover:text-white transition-all tracking-widest">Abort</button>
                <button disabled={isSubmitting} type="submit" className="flex-1 bg-purple-600 py-5 rounded-[2rem] font-black uppercase text-[10px] text-white shadow-xl shadow-purple-950/40 active:scale-95 transition-all tracking-widest">
                  {isSubmitting ? 'Processing...' : 'Sync Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
