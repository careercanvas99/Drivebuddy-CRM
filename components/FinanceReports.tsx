
import React from 'react';
import { Trip, Driver, Customer, CompanySettings } from '../types.ts';
import { ICONS } from '../constants.tsx';
import { generatePDFInvoice } from '../services/InvoiceService.ts';

interface FinanceReportsProps {
  trips: Trip[];
  drivers: Driver[];
  customers: Customer[];
  companySettings: CompanySettings;
}

const FinanceReports: React.FC<FinanceReportsProps> = ({ trips, drivers, customers, companySettings }) => {
  // Fix: Comparing against 'COMPLETED' to match TripStatus definition
  const completedTrips = trips.filter(t => t.status === 'COMPLETED');
  const totalRevenue = completedTrips.reduce((acc, t) => acc + (t.billAmount || 0), 0);

  const handleDownloadInvoice = (trip: Trip) => {
    const cust = customers.find(c => c.id === trip.customerId);
    generatePDFInvoice(trip, cust, companySettings);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
          <p className="text-gray-500 text-sm">Total Revenue</p>
          <h3 className="text-3xl font-bold text-green-500 mt-2">₹ {totalRevenue.toLocaleString()}</h3>
        </div>
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
          <p className="text-gray-500 text-sm">Completed Trips</p>
          <h3 className="text-3xl font-bold text-blue-500 mt-2">{completedTrips.length}</h3>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="font-bold">Transaction History</h3>
          <button className="bg-gray-800 text-white px-3 py-1 rounded text-xs flex items-center gap-2">
            {ICONS.Reports} Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-950 text-gray-400">
              <tr>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Trip ID</th>
                <th className="p-4 font-medium">Driver</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {completedTrips.map(trip => (
                <tr key={trip.id} className="hover:bg-gray-800/50">
                  <td className="p-4">{new Date(trip.startDateTime).toLocaleDateString()}</td>
                  <td className="p-4 font-mono text-xs text-purple-400">{trip.displayId}</td>
                  <td className="p-4">{drivers.find(d => d.id === trip.driverId)?.name}</td>
                  <td className="p-4 font-bold text-green-400">₹ {trip.billAmount?.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDownloadInvoice(trip)}
                      className="text-[10px] bg-purple-600/20 text-purple-400 px-3 py-1 rounded hover:bg-purple-600 hover:text-white transition-all font-black uppercase tracking-widest"
                    >
                      Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceReports;
