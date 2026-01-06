
import React, { useState } from 'react';
import { Trip, User, AppData, Driver, SelfieData } from '../types';
import { Camera, MapPin, CheckCircle, Navigation, Info, Clock } from 'lucide-react';
import CameraCapture from './CameraCapture';

interface DriverPortalProps {
  user: User;
  data: AppData;
  onUpdateTrips: (trips: Trip[]) => Promise<void>;
  onUpdateDrivers: (drivers: Driver[]) => Promise<void>;
}

const DriverPortal: React.FC<DriverPortalProps> = ({ user, data, onUpdateTrips, onUpdateDrivers }) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'START' | 'END' | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Find the driver object associated with this user
  const driver = data.drivers.find(d => d.phone === user.phone || d.id === user.id);
  const assignedTrips = data.trips.filter(t => t.driverId === driver?.id && t.status !== 'CANCELLED');

  const handleCaptureSelfie = async (imageData: string, location: string) => {
    if (!activeTripId || !cameraMode) return;

    const selfie: SelfieData = {
      imageBase64: imageData,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      location: location || "Unknown"
    };

    const updatedTrips = data.trips.map(t => {
      if (t.id === activeTripId) {
        if (cameraMode === 'START') {
          return { 
            ...t, 
            status: 'STARTED' as const, 
            startSelfie: selfie,
            logs: [...t.logs, { timestamp: new Date().toISOString(), user: user.username, action: 'Started trip with selfie' }]
          };
        } else {
          // End trip - would also calculate price here from estimator
          return { 
            ...t, 
            status: 'COMPLETED' as const, 
            endSelfie: selfie,
            finalPrice: (t.basePrice || 100) * 1.4, // 40% markup requirement
            logs: [...t.logs, { timestamp: new Date().toISOString(), user: user.username, action: 'Completed trip with selfie' }]
          };
        }
      }
      return t;
    });

    await onUpdateTrips(updatedTrips);
    
    // Update driver status
    if (driver) {
      const updatedDrivers = data.drivers.map(d => 
        d.id === driver.id ? { ...d, status: cameraMode === 'START' ? 'ON_TRIP' as const : 'AVAILABLE' as const } : d
      );
      await onUpdateDrivers(updatedDrivers);
    }

    setIsCameraOpen(false);
    setCameraMode(null);
    setActiveTripId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-white">Hello, {driver?.name || user.username}</h2>
          <p className="text-slate-500 text-sm">Status: <span className="text-green-400 font-bold uppercase">{driver?.status || 'Active'}</span></p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Total Earned</p>
          <p className="text-3xl font-extrabold text-purple-400">₹8,450</p>
        </div>
      </header>

      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Navigation className="w-5 h-5 text-purple-500" /> Assigned Tasks
        </h3>

        {assignedTrips.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
            <Clock className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-500 font-medium">No assigned trips today. Relax!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assignedTrips.map(trip => (
              <div key={trip.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-purple-500/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-slate-500">TRIP #{trip.id}</span>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      trip.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      {trip.status}
                    </span>
                  </div>
                  <div className="space-y-4 mb-6">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center gap-1 mt-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <div className="w-0.5 h-6 bg-slate-700"></div>
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">{trip.pickup}</p>
                        <p className="text-sm font-semibold">{trip.drop}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {trip.status === 'ASSIGNED' && (
                  <button 
                    onClick={() => { setCameraMode('START'); setActiveTripId(trip.id); setIsCameraOpen(true); }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
                  >
                    <Camera className="w-5 h-5" /> Start Trip (Selfie)
                  </button>
                )}
                {trip.status === 'STARTED' && (
                  <button 
                    onClick={() => { setCameraMode('END'); setActiveTripId(trip.id); setIsCameraOpen(true); }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20"
                  >
                    <CheckCircle className="w-5 h-5" /> End Trip (Selfie)
                  </button>
                )}
                {trip.status === 'COMPLETED' && (
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Billing Confirmation</p>
                    <p className="text-lg font-bold text-white">Earnings: ₹{trip.finalPrice?.toFixed(2)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isCameraOpen && (
        <CameraCapture 
          onCapture={handleCaptureSelfie} 
          onClose={() => setIsCameraOpen(false)} 
          title={cameraMode === 'START' ? 'Start Trip Verification' : 'End Trip Verification'}
        />
      )}
    </div>
  );
};

export default DriverPortal;
