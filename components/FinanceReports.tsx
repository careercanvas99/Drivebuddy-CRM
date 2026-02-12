
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
  const completedTrips = trips.filter(t => t.status === 'COMPLETED');
  const totalRevenue = completedTrips.reduce((acc, t) => acc + (t.totalAmount || 0), 0);

  const formatDuration = (start: string, end: string | undefined) => {
    if (!start || !end) return "00:00";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const handleExportCSV = () => {
    if (completedTrips.length === 0) return alert("No data available to export.");
    
    const headers = ["Date", "Trip ID", "Customer", "Pilot", "Duration (HH:MM)", "Amount", "Mode"];
    const rows = completedTrips.map(t => [
      new Date(t.startDateTime).toLocaleDateString(),
      t.displayId,
      customers.find(c => c.id === t.customerId)?.name || "Guest",
      drivers.find(d => d.id === t.driverId)?.name || "Unassigned",
      formatDuration(t.startDateTime, t.endDateTime),
      t.totalAmount || 0,
      t.paymentMode || "Unpaid"
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Fiscal_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadInvoice = (trip: Trip) => {
    const cust = customers.find(c => c.id === trip.customerId);
    const driver = drivers.find(d => d.id === trip.driverId);
    generatePDFInvoice(trip, cust, companySettings, driver);
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
          <button 
            onClick={handleExportCSV}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs flex items-center gap-2 transition-colors font-bold uppercase tracking-widest"
          >
            {ICONS.Reports} Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-950 text-gray-400">
              <tr>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Trip ID</th>
                <th className="p-4 font-medium">Pilot</th>
                <th className="p-4 font-medium">Duration</th>
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
                  <td className="p-4 font-mono text-gray-500">{formatDuration(trip.startDateTime, trip.endDateTime)}</td>
                  <td className="p-4 font-bold text-green-400">₹ {trip.totalAmount?.toFixed(2)}</td>
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
