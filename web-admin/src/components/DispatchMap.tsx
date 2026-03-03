import React, { useEffect, useRef, useState } from 'react';

interface Driver {
  _id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: 'online' | 'offline' | 'on_ride' | 'on_trip' | 'break';
  currentLocation?: {
    coordinates: [number, number]; // [lng, lat]
  };
  vehicleModel?: string;
  licensePlate?: string;
  totalRides?: number;
  averageRating?: number;
}

interface DispatchMapProps {
  drivers: Driver[];
  onDriverClick?: (driver: Driver) => void;
  selectedDriverId?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

const DispatchMap: React.FC<DispatchMapProps> = ({ 
  drivers, 
  onDriverClick,
  selectedDriverId 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps API
  useEffect(() => {
    if (!mapRef.current) return;

    // Check if Google Maps API already loaded
    if (window.google) {
      initMap();
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError('Google Maps API Key không được cấu hình');
      setLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=maps,marker,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    script.onerror = () => {
      setLoading(false);
      setError('Không thể tải Google Maps API');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const initMap = () => {
    if (!window.google || !mapRef.current) {
      setError('Google Maps API chưa sẵn sàng');
      setLoading(false);
      return;
    }

    try {
      const { google } = window;

      // Default center to Ho Chi Minh City
      const center = { lat: 10.7769, lng: 106.7009 };

      const map = new google.maps.Map(mapRef.current!, {
        zoom: 13,
        center,
        mapTypeControl: true,
        fullscreenControl: true,
        styles: [
          {
            featureType: 'all',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b7280' }],
          },
        ],
      });

      mapInstanceRef.current = map;

      // Create InfoWindow
      infoWindowRef.current = new google.maps.InfoWindow();

      setLoading(false);
      console.log('✅ Map initialized');
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Lỗi khởi tạo bản đồ');
      setLoading(false);
    }
  };

  // Update markers when drivers change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;

    const { google } = window;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();

    // Filter drivers with valid locations
    const driversWithLocation = drivers.filter(
      d => d.currentLocation?.coordinates && 
      d.currentLocation.coordinates.length === 2 &&
      !isNaN(d.currentLocation.coordinates[0]) &&
      !isNaN(d.currentLocation.coordinates[1])
    );

    console.log(`📍 Displaying ${driversWithLocation.length} drivers on map`);

    if (driversWithLocation.length === 0) {
      console.warn('⚠️ No drivers with valid location data');
      return;
    }

    // Bounds to fit all drivers
    const bounds = new google.maps.LatLngBounds();

    // Create markers for each driver
    driversWithLocation.forEach(driver => {
      const [lng, lat] = driver.currentLocation!.coordinates;
      const position = { lat, lng };

      // Marker color based on status
      let markerColor = '#6b7280'; // gray (offline)
      let statusText = 'Offline';
      let statusIcon = '🚗';

      switch (driver.status) {
        case 'online':
          markerColor = '#22c55e'; // green
          statusText = 'Online';
          statusIcon = '✅';
          break;
        case 'on_ride':
        case 'on_trip':
          markerColor = '#3b82f6'; // blue
          statusText = 'Đang trong chuyến';
          statusIcon = '🚕';
          break;
        case 'break':
          markerColor = '#f59e0b'; // amber
          statusText = 'Nghỉ';
          statusIcon = '⏸️';
          break;
      }

      // Create marker
      try {
        const marker = new google.maps.Marker({
          position,
          map,
          title: `${driver.firstName} ${driver.lastName}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: markerColor,
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
        });

        // Info window content
        const infoContent = `
          <div style="padding: 8px; min-width: 200px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">
              ${statusIcon} ${driver.firstName} ${driver.lastName}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
              ${driver.licensePlate || 'N/A'} - ${driver.vehicleModel || 'N/A'}
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <span>⭐ ${driver.averageRating || 0}</span>
              <span>${driver.totalRides || 0} chuyến</span>
            </div>
            <div style="font-size: 12px; padding: 4px 8px; background: ${markerColor}; color: white; border-radius: 4px; text-align: center; margin-top: 4px;">
              ${statusText}
            </div>
            ${driver.phone ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">📱 ${driver.phone}</div>` : ''}
          </div>
        `;

        // Click event
        marker.addListener('click', () => {
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(map, marker);
          
          if (onDriverClick) {
            onDriverClick(driver);
          }
        });

        // Store marker
        if (driver._id) {
          markersRef.current.set(driver._id, marker);
        }

        // Extend bounds
        bounds.extend(position);
      } catch (err) {
        console.error('Error creating marker for driver:', driver._id, err);
      }
    });

    // Fit map to bounds
    if (driversWithLocation.length > 0) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      
      // Don't zoom in too much if only one driver
      google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        if (map.getZoom() > 15) {
          map.setZoom(15);
        }
      });
    }
  }, [drivers, onDriverClick]);

  // Highlight selected driver
  useEffect(() => {
    if (!selectedDriverId || !window.google) return;

    const marker = markersRef.current.get(selectedDriverId);
    if (marker) {
      // Pulse animation or highlight
      marker.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => {
        marker.setAnimation(null);
      }, 2000);

      // Pan to marker
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo(marker.getPosition());
      }
    }
  }, [selectedDriverId]);

  if (error) {
    return (
      <div className="w-full h-[500px] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <div className="text-center text-red-500">
          <span className="material-symbols-outlined text-4xl mb-2">error</span>
          <p className="text-sm font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-white dark:bg-slate-800 flex items-center justify-center z-10">
          <div className="text-center text-slate-500">
            <span className="material-symbols-outlined animate-spin text-4xl mb-2">refresh</span>
            <p className="text-sm">Đang tải bản đồ...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 text-xs border border-slate-200 dark:border-slate-700">
        <div className="font-bold text-slate-900 dark:text-white mb-2">Trạng thái tài xế</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-700 dark:text-slate-300">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-slate-700 dark:text-slate-300">Đang chạy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-slate-700 dark:text-slate-300">Nghỉ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-slate-700 dark:text-slate-300">Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispatchMap;
