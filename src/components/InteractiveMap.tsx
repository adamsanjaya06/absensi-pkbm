import React, { useEffect, useRef } from 'react';
import { AttendanceRecord, OfficeSettings } from '../types';

interface InteractiveMapProps {
  office: OfficeSettings;
  records?: AttendanceRecord[];
  userLat?: number;
  userLng?: number;
  height?: string;
  className?: string;
  showOfficeRadius?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  office,
  records = [],
  userLat,
  userLng,
  height = '350px',
  className = '',
  showOfficeRadius = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Dynamically insert Leaflet CSS if not already loaded
    if (!document.getElementById('leaflet-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      // Import leaflet dynamically
      const L = await import('leaflet');

      if (!isMounted) return;

      // Clean existing instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const centerLat = userLat || office.latitude;
      const centerLng = userLng || office.longitude;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 16,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Headquarters Marker
      const officeIcon = L.divIcon({
        className: 'custom-office-pin',
        html: `
          <div style="background-color: #2563eb; color: white; border: 2px solid white; padding: 6px 10px; border-radius: 20px; font-weight: bold; font-size: 11px; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            <span>🏢</span> ${office.officeName}
          </div>
        `,
        iconSize: [120, 30],
        iconAnchor: [60, 15],
      });

      L.marker([office.latitude, office.longitude], { icon: officeIcon })
        .addTo(map)
        .bindPopup(`<b>[Pusat] ${office.officeName}</b><br/>${office.address}<br/>Radius Maks: ${office.radiusMeters} meter`);

      // Draw Headquarters Circle Radius
      if (showOfficeRadius) {
        L.circle([office.latitude, office.longitude], {
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          radius: office.radiusMeters,
          weight: 2,
          dashArray: '6, 6',
        }).addTo(map);
      }

      // Render Additional Office Branches on Map
      if (office.branches && office.branches.length > 0) {
        office.branches.forEach((b) => {
          if (!b.latitude || !b.longitude) return;

          const branchIcon = L.divIcon({
            className: 'custom-branch-pin',
            html: `
              <div style="background-color: #7c3aed; color: white; border: 2px solid white; padding: 5px 9px; border-radius: 20px; font-weight: bold; font-size: 10px; font-family: sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                <span>🏬</span> ${b.officeName}
              </div>
            `,
            iconSize: [110, 28],
            iconAnchor: [55, 14],
          });

          L.marker([b.latitude, b.longitude], { icon: branchIcon })
            .addTo(map)
            .bindPopup(`<b>[Cabang] ${b.officeName}</b><br/>${b.address}<br/>Radius Maks: ${b.radiusMeters} meter`);

          if (showOfficeRadius) {
            L.circle([b.latitude, b.longitude], {
              color: '#7c3aed',
              fillColor: '#8b5cf6',
              fillOpacity: 0.12,
              radius: b.radiusMeters,
              weight: 2,
              dashArray: '4, 4',
            }).addTo(map);
          }
        });
      }

      // If user current position passed
      if (userLat && userLng) {
        const userIcon = L.divIcon({
          className: 'custom-user-pin',
          html: `
            <div style="background-color: #10b981; color: white; border: 2px solid white; padding: 6px 10px; border-radius: 20px; font-weight: bold; font-size: 11px; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
              <span>📍</span> Lokasi Anda
            </div>
          `,
          iconSize: [100, 30],
          iconAnchor: [50, 15],
        });

        L.marker([userLat, userLng], { icon: userIcon })
          .addTo(map)
          .bindPopup(`<b>Posisi Realtime Anda</b><br/>Lat: ${userLat.toFixed(5)}, Lng: ${userLng.toFixed(5)}`);
      }

      // Add Attendance History Markers
      records.forEach((rec) => {
        if (!rec.latitude || !rec.longitude) return;

        const isSuccess = rec.status === 'berhasil';
        const color = isSuccess ? '#10b981' : '#ef4444';
        const typeLabel = rec.type === 'masuk' ? 'MASUK' : 'PULANG';

        const attIcon = L.divIcon({
          className: 'custom-att-pin',
          html: `
            <div style="background-color: ${color}; color: white; border: 2px solid white; width: 28px; height: 28px; border-radius: 50%; font-weight: bold; font-size: 11px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.25);">
              ${rec.type === 'masuk' ? 'IN' : 'OUT'}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const popupContent = `
          <div style="font-family: sans-serif; font-size: 12px; min-width: 180px;">
            <div style="font-weight: bold; font-size: 13px; color: #1e293b;">${rec.employeeName} (${rec.nik})</div>
            <div style="color: #64748b; margin-bottom: 4px;">${rec.divisionName}</div>
            <div style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: ${color}; color: white; margin-bottom: 6px;">
              ${typeLabel} - ${rec.status.toUpperCase()}
            </div>
            <div><b>Waktu:</b> ${rec.date} ${rec.serverTime}</div>
            <div><b>Jarak:</b> ${rec.distanceFromOfficeMeters}m dari kantor</div>
            <div><b>Kecocokan Wajah:</b> ${rec.faceMatchScore}%</div>
            <div style="margin-top: 4px; font-size: 11px; color: #475569;">${rec.address}</div>
          </div>
        `;

        L.marker([rec.latitude, rec.longitude], { icon: attIcon })
          .addTo(map)
          .bindPopup(popupContent);
      });
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [office, userLat, userLng, records, showOfficeRadius]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-0" />
    </div>
  );
};
