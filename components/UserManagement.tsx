
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
    role: UserRole.OPERATION_EXECUTIVE
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (editingUser) {
        const { error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            mobile: formData.mobile,
            address: formData.address,
            username: formData.username.toLowerCase().trim(),
            password: formData.password,
            role: formData.role
          })
          .eq('id', editingUser.id);
        
        if (error) throw error;
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
      } else {
        // NO CLIENT-SIDE ID GENERATION.
        // Database trigger fn_generate_staff_code handles the business ID.
        const { data, error } = await supabase
          .from('users')
          .insert([{
            name: formData.name,
            mobile: formData.mobile,
            address: formData.address,
            username: formData.username.toLowerCase().trim(),
            password: formData.password,
            role: formData.role
          }])
          .select();
        
        if (error) throw error;
        if (data) {
             const newUser: User = {
                 id: data[0].id,
                 displayId: data[0].staff_code, // Reading SQL generated code
                 username: data[0].username,
                 password: data[0].password,
                 role: data[0].role as UserRole,
                 name: data[0].name,
                 mobile: data[0].mobile,
                 address: data[0].address
             };
             setUsers(prev => [...prev, newUser]);
             alert(`Staff Account Registered: ${data[0].staff_code}`);
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
        role: UserRole.OPERATION_EXECUTIVE 
      });
    } catch (err: any) {
      alert(`Staff Registry Error: ${err.message}`);
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
      role: user.role
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this staff member?')) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        setUsers(prev => prev.filter(u => u.id !== id));
      } catch (err: any) {
        alert(`Delete Error: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Staff Management</h2>
          <p className="text-xs text-gray-500">Add, modify or remove operational staff accounts</p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setShowModal(true); }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all shadow-lg shadow-purple-900/40"
        >
          {ICONS.Plus} Register New Staff
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-950 text-gray-400 border-b border-gray-800">
            <tr>
              <th className="p-4 font-medium uppercase tracking-wider text-[10px]">Name / Business ID</th>
              <th className="p-4 font-medium uppercase tracking-wider text-[10px]">Contact</th>
              <th className="p-4 font-medium uppercase tracking-wider text-[10px]">Role</th>
              <th className="p-4 font-medium uppercase tracking-wider text-[10px]">Username</th>
              <th className="p-4 font-medium uppercase tracking-wider text-[10px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.filter(u => u.role !== UserRole.CUSTOMER).map(u => (
              <tr key={u.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-white">{u.name}</div>
                  <div className="text-[10px] text-purple-500 font-mono font-bold tracking-widest">{u.displayId}</div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-gray-300">{u.mobile || 'N/A'}</div>
                  <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{u.address || 'Address withheld'}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    u.role === UserRole.ADMIN ? 'bg-purple-900/40 text-purple-400 border border-purple-500/20' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-gray-400 font-mono text-xs">{u.username}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => handleEdit(u)} className="text-blue-500 hover:text-blue-400 transition-colors" title="Edit Profile">
                      {ICONS.Edit}
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-400 transition-colors" title="Remove Account">
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-lg p-8 animate-in zoom-in duration-200 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6 text-purple-500">{editingUser ? 'Edit Staff Member' : 'Register New Staff'}</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Full Name</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rahul Verma" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Mobile Number</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Residence Address</label>
                <textarea className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm h-16 focus:border-purple-500 outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Complete home/office address" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Role</label>
                  <select className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.OPS_MANAGER}>Ops-Manager</option>
                    <option value={UserRole.DRIVER_PARTNER_MANAGER}>Driver Partner Manager</option>
                    <option value={UserRole.FINANCE}>Finance</option>
                    <option value={UserRole.OPERATION_EXECUTIVE}>Operation Executive</option>
                    <option value={UserRole.DRIVER_HIRING_TEAM}>Driver Hiring Team (DHT)</option>
                    <option value={UserRole.DRIVER}>Driver (Partner Login)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Login Username</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="username_staff" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">{editingUser ? 'Update Password' : 'Initial Password'}</label>
                <input required className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-900 hover:bg-gray-800 py-3 rounded-xl font-bold transition-colors">Cancel</button>
                <button disabled={isSubmitting} type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/40 disabled:opacity-50">
                  {isSubmitting ? 'Syncing...' : (editingUser ? 'Save Changes' : 'Create Account')}
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
