import React, { useState } from 'react';
import Layout from '../components/Layout';

const ReportsAnalytics: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('today');

  const filters = [
    { id: 'today', label: 'Hôm nay' },
    { id: 'week', label: 'Tuần này' },
    { id: 'month', label: 'Tháng này' },
    { id: 'custom', label: 'Tùy chỉnh' }
  ];

  const kpiCards = [
    {
      title: 'Tổng doanh thu',
      value: '150.000.000₫',
      change: '+5%',
      isPositive: true,
      icon: 'payments',
      iconBg: 'bg-primary/10 text-primary'
    },
    {
      title: 'Cuốc xe hoàn thành',
      value: '1,240',
      change: '+12%',
      isPositive: true,
      icon: 'local_taxi',
      iconBg: 'bg-orange-500/10 text-orange-500'
    },
    {
      title: 'Tỷ lệ hủy',
      value: '4.5%',
      change: '-2%',
      isPositive: false,
      icon: 'cancel',
      iconBg: 'bg-red-500/10 text-red-500'
    }
  ];

  const areaPerformance = [
    { name: 'Quận 1, TP.HCM', value: 450, percentage: 85 },
    { name: 'Quận 3, TP.HCM', value: 210, percentage: 45 },
    { name: 'Quận Bình Thạnh', value: 185, percentage: 35 }
  ];

  const topDrivers = [
    {
      id: '1',
      name: 'Nguyễn Văn A',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvOtqxxWdDHZumYRXf4Xbrmb5LD8VYI-3rkWBQ7Cw7eGIhpww9O3mOzTtEaf0BWxcHSbaJ16D2Z2yOZJcQoy7c0oSTYUn2Plm4DyH5xk0WnWmR8jMs2pctPN3c6CdzHPcXqtvsN7njocvQ3ojyT2lz0RW_4lxmSiu08gpyPiH6qvIx0KVnl1XDoUvheM2oLk0eOGhdIQa1Sc-ZHyr9YUaVRxj8nfyLnE3Xj20dPl85BC5quCuFbTVdu65UZN_A3aUUp5qTlxsbtXM',
      rating: 4.9,
      trips: 142,
      rank: 1
    },
    {
      id: '2',
      name: 'Lê Thị B',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpzvYtt8JldiiwZDMsurrwYmo07g3JxKcvySbaIYDWS-ppgdjl9IQQQnqRhzh4Mt8RQ684KudkPxHsuhFv_gMI0n3LJ7WpMp87wgqCRFra0NQhNpnu9JzXOsi8c3oZ2gZEAAx-I5tSJq3rrcN3CngFpZmcyjB9Fma7RSxuW8_3i_JlEDQ1YlxdVZYmfKL1yaejUdqTnhptVTbEDHjnX3Z-wDh3Svy2_Fp5VMDkxUnc7qnYqYBD9bqtSTEw3vkUoE00k0A6smeQORo',
      rating: 4.8,
      trips: 138,
      rank: 2
    },
    {
      id: '3',
      name: 'Trần Văn C',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxIbikNNk_Q_DtAMVB8WDr_UR8_8opanL9SQfqIiW6D2NDLbW8ylN0MTgW0xhViYlVAATJRIB6NIk4nyMh9KQc7H4G8FNBp7S253wbitUfGr3xvPrZQ0yX4hZua5JcILfKQnVdYOYgJzqbf15a7ovEvOYRLipYc8mzXulnyKkesQUoNswSb0LQ5vj_PU8hQnF2UGSfsmTkC6nGmRC6_qvq33O5GaWBjgXAakWQR4Ff2nnfokhnLmufxDAt5XT_mkLQMg1ldxXpcMw',
      rating: 4.8,
      trips: 125,
      rank: 3
    }
  ];

  const peakHoursData = [30, 50, 40, 75, 95, 85, 60, 45];

  return (
    <Layout>
      <div className="p-6">
        {/* Filters */}
        <div className="flex gap-3 mb-6">
        <div className="flex gap-3 mb-6">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 transition-all ${
                  activeFilter === filter.id
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'bg-white dark:bg-[#283039] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                }`}
              >
                <p className={`text-sm ${activeFilter === filter.id ? 'font-bold' : 'font-medium'}`}>
                  {filter.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {kpiCards.map((card, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-[#1E252B] shadow-sm border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <div className={`flex items-center justify-center size-10 rounded-full ${card.iconBg}`}>
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold leading-normal flex items-center gap-1 ${
                      card.isPositive ? 'text-[#0bda5b] bg-[#0bda5b]/10' : 'text-red-500 bg-red-500/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {card.isPositive ? 'trending_up' : 'trending_down'}
                    </span>
                    {card.change}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-slate-500 dark:text-[#9dabb9] text-xs font-medium uppercase tracking-wider">
                    {card.title}
                  </p>
                  <p className="text-slate-900 dark:text-white tracking-tight text-2xl font-bold leading-tight mt-1">
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
        </div>

        {/* Revenue Chart */}
        <div className="rounded-xl bg-white dark:bg-[#1E252B] p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-900 dark:text-white text-base font-bold leading-normal">Xu hướng doanh thu</p>
                <p className="text-slate-500 dark:text-[#9dabb9] text-xs font-normal">Cập nhật 5 phút trước</p>
              </div>
              <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-[20px]">more_horiz</span>
              </button>
            </div>
            <div className="relative h-[180px] w-full mt-2">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
                {/* Grid Lines */}
                <line className="text-slate-100 dark:text-slate-700" stroke="currentColor" strokeDasharray="2" strokeWidth="0.5" x1="0" x2="100" y1="0" y2="0" />
                <line className="text-slate-100 dark:text-slate-700" stroke="currentColor" strokeDasharray="2" strokeWidth="0.5" x1="0" x2="100" y1="12.5" y2="12.5" />
                <line className="text-slate-100 dark:text-slate-700" stroke="currentColor" strokeDasharray="2" strokeWidth="0.5" x1="0" x2="100" y1="25" y2="25" />
                <line className="text-slate-100 dark:text-slate-700" stroke="currentColor" strokeDasharray="2" strokeWidth="0.5" x1="0" x2="100" y1="37.5" y2="37.5" />
                <line className="text-slate-100 dark:text-slate-700" stroke="currentColor" strokeDasharray="2" strokeWidth="0.5" x1="0" x2="100" y1="50" y2="50" />
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#137fec" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#137fec" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area Path */}
                <path d="M0,45 C10,40 15,42 25,30 C35,18 45,25 55,20 C65,15 75,5 85,12 C95,19 100,10 100,10 L100,50 L0,50 Z" fill="url(#chartGradient)" />
                {/* Line Path */}
                <path d="M0,45 C10,40 15,42 25,30 C35,18 45,25 55,20 C65,15 75,5 85,12 C95,19 100,10 100,10" fill="none" stroke="#137fec" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                {/* Data Point */}
                <circle cx="55" cy="20" fill="#137fec" r="1.5" stroke="white" strokeWidth="0.5" />
                {/* Tooltip */}
                <g transform="translate(50, 8)">
                  <rect fill="#137fec" height="8" rx="2" width="18" x="-8" y="-6" />
                  <text fill="white" fontSize="3" fontWeight="bold" textAnchor="middle" x="1" y="-1">5.2M</text>
                  <path d="M1,2 L4,-1 L-2,-1 Z" fill="#137fec" transform="translate(0, 3)" />
                </g>
              </svg>
            </div>
            <div className="flex justify-between mt-4 px-1">
              <p className="text-slate-400 text-xs font-medium">0H</p>
              <p className="text-slate-400 text-xs font-medium">4H</p>
              <p className="text-slate-400 text-xs font-medium">8H</p>
              <p className="text-slate-400 text-xs font-medium">12H</p>
              <p className="text-slate-400 text-xs font-medium">16H</p>
              <p className="text-slate-400 text-xs font-medium">20H</p>
              <p className="text-slate-400 text-xs font-medium">24H</p>
            </div>
          </div>

        {/* Peak Hours */}
        <div className="mb-6">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-3">Thời gian cao điểm</h3>
          <div className="bg-white dark:bg-[#1E252B] rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-end gap-2 h-32 justify-between">
              {peakHoursData.map((height, index) => (
                <div
                  key={index}
                  className={`w-1/12 rounded-t-md relative group cursor-pointer ${
                    index === 4 ? 'bg-primary' : `bg-primary/${20 + height / 2}`
                  }`}
                  style={{ height: `${height}%` }}
                >
                  {index === 4 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded shadow-lg whitespace-nowrap z-10">
                      Đỉnh điểm
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span>6:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
          </div>
        </div>

        {/* Performance by Area */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold">Hiệu suất theo khu vực</h3>
            <a className="text-primary text-sm font-semibold" href="#">Xem bản đồ</a>
          </div>
          <div className="flex flex-col gap-3">
            {areaPerformance.map((area, index) => (
              <div
                key={index}
                className="flex items-center gap-4 bg-white dark:bg-[#1E252B] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                  <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">location_on</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-slate-900 dark:text-white text-base font-bold truncate">{area.name}</p>
                    <p className="text-slate-900 dark:text-white text-base font-bold">{area.value}</p>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        index === 0 ? 'bg-primary' : index === 1 ? 'bg-primary/70' : 'bg-primary/50'
                      }`}
                      style={{ width: `${area.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{area.percentage}% tổng số cuốc hôm nay</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Drivers */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold">Tài xế xuất sắc</h3>
            <a className="text-primary text-sm font-semibold" href="#">Xem tất cả</a>
          </div>
          <div className="flex flex-col">
            {topDrivers.map((driver) => (
              <div
                key={driver.id}
                className="flex items-center gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <div className="bg-slate-200 dark:bg-slate-700 size-12 rounded-full shrink-0 overflow-hidden relative">
                  <img
                    src={driver.avatar}
                    alt={`Portrait of top performing driver ${driver.name}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-white text-base font-bold leading-normal truncate">
                    {driver.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center text-yellow-500 gap-0.5">
                      <span
                        className="material-symbols-outlined text-[16px] fill-current"
                        style={{ fontVariationSettings: '"FILL" 1' }}
                      >
                        star
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{driver.rating}</span>
                    </div>
                    <span className="text-slate-400 text-xs">•</span>
                    <p className="text-slate-500 dark:text-[#9dabb9] text-xs font-medium">{driver.trips} chuyến</p>
                  </div>
                </div>
                {driver.rank === 1 ? (
                  <div className="flex items-center justify-center size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-primary">
                    <span className="material-symbols-outlined text-[20px]">emoji_events</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                    <span className="text-sm font-bold">#{driver.rank}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-8 right-8 z-50">
          <button className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-primary/40 transition-all active:scale-95">
            <span className="material-symbols-outlined">download</span>
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default ReportsAnalytics;
