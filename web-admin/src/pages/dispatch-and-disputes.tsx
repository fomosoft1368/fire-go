import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';
import { useNotification } from '../context/NotificationContext';

// ============ DISPATCH TYPES ============
interface DispatchDriver {
  _id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  status?: 'online' | 'offline' | 'on_ride' | 'on_trip' | 'break';
  currentLocation?: {
    coordinates: [number, number];
  };
  vehicleModel?: string;
  licensePlate?: string;
  totalRides?: number;
  averageRating?: number;
  distance?: number;
}

interface DispatchRide {
  _id: string;
  customerId: any;
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
  distance: number;
  duration: number;
  createdAt: string;
  customer?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

// ============ DISPUTE TYPES ============
interface Dispute {
  _id: string;
  rideId: string;
  customerId: any;
  driverId: any;
  reason: 'fare_dispute' | 'route_complaint' | 'behavior_complaint' | 'vehicle_issue' | 'safety_concern' | 'payment_issue' | 'other';
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'rejected' | 'appealed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  initiatedBy: 'customer' | 'driver';
  evidence: string[];
  resolution?: {
    type: 'refund' | 'credit' | 'adjustment' | 'warning' | 'suspension' | 'dismissal';
    amount?: number;
    notes: string;
    resolvedBy: string;
    resolvedAt: string;
  };
  ride?: {
    pickupAddress: string;
    dropoffAddress: string;
    totalFare: number;
    distance: number;
    duration: number;
    completedAt: string;
  };
  customer?: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    averageRating: number;
  };
  driver?: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    averageRating: number;
    licensePlate: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface NearbyDriver extends DispatchDriver {
  distance: number;
}

const DispatchAndDisputesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'disputes'>('dispatch');

