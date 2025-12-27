import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';

interface Ride {
  _id?: string;
  id?: string;
  customerId: string;
  driverId?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
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

  // Fetch rides data
  useEffect(() => {
    const fetchRides = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🚀 Fetching rides from API...');
        const allRides = await apiService.getRides({
          status: filterStatus !== 'all' ? filterStatus : undefined,
        });

        console.log('📦 API Response:', allRides);
        console.log('📊 Number of rides:', allRides?.length || 0);

        // Map populated driver/customer info with fallback for name and avatar
        const mappedRides = (allRides || []).map((ride: any) => {
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

          return {
            ...ride,
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
        setRides(mappedRides);
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

  const getRouteColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'border-primary bg-primary';
      case 'completed': return 'border-green-500 bg-green-500';
      case 'cancelled': return 'border-slate-400 bg-slate-400';
      case 'pending': return 'border-yellow-500 bg-yellow-500';
      case 'accepted': return 'border-blue-500 bg-blue-500';
      default: return 'border-primary bg-primary';
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
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{(rides.reduce((sum, r) => sum + (r.totalFare || 0), 0) / 1000000).toFixed(1)}M đ</p>
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
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Tài xế</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Khách hàng</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Tuyến đường</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Khoảng cách</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Giá tiền</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Trạng thái</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Thời gian</th>
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
                          <p className="text-sm text-slate-900 dark:text-white font-medium">{ride.distance?.toFixed(1) || '0'} km</p>
                        </td>

                        {/* Fare */}
                        <td className="px-6 py-4">
                          <p className={`text-sm font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                            {(ride.totalFare || 0).toLocaleString('vi-VN')}đ
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
      </div>
    </Layout>
  );
}
