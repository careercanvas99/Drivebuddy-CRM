
import React, { useState } from 'react';
import { User, UserRole } from '../types.ts';
import { mockUsers } from '../services/mockData.ts';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isCustomer, setIsCustomer] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = mockUsers.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      alert('Invalid credentials');
    }
  };

  const handleCustomerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) {
      // Simulate Twilio OTP
      console.log(`Sending OTP to ${mobile}... (Twilio Placeholder)`);
      setOtpSent(true);
      alert('OTP sent to your mobile: 123456 (Mock)');
    } else {
      if (otp === '123456') {
        const user: User = {
          id: `CUST-${Math.floor(Math.random() * 1000)}`,
          name: 'Animesh Basak',
          username: mobile,
          role: UserRole.CUSTOMER
        };
        onLogin(user);
      } else {
        alert('Invalid OTP');
      }
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-80 h-80 bg-purple-600 rounded-full blur-[120px] opacity-20"></div>
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-purple-600 rounded-full blur-[120px] opacity-20"></div>

      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-[2.5rem] p-10 relative z-10 shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-purple-500 mb-2">Drivebuddy</h1>
          <p className="text-gray-400">Professional Driver CRM</p>
        </div>

        <div className="flex bg-gray-950 p-1 rounded-2xl mb-8">
          <button 
            onClick={() => setIsCustomer(false)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${!isCustomer ? 'bg-purple-600 text-white' : 'text-gray-500'}`}
          >
            Staff Portal
          </button>
          <button 
            onClick={() => setIsCustomer(true)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${isCustomer ? 'bg-purple-600 text-white' : 'text-gray-500'}`}
          >
            Customer
          </button>
        </div>

        {!isCustomer ? (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase px-2">Username</label>
              <input 
                type="text" 
                required 
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 mt-1 focus:border-purple-500 outline-none transition-all"
                placeholder="admin_ops"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase px-2">Password</label>
              <input 
                type="password" 
                required 
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 mt-1 focus:border-purple-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl mt-6 shadow-lg shadow-purple-900/40 transition-all active:scale-95">
              Enter Dashboard
            </button>
          </form>
        ) : (
          <form onSubmit={handleCustomerLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase px-2">Mobile Number</label>
              <input 
                type="tel" 
                required 
                disabled={otpSent}
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 mt-1 focus:border-purple-500 outline-none transition-all disabled:opacity-50"
                placeholder="+91 98765 43210"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
              />
            </div>
            {otpSent && (
              <div className="animate-in fade-in slide-in-from-top duration-300">
                <label className="text-xs font-bold text-gray-500 uppercase px-2">One-Time Password</label>
                <input 
                  type="text" 
                  required 
                  maxLength={6}
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 mt-1 focus:border-purple-500 outline-none transition-all tracking-[1em] text-center font-bold text-lg"
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                />
              </div>
            )}
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl mt-6 shadow-lg shadow-purple-900/40 transition-all active:scale-95">
              {otpSent ? 'Verify & Continue' : 'Send OTP'}
            </button>
            {otpSent && (
               <button type="button" onClick={() => setOtpSent(false)} className="w-full text-xs text-purple-500 mt-2 hover:underline">Change Mobile Number</button>
            )}
          </form>
        )}

        <p className="text-center text-gray-600 text-xs mt-10">
          Secure enterprise login powered by Drivebuddy Systems
        </p>
      </div>
    </div>
  );
};

export default Login;