  // ============ DISPATCH STATE ============
  const [pendingRides, setPendingRides] = useState<DispatchRide[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<DispatchDriver[]>([]);
  const [selectedRide, setSelectedRide] = useState<DispatchRide | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [assigningDispatch, setAssigningDispatch] = useState(false);
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const { addNotification } = useNotification();

  // ============ DISPUTES STATE ============
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [filteredDisputes, setFilteredDisputes] = useState<Dispute[]>([]);
  const [disputeStats, setDisputeStats] = useState({
    total: 0,
    open: 0,
    underReview: 0,
    resolved: 0,
    rejected: 0,
    appealed: 0,
  });
  const [disputeLoading, setDisputeLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'under_review' | 'resolved' | 'rejected' | 'appealed'>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvingDispute, setResolvingDispute] = useState(false);
  const [resolutionType, setResolutionType] = useState<'refund' | 'credit' | 'adjustment' | 'warning' | 'suspension' | 'dismissal'>('dismissal');
  const [resolutionAmount, setResolutionAmount] = useState('0');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // ============ LOAD DATA ============
  useEffect(() => {
    if (activeTab === 'dispatch') {
      loadDispatchData();
      const interval = setInterval(loadDispatchData, 30000);
      return () => clearInterval(interval);
    } else {
      loadDisputeData();
      const interval = setInterval(loadDisputeData, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // ============ DISPATCH FUNCTIONS ============
  const loadDispatchData = async () => {
    try {
      setDispatchLoading(true);
      const [ridesRes, driversRes] = await Promise.all([
        apiService.getRides(),
        apiService.getDrivers()
      ]);

      const pending = Array.isArray(ridesRes)
        ? ridesRes.filter((r: any) => r.status === 'pending')
        : [];

      const available = Array.isArray(driversRes)
        ? driversRes.filter((d: any) => d.status !== 'on_ride' && d.status !== 'on_trip')
        : [];

      setPendingRides(pending);
      setAvailableDrivers(available);
    } catch (error) {
      console.error('Error loading dispatch data:', error);
    } finally {
      setDispatchLoading(false);
    }
  };

  const calculateDistance = (
    coord1: [number, number],
    coord2: [number, number]
  ): number => {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (!selectedRide || !selectedRide.pickupLocation) {
      setNearbyDrivers([]);
      return;
    }

    const pickupCoords = selectedRide.pickupLocation.coordinates;
    const MAX_DISTANCE = 5;

    const nearby = availableDrivers
      .map(driver => ({
        ...driver,
        distance: driver.currentLocation
          ? calculateDistance(driver.currentLocation.coordinates, pickupCoords)
          : 999
      }))
      .filter(d => d.distance <= MAX_DISTANCE)
      .sort((a, b) => a.distance - b.distance);

    setNearbyDrivers(nearby);
  }, [selectedRide, availableDrivers]);

  useEffect(() => {
    if ((window as any).google?.maps && mapRef.current && !mapInstanceRef.current) {
      try {
        mapInstanceRef.current = new (window as any).google.maps.Map(mapRef.current, {
          zoom: 13,
          center: { lat: 10.762622, lng: 106.660172 },
          mapTypeId: 'roadmap'
        });
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedRide || !mapInstanceRef.current) return;

    try {
      const mapInstance = mapInstanceRef.current;
      mapInstance.markers?.forEach((m: any) => m.setMap(null));
      mapInstance.polylines?.forEach((p: any) => p.setMap(null));
      mapInstance.markers = [];
      mapInstance.polylines = [];

      const pickupCoords = selectedRide.pickupLocation?.coordinates || [106.6309, 10.7895];
      const dropoffCoords = selectedRide.dropoffLocation?.coordinates || [106.6654, 10.8123];

      const pickupMarker = new (window as any).google.maps.Marker({
        position: { lat: pickupCoords[1], lng: pickupCoords[0] },
        map: mapInstance,
        title: 'Điểm đón',
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2
        }
      });

      const dropoffMarker = new (window as any).google.maps.Marker({
        position: { lat: dropoffCoords[1], lng: dropoffCoords[0] },
        map: mapInstance,
        title: 'Điểm trả',
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2
        }
      });

      nearbyDrivers.forEach(driver => {
        if (!driver.currentLocation) return;
        const driverMarker = new (window as any).google.maps.Marker({
          position: { lat: driver.currentLocation.coordinates[1], lng: driver.currentLocation.coordinates[0] },
          map: mapInstance,
          title: `${driver.firstName} ${driver.lastName}`,
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#3b82f6',
            fillOpacity: 0.7,
            strokeColor: '#fff',
            strokeWeight: 1
          }
        });
        mapInstance.markers.push(driverMarker);
      });

      mapInstance.markers.push(pickupMarker, dropoffMarker);

      const bounds = new (window as any).google.maps.LatLngBounds();
      bounds.extend({ lat: pickupCoords[1], lng: pickupCoords[0] });
      bounds.extend({ lat: dropoffCoords[1], lng: dropoffCoords[0] });
      nearbyDrivers.forEach(d => {
        if (d.currentLocation) {
          bounds.extend({ lat: d.currentLocation.coordinates[1], lng: d.currentLocation.coordinates[0] });
        }
      });
      mapInstance.fitBounds(bounds);
    } catch (error) {
      console.error('Error updating map:', error);
    }
  }, [selectedRide, nearbyDrivers]);

  const handleAutoAssign = async () => {
    if (!selectedRide || nearbyDrivers.length === 0) return;
    const closestDriver = nearbyDrivers[0];
    if (closestDriver._id) {
      await assignDriver(closestDriver._id);
    }
  };

  const handleRandomAssign = async () => {
    if (!selectedRide || nearbyDrivers.length === 0) return;
    const randomDriver = nearbyDrivers[Math.floor(Math.random() * nearbyDrivers.length)];
    if (randomDriver._id) {
      await assignDriver(randomDriver._id);
    }
  };

  const assignDriver = async (driverId: string) => {
    if (!selectedRide) return;
    setAssigningDispatch(true);
    try {
      await apiService.assignDriver(selectedRide._id, driverId);
      addNotification({
        id: `success-${Date.now()}`,
        type: 'other',
        title: 'Thành công',
        message: 'Tài xế được giao thành công!',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'normal',
      });
      setSelectedRide(null);
      loadDispatchData();
    } catch (error: any) {
      console.error('Error assigning driver:', error);
      addNotification({
        id: `error-${Date.now()}`,
        type: 'other',
        title: 'Lỗi',
        message: `Lỗi: ${error.message}`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'high',
      });
    } finally {
      setAssigningDispatch(false);
    }
  };

  // ============ DISPUTE FUNCTIONS ============
  const loadDisputeData = async () => {
    try {
      setDisputeLoading(true);
      // Mock disputes data
      const mockDisputes: Dispute[] = [
        {
          _id: '1',
          rideId: 'ride-001',
          customerId: 'customer-1',
          driverId: 'driver-1',
          reason: 'fare_dispute',
          description: 'Tài xế tính giá cao hơn mức quy định',
          status: 'open',
          severity: 'medium',
          initiatedBy: 'customer',
          evidence: [],
          ride: {
            pickupAddress: '123 Đường Nguyễn Huệ, HCM',
            dropoffAddress: '456 Đường Tôn Đức Thắng, HCM',
            totalFare: 150000,
            distance: 5.2,
            duration: 15,
            completedAt: new Date().toISOString(),
          },
          customer: {
            firstName: 'Nguyễn',
            lastName: 'Văn A',
            phone: '0901234567',
            email: 'customer@example.com',
            averageRating: 4.5,
          },
          driver: {
            firstName: 'Trần',
            lastName: 'Văn B',
            phone: '0909876543',
            email: 'driver@example.com',
            averageRating: 3.8,
            licensePlate: '79-A1-123456',
          },
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      setDisputes(mockDisputes);
      const newStats = {
        total: mockDisputes.length,
        open: mockDisputes.filter(d => d.status === 'open').length,
        underReview: mockDisputes.filter(d => d.status === 'under_review').length,
        resolved: mockDisputes.filter(d => d.status === 'resolved').length,
        rejected: mockDisputes.filter(d => d.status === 'rejected').length,
        appealed: mockDisputes.filter(d => d.status === 'appealed').length,
      };
      setDisputeStats(newStats);
    } catch (error) {
      console.error('Error loading disputes:', error);
    } finally {
      setDisputeLoading(false);
    }
  };

  useEffect(() => {
    let filtered = disputes;
    if (filterStatus !== 'all') {
      filtered = filtered.filter(d => d.status === filterStatus);
    }
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(d => d.severity === filterSeverity);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d._id.toLowerCase().includes(query) ||
        d.rideId.toLowerCase().includes(query) ||
        d.customer?.firstName.toLowerCase().includes(query) ||
        d.customer?.lastName.toLowerCase().includes(query) ||
        d.driver?.firstName.toLowerCase().includes(query) ||
        d.driver?.lastName.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query)
      );
    }
    setFilteredDisputes(filtered);
  }, [disputes, filterStatus, filterSeverity, searchQuery]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'low':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400';
    }
  };

