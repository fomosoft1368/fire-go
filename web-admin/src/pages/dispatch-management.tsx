import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import DispatchMap from '../components/DispatchMap';

interface Driver {
  _id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  status?: 'online' | 'offline' | 'on_ride' | 'on_trip' | 'break';
  currentLocation?: {
    coordinates: [number, number]; // [longitude, latitude]
  };
  vehicleModel?: string;
  licensePlate?: string;
  totalRides?: number;
  averageRating?: number;
}

type TripType = 'ride' | 'combined' | 'delivery' | 'hourly';

interface BaseTrip {
  _id: string;
  tripType: TripType; // Added to identify trip type
  customerId: any;
  driverId?: any;
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
  status: 'pending' | 'accepted' | 'in_progress' | 'arrived_at_pickup' | 'completed' | 'cancelled';
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
  driver?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    currentLocation?: {
      coordinates: [number, number];
    };
  };
}

type Ride = BaseTrip;

interface NearbyDriver extends Driver {
  distance: number; // km
}

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

interface DisputeStats {
  total: number;
  open: number;
  underReview: number;
  resolved: number;
  rejected: number;
  appealed: number;
}

const DispatchManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'disputes'>('dispatch');

  // Dispatch states
  const [allTrips, setAllTrips] = useState<BaseTrip[]>([]); // All trips from all services
  const [filteredTrips, setFilteredTrips] = useState<BaseTrip[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]); // All drivers for map
  const [selectedRide, setSelectedRide] = useState<BaseTrip | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { addNotification } = useNotification();

  // Filters
  const [filterTripType, setFilterTripType] = useState<'all' | TripType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'in_progress' | 'arrived_at_pickup' | 'completed' | 'cancelled'>('all');

  // Disputes states
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [filteredDisputes, setFilteredDisputes] = useState<Dispute[]>([]);
  const [disputeStats, setDisputeStats] = useState<DisputeStats>({
    total: 0,
    open: 0,
    underReview: 0,
    resolved: 0,
    rejected: 0,
    appealed: 0,
  });
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [disputeFilterStatus, setDisputeFilterStatus] = useState<'all' | 'open' | 'under_review' | 'resolved' | 'rejected' | 'appealed'>('all');
  const [disputeFilterSeverity, setDisputeFilterSeverity] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvingDispute, setResolvingDispute] = useState(false);
  const [resolutionType, setResolutionType] = useState<'refund' | 'credit' | 'adjustment' | 'warning' | 'suspension' | 'dismissal'>('dismissal');
  const [resolutionAmount, setResolutionAmount] = useState('0');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Load rides and drivers
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Load disputes
  useEffect(() => {
    loadDisputes();
    const interval = setInterval(loadDisputes, 30000);
    return () => clearInterval(interval);
  }, []);

  // Apply trip filters
  useEffect(() => {
    let filtered = allTrips;

    if (filterTripType !== 'all') {
      filtered = filtered.filter(t => t.tripType === filterTripType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    setFilteredTrips(filtered);
  }, [allTrips, filterTripType, filterStatus]);

  // Apply dispute filters
  useEffect(() => {
    let filtered = disputes;

    if (disputeFilterStatus !== 'all') {
      filtered = filtered.filter(d => d.status === disputeFilterStatus);
    }

    if (disputeFilterSeverity !== 'all') {
      filtered = filtered.filter(d => d.severity === disputeFilterSeverity);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d._id.toLowerCase().includes(query) ||
        d.rideId.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query)
      );
    }

    setFilteredDisputes(filtered);
  }, [disputes, disputeFilterStatus, disputeFilterSeverity, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading all trips from all services...');

      const [ridesRes, combinedRes, deliveriesRes, hourlyRes, driversRes] = await Promise.all([
        apiService.getRides().catch(err => { console.error('Error loading rides:', err); return []; }),
        apiService.getCombinedTrips().catch(err => { console.error('Error loading combined trips:', err); return []; }),
        apiService.getDeliveries().catch(err => { console.error('Error loading deliveries:', err); return []; }),
        apiService.getHourlyServices().catch(err => { console.error('Error loading hourly services:', err); return []; }),
        apiService.getDrivers().catch(err => { console.error('Error loading drivers:', err); return []; })
      ]);

      // Normalize all trips to BaseTrip format
      const normalizedRides: BaseTrip[] = Array.isArray(ridesRes) ? ridesRes.map((r: any) => ({
        ...r,
        tripType: 'ride' as TripType,
        pickupAddress: r.pickupAddress || 'Không xác định',
        dropoffAddress: r.dropoffAddress || 'Không xác định',
      })) : [];

      const normalizedCombined: BaseTrip[] = Array.isArray(combinedRes) ? combinedRes.map((c: any) => {
        // Fix status for combined trips: if has driver, should not be "pending"
        let actualStatus = c.status;
        if (c.status === 'pending' && c.driverId) {
          // If has driver but status is still "pending", change to "accepted"
          actualStatus = 'accepted';
          console.log(`🔧 [CombinedTrip ${c._id}] Fixed status: pending → accepted (has driverId)`);
        }
        
        return {
          ...c,
          status: actualStatus,
          tripType: 'combined' as TripType,
          pickupAddress: c.pickupLocationAddress || c.pickupAddress || 'Không xác định',
          dropoffAddress: c.dropoffLocationAddress || c.dropoffAddress || 'Không xác định',
          pickupLocation: c.pickupLocation || (c.pickupCoordinates ? { type: 'Point', coordinates: c.pickupCoordinates } : undefined),
          dropoffLocation: c.dropoffLocation || (c.dropoffCoordinates ? { type: 'Point', coordinates: c.dropoffCoordinates } : undefined),
        };
      }) : [];

      const normalizedDeliveries: BaseTrip[] = Array.isArray(deliveriesRes) ? deliveriesRes.map((d: any) => ({
        ...d,
        tripType: 'delivery' as TripType,
        pickupAddress: d.pickupAddress || 'Không xác định',
        dropoffAddress: d.dropoffAddress || 'Không xác định',
        pickupLocation: d.pickupLocation || (d.pickupCoordinates ? { type: 'Point', coordinates: d.pickupCoordinates } : undefined),
        dropoffLocation: d.dropoffLocation || (d.dropoffCoordinates ? { type: 'Point', coordinates: d.dropoffCoordinates } : undefined),
      })) : [];

      const normalizedHourly: BaseTrip[] = Array.isArray(hourlyRes) ? hourlyRes.map((h: any) => ({
        ...h,
        tripType: 'hourly' as TripType,
        pickupAddress: h.pickupAddress || h.startAddress || 'Không xác định',
        dropoffAddress: h.dropoffAddress || h.endAddress || 'Không xác định',
        pickupLocation: h.pickupLocation || (h.pickupCoordinates ? { type: 'Point', coordinates: h.pickupCoordinates } : undefined),
        dropoffLocation: h.dropoffLocation || (h.dropoffCoordinates ? { type: 'Point', coordinates: h.dropoffCoordinates } : undefined),
      })) : [];

      // Combine all trips and sort by creation date
      const allTripsData = [
        ...normalizedRides,
        ...normalizedCombined,
        ...normalizedDeliveries,
        ...normalizedHourly,
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Store all drivers for map display
      const allDriversList = Array.isArray(driversRes) ? driversRes : [];

      // Filter only available drivers (not on ride/trip)
      const available = allDriversList.filter((d: any) => d.status !== 'on_ride' && d.status !== 'on_trip');

      console.log('✅ Loaded trips:', {
        rides: normalizedRides.length,
        combined: normalizedCombined.length,
        deliveries: normalizedDeliveries.length,
        hourly: normalizedHourly.length,
        total: allTripsData.length,
      });
      console.log('👥 Loaded drivers:', {
        total: allDriversList.length,
        available: available.length,
      });
      
      setAllTrips(allTripsData);
      setFilteredTrips(allTripsData);
      setAvailableDrivers(available);
      setAllDrivers(allDriversList);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      addNotification({
        id: `error-${Date.now()}`,
        type: 'other',
        title: 'Lỗi',
        message: 'Không thể tải dữ liệu chuyến đi',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'high',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (
    coord1: [number, number],
    coord2: [number, number]
  ): number => {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 6371; // Earth radius in km
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

  // Find nearby drivers when ride is selected
  useEffect(() => {
    if (!selectedRide || !selectedRide.pickupLocation) {
      setNearbyDrivers([]);
      return;
    }

    const pickupCoords = selectedRide.pickupLocation.coordinates;
    const MAX_DISTANCE = 5; // 5 km radius

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

  // Auto-assign closest available driver
  const handleAutoAssign = async () => {
    if (!selectedRide || nearbyDrivers.length === 0) return;

    const closestDriver = nearbyDrivers[0]; // Already sorted by distance
    if (closestDriver._id) {
      await assignDriver(closestDriver._id);
    }
  };

  // Random assign from nearby drivers
  const handleRandomAssign = async () => {
    if (!selectedRide || nearbyDrivers.length === 0) return;

    const randomDriver = nearbyDrivers[Math.floor(Math.random() * nearbyDrivers.length)];
    if (randomDriver._id) {
      await assignDriver(randomDriver._id);
    }
  };

  // Assign driver to ride
  const assignDriver = async (driverId: string) => {
    if (!selectedRide) return;

    setAssigning(true);
    try {
      // Call API to assign driver
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
      loadData();
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
      setAssigning(false);
    }
  };

  // Load disputes
  const loadDisputes = async () => {
    try {
      // TODO: Replace with actual API call
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
        {
          _id: '2',
          rideId: 'ride-002',
          customerId: 'customer-2',
          driverId: 'driver-2',
          reason: 'behavior_complaint',
          description: 'Tài xế có thái độ bất lịch sự',
          status: 'under_review',
          severity: 'high',
          initiatedBy: 'customer',
          evidence: [],
          ride: {
            pickupAddress: '789 Đường Lê Lợi, HCM',
            dropoffAddress: '321 Đường Nguyễn Hữu Cảnh, HCM',
            totalFare: 200000,
            distance: 8.5,
            duration: 22,
            completedAt: new Date(Date.now() - 172800000).toISOString(),
          },
          customer: {
            firstName: 'Phạm',
            lastName: 'Thị C',
            phone: '0912345678',
            email: 'customer2@example.com',
            averageRating: 4.8,
          },
          driver: {
            firstName: 'Lê',
            lastName: 'Văn D',
            phone: '0987654321',
            email: 'driver2@example.com',
            averageRating: 2.9,
            licensePlate: '79-A2-789012',
          },
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      setDisputes(mockDisputes);

      // Calculate stats
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
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;

    setResolvingDispute(true);
    try {
      // TODO: Call API to resolve dispute
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

      // Update local state
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

  const getTripTypeLabel = (type: TripType) => {
    const labels: { [key in TripType]: string } = {
      ride: '🚗 Đặt xe',
      combined: '🚙 Xe ghép',
      delivery: '📦 Giao hàng',
      hourly: '⏰ Lái xe hộ',
    };
    return labels[type];
  };

  const getTripTypeColor = (type: TripType) => {
    const colors: { [key in TripType]: string } = {
      ride: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
      combined: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
      delivery: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
      hourly: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400',
    };
    return colors[type];
  };

  const getTripStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
      accepted: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
      in_progress: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
      arrived_at_pickup: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
      completed: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
      cancelled: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400';
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header with Tabs */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quản Lý Điều Phối & Tranh Chấp</h1>
          <button
            onClick={() => activeTab === 'dispatch' ? loadData() : loadDisputes()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">refresh</span>
            Cập nhật
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              activeTab === 'dispatch'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] inline mr-2 align-text-bottom">assignment_late</span>
            Điều Phối Tài Xế
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              activeTab === 'disputes'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] inline mr-2 align-text-bottom">gavel</span>
            Quản Lý Tranh Chấp
          </button>
        </div>

        {/* Dispatch Tab Content */}
        {activeTab === 'dispatch' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tổng chuyến</p>
                <p className="text-2xl font-bold text-blue-600">{filteredTrips.length}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                <span className="material-symbols-outlined text-blue-600">local_shipping</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Chờ tài xế</p>
                <p className="text-2xl font-bold text-yellow-600">{filteredTrips.filter(t => t.status === 'pending').length}</p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg">
                <span className="material-symbols-outlined text-yellow-600">pending_actions</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đang di chuyển</p>
                <p className="text-2xl font-bold text-purple-600">
                  {filteredTrips.filter(t => ['accepted', 'in_progress', 'arrived_at_pickup'].includes(t.status)).length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                <span className="material-symbols-outlined text-purple-600">directions_car</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hoàn thành</p>
                <p className="text-2xl font-bold text-green-600">{filteredTrips.filter(t => t.status === 'completed').length}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-lg">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">Loại dịch vụ</label>
                  <select
                    value={filterTripType}
                    onChange={(e) => setFilterTripType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">Tất cả</option>
                    <option value="ride">🚗 Đặt xe</option>
                    <option value="combined">🚙 Xe ghép</option>
                    <option value="delivery">📦 Giao hàng</option>
                    <option value="hourly">⏰ Lái xe hộ</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">Trạng thái</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">Tất cả</option>
                    <option value="pending">Chờ tài xế</option>
                    <option value="accepted">Đã nhận</option>
                    <option value="in_progress">Đang di chuyển</option>
                    <option value="arrived_at_pickup">Đã đến điểm đón</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilterTripType('all');
                      setFilterStatus('all');
                    }}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Map - Always visible with all drivers */}
          <div className="lg:col-span-2">
            <DispatchMap 
              drivers={allDrivers}
              onDriverClick={(driver) => setSelectedDriver(driver)}
              selectedDriverId={selectedDriver?._id}
              selectedTrip={selectedRide}
            />
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            {/* Selected Driver Info (if clicked on map) */}
            {selectedDriver && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white">Thông tin tài xế</h3>
                  <button
                    onClick={() => setSelectedDriver(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Tài xế:</p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedDriver.firstName} {selectedDriver.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Điện thoại:</p>
                    <p className="font-bold text-slate-900 dark:text-white">{selectedDriver.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Xe:</p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedDriver.vehicleModel} - {selectedDriver.licensePlate}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Trạng thái:</p>
                    <p className={`font-bold inline-block px-2 py-1 rounded text-xs ${
                      selectedDriver.status === 'online' ? 'bg-green-100 text-green-700' :
                      selectedDriver.status === 'on_ride' || selectedDriver.status === 'on_trip' ? 'bg-blue-100 text-blue-700' :
                      selectedDriver.status === 'break' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedDriver.status === 'online' ? 'Online' :
                       selectedDriver.status === 'on_ride' || selectedDriver.status === 'on_trip' ? '🚕 Đang trong chuyến' :
                       selectedDriver.status === 'break' ? 'Nghỉ' : 'Offline'}
                    </p>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs text-slate-500">Đánh giá</p>
                      <p className="font-bold">⭐ {selectedDriver.averageRating || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Chuyến</p>
                      <p className="font-bold">{selectedDriver.totalRides || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Ride Info */}
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

                {/* Show message for completed/cancelled trips */}
                {(selectedRide.status === 'completed' || selectedRide.status === 'cancelled') && (
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4 text-center">
                    <div className="text-4xl mb-2">
                      {selectedRide.status === 'completed' ? '✅' : '❌'}
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Chuyến đi {selectedRide.status === 'completed' ? 'đã hoàn thành' : 'đã bị hủy'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Không hiển thị bản đồ theo dõi</p>
                  </div>
                )}

                <div className="space-y-2 text-sm mb-4">
                  {/* Trip Type Badge */}
                  <div>
                    <span className={`px-3 py-1 text-xs font-bold rounded inline-block ${getTripTypeColor(selectedRide.tripType)}`}>
                      {getTripTypeLabel(selectedRide.tripType)}
                    </span>
                    <span className={`ml-2 px-3 py-1 text-xs font-bold rounded inline-block ${getTripStatusColor(selectedRide.status)}`}>
                      {selectedRide.status === 'pending' ? 'Chờ tài xế' :
                       selectedRide.status === 'accepted' ? 'Đã nhận' :
                       selectedRide.status === 'in_progress' ? 'Đang đi' :
                       selectedRide.status === 'arrived_at_pickup' ? 'Đã đến đón' :
                       selectedRide.status === 'completed' ? 'Hoàn thành' :
                       selectedRide.status === 'cancelled' ? 'Đã hủy' : selectedRide.status}
                    </span>
                  </div>
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
                    <span className="text-slate-500">{(parseFloat(selectedRide.distance as any) || 0).toFixed(1)} km</span>
                    <span className="font-bold text-emerald-600">{(Number(selectedRide.totalFare) || 0).toLocaleString()}đ</span>
                  </div>
                </div>

                {/* Only show driver assignment for pending trips without driver */}
                {selectedRide.status === 'pending' && !selectedRide.driverId ? (
                  <>
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
                          disabled={assigning || !driver._id}
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
                              <p className="text-xs font-bold text-blue-600">{(parseFloat(driver.distance as any) || 0).toFixed(1)}km</p>
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
                    disabled={nearbyDrivers.length === 0 || assigning}
                    className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px] mr-1 inline">check_circle</span>
                    Auto
                  </button>
                  <button
                    onClick={handleRandomAssign}
                    disabled={nearbyDrivers.length === 0 || assigning}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px] mr-1 inline">shuffle</span>
                    Random
                  </button>
                </div>
                  </>
                ) : selectedRide.status !== 'completed' && selectedRide.status !== 'cancelled' ? (
                  <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-lg text-center">
                    <div className="text-3xl mb-2">🚕</div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                      Chuyến đi đã có tài xế
                    </p>
                    {selectedRide.driver && (
                      <p className="text-xs text-blue-600 dark:text-blue-300">
                        {selectedRide.driver.firstName} {selectedRide.driver.lastName}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 text-center">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl mb-2">info</span>
                <p className="text-sm text-slate-500 dark:text-slate-400">Chọn một chuyến đi để giao tài xế</p>
              </div>
            )}
          </div>
        </div>

        {/* All Trips List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Danh sách chuyến đi ({filteredTrips.length})
          </h2>

          {loading ? (
            <div className="text-center py-8 text-slate-500">
              <span className="material-symbols-outlined animate-spin">refresh</span>
              <p className="mt-2 text-xs">Đang tải...</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
              <p className="text-sm">Không tìm thấy chuyến đi nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 dark:text-white">Loại</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 dark:text-white">Khách hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 dark:text-white">SĐT</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 dark:text-white">Điểm đón</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 dark:text-white">Điểm đến</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-900 dark:text-white">Khoảng cách</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-900 dark:text-white">Giá</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-900 dark:text-white">Trạng thái</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-900 dark:text-white">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map(ride => (
                    <tr 
                      key={ride._id}
                      onClick={() => setSelectedRide(ride)}
                      className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                        selectedRide?._id === ride._id
                          ? 'bg-blue-50 dark:bg-blue-500/10'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-bold rounded inline-block ${getTripTypeColor(ride.tripType)}`}>
                          {getTripTypeLabel(ride.tripType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white font-medium">
                        {ride.customer?.firstName && ride.customer?.lastName
                          ? `${ride.customer.firstName} ${ride.customer.lastName}`
                          : 'Khách hàng'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {ride.customer?.phone || 'Chưa có'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {ride.pickupAddress}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {ride.dropoffAddress}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 text-right">
                        {(parseFloat(ride.distance as any) || 0).toFixed(1)} km
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                        {(Number(ride.totalFare) || 0).toLocaleString()}đ
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-bold rounded inline-block ${getTripStatusColor(ride.status)}`}>
                          {ride.status === 'pending' ? 'Chờ tài xế' :
                           ride.status === 'accepted' ? 'Đã nhận' :
                           ride.status === 'in_progress' ? 'Đang đi' :
                           ride.status === 'arrived_at_pickup' ? 'Đã đến đón' :
                           ride.status === 'completed' ? 'Hoàn thành' :
                           ride.status === 'cancelled' ? 'Đã hủy' : ride.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRide(ride);
                          }}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded transition-colors"
                        >
                          Chọn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
          )}

          {/* Disputes Tab Content */}
          {activeTab === 'disputes' && (
          <div className="space-y-6">
          {/* Stats Cards */}
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
                  placeholder="Tìm theo ID, mô tả..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">Trạng thái</label>
                <select
                  value={disputeFilterStatus}
                  onChange={(e) => setDisputeFilterStatus(e.target.value as any)}
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
                  value={disputeFilterSeverity}
                  onChange={(e) => setDisputeFilterSeverity(e.target.value as any)}
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
                    setDisputeFilterStatus('all');
                    setDisputeFilterSeverity('all');
                  }}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          </div>

          {/* Disputes List and Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Disputes List */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Danh sách tranh chấp ({filteredDisputes.length})
                </h2>

                {filteredDisputes.length === 0 ? (
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
                  {/* Header */}
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

                  {/* Info */}
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
                          <span>{parseFloat(selectedDispute.ride.distance as any) || 0}km</span>
                          <span>{selectedDispute.ride.duration} phút</span>
                          <span className="font-bold text-emerald-600">{(Number(selectedDispute.ride.totalFare) || 0).toLocaleString()}đ</span>
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

                  {/* Resolution Form */}
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

export default DispatchManagement;