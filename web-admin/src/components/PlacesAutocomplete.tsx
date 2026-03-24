import React, { useEffect, useRef, useState } from 'react';

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string, placeDetails?: { lat: number; lng: number; city: string; province: string }) => void;
  placeholder?: string;
  className?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

const PlacesAutocomplete: React.FC<PlacesAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Nhập tên địa điểm...',
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if Google Maps API already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      initAutocomplete();
      return;
    }

    // Load Google Maps API
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('❌ Google Maps API Key not configured');
      setIsLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initAutocomplete;
    script.onerror = () => {
      console.error('❌ Failed to load Google Maps API');
      setIsLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google) return;

    try {
      // Initialize autocomplete with Vietnam bias
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'vn' },
        fields: ['address_components', 'geometry', 'name', 'formatted_address'],
        types: ['(regions)'], // Cities, provinces, neighborhoods
      });

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error initializing Places Autocomplete:', error);
      setIsLoading(false);
    }
  };

  const handlePlaceSelect = () => {
    const place = autocompleteRef.current.getPlace();
    
    if (!place || !place.geometry) {
      console.warn('⚠️ No place details available');
      return;
    }

    console.log('📍 Place selected:', place);

    // Extract coordinates
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    // Extract city and province from address components
    let city = '';
    let province = '';

    if (place.address_components) {
      for (const component of place.address_components) {
        const types = component.types;
        
        // Look for city (locality or administrative_area_level_2)
        if (types.includes('locality')) {
          city = component.long_name;
        } else if (types.includes('administrative_area_level_2') && !city) {
          city = component.long_name;
        }

        // Look for province (administrative_area_level_1)
        if (types.includes('administrative_area_level_1')) {
          province = component.long_name;
        }
      }
    }

    // Fallback to name if city not found
    if (!city) {
      city = place.name || place.formatted_address || '';
    }

    console.log('🎯 Extracted data:', { lat, lng, city, province });

    // Call onChange with full details
    onChange(place.formatted_address || place.name, {
      lat,
      lng,
      city,
      province,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={isLoading ? 'Đang tải...' : placeholder}
        disabled={isLoading}
        className={className}
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default PlacesAutocomplete;
