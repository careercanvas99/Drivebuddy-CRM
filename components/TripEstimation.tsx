
import React, { useState } from 'react';
import { ICONS } from '../constants.tsx';

// Fare chart ported exactly from the provided trip-estimator-main/rates.js
export const fareChart: any = {
  "No": {
    "Instation": {
      "Round Trip": {
        "0-120": { day: 2.25, night: 2.60 },
        "121-240": { day: 2.15, night: 2.55 },
        "241-480": { day: 2.10, night: 2.40 },
        "481-600": { day: 1.90, night: 2.35 },
        "601-720": { day: 1.85, night: 2.30 },
        "721-1080": { day: 1.70, night: 1.95 },
        "1081-1440": { day: 1.50, night: 1.55 },
        "1441-8640": { day: 1.15, night: 1.15 },
        "8641-1000000": { day: 1.05, night: 1.05 }
      },
      "One Way": {
        "0-120": { day: 2.70, night: 5.55 },
        "121-240": { day: 2.60, night: 5.10 },
        "241-480": { day: 2.40, night: 4.60 },
        "481-600": { day: 2.15, night: 3.15 },
        "601-720": { day: 2.15, night: 3.15 },
        "721-1080": { day: 2.10, night: 2.60 },
        "1081-1440": { day: 1.80, night: 1.90 },
        "1441-8640": { day: 1.50, night: 1.50 },
        "8641-1000000": { day: 1.30, night: 1.30 }
      }
    },
    "Outstation": {
      "Round Trip": {
        "0-120": { day: 2.60, night: 3.05 },
        "121-240": { day: 2.55, night: 3.00 },
        "241-480": { day: 2.25, night: 2.45 },
        "481-600": { day: 2.15, night: 2.40 },
        "601-720": { day: 2.15, night: 2.40 },
        "721-1080": { day: 2.00, night: 2.25 },
        "1081-1440": { day: 1.70, night: 1.70 },
        "1441-8640": { day: 1.20, night: 1.20 },
        "8641-1000000": { day: 1.15, night: 1.15 }
      },
      "One Way": {
        "0-120": { day: 6.30, night: 6.30 },
        "121-240": { day: 5.90, night: 5.90 },
        "241-480": { day: 5.90, night: 5.90 },
        "481-600": { day: 5.90, night: 5.90 },
        "601-720": { day: 5.90, night: 5.90 },
        "721-1080": { day: 5.20, night: 5.20 },
        "1081-1440": { day: 3.80, night: 3.80 },
        "1441-8640": { day: 3.00, night: 3.00 },
        "8641-1000000": { day: 2.15, night: 2.15 }
      }
    }
  },
  "Yes": {
    "Instation": {
      "Round Trip": {
        "0-120": { day: 2.30, night: 2.65 },
        "121-240": { day: 2.20, night: 2.60 },
        "241-480": { day: 2.15, night: 2.45 },
        "481-600": { day: 1.95, night: 2.40 },
        "601-720": { day: 1.90, night: 2.35 },
        "721-1080": { day: 1.75, night: 2.00 },
        "1081-1440": { day: 1.55, night: 1.60 },
        "1441-8640": { day: 1.20, night: 1.20 },
        "8641-1000000": { day: 1.10, night: 1.10 }
      },
      "One Way": {
        "0-120": { day: 2.75, night: 5.60 },
        "121-240": { day: 2.65, night: 5.15 },
        "241-480": { day: 2.45, night: 4.65 },
        "481-600": { day: 2.20, night: 3.20 },
        "601-720": { day: 2.20, night: 3.20 },
        "721-1080": { day: 2.15, night: 2.65 },
        "1081-1440": { day: 1.85, night: 1.95 },
        "1441-8640": { day: 1.55, night: 1.55 },
        "8641-1000000": { day: 1.35, night: 1.35 }
      }
    },
    "Outstation": {
      "Round Trip": {
        "0-120": { day: 2.65, night: 3.10 },
        "121-240": { day: 2.60, night: 3.05 },
        "241-480": { day: 2.30, night: 2.50 },
        "481-600": { day: 2.20, night: 2.45 },
        "601-720": { day: 2.20, night: 2.45 },
        "721-1080": { day: 2.05, night: 2.30 },
        "1081-1440": { day: 1.75, night: 1.75 },
        "1441-8640": { day: 1.25, night: 1.25 },
        "8641-1000000": { day: 1.20, night: 1.20 }
      },
      "One Way": {
        "0-120": { day: 6.35, night: 6.35 },
        "121-240": { day: 5.95, night: 5.95 },
        "241-480": { day: 5.95, night: 5.95 },
        "481-600": { day: 5.95, night: 5.95 },
        "601-720": { day: 5.95, night: 5.95 },
        "721-1080": { day: 5.25, night: 5.25 },
        "1081-1440": { day: 3.85, night: 3.85 },
        "1441-8640": { day: 3.05, night: 3.05 },
        "8641-1000000": { day: 2.20, night: 2.20 }
      }
    }
  }
};

