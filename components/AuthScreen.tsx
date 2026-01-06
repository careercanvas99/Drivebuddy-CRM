
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ShieldCheck, Lock, User as UserIcon, ChevronRight } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // System Authentication
    const mockUser: User = {
      id: username.toLowerCase() || 'u123',
      username: username || 'Default User',
      role: role
    };

    onLogin(mockUser);
  };

  const fillDemo = (targetRole: UserRole) => {
    setRole(targetRole);
    setUsername(targetRole.toLowerCase());
    setPassword('demo123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-inter">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl shadow-purple-900/20">
          <div className="text-center mb-10">
            <div className="mx-auto h-20 w-20 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-purple-900/40 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <ShieldCheck className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter italic">DRIVEBUDDY</h2>
            <p className="mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Logistics Command Center</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="group">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Access Tier</label>
                <div className="relative">
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
                  >
                    {Object.values(UserRole).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              <div className="relative group">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Employee ID"
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-14 pr-5 py-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Security Key"
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-14 pr-5 py-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-5 px-4 rounded-2xl text-white bg-purple-600 hover:bg-purple-700 font-bold text-sm tracking-widest uppercase shadow-xl shadow-purple-900/30 transition-all active:scale-[0.98]"
            >
              Sign In
            </button>
          </form>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {[UserRole.ADMIN, UserRole.DRIVER, UserRole.CUSTOMER].map(r => (
            <button
              key={r}
              onClick={() => fillDemo(r)}
              className="px-4 py-2 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-500 hover:text-purple-400 transition-all uppercase tracking-tighter"
            >
              Demo {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
