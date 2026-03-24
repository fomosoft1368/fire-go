import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../services/api';

interface RideMapProps {
  pickupCoords?: [number, number];
  dropoffCoords?: [number, number];
  pickupAddress: string;
  dropoffAddress: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

const RideMap: React.FC<RideMapProps> = ({ 
  pickupCoords = [106.6309, 10.7895], 
  dropoffCoords = [106.6654, 10.8123],
  pickupAddress,
  dropoffAddress
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log coordinates được truyền vào
  useEffect(() => {
    const isDefaultPickup = pickupCoords[0] === 106.6309 && pickupCoords[1] === 10.7895;
    const isDefaultDropoff = dropoffCoords[0] === 106.6654 && dropoffCoords[1] === 10.8123;
    
    console.log('🗺️ RideMap Props:', {
      pickupCoords,
      dropoffCoords,
      pickupAddress,
      dropoffAddress,
      isUsingDefaultPickup: isDefaultPickup,
      isUsingDefaultDropoff: isDefaultDropoff,
    });

    if (isDefaultPickup || isDefaultDropoff) {
      console.warn('⚠️ WARNING: Using default coordinates! Component parent may not be passing coords correctly');
    }
  }, [pickupCoords, dropoffCoords, pickupAddress, dropoffAddress]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Check if Google Maps API already loaded
    if (window.google) {
      initMap();
      return;
    }

    // Tải Google Maps API
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
      console.error('Failed to load Google Maps API');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const initMap = async () => {
    if (!window.google || !mapRef.current) {
      setError('Google Maps API chưa sẵn sàng');
      setLoading(false);
      return;
    }

    try {
      const { google } = window;

      // Validate coordinates
      const isValidCoord = (coords: [number, number]) => {
        if (!coords || coords.length !== 2) return false;
        if (isNaN(coords[0]) || isNaN(coords[1])) return false;
        // Longitude: -180 to 180, Latitude: -90 to 90
        if (coords[0] < -180 || coords[0] > 180) {
          console.warn(`❌ Longitude ${coords[0]} out of range [-180, 180]`);
          return false;
        }
        if (coords[1] < -90 || coords[1] > 90) {
          console.warn(`❌ Latitude ${coords[1]} out of range [-90, 90]`);
          return false;
        }
        return true;
      };

      if (!isValidCoord(pickupCoords) || !isValidCoord(dropoffCoords)) {
        console.warn('❌ Invalid coordinates:', { pickupCoords, dropoffCoords });
        setError('Tọa độ không hợp lệ. Kiểm tra dữ liệu từ server.');
        setLoading(false);
        return;
      }

      console.log('✅ Valid coordinates, initializing map...');
      console.log('📍 Pickup coords:', {
        lng: pickupCoords[0],
        lat: pickupCoords[1],
        geoJSON: pickupCoords,
      });
      console.log('📍 Dropoff coords:', {
        lng: dropoffCoords[0],
        lat: dropoffCoords[1],
        geoJSON: dropoffCoords,
      });

      // Tạo map centered giữa pickup & dropoff
      const center = {
        lat: (pickupCoords[1] + dropoffCoords[1]) / 2,
        lng: (pickupCoords[0] + dropoffCoords[0]) / 2,
      };

      console.log('📍 Map center:', center);

      const mapInstance = new google.maps.Map(mapRef.current!, {
        zoom: 12,
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

      // Zoom to fit both markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: pickupCoords[1], lng: pickupCoords[0] });
      bounds.extend({ lat: dropoffCoords[1], lng: dropoffCoords[0] });
      
      // Add some padding
      mapInstance.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });

      // Markers - sử dụng AdvancedMarkerElement
      const pickupLatLng = { lat: pickupCoords[1], lng: pickupCoords[0] };
      const dropoffLatLng = { lat: dropoffCoords[1], lng: dropoffCoords[0] };

      console.log('🔧 Creating markers:', { pickup: pickupLatLng, dropoff: dropoffLatLng });

      try {
        // Pickup marker
        const pickupPin = new google.maps.marker.PinElement({
          background: '#22c55e',
          glyph: '📍',
        });
        new google.maps.marker.AdvancedMarkerElement({
          position: pickupLatLng,
          map: mapInstance,
          title: pickupAddress,
          content: pickupPin.element,
        });
        console.log('✅ Pickup marker created');

        // Dropoff marker
        const dropoffPin = new google.maps.marker.PinElement({
          background: '#ef4444',
          glyph: '📍',
        });
        new google.maps.marker.AdvancedMarkerElement({
          position: dropoffLatLng,
          map: mapInstance,
          title: dropoffAddress,
          content: dropoffPin.element,
        });
        console.log('✅ Dropoff marker created');
      } catch (err) {
        // Fallback to old Marker API nếu AdvancedMarkerElement không hoạt động
        console.warn('⚠️ AdvancedMarkerElement not available, using legacy Marker API', err);
        new google.maps.Marker({
          position: pickupLatLng,
          map: mapInstance,
          title: pickupAddress,
          icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        });

        new google.maps.Marker({
          position: dropoffLatLng,
          map: mapInstance,
          title: dropoffAddress,
          icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        });
        console.log('✅ Legacy markers created as fallback');
      }

      // Directions Service để lấy routing
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map: mapInstance,
        polylineOptions: {
          strokeColor: '#FF6B00',
          strokeOpacity: 0.8,
          strokeWeight: 4,
        },
      });

      const originLat = pickupCoords[1];
      const originLng = pickupCoords[0];
      const destLat = dropoffCoords[1];
      const destLng = dropoffCoords[0];

      const originObj = { lat: originLat, lng: originLng };
      const destObj = { lat: destLat, lng: destLng };

      console.log('🔍 Directions request details:');
      console.log('   Origin:', originObj, `(${pickupAddress})`);
      console.log('   Destination:', destObj, `(${dropoffAddress})`);
      console.log('   Distance:', Math.sqrt(Math.pow(destLat - originLat, 2) + Math.pow(destLng - originLng, 2)) * 111, 'km approx');

      // Use OpenRouteService for actual routing via backend proxy (avoids CORS)
      const fetchRoute = async () => {
        try {
          console.log('🔍 Fetching route from backend (ORS proxy)...');
          
          const response = await fetch(
            `${API_BASE_URL}/rides/directions?startLng=${originLng}&startLat=${originLat}&endLng=${destLng}&endLat=${destLat}`
          );
          
          if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('✅ Route data received from backend:', data);
          
          if (data.features && data.features.length > 0) {
            const route = data.features[0];
            const coords = route.geometry.coordinates;
            
            // Draw polyline from ORS route
            const polylinePath = coords.map((coord: [number, number]) => ({
              lat: coord[1],
              lng: coord[0]
            }));
            
            const routePolyline = new google.maps.Polyline({
              path: polylinePath,
              geodesic: true,
              strokeColor: '#FF6B00',
              strokeOpacity: 0.8,
              strokeWeight: 4,
              map: mapInstance,
            });
            
            console.log('✅ Route polyline drawn from ORS!');
            if (route.properties?.summary) {
              console.log('   Distance:', (route.properties.summary.distance / 1000).toFixed(2), 'km');
              console.log('   Duration:', Math.round(route.properties.summary.duration / 60), 'minutes');
            }
            
            setLoading(false);
          } else {
            console.warn('⚠️ No route found in response');
            drawStraightLine();
          }
        } catch (err) {
          console.warn('⚠️ Route fetch failed:', err);
          console.log('Falling back to straight line...');
          drawStraightLine();
        }
      };

      const drawStraightLine = () => {
        const straightLine = new google.maps.Polyline({
          path: [
            { lat: originLat, lng: originLng },
            { lat: destLat, lng: destLng },
          ],
          geodesic: true,
          strokeColor: '#FF6B00',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: mapInstance,
        });
        
        console.log('✅ Straight line drawn:', {
          from: { lat: originLat, lng: originLng },
          to: { lat: destLat, lng: destLng }
        });
        
        setLoading(false);
      };

      // Start fetching route
      fetchRoute();

      setError(null);
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Lỗi khởi tạo bản đồ. Vui lòng kiểm tra Google Maps API key.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      {error ? (
        <div className="h-96 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-center">
          <div className="text-center p-4">
            <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400 mb-2">error_outline</span>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">{error}</p>
            <p className="text-xs text-red-600 dark:text-red-400">
              Vui lòng kích hoạt Google Maps API trong Google Cloud Console
            </p>
          </div>
        </div>
      ) : (
        <div className="relative w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700" style={{ height: '400px' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {loading && (
            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin mb-2">
                  <span className="material-symbols-outlined text-3xl text-primary">autorenew</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Đang tải bản đồ...</p>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <strong>Điểm đón:</strong> {pickupAddress}
        </p>
        <p className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <strong>Điểm trả:</strong> {dropoffAddress}
        </p>
      </div>
    </div>
  );
};

export default RideMap;
