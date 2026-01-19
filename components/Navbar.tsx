
import React, { useState } from 'react';
import { User, Notification } from '../types.ts';
import { ICONS } from '../constants.tsx';

interface NavbarProps {
  user: User;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  syncStatus?: 'synced' | 'pending' | 'error' | 'offline';
  dbProvider?: 'none' | 'github' | 'supabase';
}

const Navbar: React.FC<NavbarProps> = ({ user, notifications, setNotifications, syncStatus = 'offline', dbProvider = 'none' }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'synced': return dbProvider === 'supabase' ? 'bg-emerald-500' : 'bg-green-500';
      case 'pending': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-700';
    }
  };

  const getStatusText = () => {
    if (syncStatus === 'pending') return 'Syncing...';
    if (syncStatus === 'error') return 'Sync Error';
    if (dbProvider === 'supabase') return 'Cloud SQL Online';
    if (dbProvider === 'github') return 'GitHub Active';
    return 'Local Storage';
  };

  return (
    <header className="h-16 bg-gray-950 border-b border-gray-800 px-6 flex items-center justify-between relative">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-white hidden md:block">Drivebuddy Operations</h2>
        
        <div className="flex items-center gap-2 bg-black/40 border border-gray-800 px-3 py-1.5 rounded-full">
           <div className={`w-1.5 h-1.5 rounded-full ${getSyncColor()}`}></div>
           <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
             {getStatusText()}
           </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-gray-400 hover:text-purple-500 transition-colors relative"
          >
            {ICONS.Notifications}
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-purple-600 text-white text-[10px] flex items-center justify-center rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 animate-in fade-in duration-200">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="font-bold">Notifications</h3>
                <div className="flex space-x-2">
                  <button onClick={markAllRead} className="text-xs text-purple-500 hover:underline">Mark all</button>
                  <button onClick={clearNotifications} className="text-xs text-red-500 hover:underline">Clear</button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm italic">Clean Inbox</div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className={`p-4 border-b border-gray-800 hover:bg-gray-800 transition-colors ${notif.read ? 'opacity-40' : ''}`}>
                      <p className="font-semibold text-xs text-purple-400">{notif.title}</p>
                      <p className="text-[10px] text-gray-300 mt-1">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 pl-4 border-l border-gray-800">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-purple-900/40">
            {user.name.charAt(0)}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-black text-white leading-none uppercase">{user.name}</p>
            <p className="text-[8px] text-gray-500 mt-1 font-bold uppercase tracking-widest">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
