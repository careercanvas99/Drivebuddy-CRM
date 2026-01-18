
import React, { useState } from 'react';
import { User, Driver, Trip, Customer } from '../types.ts';
import { ICONS } from '../constants.tsx';
import TripBookingModal from './TripBookingModal.tsx';

interface DashboardProps {
  users: User[];
  drivers: Driver[];
  trips: Trip[];
  customers: Customer[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const Dashboard: React.FC<DashboardProps> = ({ users, drivers, trips, customers, setTrips, setCustomers }) => {
  const [showBookingModal, setShowBookingModal] = useState(false);

  const stats = [
    { label: 'Active Drivers', value: drivers.filter(d => d.status !== 'inactive').length, icon: ICONS.Drivers, color: 'text-green-500' },
    { label: 'Pending Trips', value: trips.filter(t => t.status === 'unassigned').length, icon: ICONS.Trips, color: 'text-yellow-500' },
    { label: 'Total Customers', value: customers.length, icon: ICONS.Users, color: 'text-purple-500' },
    { label: 'Completed Trips', value: trips.filter(t => t.status === 'completed').length, icon: ICONS.History, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Operational Overview</h2>
        <button 
          onClick={() => setShowBookingModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all shadow-lg shadow-purple-900/40"
        >
          {ICONS.Plus} New Trip Booking
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-gray-900 p-6 rounded-2xl border border-gray-800 hover:border-purple-500/50 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <h3 className="text-3xl font-bold mt-1">{stat.value}</h3>
              </div>
              <div className={`p-3 bg-gray-950 rounded-xl ${stat.color} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="font-bold">Recent Trips</h3>
            <button className="text-xs text-purple-500 hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-950 text-gray-400">
                <tr>
                  <th className="p-4 font-medium">Trip ID</th>
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Destination</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {trips.slice(0, 5).map(trip => (
                  <tr key={trip.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 font-mono text-xs">{trip.id}</td>
                    <td className="p-4">{customers.find(c => c.id === trip.customerId)?.name || 'Guest'}</td>
                    <td className="p-4 max-w-[150px] truncate">{trip.dropLocation}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        trip.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                        trip.status === 'unassigned' ? 'bg-red-900/50 text-red-400' :
                        'bg-blue-900/50 text-blue-400'
                      }`}>
                        {trip.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
          <h3 className="font-bold border-b border-gray-800 pb-2">Expiring Licenses</h3>
          <div className="space-y-3">
            {drivers.map(driver => {
              const daysLeft = Math.ceil((new Date(driver.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              if (daysLeft < 30) {
                return (
                  <div key={driver.id} className="flex items-center justify-between p-3 bg-red-950/20 border border-red-900/30 rounded-lg">
                    <div>
                      <p className="text-sm font-bold text-red-400">{driver.name}</p>
                      <p className="text-[10px] text-gray-400">Exp: {driver.expiryDate}</p>
                    </div>
                    <span className="text-xs font-bold text-red-500">{daysLeft}d left</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>

      {showBookingModal && (
        <TripBookingModal 
          isOpen={showBookingModal} 
          onClose={() => setShowBookingModal(false)} 
          customers={customers} 
          setCustomers={setCustomers} 
          setTrips={setTrips} 
        />
      )}
    </div>
  );
};

export default Dashboard;
