import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiService, type Driver as ApiDriver } from '../services/api';

interface Driver extends ApiDriver {
  displayName?: string;
  displayStatus?: 'online' | 'offline' | 'pending' | 'blocked';
  statusText?: string;
  isPending?: boolean;
  registeredTime?: string;
  vehicleType?: 'car' | 'bike';
  revenue?: string;
}

export default function DriverManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'online' | 'offline'>('all');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    active: 0,
    revenue: '0'
  });

  // Fetch drivers data
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🚀 Fetching drivers from API...');
        
        // Fetch all drivers
        const allDrivers = await apiService.getDrivers();
        
        console.log('📦 API Response:', allDrivers);
        console.log('📊 Number of drivers:', allDrivers?.length || 0);
        
        if (!allDrivers || allDrivers.length === 0) {
          console.warn('⚠️ No drivers found in response');
          setPendingDrivers([]);
          setDrivers([]);
          setStats({ pending: 0, active: 0, revenue: '0' });
          setLoading(false);
          return;
        }
        
        // Transform API response to UI format
        const transformedDrivers = allDrivers.map((driver) => {
          console.log('🔄 Transforming driver:', driver.bankAccountHolder);
          return {
            ...driver,
            displayName: driver.bankAccountHolder || 'Chưa có tên',
            displayStatus: (driver.licenseStatus === 'pending' ? 'pending' : 
                            driver.status === 'online' ? 'online' : 
                            driver.isSuspended ? 'blocked' : 'offline') as 'online' | 'offline' | 'pending' | 'blocked',
            statusText: driver.status === 'online' ? 'Online' : 
                       driver.status === 'offline' ? 'Offline' : 
                       driver.isSuspended ? 'Khóa TK' : 'Offline',
            isPending: driver.licenseStatus === 'pending',
            registeredTime: driver.createdAt ? new Date(driver.createdAt).toLocaleDateString('vi-VN') : 'N/A',
            vehicleType: driver.vehicleModel?.toLowerCase().includes('exciter') || 
                        driver.vehicleModel?.toLowerCase().includes('bike') ? 'bike' : 'car',
            revenue: driver.totalEarnings ? `${(driver.totalEarnings / 1000000).toFixed(1)}M` : '0'
          }
        }) as Driver[];

        console.log('✅ Transformed drivers:', transformedDrivers.length);

        // Separate pending and approved drivers
        const pending = transformedDrivers.filter(d => d.licenseStatus === 'pending');
        const approved = transformedDrivers.filter(d => d.licenseStatus !== 'pending');

        console.log('📝 Pending drivers:', pending.length);
        console.log('✔️ Approved drivers:', approved.length);

        setPendingDrivers(pending);
        setDrivers(approved);

        // Calculate stats
        const activeCount = approved.filter(d => d.status === 'online').length;
        const totalRevenue = approved.reduce((sum, d) => sum + (d.totalEarnings || 0), 0);

        console.log('📊 Stats - Pending:', pending.length, 'Active:', activeCount, 'Revenue:', totalRevenue);

        setStats({
          pending: pending.length,
          active: activeCount,
          revenue: totalRevenue > 0 ? `${(totalRevenue / 1000000).toFixed(1)}M` : '0'
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Lỗi tải dữ liệu tài xế';
        console.error('❌ Error fetching drivers:', err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-slate-400';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'offline': return 'text-slate-500';
      case 'blocked': return 'text-red-500';
      default: return 'text-slate-500';
    }
  };

  // Filter drivers based on search and status
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = searchQuery === '' || 
      driver.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.vehiclePlate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.bankAccount?.includes(searchQuery);

    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'online' && driver.displayStatus === 'online') ||
      (filterStatus === 'offline' && driver.displayStatus === 'offline') ||
      (filterStatus === 'pending' && driver.displayStatus === 'pending');

    return matchesSearch && matchesStatus;
  });

  const handleApproveDriver = async (driverId: string) => {
    try {
      await apiService.updateDriver(driverId, { licenseStatus: 'approved' });
      // Refresh the list
      const allDrivers = await apiService.getDrivers();
      const transformedDrivers = allDrivers.map((driver) => ({
        ...driver,
        displayName: driver.bankAccountHolder || 'Chưa có tên',
        displayStatus: (driver.licenseStatus === 'pending' ? 'pending' : 
                        driver.status === 'online' ? 'online' : 
                        driver.isSuspended ? 'blocked' : 'offline') as 'online' | 'offline' | 'pending' | 'blocked',
        statusText: driver.status === 'online' ? 'Online' : 
                   driver.status === 'offline' ? 'Offline' : 
                   driver.isSuspended ? 'Khóa TK' : 'Offline',
        isPending: driver.licenseStatus === 'pending',
        registeredTime: driver.createdAt ? new Date(driver.createdAt).toLocaleDateString('vi-VN') : 'N/A',
        vehicleType: driver.vehicleModel?.toLowerCase().includes('exciter') || 
                    driver.vehicleModel?.toLowerCase().includes('bike') ? 'bike' : 'car',
        revenue: driver.totalEarnings ? `${(driver.totalEarnings / 1000000).toFixed(1)}M` : '0'
      })) as Driver[];

      const pending = transformedDrivers.filter(d => d.licenseStatus === 'pending');
      const approved = transformedDrivers.filter(d => d.licenseStatus !== 'pending');

      setPendingDrivers(pending);
      setDrivers(approved);
    } catch (err) {
      console.error('Error approving driver:', err);
      setError('Lỗi khi phê duyệt tài xế');
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-card-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-500 text-xl">pending</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Chờ duyệt</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
          </div>

          <div className="bg-white dark:bg-card-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500 text-xl">check_circle</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Hoạt động</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.active}</p>
          </div>

          <div className="bg-white dark:bg-card-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">payments</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Doanh thu</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.revenue}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl">
            <div className="flex w-full items-center rounded-xl h-12 bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
              <div className="pl-4 flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input 
                className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 px-3 text-base" 
                placeholder="Tìm tên, biển số, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="pr-4 text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">tune</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 items-center flex-wrap">
            <button 
              className={`flex h-10 items-center justify-center px-4 rounded-lg transition-all ${
                filterStatus === 'all' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              onClick={() => setFilterStatus('all')}
            >
              <span className="text-sm font-medium">Tất cả</span>
            </button>
            <button 
              className={`flex h-10 items-center justify-center px-4 rounded-lg transition-all ${
                filterStatus === 'pending' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              onClick={() => setFilterStatus('pending')}
            >
              <span className="text-sm font-medium">Chờ duyệt</span>
              {stats.pending > 0 && (
                <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500/20 px-1.5 text-xs font-bold text-orange-500">{stats.pending}</span>
              )}
            </button>
            <button 
              className={`flex h-10 items-center justify-center px-4 rounded-lg transition-all ${
                filterStatus === 'online' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              onClick={() => setFilterStatus('online')}
            >
              <span className="text-sm font-medium">Online</span>
            </button>
            <button 
              className={`flex h-10 items-center justify-center px-4 rounded-lg transition-all ${
                filterStatus === 'offline' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              onClick={() => setFilterStatus('offline')}
            >
              <span className="text-sm font-medium">Offline</span>
            </button>
          </div>
        </div>

        {/* Pending Approval Section */}
        {pendingDrivers.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cần phê duyệt ({pendingDrivers.length})</h3>
              <button className="text-primary text-sm font-medium hover:underline">Xem tất cả</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingDrivers.slice(0, 2).map((driver) => (
                <div key={driver._id || driver.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-orange-500/30 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                  <div className="flex items-start gap-4 mb-4">
                    <img 
                      className="size-14 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                      src={`https://i.pravatar.cc/150?u=${driver.bankAccountHolder || driver.userId}`}
                      alt={driver.displayName}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">{driver.displayName}</h4>
                        <span className="px-2 py-1 rounded text-xs font-bold bg-orange-500/10 text-orange-500 uppercase tracking-wide">Mới</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-lg">
                          {driver.vehicleType === 'bike' ? 'two_wheeler' : 'directions_car'}
                        </span>
                        <span className="truncate">{driver.vehicleModel} • {driver.vehiclePlate}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Đăng ký: {driver.registeredTime}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      className="flex-1 h-10 flex items-center justify-center rounded-lg bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary-dark transition-colors"
                      onClick={() => handleApproveDriver(driver._id || driver.id || '')}
                    >
                      Phê duyệt
                    </button>
                    <button className="flex-1 h-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Driver List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Danh sách tài xế</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Sắp xếp:</span>
              <button className="text-sm font-medium text-primary flex items-center hover:underline">
                Doanh thu 
                <span className="material-symbols-outlined text-lg">arrow_drop_down</span>
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin">
                <span className="material-symbols-outlined text-3xl text-primary">autorenew</span>
              </div>
              <span className="ml-3 text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</span>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="bg-white dark:bg-card-dark p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">directions_car</span>
              <p className="text-slate-500 dark:text-slate-400">Không tìm thấy tài xế</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredDrivers.map((driver) => (
                <div key={driver._id || driver.id} className="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative shrink-0">
                      <img 
                        className="size-14 rounded-full object-cover" 
                        src={`https://i.pravatar.cc/150?u=${driver.bankAccountHolder || driver.userId}`}
                        alt={driver.displayName}
                      />
                      <div className={`absolute bottom-0 right-0 size-4 rounded-full ${getStatusDotColor(driver.displayStatus)} border-2 border-white dark:border-card-dark`}></div>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">{driver.displayName}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {driver.averageRating?.toFixed(1) || '0'} 
                          <span className="material-symbols-outlined filled text-yellow-500 text-sm">star</span>
                        </span>
                        <span className="truncate">{driver.vehicleModel} • {driver.vehiclePlate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-base font-bold ${driver.displayStatus === 'online' ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                      {driver.revenue} đ
                    </span>
                    <span className={`text-xs font-medium ${getStatusTextColor(driver.displayStatus)}`}>
                      {driver.statusText}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && filteredDrivers.length > 0 && (
            <div className="py-6 text-center">
              <button className="text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-primary transition-colors">
                Tải thêm...
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
