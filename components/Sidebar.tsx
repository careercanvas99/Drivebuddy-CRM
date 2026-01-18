
import React from 'react';
import { NavLink } from 'react-router-dom';
import { UserRole } from '../types.ts';
import { ICONS } from '../constants.tsx';

interface SidebarProps {
  role: UserRole;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, onLogout }) => {
  const isStaff = [
    UserRole.ADMIN, 
    UserRole.OPS_MANAGER, 
    UserRole.DRIVER_PARTNER_MANAGER, 
    UserRole.FINANCE, 
    UserRole.OPERATION_EXECUTIVE, 
    UserRole.DRIVER_HIRING_TEAM
  ].includes(role);

  const isAdmin = role === UserRole.ADMIN;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: ICONS.Dashboard, show: isStaff },
    { path: '/trips', label: 'Trips', icon: ICONS.Trips, show: isStaff },
    { path: '/drivers', label: 'Drivers', icon: ICONS.Drivers, show: isStaff },
    { path: '/customers', label: 'Customers', icon: ICONS.Profile, show: isStaff },
    { path: '/finance', label: 'Finance', icon: ICONS.Finance, show: [UserRole.ADMIN, UserRole.FINANCE].includes(role) },
    // Strict RBAC: Staff Management menu is ONLY visible to Admins
    { path: '/users', label: 'Staff Management', icon: ICONS.Users, show: isAdmin },
    { path: '/estimation', label: 'Trip Estimation', icon: ICONS.Reports, show: true },
    { path: '/settings', label: 'Settings', icon: ICONS.Edit, show: isAdmin },
  ];

  return (
    <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-purple-500">Drivebuddy</h1>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">{role}</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.filter(item => item.show).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center space-x-3 p-3 rounded-lg transition-all ${
                isActive ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-gray-400 hover:bg-gray-900 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={onLogout}
          className="flex items-center space-x-3 w-full p-3 text-gray-400 hover:bg-red-900/20 hover:text-red-500 rounded-lg transition-all"
        >
          {ICONS.Logout}
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
