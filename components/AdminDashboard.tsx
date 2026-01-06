
import React, { useState, useEffect } from 'react';
import { AppData, Trip, User, UserRole, Driver } from '../types';
import { 
  Users, 
  Car, 
  MapPin, 
  Calendar, 
  Plus, 
  XCircle, 
  Clock,
  TrendingUp,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  User as UserIcon,
  ChevronRight
} from 'lucide-react';
import MapView from './MapView';

interface AdminDashboardProps {
  user: User;
  data: AppData;
  onUpdateTrips: (trips: Trip[]) => Promise<void>;
  onUpdateDrivers: (drivers: Driver[]) => Promise<void>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, data, onUpdateTrips, onUpdateDrivers }) => {
  const [activeTab, setActiveTab] = useState<'trips' | 'drivers' | 'customers' | 'finance'>('trips');
  const [assigningTripId, setAssigningTripId] = useState<string | null>(null);

  // License Expiry Logic (30 days)
  const expiringDrivers = data.drivers.filter(d => {
    const expiryDate = new Date(d.licenseExpiry);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  });

  const handleCancelTrip = async (id: string) => {
    const reason = prompt("Enter cancellation reason:");
    if (!reason) return;
    const newTrips = data.trips.map(t => t.id === id ? { ...t, status: 'CANCELLED' as const, cancelReason: reason, logs: [...t.logs, { timestamp: new Date().toISOString(), user: user.username, action: 'Cancelled trip' }] } : t);
    await onUpdateTrips(newTrips);
  };

  const handleAssignDriver = async (driverId: string) => {
    if (!assigningTripId) return;
    const newTrips = data.trips.map(t => t.id === assigningTripId ? { 
      ...t, 
      driverId, 
      status: 'ASSIGNED' as const,
      logs: [...t.logs, { timestamp: new Date().toISOString(), user: user.username, action: `Assigned driver: ${driverId}` }] 
    } : t);
    
    const newDrivers = data.drivers.map(d => d.id === driverId ? { ...d, status: 'ON_TRIP' as const } : d);
    
    await onUpdateTrips(newTrips);
    await onUpdateDrivers(newDrivers);
    setAssigningTripId(null);
  };

  const handleAdminStatusChange = async (tripId: string, status: 'STARTED' | 'COMPLETED') => {
    const newTrips = data.trips.map(t => t.id === tripId ? { 
      ...t, 
      status, 
      logs: [...t.logs, { timestamp: new Date().toISOString(), user: user.username, action: `Admin forced status change: ${status}` }] 
    } : t);
    
    const trip = data.trips.find(t => t.id === tripId);
    if (trip?.driverId) {
      const newDrivers = data.drivers.map(d => d.id === trip.driverId ? { 
        ...d, 
        status: status === 'STARTED' ? 'ON_TRIP' as const : 'AVAILABLE' as const 
      } : d);
      await onUpdateDrivers(newDrivers);
    }
    
    await onUpdateTrips(newTrips);
  };

  const renderTrips = () => (
    <div className="space-y-6">
      {/* License Alerts Banner */}
      {expiringDrivers.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-orange-500 mb-1">
            <AlertTriangle className="w-5 h-5" />
            <h4 className="text-sm font-bold uppercase tracking-widest">Compliance Alert: License Expiry</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiringDrivers.map(d => (
              <div key={d.id} className="bg-slate-900/50 p-3 rounded-xl border border-orange-500/20 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-white">{d.name}</p>
                  <p className="text-[10px] text-slate-500">{d.licenseNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-orange-400 uppercase">Expires: {new Date(d.licenseExpiry).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          {data.trips.map(trip => (
            <div key={trip.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-purple-500/50 transition-all group">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    trip.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
                    trip.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' :
                    trip.status === 'PENDING' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}>
                    {trip.status}
                  </span>
                  <span className="text-slate-600 text-[10px] font-bold">REF: {trip.id}</span>
                </div>
                <div>
                  <h4 className="font-bold text-lg text-white mb-1">{trip.pickup}</h4>
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <ChevronRight className="w-3 h-3 rotate-90" />
                    <span className="text-sm font-medium">{trip.drop}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(trip.dateTime).toLocaleTimeString()}</span>
                  <span className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5" /> {data.customers.find(c => c.id === trip.customerId)?.name || 'GUEST'}</span>
                  {trip.driverId && (
                    <span className="flex items-center gap-1.5 text-purple-400"><Navigation className="w-3.5 h-3.5" /> {data.drivers.find(d => d.id === trip.driverId)?.name}</span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {trip.status === 'PENDING' && (
                  <button 
                    onClick={() => setAssigningTripId(trip.id)}
                    className="flex-1 md:flex-none bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-900/20"
                  >
                    Assign Driver
                  </button>
                )}
                {trip.status === 'ASSIGNED' && (
                  <button 
                    onClick={() => handleAdminStatusChange(trip.id, 'STARTED')}
                    className="flex-1 md:flex-none border border-green-500/50 text-green-400 hover:bg-green-500/10 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Confirm Start
                  </button>
                )}
                {trip.status === 'STARTED' && (
                  <button 
                    onClick={() => handleAdminStatusChange(trip.id, 'COMPLETED')}
                    className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Confirm End
                  </button>
                )}
                {trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED' && (
                  <button 
                    onClick={() => handleCancelTrip(trip.id)}
                    className="p-3 bg-slate-800 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-2xl transition-all"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden h-[600px] sticky top-8 shadow-2xl">
          <MapView 
            trips={data.trips.filter(t => t.status === 'STARTED' || t.status === 'ASSIGNED')} 
            drivers={data.drivers}
          />
        </div>
      </div>

      {/* Driver Assignment Modal */}
      {assigningTripId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black italic tracking-tight">DISPATCH CENTER</h3>
              <button onClick={() => setAssigningTripId(null)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500"><XCircle /></button>
            </div>
            
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Available Drivers Nearby</p>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {data.drivers.filter(d => d.status === 'AVAILABLE').length === 0 ? (
                <div className="text-center py-8 text-slate-600 italic">No available drivers.</div>
              ) : (
                data.drivers.filter(d => d.status === 'AVAILABLE').map(driver => (
                  <div key={driver.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex justify-between items-center hover:border-purple-500/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-black">
                        {driver.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{driver.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">~{(Math.random() * 5).toFixed(1)} KM AWAY</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAssignDriver(driver.id)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/20"
                    >
                      Dispatch
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h2 className="text-4xl font-black text-white tracking-tighter italic">FLEET OVERVIEW</h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-2">Operator: {user.username} | Real-time Synchronization Active</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Fleet', value: data.trips.filter(t => t.status === 'STARTED').length, icon: Navigation, color: 'text-purple-400' },
          { label: 'Idle Drivers', value: data.drivers.filter(d => d.status === 'AVAILABLE').length, icon: Users, color: 'text-green-400' },
          { label: 'Dispatch Pending', value: data.trips.filter(t => t.status === 'PENDING').length, icon: Clock, color: 'text-orange-400' },
          { label: 'Daily Revenue', value: `₹${data.trips.filter(t => t.status === 'COMPLETED').reduce((acc, curr) => acc + (curr.finalPrice || 0), 0).toLocaleString()}`, icon: TrendingUp, color: 'text-blue-400' },
        ].map((s, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-sm hover:border-slate-700 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl bg-slate-950 border border-slate-800 ${s.color}`}>
                <s.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded-full">+12%</span>
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{s.label}</p>
            <h4 className="text-4xl font-black mt-2 text-white">{s.value}</h4>
          </div>
        ))}
      </div>

      <nav className="flex gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 w-fit">
        {(['trips', 'drivers', 'customers', 'finance'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === t ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/20' : 'text-slate-500 hover:text-white hover:bg-slate-800'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="bg-slate-950 min-h-[400px]">
        {activeTab === 'trips' && renderTrips()}
        {activeTab === 'drivers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.drivers.map(driver => (
              <div key={driver.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] group hover:border-purple-500/30 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex gap-5">
                    <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-purple-400 font-black text-2xl group-hover:scale-110 transition-transform">
                      {driver.name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-xl text-white">{driver.name}</h4>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">{driver.licenseNumber}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase ${
                    driver.status === 'AVAILABLE' ? 'bg-green-500/10 text-green-400' :
                    driver.status === 'ON_TRIP' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {driver.status}
                  </span>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center">
                   <div className="space-y-1">
                      <p className="text-[10px] text-slate-600 font-black uppercase">License Expiry</p>
                      <p className={`text-xs font-bold ${expiringDrivers.includes(driver) ? 'text-orange-400' : 'text-slate-300'}`}>{new Date(driver.licenseExpiry).toLocaleDateString()}</p>
                   </div>
                   <button className="bg-slate-800 hover:bg-purple-600/20 text-slate-400 hover:text-purple-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all">Full File</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'finance' && (
           <div className="bg-slate-900 border border-slate-800 p-12 rounded-[3rem] text-center text-slate-500">
             <div className="w-20 h-20 bg-purple-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-purple-500" />
             </div>
             <h4 className="text-2xl font-black text-white mb-2 italic">LEDGER ANALYSIS</h4>
             <p className="max-w-md mx-auto text-sm font-medium leading-relaxed">Enterprise financial reporting. Real-time auditing and billing reconciliation for multi-fleet operations.</p>
             <button className="mt-8 bg-purple-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-purple-700 transition-all shadow-2xl shadow-purple-900/30">Download Monthly Report</button>
           </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
