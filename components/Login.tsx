
import React, { useState } from 'react';
import { User, UserRole } from '../types.ts';
import { supabase } from '../lib/supabase.js';

interface LoginProps {
  onLogin: (user: User) => void;
  isCloudReachable: boolean;
  onRetry: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, isCloudReachable, onRetry }) => {
  const [isCustomer, setIsCustomer] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsAuthenticating(true);
    
    try {
      const cleanUsername = username.trim().toLowerCase();
      const cleanPassword = password.trim();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', cleanUsername)
        .eq('password', cleanPassword)
        .maybeSingle();

      if (error) {
        // PostgREST Schema cache error
        if (error.code === 'PGRST205') {
          setErrorMessage("DATABASE SYNC ERROR: Supabase has not yet refreshed its API cache. Please wait 10 seconds and try again, or re-run the Setup Script.");
        } else {
          setErrorMessage(`API ERROR [${error.code}]: ${error.message}`);
        }
        return;
      }

      if (!data) {
        setErrorMessage("ACCESS DENIED: Username or Password incorrect. Default is 'admin' / 'password'.");
        return;
      }

      onLogin(data as User);
    } catch (err: any) {
      console.error("Critical Login Error:", err);
      setErrorMessage(`SYSTEM ERROR: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#9333ea08_0%,_transparent_70%)]"></div>

      <div className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-[3rem] p-10 relative z-10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-purple-600/5 border border-purple-500/10 mb-6">
             <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse shadow-[0_0_20px_#a855f7]"></div>
          </div>
          <h1 className="text-3xl font-black text-white mb-1 tracking-tighter uppercase leading-none">Drivebuddy</h1>
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.4em]">Infrastructure V4.0</p>
        </div>

        <div className="flex bg-black border border-gray-900 p-1.5 rounded-2xl mb-8">
          <button 
            onClick={() => setIsCustomer(false)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isCustomer ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-600'}`}
          >
            Staff
          </button>
          <button 
            onClick={() => setIsCustomer(true)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isCustomer ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-600'}`}
          >
            Customer
          </button>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-700 uppercase px-4 tracking-[0.2em]">Operator ID</label>
            <input 
              type="text" 
              required 
              className="w-full bg-black border border-gray-800 rounded-2xl p-4 focus:border-purple-500 outline-none transition-all font-mono text-white placeholder:text-gray-900"
              placeholder="admin"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-700 uppercase px-4 tracking-[0.2em]">Security Pass</label>
            <input 
              type="password" 
              required 
              className="w-full bg-black border border-gray-800 rounded-2xl p-4 focus:border-purple-500 outline-none transition-all text-purple-500 placeholder:text-gray-900"
              placeholder="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            disabled={isAuthenticating}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-[10px] tracking-[0.4em] disabled:opacity-50"
          >
            {isAuthenticating ? 'Decrypting Credentials...' : 'Access Portal'}
          </button>
        </form>

        {errorMessage && (
          <div className="mt-8 p-5 bg-red-950/20 border border-red-500/30 rounded-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Auth Notification</p>
            </div>
            <p className="text-[11px] font-medium text-gray-400 leading-relaxed uppercase tracking-tight">
              {errorMessage}
            </p>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between border-t border-gray-900 pt-6">
           <div className="flex items-center gap-2">
              <div className={`w-1 h-1 rounded-full ${isCloudReachable ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              <span className="text-[8px] font-black text-gray-800 uppercase tracking-widest">
                {isCloudReachable ? 'Gateway Active' : 'Gateway Offline'}
              </span>
           </div>
           <button onClick={onRetry} className="text-[8px] font-black text-gray-500 uppercase hover:text-purple-400 transition-colors">Infrastructure Refresh</button>
        </div>
      </div>
    </div>
  );
};

export default Login;
