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

interface BaseTrip {
  _id: string;
  tripType: 'ride' | 'combined' | 'delivery' | 'hourly';
  pickupAddress: string;
  dropoffAddress: string;
  pickupLocation?: {
    type: string;
    coordinates: [number, number];
  };
  dropoffLocation?: {
    type: string;
    coordinates: [number, number];
  };
  status: string;
  driver?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    currentLocation?: {
      coordinates: [number, number];
    };
  };
  customer?: {
    firstName?: string;
    lastName?: string;
  };
}

interface DispatchMapProps {
  drivers: Driver[];
  onDriverClick?: (driver: Driver) => void;
  selectedDriverId?: string;
  selectedTrip?: BaseTrip | null;
}

declare global {
  interface Window {
    google?: any;
  }
}

const DispatchMap: React.FC<DispatchMapProps> = ({ 
  drivers, 
  onDriverClick,
  selectedDriverId,
  selectedTrip
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
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

  // Update markers when drivers or selectedTrip change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;

    const { google } = window;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();

    // Clear old directions
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }

    // If trip is selected, show only trip markers and route
    if (selectedTrip && selectedTrip.pickupLocation && selectedTrip.dropoffLocation) {
      console.log('🗺️ Showing selected trip on map:', selectedTrip._id);
      const bounds = new google.maps.LatLngBounds();

      // Pickup marker (green A)
      const [pickupLng, pickupLat] = selectedTrip.pickupLocation.coordinates;
      const pickupMarker = new google.maps.Marker({
        position: { lat: pickupLat, lng: pickupLng },
        map,
        title: 'Điểm đón',
        label: { text: 'A', color: '#ffffff', fontWeight: 'bold' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
      });
      markersRef.current.set('pickup', pickupMarker);
      bounds.extend({ lat: pickupLat, lng: pickupLng });

      // Dropoff marker (red B)
      const [dropoffLng, dropoffLat] = selectedTrip.dropoffLocation.coordinates;
      const dropoffMarker = new google.maps.Marker({
        position: { lat: dropoffLat, lng: dropoffLng },
        map,
        title: 'Điểm trả',
        label: { text: 'B', color: '#ffffff', fontWeight: 'bold' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
      });
      markersRef.current.set('dropoff', dropoffMarker);
      bounds.extend({ lat: dropoffLat, lng: dropoffLng });

      // Driver marker (blue car) if available
      if (selectedTrip.driver?.currentLocation?.coordinates) {
        const [driverLng, driverLat] = selectedTrip.driver.currentLocation.coordinates;
        const driverMarker = new google.maps.Marker({
          position: { lat: driverLat, lng: driverLng },
          map,
          title: `Tài xế: ${selectedTrip.driver.firstName} ${selectedTrip.driver.lastName}`,
          icon: {
            path: 'M17.402,0H5.643C2.526,0,0,3.467,0,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759c3.116,0,5.644-2.527,5.644-5.644 V6.584C23.044,3.467,20.518,0,17.402,0z M22.057,14.188v11.665l-2.729,0.351v-4.806L22.057,14.188z M20.625,10.773 c-1.016,3.9-2.219,8.51-2.219,8.51H4.638l-2.222-8.51C2.417,10.773,11.3,7.755,20.625,10.773z M3.748,21.713v4.492l-2.73-0.349 V14.502L3.748,21.713z M1.018,37.938V27.579l2.73,0.343v8.196L1.018,37.938z M2.575,40.882l2.218-3.336h13.771l2.219,3.336H2.575z M19.328,35.805v-7.872l2.729-0.355v10.048L19.328,35.805z',
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            scale: 0.6,
            anchor: new google.maps.Point(12, 24),
          },
        });
        markersRef.current.set('driver', driverMarker);
        bounds.extend({ lat: driverLat, lng: driverLng });
      }

      // Draw polyline route
      const directionsService = new google.maps.DirectionsService();
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeOpacity: 0.8,
          strokeWeight: 5,
          geodesic: true,
        },
      });

      directionsService.route(
        {
          origin: { lat: pickupLat, lng: pickupLng },
          destination: { lat: dropoffLat, lng: dropoffLng },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === 'OK' && result) {
            directionsRendererRef.current.setDirections(result);
            console.log('✅ Polyline drawn successfully');
          } else {
            console.error('❌ Directions request failed:', status);
          }
        }
      );

      // Fit map to bounds
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      return;
    }

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
  }, [drivers, onDriverClick, selectedTrip]);

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