/**
 * Shared fare calculation logic used across CRM.
 */
export const calculateFareInternal = (start: Date, end: Date, uniform: string, tripType: string, mode: string) => {
  const calculateDayNightMinutes = (s: Date, e: Date) => {
    let dayMinutes = 0;
    let nightMinutes = 0;
    let current = new Date(s);
    while (current < e) {
      const hour = current.getHours();
      const isDay = hour >= 7 && hour < 22; // Day shift: 7 AM to 10 PM
      if (isDay) dayMinutes++; else nightMinutes++;
      current.setMinutes(current.getMinutes() + 1);
    }
    return { dayMinutes, nightMinutes };
  };

  let { dayMinutes, nightMinutes } = calculateDayNightMinutes(start, end);
  let totalMinutes = dayMinutes + nightMinutes;

  // Minimum Billing Protocol: 120 minutes
  if (totalMinutes < 120) {
    const diff = 120 - totalMinutes;
    let tempTime = new Date(end);
    for (let i = 0; i < diff; i++) {
      const hour = tempTime.getHours();
      if (hour >= 7 && hour < 22) dayMinutes++; else nightMinutes++;
      tempTime.setMinutes(tempTime.getMinutes() + 1);
    }
    totalMinutes = 120;
  }

  const timeRanges = ["0-120", "121-240", "241-480", "481-600", "601-720", "721-1080", "1081-1440", "1441-8640", "8641-1000000"];
  let rates = { day: 0, night: 0 };
  for (const range of timeRanges) {
    const [min, max] = range.split('-').map(Number);
    if (totalMinutes >= min && totalMinutes <= max) {
      rates = fareChart[uniform][tripType][mode][range];
      break;
    }
  }

  const basePrice = (dayMinutes * rates.day) + (nightMinutes * rates.night);
  const gst = Math.round(basePrice * 0.18);
  const totalPrice = Math.round(basePrice + gst);

  return {
    totalMinutes,
    hours: Math.floor(totalMinutes / 60),
    mins: totalMinutes % 60,
    dayMinutes,
    nightMinutes,
    dayRate: rates.day,
    nightRate: rates.night,
    basePrice,
    gst,
    totalPrice
  };
};

