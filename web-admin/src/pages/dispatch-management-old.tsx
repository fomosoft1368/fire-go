import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';

interface Ride {
  _id: string;
  customerId: any; // Can be string or object
  driverId?: string;
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
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  totalFare: number;
  baseFare?: number;
  distanceFare?: number;
  timeFare?: number;
  distance: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
  rating?: number;
  notes?: string;
  licensePlate?: string;
  carType?: string;
  transmission?: string;
  passengers?: number;
  paymentMethod?: string;
  isPaid?: boolean;
  // For display
  customer?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
  };
  driver?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    currentLocation?: {
      coordinates: [number, number];
    };
    status?: string;
  };
}

interface Dispute {
  id: string;
  rideId: string;
  type: 'urgent' | 'payment' | 'standard';
  title: string;
  description?: string;
  customer: string;
  driver: string;
  customerPhone: string;
  driverPhone: string;
  timeAgo: string;
  status: 'pending' | 'resolved' | 'escalated';
  latitude?: number;
  longitude?: number;
}

const DispatchManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'disputes'>('dispatch');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'in_progress' | 'completed'>('all');
  const [rides, setRides] = useState<Ride[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'escalated'>('resolved');
  // New resolution fields
  const [resolutionAction, setResolutionAction] = useState<'refund' | 'warning' | 'ban' | 'contact' | 'evidence'>('refund');
  const [actionTarget, setActionTarget] = useState<'customer' | 'driver' | 'both'>('driver');
  const [refundAmount, setRefundAmount] = useState(0);
  const [compensationAmount, setCompensationAmount] = useState(0);
  const [banDuration, setBanDuration] = useState(7);
  const [removeRating, setRemoveRating] = useState(false);
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);

  // Load rides from API
  useEffect(() => {
    loadRides();
  }, []);

  const loadRides = async () => {
    try {
      setLoading(true);
      
      // Fetch rides from API
      const ridesResponse = await apiService.getRides();
      
      console.log('Rides from API:', ridesResponse);
      
      let ridesData: Ride[] = [];
      
      if (ridesResponse && Array.isArray(ridesResponse) && ridesResponse.length > 0) {
        // Use actual API rides data, but create placeholder customer/driver info
        ridesData = ridesResponse.map((ride: any, idx: number) => ({
          ...ride,
          // Use actual ride data from API, add placeholder customer/driver
          customer: {
            _id: `customer-${idx}`,
            firstName: `Khách ${idx + 1}`,
            lastName: '',
            phoneNumber: '0987654321',
            email: `customer${idx}@example.com`
          },
          driver: {
            _id: `driver-${idx}`,
            firstName: `Tài xế ${idx + 1}`,
            lastName: '',
            phoneNumber: '0912345678',
            currentLocation: {
              coordinates: ride.pickupLocation?.coordinates || [106.6309, 10.7895]
            },
            status: 'online'
          }
        }));
      } else {
        ridesData = generateDemoRides();
      }
      
      console.log('Final rides data:', ridesData);
      
      setRides(ridesData || []);
      generateDisputes(ridesData || []);
    } catch (err) {
      console.error('Error loading rides:', err);
      const demoRides = generateDemoRides();
      console.log('Using demo rides due to error:', demoRides);
      setRides(demoRides);
      generateDisputes(demoRides);
    } finally {
      setLoading(false);
    }
  };

  const generateDemoRides = (): Ride[] => {
    return [
      {
        _id: '1',
        customerId: 'cust-1',
        driverId: 'driver-1',
        status: 'in_progress',
        pickupAddress: 'Aeon Mall Tân Phú',
        dropoffAddress: 'Công viên Văn Thánh',
        pickupLocation: {
          type: 'Point',
          coordinates: [106.6309, 10.7895]
        },
        dropoffLocation: {
          type: 'Point',
          coordinates: [106.6654, 10.8123]
        },
        totalFare: 125000,
        distance: 10.7,
        duration: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        driver: {
          _id: 'driver-1',
          firstName: 'Hoàng',
          lastName: 'Long',
          phoneNumber: '0912345678',
          currentLocation: {
            coordinates: [106.6309, 10.7895]
          },
          status: 'online'
        },
        customer: {
          _id: 'cust-1',
          firstName: 'Minh',
          lastName: 'Tuấn',
          phoneNumber: '0987654321'
        }
      },
      {
        _id: '2',
        customerId: 'cust-2',
        driverId: 'driver-2',
        status: 'pending',
        pickupAddress: 'Landmark 81',
        dropoffAddress: 'Tao Đàn Park',
        pickupLocation: {
          type: 'Point',
          coordinates: [106.7034, 10.7960]
        },
        dropoffLocation: {
          type: 'Point',
          coordinates: [106.6983, 10.7768]
        },
        totalFare: 85000,
        distance: 5.2,
        duration: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        driver: {
          _id: 'driver-2',
          firstName: 'Văn',
          lastName: 'Nam',
          phoneNumber: '0934567890',
          currentLocation: {
            coordinates: [106.7034, 10.7960]
          },
          status: 'online'
        },
        customer: {
          _id: 'cust-2',
          firstName: 'Ngọc',
          lastName: 'Anh',
          phoneNumber: '0923456789'
        }
      },
      {
        _id: '3',
        customerId: 'cust-3',
        driverId: 'driver-3',
        status: 'in_progress',
        pickupAddress: 'Crescent Mall',
        dropoffAddress: 'Bến Xe Quận 8',
        pickupLocation: {
          type: 'Point',
          coordinates: [106.7234, 10.8087]
        },
        dropoffLocation: {
          type: 'Point',
          coordinates: [106.7245, 10.7587]
        },
        totalFare: 95000,
        distance: 8.3,
        duration: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        driver: {
          _id: 'driver-3',
          firstName: 'Minh',
          lastName: 'Quân',
          phoneNumber: '0956789012',
          currentLocation: {
            coordinates: [106.7234, 10.8087]
          },
          status: 'online'
        },
        customer: {
          _id: 'cust-3',
          firstName: 'Hải',
          lastName: 'Đăng',
          phoneNumber: '0945678901'
        }
      },
      {
        _id: '4',
        customerId: 'cust-4',
        driverId: 'driver-4',
        status: 'accepted',
        pickupAddress: 'Chợ Bến Thành',
        dropoffAddress: 'Sân bay Tân Sơn Nhất',
        pickupLocation: {
          type: 'Point',
          coordinates: [106.6980, 10.7723]
        },
        dropoffLocation: {
          type: 'Point',
          coordinates: [106.6613, 10.8194]
        },
        totalFare: 250000,
        distance: 18.5,
        duration: 35,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        driver: {
          _id: 'driver-4',
          firstName: 'Hùng',
          lastName: 'Sơn',
          phoneNumber: '0967890123',
          currentLocation: {
            coordinates: [106.6980, 10.7723]
          },
          status: 'online'
        },
        customer: {
          _id: 'cust-4',
          firstName: 'Linh',
          lastName: 'Chi',
          phoneNumber: '0932109876'
        }
      }
    ];
  };

  const generateDisputes = (rides: Ride[]) => {
    const generatedDisputes: Dispute[] = [];
    
    rides.forEach((ride, index) => {
      // Randomly generate disputes for some rides
      if (index % 5 === 0 && ride.customer) {
        const customerName = ride.customer.firstName ? `${ride.customer.firstName} ${ride.customer.lastName || ''}` : 'Khách hàng';
        
        const disputeTypes: Array<'urgent' | 'payment' | 'standard'> = ['urgent', 'payment', 'standard'];
        const type = disputeTypes[index % 3];
        
        const disputeTitles = {
          urgent: 'Khách báo cáo tài xế thái độ',
          payment: 'Sai lệch cước phí chuyến đi',
          standard: 'Tìm lại đồ bỏ quên trên xe'
        };
        
        const pickupCoords = ride.pickupLocation?.coordinates || [106.6309, 10.7895];
        
        generatedDisputes.push({
          id: `DIS-${String(9921 - index).padStart(4, '0')}`,
          rideId: ride._id,
          type,
          title: disputeTitles[type],
          description: 'Chi tiết tranh chấp...',
          customer: customerName,
          driver: 'Tài xế',
          customerPhone: ride.customer.phoneNumber || ride.customer.email || 'N/A',
          driverPhone: 'N/A',
          timeAgo: Math.floor(Math.random() * 60) + ' phút trước',
          status: type === 'urgent' ? 'escalated' : 'pending',
          latitude: pickupCoords[1],
          longitude: pickupCoords[0]
        });
      }
    });
    
    setDisputes(generatedDisputes);
  };

  // Handle resolve dispute
  const handleResolveDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setResolutionNote('');
    setResolutionStatus('resolved');
    setShowDisputeModal(true);
  };

  // Submit dispute resolution
  const submitDisputeResolution = () => {
    if (!selectedDispute || !resolutionNote.trim()) {
      alert('Vui lòng nhập ghi chú xử lý');
      return;
    }

    // Validate refund amount
    if (resolutionAction === 'refund' && refundAmount <= 0) {
      alert('Vui lòng nhập số tiền hoàn lại');
      return;
    }

    // Update dispute status
    const updatedDisputes = disputes.map(d => 
      d.id === selectedDispute.id 
        ? { ...d, status: resolutionStatus }
        : d
    );
    
    setDisputes(updatedDisputes);
    
    // Log for API call (when ready)
    const resolutionData = {
      id: selectedDispute.id,
      rideId: selectedDispute.rideId,
      status: resolutionStatus,
      resolution: resolutionNote,
      action: resolutionAction,
      actionTarget,
      refundAmount: resolutionAction === 'refund' ? refundAmount : 0,
      compensationAmount: compensationAmount,
      banDuration: resolutionAction === 'ban' ? banDuration : 0,
      removeRating,
      resolvedAt: new Date().toISOString()
    };
    
    console.log('Dispute resolution:', resolutionData);
    
    // Show success and close modal
    alert(`Tranh chấp ${selectedDispute.id} đã được xử lý (${resolutionStatus})`);
    setShowDisputeModal(false);
    setSelectedDispute(null);
  };

  // Initialize Google Map once
  useEffect(() => {
    const initializeMap = () => {
      if (mapInstanceRef.current || !mapRef.current) return;

      // Check if Google Maps API is loaded
      if (!(window as any).google || !(window as any).google.maps) {
        console.log('⏳ Google Maps API not loaded yet, retrying in 500ms...');
        setTimeout(initializeMap, 500);
        return;
      }

      try {
        console.log('✨ Initializing Google Map with API available...');
        const mapInstance = new (window as any).google.maps.Map(mapRef.current, {
          zoom: 13,
          center: { lat: 10.762622, lng: 106.660172 },
          mapTypeId: 'roadmap',
          styles: [
            {
              featureType: 'poi',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        mapInstanceRef.current = mapInstance;
        mapInstanceRef.current.markers = [];
        mapInstanceRef.current.polylines = [];
        console.log('✅ Google Map initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing Google Maps:', error);
      }
    };

    initializeMap();
  }, []);

  // Reinitialize map when switching back to dispatch tab
  useEffect(() => {
    if (activeTab === 'dispatch') {
      console.log('🔄 Tab switched to dispatch, checking map...');
      
      // Longer timeout to ensure DOM fully rendered
      setTimeout(() => {
        if (!mapRef.current) {
          console.warn('⚠️ mapRef.current is null');
          return;
        }
        
        if (!mapInstanceRef.current) {
          console.warn('⚠️ mapInstanceRef.current is null, reinitializing...');
          // Try to reinitialize if lost
          const initMap = () => {
            if (!(window as any).google || !(window as any).google.maps) {
              setTimeout(initMap, 500);
              return;
            }
            
            try {
              const mapInstance = new (window as any).google.maps.Map(mapRef.current, {
                zoom: 13,
                center: { lat: 10.762622, lng: 106.660172 },
                mapTypeId: 'roadmap',
                styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
              });
              mapInstanceRef.current = mapInstance;
              mapInstanceRef.current.markers = [];
              mapInstanceRef.current.polylines = [];
              console.log('✅ Map reinitialized');
            } catch (error) {
              console.error('Error reinitializing map:', error);
            }
          };
          initMap();
          return;
        }
        
        if ((window as any).google && (window as any).google.maps && mapInstanceRef.current) {
          // Trigger resize
          (window as any).google.maps.event.trigger(mapInstanceRef.current, 'resize');
          
          // Recenter map
          if (selectedRide) {
            const pickupCoords = selectedRide.pickupLocation?.coordinates || [106.6309, 10.7895];
            const dropoffCoords = selectedRide.dropoffLocation?.coordinates || [106.6654, 10.8123];
            const driverCoords = selectedRide.driver?.currentLocation?.coordinates || pickupCoords;
            
            const bounds = new (window as any).google.maps.LatLngBounds();
            bounds.extend({ lat: pickupCoords[1], lng: pickupCoords[0] });
            bounds.extend({ lat: dropoffCoords[1], lng: dropoffCoords[0] });
            bounds.extend({ lat: driverCoords[1], lng: driverCoords[0] });
            
            mapInstanceRef.current.fitBounds(bounds);
          } else {
            mapInstanceRef.current.setCenter({ lat: 10.762622, lng: 106.660172 });
            mapInstanceRef.current.setZoom(13);
          }
          
          console.log('✅ Map resized and recentered');
        }
      }, 300);
    }
  }, [activeTab, selectedRide]);

  // Update map when selectedRide changes
  useEffect(() => {
    if (!selectedRide) {
      console.log('ℹ️ No ride selected');
      return;
    }

    if (!mapInstanceRef.current) {
      console.warn('⚠️ Map instance not initialized yet');
      return;
    }

    // Check if Google Maps API is loaded
    if (!(window as any).google || !(window as any).google.maps) {
      console.warn('⚠️ Google Maps API not available');
      return;
    }

    try {
      console.log('Updating map for selected ride:', selectedRide._id);
      const mapInstance = mapInstanceRef.current;
      
      // Clear existing markers and polylines
      const existingMarkers = mapInstance.markers || [];
      const existingPolylines = mapInstance.polylines || [];
      
      existingMarkers.forEach((marker: any) => marker.setMap(null));
      existingPolylines.forEach((polyline: any) => polyline.setMap(null));
      
      mapInstance.markers = [];
      mapInstance.polylines = [];

      // Get coordinates
      const pickupCoords = selectedRide.pickupLocation?.coordinates || [106.6309, 10.7895];
      const dropoffCoords = selectedRide.dropoffLocation?.coordinates || [106.6654, 10.8123];
      const driverCoords = selectedRide.driver?.currentLocation?.coordinates || pickupCoords;

      console.log('Coordinates - Driver:', driverCoords, 'Pickup:', pickupCoords, 'Dropoff:', dropoffCoords);

      // Khách hàng marker (Pickup) - Xanh lá
      const customerMarker = new (window as any).google.maps.Marker({
        position: { lat: pickupCoords[1], lng: pickupCoords[0] },
        map: mapInstance,
        title: `Khách: ${selectedRide.customer?.firstName} ${selectedRide.customer?.lastName || ''}`,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2
        }
      });
      
      const customerInfoWindow = new (window as any).google.maps.InfoWindow({
        content: `<div style="padding: 8px; font-size: 12px; font-family: Arial;">
          <strong style="color: #10b981;">🚶 Khách hàng</strong><br/>
          <strong>${selectedRide.customer?.firstName} ${selectedRide.customer?.lastName || ''}</strong><br/>
          📍 ${selectedRide.pickupAddress}
        </div>`
      });
      
      customerMarker.addListener('click', () => {
        customerInfoWindow.open(mapInstance, customerMarker);
      });

      // Tài xế marker (Current location) - Xanh dương
      const driverMarker = new (window as any).google.maps.Marker({
        position: { lat: driverCoords[1], lng: driverCoords[0] },
        map: mapInstance,
        title: `Tài xế: ${selectedRide.driver?.firstName} ${selectedRide.driver?.lastName || ''}`,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3
        }
      });
      
      const driverInfoWindow = new (window as any).google.maps.InfoWindow({
        content: `<div style="padding: 8px; font-size: 12px; font-family: Arial;">
          <strong style="color: #3b82f6;">🚕 Tài xế</strong><br/>
          <strong>${selectedRide.driver?.firstName} ${selectedRide.driver?.lastName || ''}</strong><br/>
          📋 ${selectedRide.licensePlate || 'N/A'}
        </div>`
      });
      
      driverMarker.addListener('click', () => {
        driverInfoWindow.open(mapInstance, driverMarker);
      });

      // Điểm đến marker (Dropoff) - Đỏ
      const destMarker = new (window as any).google.maps.Marker({
        position: { lat: dropoffCoords[1], lng: dropoffCoords[0] },
        map: mapInstance,
        title: `Điểm đến: ${selectedRide.dropoffAddress}`,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2
        }
      });

      const destInfoWindow = new (window as any).google.maps.InfoWindow({
        content: `<div style="padding: 8px; font-size: 12px; font-family: Arial;">
          <strong style="color: #ef4444;">🎯 Điểm đến</strong><br/>
          <strong>${selectedRide.dropoffAddress}</strong>
        </div>`
      });

      destMarker.addListener('click', () => {
        destInfoWindow.open(mapInstance, destMarker);
      });

      // Đường tài xế → khách (xanh dương)
      const driverToPickupLine = new (window as any).google.maps.Polyline({
        path: [
          { lat: driverCoords[1], lng: driverCoords[0] },
          { lat: pickupCoords[1], lng: pickupCoords[0] }
        ],
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.6,
        strokeWeight: 3,
        map: mapInstance
      });

      // Đường khách → điểm đến (xanh lá)
      const pickupToDropoffLine = new (window as any).google.maps.Polyline({
        path: [
          { lat: pickupCoords[1], lng: pickupCoords[0] },
          { lat: dropoffCoords[1], lng: dropoffCoords[0] }
        ],
        geodesic: true,
        strokeColor: '#10b981',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: mapInstance
      });

      // Lưu markers và polylines
      mapInstance.markers = [customerMarker, driverMarker, destMarker];
      mapInstance.polylines = [driverToPickupLine, pickupToDropoffLine];

      // Fit bounds để nhìn thấy cả 3 điểm
      const bounds = new (window as any).google.maps.LatLngBounds();
      bounds.extend({ lat: pickupCoords[1], lng: pickupCoords[0] });
      bounds.extend({ lat: dropoffCoords[1], lng: dropoffCoords[0] });
      bounds.extend({ lat: driverCoords[1], lng: driverCoords[0] });
      
      mapInstance.fitBounds(bounds);
      
      // Đặt zoom mức hợp lý
      const zoomChangeListener = mapInstance.addListener('zoom_changed', () => {
        const currentZoom = mapInstance.getZoom();
        if (currentZoom > 16) {
          mapInstance.setZoom(16);
        }
        (window as any).google.maps.event.removeListener(zoomChangeListener);
      });

      console.log('Map updated successfully with ride markers and routes');
    } catch (error) {
      console.error('Error updating map with selected ride:', error);
    }
  }, [selectedRide]);

  const filteredRides = rides.filter(ride => {
    const matchSearch = !searchQuery || 
      ride.customer?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.driver?.firstName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchStatus = filterStatus === 'all' || ride.status === filterStatus;
    
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-50 dark:bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-400', label: 'Chờ duyệt' },
      accepted: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', label: 'Đã nhận' },
      in_progress: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', label: 'Đang chạy' },
      completed: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', label: 'Hoàn thành' },
      cancelled: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', label: 'Đã hủy' }
    };
    
    const badge = badges[status] || badges.pending;
    return { ...badge, label: badges[status]?.label || status };
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Điều phối & Tranh chấp</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                const demo = generateDemoRides();
                setRides(demo);
                generateDisputes(demo);
              }}
              className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 text-xs font-medium"
            >
              <span className="material-symbols-outlined text-[16px]">dataset</span>
              Demo Data
            </button>
            <button 
              onClick={loadRides}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Cập nhật
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cuốc xe hiện tại</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredRides.length}</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">directions_car</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đang chạy</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {filteredRides.filter(r => r.status === 'in_progress').length}
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">route</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Chờ duyệt</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {filteredRides.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg">
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">pending_actions</span>
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/30 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">⚠️ Tranh chấp</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{disputes.length}</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-lg">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">emergency</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-4 py-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'dispatch'
                ? 'text-primary border-primary'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">map</span>
            Bản đồ & Điều phối
            <span className="ml-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs font-bold">
              {filteredRides.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-4 py-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'disputes'
                ? 'text-red-500 border-red-500'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">priority_high</span>
            Tranh chấp
            {disputes.length > 0 && (
              <span className="ml-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">
                {disputes.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div>
          {/* Map Section - Always rendered, hidden with CSS */}
          <div className={`${activeTab === 'dispatch' ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Map */}
              <div className="lg:col-span-2">
                <div
                  ref={mapRef}
                  className="w-full h-[400px] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-slate-100 dark:bg-slate-800"
                />
              </div>

              {/* Ride Details Sidebar */}
              <div className="lg:col-span-2">
                {selectedRide ? (
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm h-full overflow-y-auto">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-bold text-slate-900 dark:text-white">Chi tiết cuốc xe</h3>
                      <button onClick={() => setSelectedRide(null)} className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Khách hàng:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {selectedRide?.customer?.firstName} {selectedRide?.customer?.lastName || ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Điểm đón:</span>
                      <span className="font-medium text-slate-900 dark:text-white text-right">{selectedRide.pickupAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Điểm đến:</span>
                      <span className="font-medium text-slate-900 dark:text-white text-right">{selectedRide.dropoffAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Khoảng cách:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedRide.distance?.toFixed(1) || 'N/A'} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Giá:</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{(selectedRide.totalFare || selectedRide.baseFare || 0).toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Trạng thái:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{getStatusBadge(selectedRide?.status).label}</span>
                    </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-5xl mb-3">info</span>
                    <p className="text-slate-500 dark:text-slate-400">Chọn một cuốc xe để xem chi tiết</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ride List - Full Width */}
            <div className="mt-6 space-y-3">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tìm kiếm cuốc xe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                />
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="accepted">Đã nhận</option>
                  <option value="in_progress">Đang chạy</option>
                  <option value="completed">Hoàn thành</option>
                </select>
              </div>

              <div className="max-h-[600px] overflow-y-auto space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-slate-500">
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    <p className="mt-2 text-xs">Đang tải...</p>
                  </div>
                ) : filteredRides.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2">info</span>
                    <p className="text-xs">Không có cuốc xe nào</p>
                  </div>
                ) : (
                  filteredRides.map(ride => {
                    const badge = getStatusBadge(ride.status);
                    const isDisputed = disputes.some(d => d.rideId === ride._id && d.status === 'escalated');
                    const customerName = ride.customer?.firstName ? `${ride.customer.firstName} ${ride.customer.lastName || ''}` : 'Khách hàng';

                    return (
                      <button
                        key={ride._id}
                        onClick={() => setSelectedRide(ride)}
                        className={`w-full text-left p-3 rounded-lg transition-all border-l-4 ${
                          selectedRide?._id === ride._id
                            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500'
                            : isDisputed
                            ? 'bg-red-50 dark:bg-red-500/10 border-red-500 hover:shadow-md'
                            : `bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md`
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {customerName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {ride.pickupAddress} → {ride.dropoffAddress}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              💵 {(ride.totalFare || ride.baseFare || 0).toLocaleString()}đ
                            </p>
                          </div>
                          {isDisputed && (
                            <span className="flex-shrink-0 px-2 py-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded">
                              ⚠️ SOS
                            </span>
                          )}
                        </div>
                        <div className={`px-2 py-0.5 rounded inline-block text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Disputes Section */}
          <div className={`${activeTab === 'disputes' ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {disputes.length === 0 ? (
                <div className="lg:col-span-2 text-center py-12">
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-6xl mb-4">check_circle</span>
                  <p className="text-slate-500 dark:text-slate-400">Không có tranh chấp nào</p>
                </div>
              ) : (
                disputes.map(dispute => (
                  <div
                    key={dispute.id}
                    className={`rounded-xl p-5 shadow-sm border-l-4 ${
                      dispute.status === 'escalated'
                        ? 'bg-red-50 dark:bg-red-500/5 border-red-500'
                        : dispute.type === 'payment'
                        ? 'bg-orange-50 dark:bg-orange-500/5 border-orange-500'
                        : 'bg-blue-50 dark:bg-blue-500/5 border-blue-500'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                            dispute.status === 'escalated'
                              ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                              : dispute.type === 'payment'
                              ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400'
                              : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                          }`}
                        >
                          {dispute.status === 'escalated' ? '🚨 SOS' : dispute.type === 'payment' ? 'Thanh toán' : 'Hỗ trợ'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">#{dispute.id}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{dispute.timeAgo}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{dispute.title}</h3>

                    {/* Description */}
                    {dispute.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">{dispute.description}</p>
                    )}

                    {/* Parties Info */}
                    <div className="space-y-2 mb-4 p-3 rounded-lg bg-white/50 dark:bg-slate-800/30">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="material-symbols-outlined text-[16px] text-blue-600 dark:text-blue-400">person</span>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white">{dispute.customer}</p>
                          <p className="text-slate-500 dark:text-slate-400">{dispute.customerPhone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="material-symbols-outlined text-[16px] text-purple-600 dark:text-purple-400">directions_car</span>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white">{dispute.driver}</p>
                          <p className="text-slate-500 dark:text-slate-400">{dispute.driverPhone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleResolveDispute(dispute)}
                        className="flex-1 bg-primary text-white text-xs font-bold py-2.5 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                        Xử lý
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setShowDisputeModal(true);
                        }}
                        className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        Chi tiết
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        

        {/* Dispute Detail & Resolution Modal */}
        {showDisputeModal && selectedDispute && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Tranh chấp: {selectedDispute.id}
                </h2>
                <button
                  onClick={() => {
                    setShowDisputeModal(false);
                    setSelectedDispute(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Dispute Info */}
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Loại tranh chấp</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedDispute.type === 'urgent' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                        selectedDispute.type === 'payment' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' :
                        'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                      }`}>
                        {selectedDispute.type === 'urgent' ? '⚠️ Khẩn cấp' : 
                         selectedDispute.type === 'payment' ? '💰 Tiền' : '📦 Đồ bỏ quên'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Trạng thái</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedDispute.status === 'escalated' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                        'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {selectedDispute.status === 'escalated' ? '🔴 Đã leo thang' : '🟡 Chờ xử lý'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{selectedDispute.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{selectedDispute.description}</p>
                  </div>
                </div>

                {/* Party Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-2">👤 KHÁCH HÀNG</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedDispute.customer}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{selectedDispute.customerPhone}</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-lg border border-purple-200 dark:border-purple-500/20">
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mb-2">🚗 TÀI XẾ</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedDispute.driver}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{selectedDispute.driverPhone}</p>
                  </div>
                </div>

                {/* Resolution Form */}
                <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="font-bold text-slate-900 dark:text-white">Xử lý tranh chấp</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Quyết định
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setResolutionStatus('resolved')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                          resolutionStatus === 'resolved'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        ✅ Giải quyết
                      </button>
                      <button
                        onClick={() => setResolutionStatus('escalated')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                          resolutionStatus === 'escalated'
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        🔴 Leo thang
                      </button>
                    </div>
                  </div>

                  {/* Biện pháp xử lý */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Biện pháp xử lý
                    </label>
                    <select
                      value={resolutionAction}
                      onChange={(e) => setResolutionAction(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                    >
                      <option value="refund">💰 Hoàn tiền cho khách</option>
                      <option value="warning">⚠️ Cảnh báo</option>
                      <option value="ban">🚫 Cấm hoạt động</option>
                      <option value="contact">📞 Liên hệ bên liên quan</option>
                      <option value="evidence">📸 Yêu cầu bằng chứng</option>
                    </select>
                  </div>

                  {/* Mục tiêu xử lý */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Tác động tới
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActionTarget('customer')}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-all ${
                          actionTarget === 'customer'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        👤 Khách
                      </button>
                      <button
                        onClick={() => setActionTarget('driver')}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-all ${
                          actionTarget === 'driver'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        🚗 Tài xế
                      </button>
                      <button
                        onClick={() => setActionTarget('both')}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-all ${
                          actionTarget === 'both'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        👥 Cả hai
                      </button>
                    </div>
                  </div>

                  {/* Hoàn tiền */}
                  {resolutionAction === 'refund' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Số tiền hoàn lại (đ) *
                      </label>
                      <input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                        placeholder="0"
                      />
                    </div>
                  )}

                  {/* Bù tiền cho tài xế */}
                  {resolutionAction === 'refund' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Bù tiền cho tài xế (đ)
                      </label>
                      <input
                        type="number"
                        value={compensationAmount}
                        onChange={(e) => setCompensationAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                        placeholder="0"
                      />
                    </div>
                  )}

                  {/* Cấm hoạt động */}
                  {resolutionAction === 'ban' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Cấm trong bao nhiêu ngày?
                      </label>
                      <input
                        type="number"
                        value={banDuration}
                        onChange={(e) => setBanDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                        placeholder="7"
                      />
                    </div>
                  )}

                  {/* Xóa đánh giá */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="removeRating"
                      checked={removeRating}
                      onChange={(e) => setRemoveRating(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="removeRating" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      🗑️ Xóa đánh giá/rating của cuốc này
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Ghi chú xử lý *
                    </label>
                    <textarea
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Nhập lý do/chi tiết xử lý tranh chấp..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 flex gap-2">
                <button
                  onClick={() => {
                    setShowDisputeModal(false);
                    setSelectedDispute(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={submitDisputeResolution}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-blue-600 transition-colors"
                >
                  Lưu xử lý
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
     
    </Layout>
  );
};

export default DispatchManagement;
