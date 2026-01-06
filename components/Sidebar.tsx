
import React from 'react';
import { UserRole } from '../types';
import { 
  LayoutDashboard, 
  MapPin, 
  Users, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  PieChart,
  Truck,
  CloudCog
} from 'lucide-react';

interface SidebarProps {
  role: UserRole;
  isOpen: boolean;
  onToggle: () => void;
  onLogout: () => void;
  currentView: 'DASHBOARD' | 'STORAGE_SETUP';
  onViewChange: (view: 'DASHBOARD' | 'STORAGE_SETUP') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, isOpen, onToggle, onLogout, currentView, onViewChange }) => {
  const adminLinks = [
    { label: 'Dashboard', icon: LayoutDashboard, view: 'DASHBOARD' as const },
    { label: 'Live Fleet', icon: MapPin },
    { label: 'Drivers', icon: Truck },
    { label: 'Customers', icon: Users },
    { label: 'Analytics', icon: PieChart },
  ];

  const driverLinks = [
    { label: 'My Trips', icon: LayoutDashboard, view: 'DASHBOARD' as const },
    { label: 'Map View', icon: MapPin },
  ];

  const links = role === UserRole.DRIVER ? driverLinks : adminLinks;

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 h-screen transition-all duration-300 flex flex-col z-50`}>
      <div className="p-8 flex items-center justify-between">
        <div className={`flex items-center gap-3 overflow-hidden ${!isOpen && 'hidden'}`}>
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex-shrink-0 flex items-center justify-center font-black italic">D</div>
          <span className="font-black text-xl tracking-tighter italic">DRIVEBUDDY</span>
        </div>
        <button onClick={onToggle} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500">
          {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {links.map((link, idx) => (
          <button
            key={idx}
            onClick={() => link.view && onViewChange(link.view)}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${
              currentView === link.view && link.view ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'
            }`}
          >
            <link.icon className="w-5 h-5 flex-shrink-0" />
            <span className={`font-bold text-sm tracking-tight transition-opacity duration-300 ${!isOpen && 'opacity-0 pointer-events-none'}`}>
              {link.label}
            </span>
          </button>
        ))}

        {role === UserRole.ADMIN && (
          <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
             <button
              onClick={() => onViewChange('STORAGE_SETUP')}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${
                currentView === 'STORAGE_SETUP' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CloudCog className="w-5 h-5 flex-shrink-0" />
              <span className={`font-bold text-sm tracking-tight transition-opacity duration-300 ${!isOpen && 'opacity-0 pointer-events-none'}`}>
                Cloud Storage
              </span>
            </button>
            <button className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className={`font-bold text-sm tracking-tight transition-opacity duration-300 ${!isOpen && 'opacity-0 pointer-events-none'}`}>
                Settings
              </span>
            </button>
          </div>
        )}
      </nav>

      <div className="p-4">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-4 py-4 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className={`font-bold text-sm ${!isOpen && 'hidden'}`}>Term Sesssion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
