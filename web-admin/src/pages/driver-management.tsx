import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DriverDetailModal from '../components/DriverDetailModal';
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
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

export default function DriverManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
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

  const handleShowDetail = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setSelectedDriver(null);
  };

  // Fetch drivers data
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
        const fullName = `${driver.lastName || ''} ${driver.firstName || ''}`.trim() || 'Chưa có tên';
        console.log('🔄 Transforming driver:', fullName);
        return {
          ...driver,
          displayName: fullName,
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

  useEffect(() => {
    fetchDrivers();

    // Refetch when page becomes visible (user switches back to this tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📍 Driver page became visible, refetching drivers...');
        fetchDrivers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [location.pathname]);

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
      const transformedDrivers = allDrivers.map((driver) => {
        const fullName = `${driver.lastName || ''} ${driver.firstName || ''}`.trim() || 'Chưa có tên';
        return {
          ...driver,
          displayName: fullName,
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
        };
      }) as Driver[];

      const pending = transformedDrivers.filter(d => d.licenseStatus === 'pending');
      const approved = transformedDrivers.filter(d => d.licenseStatus !== 'pending');

      setPendingDrivers(pending);
      setDrivers(approved);
    } catch (err) {
      console.error('Error approving driver:', err);
      setError('Lỗi khi phê duyệt tài xế');
    }
  };

  const handleLockDriver = async (driverId: string, currentStatus: boolean) => {
    try {
      const confirmMessage = currentStatus 
        ? 'Bạn chắc chắn muốn mở khóa tài khoản này?' 
        : 'Bạn chắc chắn muốn khóa tài khoản này?';
      
      if (!window.confirm(confirmMessage)) return;

      await apiService.updateDriver(driverId, { isSuspended: !currentStatus });
      
      // Refresh the list
      const allDrivers = await apiService.getDrivers();
      const transformedDrivers = allDrivers.map((driver) => {
        const fullName = `${driver.lastName || ''} ${driver.firstName || ''}`.trim() || 'Chưa có tên';
        return {
          ...driver,
          displayName: fullName,
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
        };
      }) as Driver[];

      const pending = transformedDrivers.filter(d => d.licenseStatus === 'pending');
      const approved = transformedDrivers.filter(d => d.licenseStatus !== 'pending');

      setPendingDrivers(pending);
      setDrivers(approved);
    } catch (err) {
      console.error('Error locking driver:', err);
      setError('Lỗi khi cập nhật trạng thái tài khoản');
    }
  };

  return (
    <Layout>
      <div className="p-6">
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

        {/* Filter + Add Button */}
        <div className="flex flex-row items-center justify-between gap-2 mb-4 w-full">
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
          {/* Add Driver Button */}
          <button
            className="h-10 px-5 rounded-lg bg-primary text-white font-semibold shadow-md hover:bg-primary-dark transition-colors"
            onClick={() => navigate('/add-driver')}
          >
            <span className="material-symbols-outlined align-middle mr-2">add</span>
            Thêm tài xế
          </button>
        </div>

        {/* Search Bar riêng */}
        <div className="w-full mb-6">
          <div className="flex w-full max-w-2xl items-center rounded-xl h-12 bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
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
                      src={`https://i.pravatar.cc/150?u=${driver.email || driver.userId}`}
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
                      onClick={() => navigate(`/driver/${driver._id || driver.id}`)}
                    >
                      <span className="material-symbols-outlined mr-1">visibility</span>
                      Xem chi tiết
                    </button>
                    <button className="flex-1 h-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <span className="material-symbols-outlined mr-1">close</span>
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bảng danh sách tài xế */}
        <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Tên tài xế</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Loại xe</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Biển số</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Doanh thu</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-card-dark divide-y divide-slate-200 dark:divide-slate-700">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Không có tài xế nào phù hợp.</td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver._id || driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                      <img
                        className="size-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        src={`https://i.pravatar.cc/150?u=${driver.email || driver.userId}`}
                        alt={driver.displayName}
                      />
                      <span className="font-medium text-slate-900 dark:text-slate-100">{driver.displayName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                        driver.displayStatus === 'online' ? 'bg-green-100 text-green-600 dark:bg-green-600/20 dark:text-green-300' :
                        driver.displayStatus === 'offline' ? 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300' :
                        driver.displayStatus === 'blocked' ? 'bg-red-100 text-red-600 dark:bg-red-700/40 dark:text-red-300' :
                        'bg-orange-100 text-orange-600 dark:bg-orange-700/40 dark:text-orange-300'
                      }`}>
                        <span className="material-symbols-outlined text-base align-middle">
                          {driver.displayStatus === 'online' ? 'circle' :
                            driver.displayStatus === 'offline' ? 'radio_button_unchecked' :
                            driver.displayStatus === 'blocked' ? 'block' : 'pending'}
                        </span>
                        {driver.statusText}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-slate-900 dark:text-slate-100">
                        <span className="material-symbols-outlined text-base align-middle">
                          {driver.vehicleType === 'bike' ? 'two_wheeler' : 'directions_car'}
                        </span>
                        {driver.vehicleType === 'bike' ? 'Xe máy' : 'Ô tô'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-900 dark:text-slate-100">{driver.vehiclePlate}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-primary">{driver.revenue}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 hover:bg-primary hover:text-white dark:hover:bg-primary-dark dark:hover:text-white font-medium text-xs transition-colors"
                          onClick={() => navigate(`/driver/${driver._id || driver.id}`)}
                        >
                          <span className="material-symbols-outlined text-base align-middle">visibility</span>
                          Xem
                        </button>
                        <button
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded font-medium text-xs transition-colors ${
                            driver.isSuspended
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                          }`}
                          onClick={() => handleLockDriver(driver._id || driver.id || '', driver.isSuspended || false)}
                        >
                          <span className="material-symbols-outlined text-base align-middle">
                            {driver.isSuspended ? 'lock_open' : 'lock'}
                          </span>
                          {driver.isSuspended ? 'Mở khóa' : 'Khóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal chi tiết tài xế */}
        {showDetail && selectedDriver && (
          <DriverDetailModal driver={selectedDriver} onClose={handleCloseDetail} />
        )}
      </div>
    </Layout>
  );
}
