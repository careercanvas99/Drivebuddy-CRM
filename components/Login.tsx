
import React, { useState } from 'react';
import { User, UserRole, Customer } from '../types.ts';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  customers: Customer[];
}

const Login: React.FC<LoginProps> = ({ onLogin, users, customers }) => {
  const [isCustomer, setIsCustomer] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Use the live 'users' list passed from App.tsx instead of static mock data
    const userMatch = users.find(u => u.username === username && u.password === password);
    if (userMatch) {
      onLogin(userMatch);
    } else {
      alert('Invalid credentials. If this is a new account, ensure data has synced.');
    }
  };

  const handleCustomerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) {
      // Simulate OTP handshake
      console.log(`Sending OTP to ${mobile}...`);
      setOtpSent(true);
      alert('Security Code sent: 123456 (Dev Bypass)');
    } else {
      if (otp === '123456') {
        // Resolve customer identity from the global registry
        const existingCustomer = customers.find(c => c.mobile === mobile);
        const user: User = {
          id: existingCustomer?.id || `CUST-${Math.floor(Math.random() * 1000)}`,
          name: existingCustomer?.name || 'Valued Client',
          username: mobile,
          role: UserRole.CUSTOMER
        };
        onLogin(user);
      } else {
        alert('Invalid OTP sequence.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-80 h-80 bg-purple-600 rounded-full blur-[120px] opacity-20"></div>
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-purple-600 rounded-full blur-[120px] opacity-20"></div>

      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-[2.5rem] p-10 relative z-10 shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-purple-500 mb-2 tracking-tighter">Drivebuddy</h1>
          <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Enterprise Chauffeur CRM</p>
        </div>

        <div className="flex bg-gray-950 p-1 rounded-2xl mb-8 border border-gray-800 shadow-inner">
          <button 
            onClick={() => setIsCustomer(false)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isCustomer ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/40' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Staff Portal
          </button>
          <button 
            onClick={() => setIsCustomer(true)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isCustomer ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/40' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Customer
          </button>
        </div>

        {!isCustomer ? (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase px-4 tracking-[0.2em]">Ops Username</label>
              <input 
                type="text" 
                required 
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 mt-1 focus:border-purple-500 outline-none transition-all font-mono text-white shadow-inner"
                placeholder="e.g. babu"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase px-4 tracking-[0.2em]">Passphrase</label>
              <input 
                type="password" 
                required 
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 mt-1 focus:border-purple-500 outline-none transition-all text-purple-500 shadow-inner"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-5 rounded-2xl mt-6 shadow-2xl shadow-purple-900/40 transition-all active:scale-95 uppercase text-[10px] tracking-[0.3em]">
              Initialize Session
            </button>
          </form>
        ) : (
          <form onSubmit={handleCustomerLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase px-4 tracking-[0.2em]">Contact Mobile</label>
              <input 
                type="tel" 
                required 
                disabled={otpSent}
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 mt-1 focus:border-purple-500 outline-none transition-all disabled:opacity-50 font-mono text-white shadow-inner"
                placeholder="+91 XXXXX XXXXX"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
              />
            </div>
            {otpSent && (
              <div className="animate-in fade-in slide-in-from-top duration-300 space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase px-4 tracking-[0.2em]">Cloud OTP</label>
                <input 
                  type="text" 
                  required 
                  maxLength={6}
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 mt-1 focus:border-purple-500 outline-none transition-all tracking-[1em] text-center font-black text-lg text-purple-400"
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                />
              </div>
            )}
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-5 rounded-2xl mt-6 shadow-2xl shadow-purple-900/40 transition-all active:scale-95 uppercase text-[10px] tracking-[0.3em]">
              {otpSent ? 'Authorize Access' : 'Request Security Code'}
            </button>
            {otpSent && (
               <button type="button" onClick={() => setOtpSent(false)} className="w-full text-[9px] text-gray-500 mt-4 hover:text-white uppercase font-black tracking-widest">Correction: Change Number</button>
            )}
          </form>
        )}

        <div className="text-center mt-12 pt-8 border-t border-gray-800">
          <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">
            Protected by Drivebuddy Architecture v2.5
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
