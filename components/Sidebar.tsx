
import React from 'react';
import { NavLink } from 'react-router-dom';
import { UserRole, User } from '../types.ts';
import { ICONS } from '../constants.tsx';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

const DrivebuddyLogo = () => (
  <div className="flex flex-col items-center justify-center">
    <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_10px_rgba(147,51,234,0.3)]">
      {/* Top Chevron pointing right */}
      <path d="M50 20L75 40L50 60H30L55 40L30 20H50Z" fill="white" />
      {/* Bottom Chevron pointing left */}
      <path d="M50 80L25 60L50 40H70L45 60L70 80H50Z" fill="#9333ea" />
    </svg>
    <div className="mt-2 text-center">
      <h1 className="text-lg font-black text-white tracking-[0.15em] uppercase leading-none">Drivebuddy</h1>
      <p className="text-[7px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">A Friendly Driver</p>
    </div>
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const role = user.role;
  const userRoleStr = String(role || '').toLowerCase();
  
  const isStaff = [
    UserRole.ADMIN, 
    UserRole.OPS_MANAGER, 
    UserRole.OPERATION_EXECUTIVE,
    UserRole.DRIVER_PARTNER_MANAGER, 
    UserRole.FINANCE, 
    UserRole.DRIVER_HIRING_TEAM
  ].some(r => r.toLowerCase() === userRoleStr);

  const isAdmin = userRoleStr === UserRole.ADMIN.toLowerCase();

  const navItems = [
    { path: '/', label: 'Operations Dashboard', icon: ICONS.Dashboard, show: isStaff },
    { path: '/trips', label: 'Manifest Control', icon: ICONS.Trips, show: isStaff },
    { path: '/drivers', label: 'Pilot Registry', icon: ICONS.Drivers, show: isStaff },
    { path: '/customers', label: 'Client Registry', icon: ICONS.Profile, show: isStaff },
    { path: '/finance', label: 'Fiscal Reports', icon: ICONS.Finance, show: [UserRole.ADMIN, UserRole.FINANCE].some(r => r.toLowerCase() === userRoleStr) },
    { path: '/users', label: 'Staff Hub', icon: ICONS.Users, show: isAdmin },
    { path: '/estimation', label: 'Fare Engine', icon: ICONS.Reports, show: true },
    { path: '/settings', label: 'Config Panel', icon: ICONS.Edit, show: isAdmin },
  ];

  return (
    <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col shadow-2xl z-20">
      <div className="pt-10 pb-6 px-8 flex justify-center border-b border-gray-900/50">
        <DrivebuddyLogo />
      </div>

      <div className="px-6 py-4">
        <div className="p-4 bg-black/40 border border-gray-900 rounded-2xl shadow-inner">
          <p className="text-[8px] text-gray-500 uppercase tracking-[0.2em] font-black leading-none mb-2">{user.role}</p>
          <p className="text-[10px] text-purple-500 font-mono font-bold tracking-tight truncate">{user.name}</p>
          <p className="text-[8px] text-gray-600 font-mono mt-1 opacity-60">{user.displayId}</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navItems.filter(item => item.show).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center space-x-3 p-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest ${
                isActive ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/40 translate-x-1' : 'text-gray-500 hover:bg-gray-900 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-white' : 'text-purple-500/40 group-hover:text-purple-500'}>{item.icon}</span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-gray-900 bg-black/20">
        <button
          onClick={onLogout}
          className="flex items-center space-x-3 w-full p-4 text-gray-600 hover:bg-red-950/20 hover:text-red-500 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest group"
        >
          <span className="group-hover:rotate-12 transition-transform">{ICONS.Logout}</span>
          <span>Terminate Uplink</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
