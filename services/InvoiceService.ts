
import { jsPDF } from 'jspdf';
import { Trip, Customer, CompanySettings, Driver } from '../types.ts';

/**
 * Professional Invoice Generation Service
 * Fixes billing inconsistencies by deriving fiscal data from the database total_amount
 */
export const generatePDFInvoice = (trip: Trip, customer: Customer | undefined, settings: CompanySettings, driver?: Driver) => {
  const doc = new jsPDF();
  const primaryColor = '#9333ea'; // Drivebuddy Purple
  const secondaryColor = '#111827'; // Dark Slate

  // SOURCE OF TRUTH: Use totalAmount directly from CRM registry
  const finalizedTotal = trip.totalAmount || 0;
  // Derive Subtotal and GST (Inclusive of 18%)
  const subtotal = Math.round(finalizedTotal / 1.18);
  const gst = finalizedTotal - subtotal;

  // 1. HEADER & BRANDING
  if (settings.logo) {
    try {
      doc.addImage(settings.logo, 'PNG', 15, 15, 25, 25);
    } catch (e) {
      console.warn("Branding asset skipped");
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

  // 2. MISSION METADATA
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(secondaryColor);
  doc.text("MISSION COMPLETION RECEIPT", 15, 60);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Manifest ID: ${trip.displayId}`, 145, 60);
  doc.text(`Issued: ${new Date().toLocaleDateString('en-IN')}`, 145, 66);

  // 3. ENTITY HUB (Client & Pilot)
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
  doc.text(`Route: ${trip.tripRoute || 'Instation'}`, 110, 104);

  // 4. LOGISTICS BREAKDOWN
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
  doc.text("Pickup: " + (trip.pickupLocation.substring(0, 20) + "..."), 100, y);
  doc.text(`INR ${finalizedTotal}`, 175, y);
  
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(`Start: ${new Date(trip.startDateTime).toLocaleString()}`, 100, y);
  
  y += 5;
  const endDisplay = trip.endDateTime ? new Date(trip.endDateTime).toLocaleString() : "N/A";
  doc.text(`End: ${endDisplay}`, 100, y);

  // 5. FISCAL SUMMARY
  y = 175;
  doc.setDrawColor(230);
  doc.line(130, y, 195, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.text("Base Billable:", 140, y);
  doc.text(`₹${subtotal}`, 178, y);

  y += 8;
  doc.text("GST (18%):", 140, y);
  doc.text(`₹${gst}`, 178, y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFillColor(primaryColor);
  doc.setTextColor(255);
  doc.rect(130, y - 6, 65, 10, 'F');
  doc.text("GRAND TOTAL (INR):", 135, y);
  doc.text(`₹${finalizedTotal}`, 178, y);

  // 6. FOOTER PROTOCOL
  doc.setTextColor(180);
  doc.setFontSize(7);
  doc.text("AUDIT PROTOCOL: Verified via biometric check-in. Computer-generated registry.", 105, 280, { align: 'center' });
  doc.text(`DRIVEBUDDY PLATFORM - MISSION LOG ${trip.displayId}`, 105, 285, { align: 'center' });

  doc.save(`Invoice_${trip.displayId}.pdf`);
};
