import { useState } from 'react';
import Layout from '../components/Layout';

export default function Dashboard() {
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('day');
  const [searchQuery, setSearchQuery] = useState('');

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
              <p className="text-3xl font-bold text-slate-900 dark:text-white">15,230</p>
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
              <p className="text-3xl font-bold text-slate-900 dark:text-white">4,102</p>
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
              <p className="text-3xl font-bold text-white">342</p>
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
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Doanh thu hôm nay</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white truncate">125 Tr ₫</p>
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
                <p className="text-xs text-slate-500 dark:text-slate-400">Cập nhật: Vừa xong</p>
              </div>
              <button className="text-primary text-sm font-semibold hover:text-primary-dark transition-colors">Chi tiết</button>
            </div>
            <div className="h-64 w-full relative">
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
                <path d="M0,40 Q25,10 50,30 T100,10 V50 H0 Z" fill="url(#chartGradient)" />
                <path d="M0,40 Q25,10 50,30 T100,10" fill="none" stroke="#FF6B00" strokeLinecap="round" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <circle className="fill-white dark:fill-card-dark stroke-primary" cx="50" cy="30" r="1.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <circle className="fill-white dark:fill-card-dark stroke-primary" cx="100" cy="10" r="1.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              </svg>
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
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="75.4 251.2" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="20" strokeDasharray="50.24 251.2" strokeDashoffset="-75.4" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="20" strokeDasharray="37.68 251.2" strokeDashoffset="-125.64" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#6366f1" strokeWidth="20" strokeDasharray="37.68 251.2" strokeDashoffset="-163.32" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">800</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tổng cuốc</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-3">
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
}
