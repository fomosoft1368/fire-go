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

        setRides(allRides || []);
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

        {/* Rides List */}
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
        <div className="flex flex-col gap-4">
          {rides.map((ride) => {
            const rideId = ride._id || ride.id || '';
            const isRunning = ride.status === 'in_progress';
            const isCancelled = ride.status === 'cancelled';
            const time = isRunning 
              ? 'Đang chạy'
              : ride.completedAt 
              ? new Date(ride.completedAt).toLocaleString('vi-VN')
              : ride.cancelledAt
              ? new Date(ride.cancelledAt).toLocaleString('vi-VN')
              : new Date(ride.requestedAt).toLocaleString('vi-VN');

            return (
            <div 
              key={rideId} 
              className={`bg-white dark:bg-card-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all ${
                isCancelled ? 'opacity-75' : ''
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 dark:text-white font-bold text-lg">#{rideId.slice(-4).toUpperCase()}</span>
                    {getStatusBadge(ride.status)}
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs mt-1">{time}</span>
                </div>
                <p className={`font-bold text-lg ${
                  isCancelled 
                    ? 'text-slate-400 line-through' 
                    : isRunning
                    ? 'text-primary'
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {(ride.totalFare || 0).toLocaleString('vi-VN')}đ
                </p>
              </div>

              {/* Route */}
              <div className={`flex gap-3 mb-4 ${isCancelled ? 'opacity-60' : ''}`}>
                <div className="flex flex-col items-center pt-1">
                  <div className={`w-3 h-3 rounded-full border-2 ${getRouteColor(ride.status)} ${isRunning || isCancelled ? 'bg-transparent' : ''}`}></div>
                  <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 my-1.5"></div>
                  <div className={`w-3 h-3 rounded-full ${getRouteColor(ride.status)}`}></div>
                </div>
                <div className="flex flex-col gap-5 flex-1">
                  <div className="flex flex-col">
                    <p className="text-slate-900 dark:text-white text-sm font-medium leading-tight">{ride.pickupAddress}</p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-slate-900 dark:text-white text-sm font-medium leading-tight">{ride.dropoffAddress}</p>
                  </div>
                </div>
              </div>

              {/* Driver & Customer (would need to populate from separate API calls) */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className={`flex items-center gap-3 flex-1 ${isCancelled ? 'opacity-50' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-xl">local_taxi</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-900 dark:text-white text-sm font-semibold">Tài xế</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-3"></div>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <div className="flex flex-col items-end">
                    <span className="text-slate-900 dark:text-white text-sm font-semibold">Khách hàng</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-xl">person</span>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
        )}

        {/* Load More */}
        {!loading && rides.length > 0 && (
        <div className="flex justify-center py-8">
          <button className="text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-primary transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined">expand_more</span>
            Xem thêm
          </button>
        </div>
        )}
      </div>
    </Layout>
  );
}