const TripEstimation: React.FC = () => {
  const [formData, setFormData] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    uniform: 'No',
    tripType: 'Instation',
    mode: 'Round Trip'
  });

  const [estimation, setEstimation] = useState<any | null>(null);
  const [copyStatus, setCopyStatus] = useState('Copy Summary');

  const calculateEstimation = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`${formData.startDate}T${formData.startTime}`);
    const end = new Date(`${formData.endDate}T${formData.endTime}`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return alert("Invalid date/time.");
    if (end <= start) return alert("End time must be after start time.");

    const results = calculateFareInternal(start, end, formData.uniform, formData.tripType, formData.mode);
    setEstimation(results);
  };

  const copySummary = () => {
    if (!estimation) return;
    
    const start = new Date(`${formData.startDate}T${formData.startTime}`);
    const end = new Date(`${formData.endDate}T${formData.endTime}`);
    
    const formatDateTime = (date: Date) => {
      return date.toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    };

    const summary = `Trip Start Time - ${formatDateTime(start)}
Trip End Time - ${formatDateTime(end)}
Trip Type - ${formData.tripType}
Trip Route - ${formData.mode}
Total Time - ${String(estimation.hours).padStart(2, '0')}:${String(estimation.mins).padStart(2, '0')}
Total Price - ₹${estimation.totalPrice}`;

    navigator.clipboard.writeText(summary).then(() => {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy Summary'), 2000);
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">Trip Estimation Engine</h2>
        <p className="text-gray-400 text-sm">Professional tiered pricing with automatic GST and Shift logic</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={calculateEstimation} className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-3xl p-8 space-y-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
               <h4 className="text-[10px] text-purple-500 uppercase font-black tracking-widest border-b border-gray-800 pb-2 flex items-center gap-2">
                 {ICONS.Trips} Timing Configuration
               </h4>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase px-2 font-bold">Start Date</label>
                    <input required type="date" className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase px-2 font-bold">Start Time</label>
                    <input required type="time" className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase px-2 font-bold">End Date</label>
                    <input required type="date" className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase px-2 font-bold">End Time</label>
                    <input required type="time" className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                  </div>
               </div>
            </div>

            <div className="space-y-6">
               <h4 className="text-[10px] text-purple-500 uppercase font-black tracking-widest border-b border-gray-800 pb-2 flex items-center gap-2">
                 {ICONS.Reports} Service Metrics
               </h4>
               <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase px-2 font-bold">Uniform Required</label>
                  <select className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={formData.uniform} onChange={e => setFormData({...formData, uniform: e.target.value})}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase px-2 font-bold">Trip Category</label>
                    <select className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={formData.tripType} onChange={e => setFormData({...formData, tripType: e.target.value})}>
                      <option value="Instation">Instation</option>
                      <option value="Outstation">Outstation</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase px-2 font-bold">Route Mode</label>
                    <select className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-purple-500 outline-none" value={formData.mode} onChange={e => setFormData({...formData, mode: e.target.value})}>
                      <option value="Round Trip">Round Trip</option>
                      <option value="One Way">One Way</option>
                    </select>
                  </div>
               </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-purple-900/40 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg">
            {ICONS.Finance} Generate Bill Estimation
          </button>
        </form>

        <div className="flex flex-col">
          {estimation ? (
            <div className="bg-purple-900/10 border-2 border-purple-500/30 rounded-[2.5rem] p-8 text-center animate-in zoom-in duration-300 shadow-2xl relative overflow-hidden flex flex-col h-full">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
              
              <div className="flex justify-between items-center mb-6">
                <p className="text-[10px] text-purple-400 font-black uppercase tracking-[0.2em]">Live Estimation</p>
                <button onClick={copySummary} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold text-white transition-all">
                  {copyStatus}
                </button>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-7xl font-black text-white">₹ {estimation.totalPrice.toLocaleString()}</h3>
                <p className="text-gray-400 text-sm mt-2">All-Inclusive Total Amount</p>
              </div>
              
              <div className="mt-8 space-y-4 pt-8 border-t border-purple-500/20 text-left">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 uppercase font-black">Total Duration:</span>
                  <span className="text-white font-black">{estimation.hours}h {estimation.mins}m</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 uppercase font-black">Shift Mix:</span>
                  <span className="text-white">{estimation.dayMinutes}m (Day) / {estimation.nightMinutes}m (Night)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 uppercase font-black">Base Billable:</span>
                  <span className="text-white">₹ {estimation.basePrice.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-gray-800">
                  <span className="text-purple-400 font-black">GST Applied (18%):</span>
                  <span className="text-purple-400 font-black">₹ {estimation.gst}</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gray-950 rounded-2xl text-[10px] text-gray-500 italic border border-gray-800 text-center leading-relaxed">
                * Based on tiered rate structure from professional fare chart. Minimum 120-minute billing cycle enforced. Day: 07:00-22:00.
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/50 border-2 border-dashed border-gray-800 rounded-[2.5rem] p-10 text-center flex flex-col items-center justify-center h-full space-y-6">
              <div className="w-20 h-20 bg-gray-950 rounded-full flex items-center justify-center text-gray-700 shadow-inner">
                {ICONS.Reports}
              </div>
              <div>
                <h4 className="font-black text-gray-400 uppercase tracking-widest text-sm">Engine Idle</h4>
                <p className="text-[10px] text-gray-600 max-w-[200px] mx-auto uppercase mt-2 font-bold leading-relaxed">Please configure the journey metrics on the left to initiate fare calculation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripEstimation;
