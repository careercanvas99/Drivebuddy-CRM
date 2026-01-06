
import React, { useEffect, useRef } from 'react';
import { Trip, Driver } from '../types';

// Declare Leaflet global variable to resolve 'Cannot find name L' errors
declare const L: any;

interface MapViewProps {
  trips: Trip[];
  drivers: Driver[];
}

const MapView: React.FC<MapViewProps> = ({ trips, drivers }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || leafletInstance.current) return;

    // Bangalore default center
    leafletInstance.current = L.map(mapRef.current).setView([12.9716, 77.5946], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(leafletInstance.current);

    // Add markers
    drivers.forEach(d => {
      if (d.currentLocation) {
        L.marker([d.currentLocation.lat, d.currentLocation.lng])
          .addTo(leafletInstance.current)
          .bindPopup(`<b>Driver: ${d.name}</b><br>Status: ${d.status}`);
      }
    });

    return () => {
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, [drivers]);

  return <div ref={mapRef} className="h-full w-full" />;
};

export default MapView;
