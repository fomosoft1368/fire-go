import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';

interface Ride {
  _id?: string;
  id?: string;
  customerId: string;
  driverId?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  type?: 'hire' | 'rideshare' | 'delivery'; // Added type field
  pickupAddress: string;
  dropoffAddress: string;
  distance: number;
  duration: number;
  totalFare: number;
  paymentMethod: string;
  isPaid: boolean;
  passengers: number;
  requestedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancellationBy?: 'driver' | 'customer';
  driver?: {
    name: string;
    avatar?: string;
    rating?: number;
  };
  customer?: {
    name: string;
    avatar?: string;
  };
}

export default function RideManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [rideshareRequests, setRideshareRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Fetch requests when modal opens for rideshare trips
  useEffect(() => {
    const fetchRequests = async () => {
      if (showDetailModal && selectedRide && selectedRide.type === 'rideshare') {
        setLoadingRequests(true);
        try {
          const tripId = selectedRide._id || selectedRide.id;
          console.log('🔍 Fetching requests for trip:', tripId);
          const requests = await apiService.getCombinedTripRequests(tripId);
          console.log('📋 Fetched rideshare requests:', requests);
          setRideshareRequests(requests || []);
        } catch (err) {
          console.error('❌ Error fetching requests:', err);
          setRideshareRequests([]);
        } finally {
          setLoadingRequests(false);
        }
      }
    };
    fetchRequests();
  }, [showDetailModal, selectedRide]);

  // Fetch rides data
  useEffect(() => {
    const fetchRides = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🚀 Fetching all trips from 3 sources...');
        
        const statusFilter = filterStatus !== 'all' ? filterStatus : undefined;

        // Fetch from all 3 sources in parallel
        const [regularRides, combinedTrips, deliveries] = await Promise.all([
          apiService.getRides({ status: statusFilter }),
          apiService.getCombinedTrips({ status: statusFilter }),
          apiService.getDeliveries({ status: statusFilter }),
        ]);

        console.log('📦 Regular rides:', regularRides?.length || 0);
        console.log('📦 Combined trips (xe ghép):', combinedTrips?.length || 0);
        console.log('📦 Deliveries (giao hàng):', deliveries?.length || 0);

        // Map regular rides
        const mappedRegularRides = (regularRides || []).map((ride: any) => {
          // Get customer name from firstName + lastName
          let customerName = 'Khách hàng';
          if (ride.customerId && typeof ride.customerId === 'object') {
            const customer = ride.customerId;
            const userId = customer.userId || customer;
            if (userId?.firstName && userId?.lastName) {
              customerName = `${userId.firstName} ${userId.lastName}`.trim();
            } else if (userId?.firstName) {
              customerName = userId.firstName;
            } else if (userId?.lastName) {
              customerName = userId.lastName;
            } else if (userId?.name) {
              customerName = userId.name;
            }
          }

          // Get driver name from firstName + lastName
          let driverName = 'Tài xế';
          if (ride.driverId && typeof ride.driverId === 'object') {
            const driver = ride.driverId;
            const driverUserId = driver.userId || driver;
            if (driverUserId?.firstName && driverUserId?.lastName) {
              driverName = `${driverUserId.firstName} ${driverUserId.lastName}`.trim();
            } else if (driverUserId?.firstName) {
              driverName = driverUserId.firstName;
            } else if (driverUserId?.lastName) {
              driverName = driverUserId.lastName;
            } else if (driverUserId?.name) {
              driverName = driverUserId.name;
            } else if (driver.bankAccountHolder) {
              driverName = driver.bankAccountHolder;
            }
          }

          // Helper to safely get address string from GeoJSON or text
          const getAddressString = (field: any): string => {
            if (!field) return 'N/A';
            if (typeof field === 'string') return field;
            if (typeof field === 'object' && field.type === 'Point') {
              // GeoJSON object - show coordinates
              return `${field.coordinates?.[1]?.toFixed(4) || '?'}, ${field.coordinates?.[0]?.toFixed(4) || '?'}`;
            }
            return 'N/A';
          };

          return {
            ...ride,
            type: 'hire', // Thuê xe thường
            pickupAddress: getAddressString(ride.pickupAddress),
            dropoffAddress: getAddressString(ride.dropoffAddress),
            driver: ride.driverId && typeof ride.driverId === 'object' ? {
              name: driverName,
              avatar:
                ride.driverId.userId?.avatar ||
                `https://i.pravatar.cc/150?u=${ride.driverId.userId?.firstName || ride.driverId.bankAccountHolder || ride.driverId._id}`,
              rating: ride.driverId.averageRating,
            } : undefined,
            customer: ride.customerId && typeof ride.customerId === 'object' ? {
              name: customerName,
              avatar:
                ride.customerId.userId?.avatar ||
                `https://i.pravatar.cc/150?u=${ride.customerId.userId?._id || ride.customerId._id || ride.customerId}`,
            } : undefined,
          };
        });

        // Map combined trips (xe ghép)
        const mappedCombinedTrips = (combinedTrips || []).map((trip: any) => {
          let customerName = 'Khách hàng';
          let customerCount = 0;
          let customers: any[] = [];

          // Combined trips có thể có NHIỀU khách hàng trong array customerId
          if (trip.customerId && Array.isArray(trip.customerId)) {
            customerCount = trip.customerId.length;
            customers = trip.customerId;
            if (customerCount === 1) {
              const customer = trip.customerId[0];
              if (customer && typeof customer === 'object') {
                const userId = customer.userId || customer;
                if (userId?.firstName && userId?.lastName) {
                  customerName = `${userId.firstName} ${userId.lastName}`.trim();
                } else if (customer.firstName && customer.lastName) {
                  customerName = `${customer.firstName} ${customer.lastName}`.trim();
                } else if (userId?.firstName) {
                  customerName = userId.firstName;
                } else if (customer.firstName) {
                  customerName = customer.firstName;
                }
              }
            } else if (customerCount > 1) {
              customerName = `${customerCount} khách hàng`;
            }
          } else if (trip.userId && typeof trip.userId === 'object') {
            // Fallback: old field name
            const user = trip.userId;
            if (user?.firstName && user?.lastName) {
              customerName = `${user.firstName} ${user.lastName}`.trim();
            } else if (user?.firstName) {
              customerName = user.firstName;
            } else if (user?.name) {
              customerName = user.name;
            }
            customers = [user];
            customerCount = 1;
          }

          let driverName = 'Tài xế';
          if (trip.driverId && typeof trip.driverId === 'object') {
            const driver = trip.driverId;
            const driverUserId = driver.userId || driver;
            if (driverUserId?.firstName && driverUserId?.lastName) {
              driverName = `${driverUserId.firstName} ${driverUserId.lastName}`.trim();
            } else if (driverUserId?.firstName) {
              driverName = driverUserId.firstName;
            } else if (driver.bankAccountHolder) {
              driverName = driver.bankAccountHolder;
            }
          }

          // Helper to safely get address string from GeoJSON or text
          const getAddressString = (field: any): string => {
            if (!field) return 'N/A';
            if (typeof field === 'string') return field;
            if (typeof field === 'object' && field.type === 'Point') {
              // GeoJSON object - just show coordinates
              return `${field.coordinates?.[1]?.toFixed(4) || '?'}, ${field.coordinates?.[0]?.toFixed(4) || '?'}`;
            }
            return 'N/A';
          };

          return {
            ...trip,
            type: 'rideshare', // Xe ghép
            pickupAddress: getAddressString(trip.pickupLocation || trip.pickupAddress),
            dropoffAddress: getAddressString(trip.dropoffLocation || trip.dropoffAddress),
            passengers: trip.numberOfSeats || trip.passengers || 1,
            customerCount, // NEW: số lượng khách hàng
            customers, // NEW: danh sách khách hàng đầy đủ
            driver: trip.driverId && typeof trip.driverId === 'object' ? {
              name: driverName,
              avatar:
                trip.driverId.userId?.avatar ||
                `https://i.pravatar.cc/150?u=${trip.driverId.userId?.firstName || trip.driverId.bankAccountHolder || trip.driverId._id}`,
              rating: trip.driverId.averageRating,
            } : undefined,
            customer: customers.length > 0 ? {
              name: customerName,
              avatar:
                customers[0]?.userId?.avatar || 
                customers[0]?.avatar ||
                `https://i.pravatar.cc/150?u=${customers[0]?.userId?._id || customers[0]?._id || 'default'}`,
            } : undefined,
          };
        });

        // Map deliveries (giao hàng)
        const mappedDeliveries = (deliveries || []).map((delivery: any) => {
          let customerName = 'Khách hàng';
          if (delivery.customerId && typeof delivery.customerId === 'object') {
            const customer = delivery.customerId;
            const userId = customer.userId || customer;
            if (userId?.firstName && userId?.lastName) {
              customerName = `${userId.firstName} ${userId.lastName}`.trim();
            } else if (userId?.firstName) {
              customerName = userId.firstName;
            } else if (userId?.name) {
              customerName = userId.name;
            }
          }

          let driverName = 'Tài xế';
          if (delivery.driverId && typeof delivery.driverId === 'object') {
            const driver = delivery.driverId;
            const driverUserId = driver.userId || driver;
            if (driverUserId?.firstName && driverUserId?.lastName) {
              driverName = `${driverUserId.firstName} ${driverUserId.lastName}`.trim();
            } else if (driverUserId?.firstName) {
              driverName = driverUserId.firstName;
            } else if (driver.bankAccountHolder) {
              driverName = driver.bankAccountHolder;
            }
          }

          // Helper to safely get address string from GeoJSON or text
          const getAddressString = (field: any): string => {
            if (!field) return 'N/A';
            if (typeof field === 'string') return field;
            if (typeof field === 'object' && field.type === 'Point') {
              // GeoJSON object - show coordinates
              return `${field.coordinates?.[1]?.toFixed(4) || '?'}, ${field.coordinates?.[0]?.toFixed(4) || '?'}`;
            }
            return 'N/A';
          };

          return {
            ...delivery,
            type: 'delivery', // Giao hàng
            pickupAddress: getAddressString(delivery.pickupAddress || delivery.pickupLocation),
            dropoffAddress: getAddressString(delivery.dropoffAddress || delivery.dropoffLocation),
            passengers: 0, // Deliveries don't have passengers
            driver: delivery.driverId && typeof delivery.driverId === 'object' ? {
              name: driverName,
              avatar:
                delivery.driverId.userId?.avatar ||
                `https://i.pravatar.cc/150?u=${delivery.driverId.userId?.firstName || delivery.driverId.bankAccountHolder || delivery.driverId._id}`,
              rating: delivery.driverId.averageRating,
            } : undefined,
            customer: delivery.customerId && typeof delivery.customerId === 'object' ? {
              name: customerName,
              avatar:
                delivery.customerId.userId?.avatar ||
                `https://i.pravatar.cc/150?u=${delivery.customerId.userId?._id || delivery.customerId._id || delivery.customerId}`,
            } : undefined,
          };
        });

        // Merge all trips
        const allTrips = [
          ...mappedRegularRides,
          ...mappedCombinedTrips,
          ...mappedDeliveries,
        ];

        console.log('📊 Total trips after merge:', allTrips.length);
        setRides(allTrips);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Lỗi tải dữ liệu cuốc xe';
        console.error('❌ Error fetching rides:', err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, [filterStatus]);

  // Calculate pagination
  const filteredRides = rides.filter(ride => 
    searchQuery === '' || 
    ride.pickupAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ride.dropoffAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ride.driver?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ride.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ride._id?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredRides.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRides = filteredRides.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return (
          <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            Đang chạy
          </div>
        );
      case 'completed':
        return (
          <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold">
            Hoàn thành
          </div>
        );
      case 'cancelled':
        return (
          <div className="px-3 py-1 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold">
            Đã hủy
          </div>
        );
      case 'pending':
        return (
          <div className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-bold">
            Chờ tài xế
          </div>
        );
      case 'accepted':
        return (
          <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold">
            Đã chấp nhận
          </div>
        );
    }
  };

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'hire':
        return (
          <div className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">local_taxi</span>
            Thuê xe
          </div>
        );
      case 'rideshare':
        return (
          <div className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">group</span>
            Xe ghép
          </div>
        );
      case 'delivery':
        return (
          <div className="px-2 py-1 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">package</span>
            Giao hàng
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400">
            <p className="font-medium">Lỗi: {error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-all duration-200 shadow-sm">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
            <span className="font-semibold">Tạo cuốc xe mới</span>
          </button>
          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex w-full items-center rounded-xl h-12 bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all shadow-sm">
            <div className="pl-4 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-xl">search</span>
            </div>
            <input 
              className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 px-3 text-base" 
              placeholder="Tìm ID, Tài xế, hoặc Khách hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-card-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-primary text-2xl">local_taxi</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Tổng cộng</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{rides.length}</p>
          </div>

          <div className="bg-white dark:bg-card-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-green-500 text-2xl">bolt</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Đang chạy</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{rides.filter(r => r.status === 'in_progress').length}</p>
          </div>

          <div className="bg-white dark:bg-card-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-yellow-500 text-2xl">attach_money</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Doanh thu</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {(() => {
                const total = rides.reduce((sum, r) => {
                  const fare = r.totalFare;
                  const numFare = typeof fare === 'string' 
                    ? parseFloat((fare as string).replace(/\./g, '').replace(/,/g, ''))
                    : (fare || 0);
                  return sum + (isNaN(numFare) ? 0 : numFare);
                }, 0);
                return (total / 1000000).toFixed(1);
              })()}M đ
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button 
            className={`flex h-10 shrink-0 items-center justify-center px-5 rounded-lg transition-all ${
              filterStatus === 'all' 
                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                : 'bg-white dark:bg-card-dark text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            onClick={() => setFilterStatus('all')}
          >
            <span className="text-sm font-bold">Tất cả</span>
          </button>
          <button 
            className={`flex h-10 shrink-0 items-center justify-center px-5 rounded-lg transition-all ${
              filterStatus === 'in_progress' 
                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                : 'bg-white dark:bg-card-dark text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            onClick={() => setFilterStatus('in_progress')}
          >
            <span className="text-sm font-medium">Đang chạy</span>
          </button>
          <button 
            className={`flex h-10 shrink-0 items-center justify-center px-5 rounded-lg transition-all ${
              filterStatus === 'completed' 
                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                : 'bg-white dark:bg-card-dark text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            onClick={() => setFilterStatus('completed')}
          >
            <span className="text-sm font-medium">Hoàn thành</span>
          </button>
          <button 
            className={`flex h-10 shrink-0 items-center justify-center px-5 rounded-lg transition-all ${
              filterStatus === 'cancelled' 
                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                : 'bg-white dark:bg-card-dark text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            onClick={() => setFilterStatus('cancelled')}
          >
            <span className="text-sm font-medium">Đã hủy</span>
          </button>
        </div>

        {/* Rides Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin">
              <span className="material-symbols-outlined text-3xl text-primary">autorenew</span>
            </div>
            <span className="ml-3 text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</span>
          </div>
        ) : rides.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">local_taxi</span>
            <p className="text-slate-500 dark:text-slate-400">Không tìm thấy cuốc xe</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">ID Cuốc</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Loại</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Tài xế</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Khách hàng</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Tuyến đường</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Khoảng cách</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Giá tiền</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Trạng thái</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Thời gian</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {paginatedRides.map((ride) => {
                    const rideId = ride._id || ride.id || '';
                    const isCancelled = ride.status === 'cancelled';
                    const time = ride.completedAt 
                      ? new Date(ride.completedAt).toLocaleDateString('vi-VN')
                      : ride.cancelledAt
                      ? new Date(ride.cancelledAt).toLocaleDateString('vi-VN')
                      : new Date(ride.requestedAt).toLocaleDateString('vi-VN');

                    return (
                      <tr key={rideId} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isCancelled ? 'opacity-60' : ''}`}>
                        {/* ID */}
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">#{rideId.slice(-6).toUpperCase()}</p>
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4">
                          {getTypeBadge(ride.type)}
                        </td>

                        {/* Driver */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {ride.driver?.avatar ? (
                              <img className="w-8 h-8 rounded-full object-cover" src={ride.driver.avatar} alt={ride.driver.name} />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-sm">local_taxi</span>
                              </div>
                            )}
                            <span className="text-sm text-slate-900 dark:text-white font-medium">{ride.driver?.name || 'N/A'}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {ride.customer?.avatar ? (
                              <img className="w-8 h-8 rounded-full object-cover" src={ride.customer.avatar} alt={ride.customer.name} />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined text-sm">person</span>
                              </div>
                            )}
                            <span className="text-sm text-slate-900 dark:text-white font-medium">{ride.customer?.name || 'N/A'}</span>
                          </div>
                        </td>

                        {/* Route */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 max-w-xs">
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={ride.pickupAddress}>📍 {ride.pickupAddress}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={ride.dropoffAddress}>📍 {ride.dropoffAddress}</p>
                          </div>
                        </td>

                        {/* Distance */}
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-900 dark:text-white font-medium">
                            {(() => {
                              const dist = typeof ride.distance === 'string' 
                                ? parseFloat(ride.distance) 
                                : (ride.distance || 0);
                              return isNaN(dist) ? '0' : dist.toFixed(1);
                            })()} km
                          </p>
                        </td>

                        {/* Fare */}
                        <td className="px-6 py-4">
                          <p className={`text-sm font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                            {(() => {
                              const fare = typeof ride.totalFare === 'string'
                                ? parseFloat((ride.totalFare as string).replace(/\./g, '').replace(/,/g, ''))
                                : (ride.totalFare || 0);
                              return isNaN(fare) ? '0' : fare.toLocaleString('vi-VN');
                            })()}đ
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {getStatusBadge(ride.status)}
                        </td>

                        {/* Time */}
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 dark:text-slate-400">{time}</p>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          {ride.type === 'rideshare' && (ride as any).customerCount > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedRide(ride);
                                setShowDetailModal(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors text-xs font-semibold"
                            >
                              <span className="material-symbols-outlined text-[14px]">visibility</span>
                              Chi tiết
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Hiển thị <strong>{startIndex + 1}-{Math.min(startIndex + pageSize, filteredRides.length)}</strong> của <strong>{filteredRides.length}</strong>
                </span>
                <select 
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="ml-4 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                >
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                  <option value={100}>100 / trang</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Trước
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}

        {/* Detail Modal for Rideshare Trips */}
        {showDetailModal && selectedRide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => {
            setShowDetailModal(false);
            setRideshareRequests([]);
          }}>
            <div className="bg-white dark:bg-card-dark rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-purple-600 text-2xl">group</span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chi tiết chuyến xe ghép</h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setRideshareRequests([]);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="material-symbols-outlined text-slate-500">close</span>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Trip Info */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Thông tin chuyến đi</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">ID Cuốc</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">#{(selectedRide._id || selectedRide.id || '').slice(-6).toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Số lượng khách</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{(selectedRide as any).customerCount || 0} người</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Khoảng cách</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {(() => {
                          const dist = typeof selectedRide.distance === 'string' 
                            ? parseFloat(selectedRide.distance) 
                            : (selectedRide.distance || 0);
                          return isNaN(dist) ? '0' : dist.toFixed(1);
                        })()} km
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Tổng tiền</p>
                      <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {(() => {
                          const fare = typeof selectedRide.totalFare === 'string'
                            ? parseFloat((selectedRide.totalFare as string).replace(/\./g, '').replace(/,/g, ''))
                            : (selectedRide.totalFare || 0);
                          return isNaN(fare) ? '0' : fare.toLocaleString('vi-VN');
                        })()}đ
                      </p>
                    </div>
                  </div>
                </div>

                {/* Driver Info */}
                {selectedRide.driver && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600 text-lg">local_taxi</span>
                      Tài xế
                    </h3>
                    <div className="flex items-center gap-3">
                      <img className="w-12 h-12 rounded-full object-cover" src={selectedRide.driver.avatar} alt={selectedRide.driver.name} />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{selectedRide.driver.name}</p>
                        {selectedRide.driver.rating && (
                          <div className="flex items-center gap-1 text-yellow-500">
                            <span className="material-symbols-outlined text-sm">star</span>
                            <span className="text-sm font-medium">{selectedRide.driver.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Customers List */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-600 text-lg">group</span>
                    Danh sách khách hàng ({loadingRequests ? '...' : rideshareRequests.length})
                  </h3>
                  
                  {loadingRequests ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin">
                        <span className="material-symbols-outlined text-2xl text-purple-600">autorenew</span>
                      </div>
                      <span className="ml-3 text-slate-500 dark:text-slate-400">Đang tải...</span>
                    </div>
                  ) : rideshareRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">group_off</span>
                      <p className="text-slate-500 dark:text-slate-400 mt-2">Không có thông tin khách hàng</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rideshareRequests.map((request: any, index: number) => {
                        // Get customer info
                        const customer = request.customerId;
                        const customerName = customer?.firstName && customer?.lastName 
                          ? `${customer.firstName} ${customer.lastName}`.trim()
                          : customer?.firstName || 'Khách hàng';
                        const avatar = customer?.avatar || `https://i.pravatar.cc/150?u=${customer?._id || index}`;

                        // Get address info - handle both string and GeoJSON
                        const getAddressString = (field: any): string => {
                          if (!field) return 'Chưa có thông tin';
                          if (typeof field === 'string') return field;
                          if (typeof field === 'object' && field.type === 'Point') {
                            return `${field.coordinates?.[1]?.toFixed(4) || '?'}, ${field.coordinates?.[0]?.toFixed(4) || '?'}`;
                          }
                          return 'Chưa có thông tin';
                        };

                        const pickupAddr = getAddressString(request.pickupAddress);
                        const dropoffAddr = getAddressString(request.dropoffAddress);

                        return (
                          <div key={request._id || index} className="bg-white dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                            {/* Customer Header */}
                            <div className="flex items-center gap-3 mb-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">
                                {index + 1}
                              </div>
                              <img className="w-10 h-10 rounded-full object-cover" src={avatar} alt={customerName} />
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900 dark:text-white">{customerName}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {request.seats || 1} chỗ
                                  {request.fare && ` • ${request.fare.toLocaleString('vi-VN')}đ`}
                                </p>
                              </div>
                            </div>

                            {/* Customer's Route */}
                            <div className="ml-11 space-y-2">
                              <div className="flex gap-2">
                                <div className="flex flex-col items-center">
                                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                  <div className="w-0.5 flex-1 bg-slate-300 dark:bg-slate-600 my-0.5 min-h-[20px]"></div>
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                </div>
                                <div className="flex-1 space-y-3 pb-1">
                                  <div>
                                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-0.5">Điểm đón</p>
                                    <p className="text-sm text-slate-900 dark:text-white">{pickupAddr}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-0.5">Điểm đến</p>
                                    <p className="text-sm text-slate-900 dark:text-white">{dropoffAddr}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Route Info */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 text-lg">route</span>
                    Tuyến đường chung
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div className="w-0.5 flex-1 bg-slate-300 dark:bg-slate-600 my-1"></div>
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Điểm bắt đầu</p>
                          <p className="text-sm text-slate-900 dark:text-white">{selectedRide.pickupAddress}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Điểm kết thúc</p>
                          <p className="text-sm text-slate-900 dark:text-white">{selectedRide.dropoffAddress}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setRideshareRequests([]);
                  }}
                  className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
