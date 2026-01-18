
import React, { useEffect, useRef } from 'react';
import { Driver } from '../types.ts';
import L from 'leaflet';

interface MapTrackerProps {
  driver: Driver;
}

const MapTracker: React.FC<MapTrackerProps> = ({ driver }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('leaflet-map').setView(driver.location, 14);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(mapRef.current);
    }

    if (markerRef.current) {
      markerRef.current.setLatLng(driver.location);
    } else {
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #9333ea; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px #9333ea;"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      markerRef.current = L.marker(driver.location, { icon: customIcon }).addTo(mapRef.current);
      markerRef.current.bindPopup(`<b>${driver.name}</b><br/>Status: ${driver.status}`).openPopup();
    }

    return () => {
      // Don't remove map on every update to prevent flickering
    };
  }, [driver.location, driver.name, driver.status]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div id="leaflet-map" className="w-full h-full rounded-b-3xl"></div>;
};

export default MapTracker;
