
import React, { useEffect, useRef } from 'react';
import { Driver, Trip, Customer } from '../types.ts';
import L from 'leaflet';

interface MapTrackerProps {
  drivers: Driver[];
  trips?: Trip[];
  customers?: Customer[];
  center?: [number, number];
  zoom?: number;
  onDriverClick?: (driverId: string) => void;
}

const MapTracker: React.FC<MapTrackerProps> = ({ drivers, trips = [], customers = [], center, zoom = 13, onDriverClick }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapRef.current) {
      const initialCenter = center || (drivers.length > 0 ? drivers[0].location : [17.3850, 78.4867]);
      mapRef.current = L.map('leaflet-map').setView(initialCenter, zoom);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(mapRef.current);
    }

    // Update markers
    const currentDriverIds = drivers.map(d => d.id);
    
    // Remove old markers
    Object.keys(markersRef.current).forEach(id => {
      if (!currentDriverIds.includes(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    drivers.forEach(driver => {
      const statusText = (driver.status || 'available').toLowerCase();
      const color = statusText === 'available' ? '#10b981' : statusText === 'busy' ? '#3b82f6' : '#6b7280';
      
      // Find active trip for this driver
      const activeTrip = trips.find(t => t.driverId === driver.id && (t.status === 'ASSIGNED' || t.status === 'STARTED'));
      const activeCustomer = activeTrip ? customers.find(c => c.id === activeTrip.customerId) : null;

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 10px;">${driver.name.charAt(0)}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const popupContent = `
          <div style="color: black; font-family: sans-serif; padding: 5px;">
            <b style="text-transform: uppercase; font-size: 12px;">${driver.name}</b><br/>
            <span style="font-size: 10px; color: #666;">ID: ${driver.displayId}</span><br/>
            <span style="font-size: 10px; font-weight: bold; color: ${color};">STATUS: ${statusText.toUpperCase()}</span>
            ${activeTrip ? `
              <div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 4px;">
                <b style="font-size: 9px; color: #9333ea;">LIVE MISSION</b><br/>
                <span style="font-size: 10px; color: #333;">${activeTrip.displayId}</span><br/>
                <span style="font-size: 10px; font-weight: bold;">${activeCustomer?.name || 'Guest'}</span>
              </div>
            ` : ''}
          </div>
        `;

      const tooltipContent = `
        <div style="font-weight: 900; text-transform: uppercase; font-size: 10px;">${driver.name}</div>
        ${activeTrip ? `<div style="font-size: 9px; opacity: 0.8;">${activeTrip.displayId} | ${activeCustomer?.name || 'Guest'}</div>` : `<div style="font-size: 9px; opacity: 0.6;">${statusText}</div>`}
      `;

      if (markersRef.current[driver.id]) {
        markersRef.current[driver.id].setLatLng(driver.location);
        markersRef.current[driver.id].setIcon(customIcon);
        markersRef.current[driver.id].setPopupContent(popupContent);
        markersRef.current[driver.id].setTooltipContent(tooltipContent);
      } else {
        const marker = L.marker(driver.location, { icon: customIcon }).addTo(mapRef.current!);
        marker.bindPopup(popupContent);
        
        // Bind tooltip for hover
        marker.bindTooltip(tooltipContent, { 
          direction: 'top', 
          offset: [0, -10],
          opacity: 0.9,
          className: 'custom-map-tooltip'
        });
        
        // Add click listener for internal state sync
        marker.on('click', () => {
          if (onDriverClick) onDriverClick(driver.id);
        });
        
        markersRef.current[driver.id] = marker;
      }
    });

    // Only auto-pan if we have a single driver being tracked or first initialization
    if (drivers.length === 1 && mapRef.current) {
        mapRef.current.panTo(drivers[0].location);
    }

  }, [drivers, trips, customers, center, zoom, onDriverClick]);

  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <style>{`
        .custom-map-tooltip {
          background: #000 !important;
          border: 1px solid #9333ea !important;
          color: #fff !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
          font-family: sans-serif !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important;
        }
        .custom-map-tooltip:before {
          border-top-color: #9333ea !important;
        }
      `}</style>
      <div id="leaflet-map" className="w-full h-full rounded-[2.5rem]"></div>
    </>
  );
};

export default MapTracker;