  const getSeverityLabel = (severity: string) => {
    const labels: { [key: string]: string } = {
      critical: '🔴 Rất nghiêm trọng',
      high: '🟠 Nghiêm trọng',
      medium: '🟡 Bình thường',
      low: '🔵 Nhẹ',
    };
    return labels[severity] || severity;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30';
      case 'under_review':
        return 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30';
      case 'resolved':
        return 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30';
      case 'rejected':
        return 'bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30';
      case 'appealed':
        return 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30';
      default:
        return 'bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      open: '🔴 Mới',
      under_review: '🟡 Đang xem xét',
      resolved: '✅ Đã xử lý',
      rejected: '❌ Từ chối',
      appealed: '🔄 Phúc thẩm',
    };
    return labels[status] || status;
  };

  const getReasonLabel = (reason: string) => {
    const labels: { [key: string]: string } = {
      fare_dispute: '💰 Tranh chấp giá cước',
      route_complaint: '🗺️ Phàn nàn lộ trình',
      behavior_complaint: '😠 Phàn nàn hành vi',
      vehicle_issue: '🚗 Vấn đề xe',
      safety_concern: '⚠️ Vấn đề an toàn',
      payment_issue: '💳 Vấn đề thanh toán',
      other: '📝 Khác',
    };
    return labels[reason] || reason;
  };

  const getResolutionTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      refund: '💵 Hoàn tiền',
      credit: '🎁 Tín dụng',
      adjustment: '⚙️ Điều chỉnh',
      warning: '⚠️ Cảnh báo',
      suspension: '🚫 Tạm ngừng',
      dismissal: '✓ Từ chối',
    };
    return labels[type] || type;
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;
    setResolvingDispute(true);
    try {
      const updatedDispute: Dispute = {
        ...selectedDispute,
        status: 'resolved',
        resolution: {
          type: resolutionType,
          amount: resolutionType !== 'warning' && resolutionType !== 'dismissal' ? parseInt(resolutionAmount) : undefined,
          notes: resolutionNotes,
          resolvedBy: 'admin',
          resolvedAt: new Date().toISOString(),
        },
      };

      setDisputes(disputes.map(d => (d._id === selectedDispute._id ? updatedDispute : d)));
      setSelectedDispute(null);
      setResolutionNotes('');
      setResolutionAmount('0');
      setResolutionType('dismissal');
      
      addNotification({
        id: `success-${Date.now()}`,
        type: 'other',
        title: 'Thành công',
        message: 'Tranh chấp đã được xử lý thành công!',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'normal',
      });
    } catch (error) {
      console.error('Error resolving dispute:', error);
      addNotification({
        id: `error-${Date.now()}`,
        type: 'other',
        title: 'Lỗi',
        message: 'Lỗi khi xử lý tranh chấp',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'high',
      });
    } finally {
      setResolvingDispute(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header with Tabs */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {activeTab === 'dispatch' ? 'Điều Phối Tài Xế' : 'Quản Lý Tranh Chấp'}
          </h1>
          <button
            onClick={() => activeTab === 'dispatch' ? loadDispatchData() : loadDisputeData()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">refresh</span>
            Cập nhật
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'dispatch'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined inline mr-2" style={{ fontSize: '20px', verticalAlign: 'middle' }}>assignment_late</span>
            Điều Phối
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'disputes'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined inline mr-2" style={{ fontSize: '20px', verticalAlign: 'middle' }}>gavel</span>
            Tranh Chấp
          </button>
        </div>

        {/* DISPATCH TAB */}
        {activeTab === 'dispatch' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Chờ giao tài xế</p>
                    <p className="text-2xl font-bold text-yellow-600">{pendingRides.length}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-yellow-600">pending_actions</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tài xế có sẵn</p>
                    <p className="text-2xl font-bold text-green-600">{availableDrivers.length}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-green-600">verified_driver</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tài xế gần đó</p>
                    <p className="text-2xl font-bold text-blue-600">{nearbyDrivers.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-blue-600">location_on</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map */}
              <div className="lg:col-span-2">
                <div
                  ref={mapRef}
                  className="w-full h-[500px] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-slate-100 dark:bg-slate-800"
                />
              </div>

              {/* Right Panel */}
              <div className="space-y-4">
                {selectedRide ? (
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-900 dark:text-white">Chuyến đi</h3>
                      <button
                        onClick={() => setSelectedRide(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div>
                        <p className="text-xs text-slate-500">Khách:</p>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {selectedRide.customer?.firstName} {selectedRide.customer?.lastName || ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Từ:</p>
                        <p className="font-bold text-slate-900 dark:text-white">{selectedRide.pickupAddress}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Đến:</p>
                        <p className="font-bold text-slate-900 dark:text-white">{selectedRide.dropoffAddress}</p>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500">{selectedRide.distance?.toFixed(1) || 0} km</span>
                        <span className="font-bold text-emerald-600">{(selectedRide.totalFare || 0).toLocaleString()}đ</span>
                      </div>
                    </div>

                    {/* Nearby Drivers */}
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Tài xế gần đó ({nearbyDrivers.length})
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {nearbyDrivers.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">Không có tài xế gần đó</p>
                        ) : (
                          nearbyDrivers.map(driver => (
                            <button
                              key={driver._id || 'unknown'}
                              onClick={() => driver._id && assignDriver(driver._id)}
                              disabled={assigningDispatch || !driver._id}
                              className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                                    {driver.firstName} {driver.lastName}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    ⭐ {driver.averageRating || 0} ({driver.totalRides || 0} cuốc)
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-blue-600">{driver.distance?.toFixed(1)}km</p>
                                  <p className="text-xs text-slate-500">{driver.licensePlate || 'N/A'}</p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Auto/Random Assign */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleAutoAssign}
                        disabled={nearbyDrivers.length === 0 || assigningDispatch}
                        className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px] mr-1 inline">check_circle</span>
                        Auto
                      </button>
                      <button
                        onClick={handleRandomAssign}
                        disabled={nearbyDrivers.length === 0 || assigningDispatch}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px] mr-1 inline">shuffle</span>
                        Random
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl mb-2">info</span>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Chọn một chuyến đi để giao tài xế</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pending Rides List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Chuyến đi chờ giao ({pendingRides.length})
              </h2>

              {dispatchLoading ? (
                <div className="text-center py-8 text-slate-500">
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  <p className="mt-2 text-xs">Đang tải...</p>
                </div>
              ) : pendingRides.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                  <p className="text-sm">Không có chuyến đi chờ</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingRides.map(ride => (
                    <button
                      key={ride._id}
                      onClick={() => setSelectedRide(ride)}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        selectedRide?._id === ride._id
                          ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500'
                          : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {ride.customer?.firstName} {ride.customer?.lastName || ''}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            📞 {ride.customer?.phone || 'N/A'}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-xs font-bold rounded">
                          Chờ
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="text-slate-600 dark:text-slate-300 line-clamp-1">
                          📍 {ride.pickupAddress}
                        </p>
                        <p className="text-slate-600 dark:text-slate-300 line-clamp-1">
                          📌 {ride.dropoffAddress}
                        </p>
                        <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-600">
                          <span className="text-slate-500">{ride.distance?.toFixed(1) || 0}km</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {(ride.totalFare || 0).toLocaleString()}đ
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DISPUTES TAB */}
        {activeTab === 'disputes' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tổng cộng</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{disputeStats.total}</p>
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">description</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mới</p>
                    <p className="text-2xl font-bold text-red-600">{disputeStats.open}</p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-red-600">new_inbox</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đang xem xét</p>
                    <p className="text-2xl font-bold text-yellow-600">{disputeStats.underReview}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-yellow-600">schedule</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đã xử lý</p>
                    <p className="text-2xl font-bold text-green-600">{disputeStats.resolved}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-green-600">check_circle</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Từ chối</p>
                    <p className="text-2xl font-bold text-slate-600">{disputeStats.rejected}</p>
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <span className="material-symbols-outlined text-slate-600">cancel</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Phúc thẩm</p>
                    <p className="text-2xl font-bold text-purple-600">{disputeStats.appealed}</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                    <span className="material-symbols-outlined text-purple-600">gavel</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">Tìm kiếm</label>
                  <input
                    type="text"
                    placeholder="Tìm theo ID, tên khách, tài xế..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">Trạng thái</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">Tất cả</option>
                    <option value="open">Mới</option>
                    <option value="under_review">Đang xem xét</option>
                    <option value="resolved">Đã xử lý</option>
                    <option value="rejected">Từ chối</option>
                    <option value="appealed">Phúc thẩm</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">Mức độ</label>
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">Tất cả</option>
                    <option value="critical">Rất nghiêm trọng</option>
                    <option value="high">Nghiêm trọng</option>
                    <option value="medium">Bình thường</option>
                    <option value="low">Nhẹ</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                      setFilterSeverity('all');
                    }}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Disputes List */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Danh sách tranh chấp ({filteredDisputes.length})
                  </h2>

                  {disputeLoading ? (
                    <div className="text-center py-8 text-slate-500">
                      <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
                      <p className="mt-2">Đang tải...</p>
                    </div>
                  ) : filteredDisputes.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                      <p>Không có tranh chấp nào</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredDisputes.map(dispute => (
                        <button
                          key={dispute._id}
                          onClick={() => setSelectedDispute(dispute)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            selectedDispute?._id === dispute._id
                              ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500'
                              : getStatusColor(dispute.status)
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                  {getReasonLabel(dispute.reason)}
                                </p>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${getSeverityColor(dispute.severity)}`}>
                                  {getSeverityLabel(dispute.severity)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                ID: {dispute._id}
                              </p>
                            </div>
                            <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700">
                              {getStatusLabel(dispute.status)}
                            </span>
                          </div>

                          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2 line-clamp-2">
                            {dispute.description}
                          </p>

                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <div>
                              <p>👤 {dispute.customer?.firstName} {dispute.customer?.lastName} vs {dispute.driver?.firstName} {dispute.driver?.lastName}</p>
                            </div>
                            <p>{new Date(dispute.createdAt).toLocaleDateString('vi-VN')}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dispute Details */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 h-fit sticky top-6">
                {!selectedDispute ? (
                  <div className="text-center py-12 text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2">description</span>
                    <p className="text-sm">Chọn một tranh chấp để xem chi tiết</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                          {getReasonLabel(selectedDispute.reason)}
                        </h3>
                        <p className="text-xs text-slate-500">{getStatusLabel(selectedDispute.status)}</p>
                      </div>
                      <button
                        onClick={() => setSelectedDispute(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Mô tả</p>
                        <p className="text-slate-900 dark:text-slate-100">{selectedDispute.description}</p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Khách hàng</p>
                        <p className="text-slate-900 dark:text-slate-100">
                          {selectedDispute.customer?.firstName} {selectedDispute.customer?.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          📞 {selectedDispute.customer?.phone} | ⭐ {selectedDispute.customer?.averageRating}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tài xế</p>
                        <p className="text-slate-900 dark:text-slate-100">
                          {selectedDispute.driver?.firstName} {selectedDispute.driver?.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          📞 {selectedDispute.driver?.phone} | ⭐ {selectedDispute.driver?.averageRating}
                        </p>
                        <p className="text-xs text-slate-500">
                          🚗 {selectedDispute.driver?.licensePlate}
                        </p>
                      </div>

                      {selectedDispute.ride && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Chi tiết chuyến</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            📍 {selectedDispute.ride.pickupAddress}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">
                            📌 {selectedDispute.ride.dropoffAddress}
                          </p>
                          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                            <span>{selectedDispute.ride.distance}km</span>
                            <span>{selectedDispute.ride.duration} phút</span>
                            <span className="font-bold text-emerald-600">{selectedDispute.ride.totalFare.toLocaleString()}đ</span>
                          </div>
                        </div>
                      )}

                      {selectedDispute.resolution && (
                        <div className="bg-green-50 dark:bg-green-500/10 p-3 rounded-lg">
                          <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-1">✅ Đã xử lý</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            {getResolutionTypeLabel(selectedDispute.resolution.type)}
                            {selectedDispute.resolution.amount && ` - ${selectedDispute.resolution.amount.toLocaleString()}đ`}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                            {selectedDispute.resolution.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'rejected' && (
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                            Cách xử lý
                          </label>
                          <select
                            value={resolutionType}
                            onChange={(e) => setResolutionType(e.target.value as any)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="refund">💵 Hoàn tiền</option>
                            <option value="credit">🎁 Tín dụng</option>
                            <option value="adjustment">⚙️ Điều chỉnh</option>
                            <option value="warning">⚠️ Cảnh báo</option>
                            <option value="suspension">🚫 Tạm ngừng</option>
                            <option value="dismissal">✓ Từ chối</option>
                          </select>
                        </div>

                        {resolutionType !== 'warning' && resolutionType !== 'dismissal' && (
                          <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                              Số tiền (đ)
                            </label>
                            <input
                              type="number"
                              value={resolutionAmount}
                              onChange={(e) => setResolutionAmount(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                            Ghi chú
                          </label>
                          <textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Lý do xử lý..."
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        <button
                          onClick={handleResolveDispute}
                          disabled={resolvingDispute || !resolutionNotes}
                          className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
                        >
                          {resolvingDispute ? 'Đang xử lý...' : '✓ Xác nhận xử lý'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DispatchAndDisputesPage;
