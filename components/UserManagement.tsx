
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
    displayId: ''
  });

  const isAdmin = currentUser.role === UserRole.ADMIN;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-12 bg-gray-900 border border-red-500/20 rounded-3xl">
          <h2 className="text-2xl font-black text-red-500 mb-2">ACCESS DENIED</h2>
          <p className="text-gray-400">Administrative clearance required for this module.</p>
        </div>
      </div>
    );
  }

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Clean data for SQL: Empty string should be undefined to let DB triggers work
    const staffCode = formData.displayId && formData.displayId.trim() !== '' ? formData.displayId : undefined;

    try {
      if (editingUser) {
        // SQL PROTOCOL: Update Registry
        const { data, error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            mobile: formData.mobile,
            address: formData.address,
            username: formData.username.toLowerCase().trim(),
            password: formData.password,
            role: formData.role,
            staff_code: staffCode
          } as any)
          .eq('id', editingUser.id)
          .select()
          .single();
        
        if (error) throw error;

        if (data) {
          const u = data as any;
          const updatedUser: User = {
            id: u.id,
            displayId: u.staff_code,
            username: u.username,
            password: u.password,
            role: u.role as UserRole,
            name: u.name,
            mobile: u.mobile,
            address: u.address
          };
          setUsers(prev => prev.map(usr => usr.id === editingUser.id ? updatedUser : usr));
          alert('Staff Registry Synchronized.');
        }
      } else {
        // SQL PROTOCOL: Register Operator
        const { data, error } = await supabase
          .from('users')
          .insert([{
            name: formData.name,
            mobile: formData.mobile,
            address: formData.address,
            username: formData.username.toLowerCase().trim(),
            password: formData.password,
            role: formData.role,
            staff_code: staffCode 
          } as any])
          .select()
          .single();
        
        if (error) throw error;
        
        if (data) {
             const u = data as any;
             const newUser: User = {
                 id: u.id,
                 displayId: u.staff_code,
                 username: u.username,
                 password: u.password,
                 role: u.role as UserRole,
                 name: u.name,
                 mobile: u.mobile,
                 address: u.address
             };
             setUsers(prev => [...prev, newUser]);
             alert(`Staff Account Registered: ${u.staff_code}`);
        }
      }
      
      setShowModal(false);
      setEditingUser(null);
      setFormData({ 
        name: '', 
        mobile: '', 
        address: '', 
        username: '', 
        password: '', 
        role: UserRole.OPERATION_EXECUTIVE,
        displayId: ''
      });
    } catch (err: any) {
      alert(`Staff Sync Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      mobile: user.mobile || '',
      address: user.address || '',
      username: user.username,
      password: user.password || '',
      role: user.role,
      displayId: user.displayId
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('DANGER: Terminate operator credentials permanently?')) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        setUsers(prev => prev.filter(u => u.id !== id));
      } catch (err: any) {
        alert(`Deletion Error: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Staff Hub</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Operator Registry & Access Policy</p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setShowModal(true); setFormData({ name: '', mobile: '', address: '', username: '', password: '', role: UserRole.OPERATION_EXECUTIVE, displayId: '' }); }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-900/40"
        >
          {ICONS.Plus} Register Operator
        </button>
      </div>

      <div className="bg-gray-950 rounded-[2.5rem] border border-gray-900 overflow-hidden shadow-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-black text-gray-600 border-b border-gray-900 font-black uppercase text-[9px] tracking-widest">
            <tr>
              <th className="p-6">Operator / Business ID</th>
              <th className="p-6">Secure Contact</th>
              <th className="p-6">Access Level</th>
              <th className="p-6">Uplink</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {users.filter(u => u.role !== UserRole.CUSTOMER).map(u => (
              <tr key={u.id} className="hover:bg-gray-900/40 transition-colors group">
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-sm font-black text-purple-500 border border-gray-800">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-[10px] text-purple-500 font-mono font-bold tracking-widest">{u.displayId}</div>
                    </div>
                  </div>
                </td>
                <td className="p-6">
                  <div className="text-gray-300 text-xs font-medium">{u.mobile || '---'}</div>
                  <div className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter truncate max-w-[150px]">{u.address || 'Location withheld'}</div>
                </td>
                <td className="p-6">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    u.role === UserRole.ADMIN ? 'bg-purple-900/40 text-purple-400 border border-purple-500/20 shadow-[0_0_10px_#9333ea20]' : 'bg-gray-900 text-gray-500 border border-gray-800'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-6 text-gray-400 font-mono text-xs">{u.username}</td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(u)} className="p-2.5 bg-gray-900 rounded-xl text-blue-500 hover:text-white transition-all shadow-sm" title="Modify Registry">
                      {ICONS.Edit}
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="p-2.5 bg-gray-900 rounded-xl text-red-500 hover:text-white transition-all shadow-sm" title="Revoke Access">
                      {ICONS.Delete}
                    </button>
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
            <h3 className="text-3xl font-black mb-10 text-purple-500 uppercase tracking-tighter">{editingUser ? 'Modify Credentials' : 'Staff Onboarding'}</h3>
            <form onSubmit={handleAddOrUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Full Name</label>
                  <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Rahul Verma" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Secure Contact</label>
                  <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner font-mono" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] text-purple-500 font-black uppercase tracking-widest block px-3">Business ID (Override)</label>
                <input className="w-full bg-black border border-purple-500/20 rounded-2xl p-4 text-sm font-mono focus:border-purple-500 outline-none text-white shadow-inner" value={formData.displayId} onChange={e => setFormData({...formData, displayId: e.target.value})} placeholder="e.g. DBDY-HYD-001" />
                <p className="text-[9px] text-gray-700 mt-1 px-3">Leave blank for automatic SQL sequence generation.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Permanent Address</label>
                <textarea className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm h-20 focus:border-purple-500 outline-none text-white shadow-inner" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Address for records" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Role</label>
                  <select className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.OPS_MANAGER}>Ops-Manager</option>
                    <option value={UserRole.OPERATION_EXECUTIVE}>Operation Executive</option>
                    <option value={UserRole.DRIVER_PARTNER_MANAGER}>Driver Partner Manager</option>
                    <option value={UserRole.FINANCE}>Finance</option>
                    <option value={UserRole.DRIVER_HIRING_TEAM}>Driver Hiring Team (DHT)</option>
                    <option value={UserRole.DRIVER}>Driver (Partner)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Username</label>
                  <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner font-mono" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="operator_01" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase px-3 font-black tracking-widest">Security Pass</label>
                <input required className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none text-white shadow-inner" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-900 hover:bg-gray-800 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-white">Discard</button>
                <button disabled={isSubmitting} type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-white shadow-xl shadow-purple-900/40 disabled:opacity-50">
                  {isSubmitting ? 'Syncing...' : (editingUser ? 'Save Registry' : 'Confirm Registry')}
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
