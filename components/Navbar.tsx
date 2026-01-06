
import React, { useState } from 'react';
import { User, AppNotification } from '../types';
import { Bell, Search, User as UserIcon, Settings } from 'lucide-react';

interface NavbarProps {
  user: User;
  notifications: AppNotification[];
}

const Navbar: React.FC<NavbarProps> = ({ user, notifications }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex-1 max-w-xl hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search trips, drivers, plates..." 
            className="w-full bg-slate-900 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:text-white transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-slate-950">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold">Notifications</h4>
                <button className="text-xs text-purple-400 hover:underline">Mark all read</button>
              </div>
              <div className="space-y-4">
                {notifications.length > 0 ? notifications.slice(0, 3).map(n => (
                  <div key={n.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <p className="text-sm font-bold text-white mb-1">{n.title}</p>
                    <p className="text-xs text-slate-400">{n.message}</p>
                  </div>
                )) : <p className="text-center text-slate-500 py-4 italic text-sm">No new alerts.</p>}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-6 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white">{user.username}</p>
            <p className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">{user.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 cursor-pointer hover:border-purple-500 transition-all">
            <UserIcon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
