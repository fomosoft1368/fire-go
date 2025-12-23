import { useState } from 'react';
import Layout from '../components/Layout';

interface DailyRevenue {
  id: string;
  date: string;
  month: string;
  day: string;
  rides: number;
  revenue: string;
}

export default function RevenueManagement() {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('week');

  const dailyRevenues: DailyRevenue[] = [
    {
      id: '1',
      date: '24',
      month: 'T10',
      day: '24',
      rides: 450,
      revenue: '120.500.000'
    },
    {
      id: '2',
      date: '23',
      month: 'T10',
      day: '23',
      rides: 432,
      revenue: '115.200.000'
    },
    {
      id: '3',
      date: '22',
      month: 'T10',
      day: '22',
      rides: 410,
      revenue: '98.800.000'
    }
  ];

  return (
    <Layout>
      <div className="p-6">
        {/* Time Filter */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          <button 
            className={`flex h-10 shrink-0 items-center justify-center px-5 rounded-lg transition-all ${
              timeFilter === 'today' 
                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                : 'border border-slate-300 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setTimeFilter('today')}
          >
            <span className="text-sm font-medium">Hôm nay</span>
          </button>
          <button 
            className={`flex h-10 shrink-0 items-center justify-center px-5 rounded-lg transition-all ${
              timeFilter === 'week' 
                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                : 'border border-slate-300 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setTimeFilter('week')}
          >
            <span className="text-sm font-bold">Tuần này</span>
          </button>
          <button 
            className={`flex h-10 shrink-0 items-center justify-center px-5 rounded-lg transition-all ${
              timeFilter === 'month' 
                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                : 'border border-slate-300 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setTimeFilter('month')}
          >
            <span className="text-sm font-medium">Tháng này</span>
          </button>
          <button className="flex h-10 shrink-0 items-center justify-center px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <span className="material-symbols-outlined text-xl">calendar_month</span>
          </button>
        </div>

        {/* Total Revenue Card */}
        <div className="mb-6">
          <div className="flex flex-col gap-3 rounded-2xl p-6 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-900 dark:to-slate-950 shadow-lg border border-slate-800 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="flex justify-between items-start z-10">
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Tổng Doanh thu</p>
              <button className="text-slate-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-xl">visibility</span>
              </button>
            </div>
            <div className="flex items-baseline gap-2 mt-1 z-10">
              <h2 className="text-white text-4xl font-extrabold tracking-tight">
                1.250.000.000 <span className="text-xl text-slate-400 font-bold">đ</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-2 z-10">
              <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded text-green-500">
                <span className="material-symbols-outlined text-base">trending_up</span>
                <p className="text-sm font-bold">+5.4%</p>
              </div>
              <p className="text-slate-500 text-sm">so với tuần trước</p>
            </div>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className="mb-6">
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Xu hướng doanh thu</h3>
              <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded">Biểu đồ</span>
            </div>
            <div className="w-full h-[180px] relative">
              <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 375 150">
                <defs>
                  <linearGradient id="chartGradient" x1="187.5" y1="0" x2="187.5" y2="150" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF6B00" stopOpacity="0.3" />
                    <stop offset="1" stopColor="#FF6B00" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 110 C 30 110, 50 80, 80 90 C 110 100, 130 50, 160 60 C 190 70, 210 30, 240 40 C 270 50, 290 20, 320 30 C 350 40, 375 10, 375 10 V 150 H 0 Z" fill="url(#chartGradient)" />
                <path d="M0 110 C 30 110, 50 80, 80 90 C 110 100, 130 50, 160 60 C 190 70, 210 30, 240 40 C 270 50, 290 20, 320 30 C 350 40, 375 10, 375 10" fill="none" stroke="#FF6B00" strokeLinecap="round" strokeWidth="3" />
                <circle cx="160" cy="60" r="4" fill="#FF6B00" stroke="#fff" strokeWidth="2" />
                <circle cx="320" cy="30" r="4" fill="#FF6B00" stroke="#fff" strokeWidth="2" />
              </svg>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 px-1">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span>T7</span>
                <span>CN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Service Distribution & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Service Distribution */}
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tỷ trọng dịch vụ</h3>
              <span className="material-symbols-outlined text-slate-500" style={{ fontSize: '20px' }}>pie_chart</span>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary"></span> Xe máy
                  </span>
                  <span className="text-slate-900 dark:text-white font-bold">45%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '45%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Ô tô
                  </span>
                  <span className="text-slate-900 dark:text-white font-bold">35%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: '35%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Giao hàng
                  </span>
                  <span className="text-slate-900 dark:text-white font-bold">20%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: '20%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-card-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-1">
                <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Chi trả tài xế</p>
              <p className="text-slate-900 dark:text-white text-xl font-bold">850 Tr</p>
            </div>
            <div className="bg-white dark:bg-card-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-1">
                <span className="material-symbols-outlined text-xl">savings</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Tổng hoa hồng</p>
              <p className="text-slate-900 dark:text-white text-xl font-bold">250 Tr</p>
            </div>
            <div className="bg-white dark:bg-card-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-700 col-span-2 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <span className="material-symbols-outlined text-xl">percent</span>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Chiết khấu hiện tại</p>
                    <p className="text-slate-900 dark:text-white text-base font-bold">
                      20% <span className="text-slate-500 text-xs font-normal">(Xe máy)</span>
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold text-white border border-slate-700 dark:border-slate-600 transition-colors">
                  Chỉnh sửa
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Summary */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Tổng kết ngày</h3>
          <div className="flex flex-col gap-3">
            {dailyRevenues.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-5 rounded-xl bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary/50 dark:hover:border-primary/50 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <span className="text-xs font-bold uppercase">{item.month}</span>
                    <span className="text-sm font-bold">{item.day}</span>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-slate-900 dark:text-white text-sm font-bold">Doanh thu ngày</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{item.rides} cuốc xe</p>
                  </div>
                </div>
                <p className="text-slate-900 dark:text-white text-sm font-bold">{item.revenue} đ</p>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-3 text-sm text-primary font-bold bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors">
            Xem báo cáo chi tiết
          </button>
        </div>
      </div>
    </Layout>
  );
}
