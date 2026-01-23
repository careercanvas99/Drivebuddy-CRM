
import { jsPDF } from 'jspdf';
import { Trip, Customer, CompanySettings, Driver } from '../types.ts';

export const generatePDFInvoice = (trip: Trip, customer: Customer | undefined, settings: CompanySettings, driver?: Driver) => {
  const doc = new jsPDF();
  const primaryColor = '#9333ea';
  const secondaryColor = '#111827';

  // 1. Header & Branding
  if (settings.logo) {
    try {
      doc.addImage(settings.logo, 'PNG', 15, 15, 25, 25);
    } catch (e) {
      console.warn("Logo rendering skipped");
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text(settings.name.toUpperCase(), 45, 25);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text(settings.address, 45, 31, { maxWidth: 100 });
  doc.text(`Corporate Support: ${settings.mobile}`, 45, 39);

  doc.setDrawColor(240);
  doc.line(15, 45, 195, 45);

  // 2. Mission Metadata
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(secondaryColor);
  doc.text("TRIP COMPLETION RECEIPT", 15, 60);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Manifest ID: ${trip.displayId}`, 145, 60);
  doc.text(`Issued: ${new Date().toLocaleDateString('en-IN')}`, 145, 66);

  // 3. Entity Hub (Relational IDs)
  doc.setFillColor(248, 248, 248);
  doc.rect(15, 75, 180, 35, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.text("CLIENT RECORD", 20, 85);
  doc.text("PILOT ALLOCATION", 110, 85);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Name: ${customer?.name || "Guest Client"}`, 20, 92);
  doc.text(`ID: ${customer?.displayId || "CUST-PENDING"}`, 20, 98);
  doc.text(`Contact: ${customer?.mobile || "N/A"}`, 20, 104);

  doc.text(`Name: ${driver?.name || "Verified Professional"}`, 110, 92);
  doc.text(`ID: ${driver?.displayId || "DBDY-HYD-DR-XXX"}`, 110, 98);
  doc.text(`Pattern: ${trip.tripType.toUpperCase()}`, 110, 104);

  // 4. Logistics Breakdown
  doc.setFillColor(secondaryColor);
  doc.rect(15, 120, 180, 10, 'F');
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.text("MANIFEST DESCRIPTION", 20, 127);
  doc.text("HUB POINTS", 100, 127);
  doc.text("AMOUNT", 175, 127);

  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  let y = 140;
  doc.text("Professional Fleet Chauffeur Service", 20, y);
  doc.text("Departure: " + trip.pickupLocation.substring(0, 25) + "...", 100, y);
  doc.text(`₹${trip.billAmount || 0}`, 175, y);
  
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(`Start: ${new Date(trip.startDateTime).toLocaleString()}`, 100, y);
  
  y += 5;
  doc.text(`End: ${new Date(trip.endDateTime || Date.now()).toLocaleString()}`, 100, y);

  // 5. Fiscal Summary
  y = 175;
  doc.setDrawColor(230);
  doc.line(130, y, 195, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.text("Base Billable:", 140, y);
  const subtotal = Math.round((trip.billAmount || 0) / 1.18);
  doc.text(`₹${subtotal}`, 178, y);

  y += 8;
  doc.text("GST (18%):", 140, y);
  doc.text(`₹${(trip.billAmount || 0) - subtotal}`, 178, y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFillColor(primaryColor);
  doc.setTextColor(255);
  doc.rect(130, y - 6, 65, 10, 'F');
  doc.text("GRAND TOTAL (INR):", 135, y);
  doc.text(`₹${trip.billAmount || 0}`, 178, y);

  // 6. Footer Protocol
  doc.setTextColor(180);
  doc.setFontSize(7);
  doc.text("AUDIT PROTOCOL: This manifest receipt is computer-generated at the SQL layer.", 105, 280, { align: 'center' });
  doc.text(`DRIVEBUDDY PLATFORM - MISSION LOG ID ${trip.displayId}`, 105, 285, { align: 'center' });

  doc.save(`Invoice_${trip.displayId}.pdf`);
};
