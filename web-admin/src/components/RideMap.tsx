import React, { useEffect, useRef, useState } from 'react';

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=maps,geometry`;
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

      // Tạo map centered giữa pickup & dropoff
      const center = {
        lat: (pickupCoords[1] + dropoffCoords[1]) / 2,
        lng: (pickupCoords[0] + dropoffCoords[0]) / 2,
      };

      const mapInstance = new google.maps.Map(mapRef.current!, {
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

      // Markers
      new google.maps.Marker({
        position: { lat: pickupCoords[1], lng: pickupCoords[0] },
        map: mapInstance,
        title: pickupAddress,
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
      });

      new google.maps.Marker({
        position: { lat: dropoffCoords[1], lng: dropoffCoords[0] },
        map: mapInstance,
        title: dropoffAddress,
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      });

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

      directionsService.route(
        {
          origin: { lat: pickupCoords[1], lng: pickupCoords[0] },
          destination: { lat: dropoffCoords[1], lng: dropoffCoords[0] },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
          } else {
            console.warn('Directions request failed:', status);
            // Nếu không lấy được routing, vẽ đường thẳng
            new google.maps.Polyline({
              path: [
                { lat: pickupCoords[1], lng: pickupCoords[0] },
                { lat: dropoffCoords[1], lng: dropoffCoords[0] },
              ],
              geodesic: true,
              strokeColor: '#FF6B00',
              strokeOpacity: 0.8,
              strokeWeight: 4,
              map: mapInstance,
            });
          }
        }
      );

      setLoading(false);
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
