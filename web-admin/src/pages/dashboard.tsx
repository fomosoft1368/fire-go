import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';

interface DashboardStats {
  totalUsers: number;
  totalDrivers: number;
  activeRides: number;
  todayRevenue: number;
}

export default function Dashboard() {
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDrivers: 0,
    activeRides: 0,
    todayRevenue: 0,
  });
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [rideStats, setRideStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [usersData, driversData, revenueData, dailyRevenueData, ridesStatsData] = await Promise.all([
        apiService.getUsers().catch(() => []),
        apiService.getDrivers().catch(() => []),
        apiService.getRevenueStats().catch(() => null),
        apiService.getDailyRevenue(7).catch(() => []),
        apiService.get('/rides/stats').catch(() => null),
      ]);

      const users = Array.isArray(usersData) ? usersData : [];
      const drivers = Array.isArray(driversData) ? driversData : [];
      
      // Calculate revenue based on time filter
      let todayRevenue = 0;
      if (revenueData?.totalRevenue) {
        todayRevenue = revenueData.totalRevenue;
      }

      // Get active rides count from ride stats
      let activeRides = 0;
      if (ridesStatsData?.activeRides) {
        activeRides = ridesStatsData.activeRides;
      }

      // Set dashboard stats
      setStats({
        totalUsers: users.length || 0,
        totalDrivers: drivers.length || 0,
        activeRides: activeRides,
        todayRevenue: todayRevenue,
      });

      // Set daily revenue data
      if (Array.isArray(dailyRevenueData) && dailyRevenueData.length > 0) {
        setDailyRevenue(dailyRevenueData);
      }

      // Set ride statistics by status
      if (ridesStatsData?.byStatus && Array.isArray(ridesStatsData.byStatus)) {
        setRideStats(ridesStatsData.byStatus);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex w-full items-center rounded-xl bg-white dark:bg-card-dark h-12 px-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-slate-400">search</span>
            <input 
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-slate-400 ml-2 text-slate-900 dark:text-white font-medium" 
              placeholder="Tìm user, tài xế, mã cuốc xe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Time Filter */}
        <div className="mb-6">
          <div className="flex bg-slate-200 dark:bg-card-dark rounded-lg p-1 max-w-sm">
            <label className="flex-1 cursor-pointer">
              <input 
                className="peer sr-only" 
                name="time-filter" 
                type="radio" 
                value="day"
                checked={timeFilter === 'day'}
                onChange={() => setTimeFilter('day')}
              />
              <div className="flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium text-slate-500 peer-checked:bg-white dark:peer-checked:bg-primary peer-checked:text-slate-900 dark:peer-checked:text-white shadow-sm peer-checked:shadow transition-all">
                Ngày
              </div>
            </label>
            <label className="flex-1 cursor-pointer">
              <input 
                className="peer sr-only" 
                name="time-filter" 
                type="radio" 
                value="week"
                checked={timeFilter === 'week'}
                onChange={() => setTimeFilter('week')}
              />
              <div className="flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium text-slate-500 peer-checked:bg-white dark:peer-checked:bg-primary peer-checked:text-slate-900 dark:peer-checked:text-white shadow-sm peer-checked:shadow transition-all">
                Tuần
              </div>
            </label>
            <label className="flex-1 cursor-pointer">
              <input 
                className="peer sr-only" 
                name="time-filter" 
                type="radio" 
                value="month"
                checked={timeFilter === 'month'}
                onChange={() => setTimeFilter('month')}
              />
              <div className="flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium text-slate-500 peer-checked:bg-white dark:peer-checked:bg-primary peer-checked:text-slate-900 dark:peer-checked:text-white shadow-sm peer-checked:shadow transition-all">
                Tháng
              </div>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-600 dark:text-blue-400 text-sm">
            Đang tải dữ liệu...
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Users Card */}
          <div className="bg-white dark:bg-card-dark p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="size-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined filled text-2xl">group</span>
              </div>
              <span className="text-xs font-medium text-green-500 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded">+5%</span>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Tổng người dùng</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalUsers.toLocaleString()}</p>
            </div>
          </div>

          {/* Total Drivers Card */}
          <div className="bg-white dark:bg-card-dark p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="size-12 rounded-full bg-orange-100 dark:bg-orange-800/40 flex items-center justify-center text-orange-600">
                <span className="material-symbols-outlined filled text-2xl">drive_eta</span>
              </div>
              <span className="text-xs font-medium text-green-500 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded">+2%</span>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Tổng tài xế</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalDrivers.toLocaleString()}</p>
            </div>
          </div>

          {/* Active Rides Card */}
          <div className="bg-gradient-to-br from-primary to-orange-600 p-6 rounded-xl shadow-lg shadow-primary/20 flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 size-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="size-12 rounded-full bg-white/20 flex items-center justify-center text-white">
                <span className="material-symbols-outlined filled text-2xl">local_taxi</span>
              </div>
              <span className="text-xs font-medium text-white bg-white/20 px-2 py-1 rounded">+12%</span>
            </div>
            <div className="relative z-10">
              <p className="text-sm text-white/80 font-medium">Cuốc xe đang chạy</p>
              <p className="text-3xl font-bold text-white">{stats.activeRides.toLocaleString()}</p>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="bg-white dark:bg-card-dark p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                <span className="material-symbols-outlined filled text-2xl">payments</span>
              </div>
              <span className="text-xs font-medium text-emerald-500 bg-emerald-100 dark:bg-emerald-900/20 px-2 py-1 rounded">+8%</span>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Doanh thu {timeFilter === 'day' ? 'hôm nay' : timeFilter === 'week' ? 'tuần này' : 'tháng này'}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white truncate">
                {(stats.todayRevenue / 1000000).toFixed(0)} Tr ₫
              </p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="bg-white dark:bg-card-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Biểu đồ doanh thu</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Cập nhật: {loading ? 'đang tải...' : 'Vừa xong'}</p>
              </div>
              <button className="text-primary text-sm font-semibold hover:text-primary-dark transition-colors">Chi tiết</button>
            </div>
            <div className="h-64 w-full relative">
              {dailyRevenue.length > 0 ? (
                <RevenueChart data={dailyRevenue} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                  Chưa có dữ liệu doanh thu
                </div>
              )}
            </div>
            <div className="flex justify-between mt-3 text-xs text-slate-400 font-medium">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:59</span>
            </div>
          </div>

          {/* Ride Status Chart */}
          <div className="bg-white dark:bg-card-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Trạng thái cuốc xe</h3>
            <div className="flex items-center gap-8">
              {/* Donut Chart */}
              <div className="relative w-40 h-40">
                {rideStats.length > 0 ? (
                  <RideStatusChart data={rideStats} />
                ) : (
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="75.4 251.2" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="20" strokeDasharray="50.24 251.2" strokeDashoffset="-75.4" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="20" strokeDasharray="37.68 251.2" strokeDashoffset="-125.64" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#6366f1" strokeWidth="20" strokeDasharray="37.68 251.2" strokeDashoffset="-163.32" />
                  </svg>
                )}
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{rideStats.length > 0 ? rideStats.reduce((sum: number, r: any) => sum + (r.count || 0), 0) : 800}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tổng cuốc</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-3">
                {rideStats.length > 0 ? (
                  rideStats.map((stat: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getRideStatusColor(stat.status)}`}></div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">{getRideStatusLabel(stat.status)}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{stat.count || 0}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">Hoàn thành</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">240</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">Đang chạy</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">160</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">Đã hủy</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">120</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">Chờ xác nhận</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">120</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-card-dark rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hoạt động gần đây</h3>
            <button className="text-primary text-sm font-semibold hover:text-primary-dark transition-colors">Xem tất cả</button>
          </div>
          <div className="space-y-3">
            {/* New User Activity */}
            <div className="flex gap-4 p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-l-4 border-blue-400">
              <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/20 shrink-0 flex items-center justify-center text-blue-500">
                <span className="material-symbols-outlined filled">person_add</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">Người dùng mới đăng ký</h4>
                  <span className="text-xs text-slate-400 whitespace-nowrap ml-2">2 phút trước</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Nguyễn Văn A đã đăng ký tài khoản mới.</p>
              </div>
            </div>

            {/* New Driver Activity */}
            <div className="flex gap-4 p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-l-4 border-green-400">
              <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/20 shrink-0 flex items-center justify-center text-green-500">
                <span className="material-symbols-outlined filled">local_taxi</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">Tài xế mới</h4>
                  <span className="text-xs text-slate-400 whitespace-nowrap ml-2">15 phút trước</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Trần Văn B đã hoàn thành đăng ký làm tài xế.</p>
              </div>
            </div>

            {/* High Demand Area */}
            <div className="flex gap-4 p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-l-4 border-orange-400">
              <div className="size-10 rounded-full bg-orange-100 dark:bg-orange-900/20 shrink-0 flex items-center justify-center text-orange-500">
                <span className="material-symbols-outlined filled">trending_up</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">Khu vực nhu cầu cao</h4>
                  <span className="text-xs text-slate-400 whitespace-nowrap ml-2">1h trước</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Quận 1 đang có nhu cầu đặt xe tăng đột biến (+40%).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );

  // Helper functions for charts and status labels
  function getRideStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      completed: 'bg-green-500',
      ongoing: 'bg-amber-500',
      cancelled: 'bg-red-500',
      pending: 'bg-indigo-500',
      finished: 'bg-green-500',
      active: 'bg-amber-500',
    };
    return colors[status?.toLowerCase()] || 'bg-slate-500';
  }

  function getRideStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      completed: 'Hoàn thành',
      ongoing: 'Đang chạy',
      cancelled: 'Đã hủy',
      pending: 'Chờ xác nhận',
      finished: 'Hoàn thành',
      active: 'Đang chạy',
    };
    return labels[status?.toLowerCase()] || status;
  }
}

// Component to render revenue chart from data
function RevenueChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return null;
  }

  // Find max value to scale the chart
  const maxValue = Math.max(...data.map((d: any) => d.revenue || 0), 1);
  
  // Generate SVG path for the chart
  const points = data.map((d: any, idx: number) => {
    const x = (idx / (data.length - 1)) * 100;
    const y = 50 - ((d.revenue || 0) / maxValue) * 40; // Scale to max 40 units
    return `${x},${y}`;
  }).join(' ');

  const fillPath = `M0,50 L${points} L100,50 Z`;
  const linePath = `M${points}`;

  return (
    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
      <line className="text-slate-100 dark:text-slate-700/50" stroke="currentColor" strokeWidth="0.5" x1="0" x2="100" y1="0" y2="0" />
      <line className="text-slate-100 dark:text-slate-700/50" stroke="currentColor" strokeWidth="0.5" x1="0" x2="100" y1="25" y2="25" />
      <line className="text-slate-100 dark:text-slate-700/50" stroke="currentColor" strokeWidth="0.5" x1="0" x2="100" y1="50" y2="50" />
      <defs>
        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF6B00" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#chartGradient)" />
      <path d={linePath} fill="none" stroke="#FF6B00" strokeLinecap="round" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {data.map((_, idx) => {
        const x = (idx / (data.length - 1)) * 100;
        const y = 50 - ((data[idx].revenue || 0) / maxValue) * 40;
        return (
          <circle
            key={idx}
            className="fill-white dark:fill-card-dark stroke-primary"
            cx={x}
            cy={y}
            r="1.5"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}

// Component to render ride status donut chart
function RideStatusChart({ data }: { data: any[] }) {
  const total = data.reduce((sum: number, d: any) => sum + (d.count || 0), 0);
  
  if (total === 0) {
    return null;
  }

  // Calculate stroke dasharray for each segment
  const circumference = 251.2; // 2 * π * 40
  let offset = 0;
  const segments = data.map((d: any) => {
    const percentage = (d.count || 0) / total;
    const dasharray = percentage * circumference;
    const currentOffset = offset;
    offset += dasharray;
    return { dasharray, offset: currentOffset, color: getStatusColor(d.status) };
  });

  return (
    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
      {segments.map((seg, idx) => (
        <circle
          key={idx}
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={seg.color}
          strokeWidth="20"
          strokeDasharray={seg.dasharray + ' ' + circumference}
          strokeDashoffset={-seg.offset}
        />
      ))}
    </svg>
  );

  function getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      completed: '#10b981',
      finished: '#10b981',
      ongoing: '#f59e0b',
      active: '#f59e0b',
      cancelled: '#ef4444',
      pending: '#6366f1',
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  }
}
