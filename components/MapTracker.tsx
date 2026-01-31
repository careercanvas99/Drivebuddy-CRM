
import React, { useEffect, useRef } from 'react';
import { Driver } from '../types.ts';
import L from 'leaflet';

interface MapTrackerProps {
  drivers: Driver[];
  center?: [number, number];
  zoom?: number;
}

const MapTracker: React.FC<MapTrackerProps> = ({ drivers, center, zoom = 13 }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapRef.current) {
      const initialCenter = center || (drivers.length > 0 ? drivers[0].location : [12.9716, 77.5946]);
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
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 10px;">${driver.name.charAt(0)}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const popupContent = `
          <div style="color: black; font-family: sans-serif;">
            <b style="text-transform: uppercase;">${driver.name}</b><br/>
            <span style="font-size: 10px; color: #666;">ID: ${driver.displayId}</span><br/>
            <span style="font-size: 10px; font-weight: bold; color: ${color};">STATUS: ${statusText.toUpperCase()}</span>
          </div>
        `;

      if (markersRef.current[driver.id]) {
        markersRef.current[driver.id].setLatLng(driver.location);
        markersRef.current[driver.id].setIcon(customIcon);
        markersRef.current[driver.id].setPopupContent(popupContent);
      } else {
        const marker = L.marker(driver.location, { icon: customIcon }).addTo(mapRef.current!);
        marker.bindPopup(popupContent);
        markersRef.current[driver.id] = marker;
      }
    });

    if (drivers.length === 1 && mapRef.current) {
        mapRef.current.panTo(drivers[0].location);
    }

  }, [drivers, center, zoom]);

  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div id="leaflet-map" className="w-full h-full rounded-[2.5rem]"></div>;
};

export default MapTracker;
