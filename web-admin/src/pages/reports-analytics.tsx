import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';

interface KPIData {
  totalRevenue: number;
  completedRides: number;
  cancelRate: number;
  activeDrivers: number;
}

interface DriverStats {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  trips: number;
  earnings: number;
  rank: number;
}

interface PeakHour {
  hour: number;
  rides: number;
  revenue: number;
}

const ReportsAnalytics: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('week');
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData>({
    totalRevenue: 0,
    completedRides: 0,
    cancelRate: 0,
    activeDrivers: 0,
  });
  const [topDrivers, setTopDrivers] = useState<DriverStats[]>([]);
  const [revenueByType, setRevenueByType] = useState<any[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);

  const filters = [
    { id: 'today', label: 'Hôm nay' },
    { id: 'week', label: 'Tuần này' },
    { id: 'month', label: 'Tháng này' },
    { id: 'custom', label: 'Tùy chỉnh' }
  ];

  useEffect(() => {
    fetchAnalyticsData();
  }, [activeFilter]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      console.log('[Analytics] Fetching data for filter:', activeFilter);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      if (activeFilter === 'today') {
        // No change, same day
      } else if (activeFilter === 'week') {
        startDate.setDate(startDate.getDate() - 6);
      } else if (activeFilter === 'month') {
        startDate.setDate(startDate.getDate() - 29);
      }

      // Fetch revenue stats
      const revenueStats = await apiService.getRevenueStats(
        startDate.toISOString(),
        endDate.toISOString()
      );
      console.log('[Analytics] Revenue stats:', revenueStats);
      
      if (revenueStats) {
        setKpiData(prev => ({
          ...prev,
          totalRevenue: revenueStats.totalRevenue || 0,
          completedRides: revenueStats.totalRides || 0,
        }));
      } else {
        console.warn('[Analytics] No revenue stats, using defaults');
        // Fallback to mock data
        setKpiData(prev => ({
          ...prev,
          totalRevenue: 150000000,
          completedRides: 1240,
        }));
      }

      // Fetch revenue by type
      const typeData = await apiService.getRevenueByType(
        startDate.toISOString(),
        endDate.toISOString()
      );
      console.log('[Analytics] Revenue by type:', typeData);
      if (Array.isArray(typeData) && typeData.length > 0) {
        setRevenueByType(typeData);
      }

      // Fetch peak hours
      const peakHoursData = await apiService.getPeakHours(
        startDate.toISOString(),
        endDate.toISOString()
      );
      console.log('[Analytics] Peak hours:', peakHoursData);
      if (Array.isArray(peakHoursData) && peakHoursData.length > 0) {
        setPeakHours(peakHoursData);
      }

      // Fetch daily revenue - get full range for chart
      const days = activeFilter === 'today' ? 1 : activeFilter === 'week' ? 7 : 30;
      const dailyRevData = await apiService.getDailyRevenue(days);
      console.log('[Analytics] Daily revenue data points:', dailyRevData?.length, dailyRevData);
      if (Array.isArray(dailyRevData) && dailyRevData.length > 0) {
        setDailyRevenue(dailyRevData);
      } else {
        // Fallback with mock data
        const mockDaily = [];
        for (let i = 0; i < days; i++) {
          const d = new Date();
          d.setDate(d.getDate() - (days - 1 - i));
          mockDaily.push({
            date: d.toISOString().split('T')[0],
            revenue: Math.random() * 50000000 + 30000000,
            rides: Math.floor(Math.random() * 100) + 50
          });
        }
        setDailyRevenue(mockDaily);
      }

      // Fetch top drivers
      const driversData = await apiService.getTopDrivers(10);
      console.log('[Analytics] Top drivers:', driversData);
      if (Array.isArray(driversData) && driversData.length > 0) {
        const formattedDrivers: DriverStats[] = driversData.map((d: any) => ({
          id: d.driverId,
          name: d.name,
          avatar: d.avatar,
          rating: d.rating,
          trips: d.trips,
          earnings: d.earnings,
          rank: d.rank,
        }));
        setTopDrivers(formattedDrivers);
      }

    } catch (error) {
      console.error('[Analytics] Error fetching data:', error);
      // Use fallback mock data on error
      setKpiData({
        totalRevenue: 150000000,
        completedRides: 1240,
        cancelRate: 4.5,
        activeDrivers: 245,
      });
      setTopDrivers([
        {
          id: '1',
          name: 'Nguyễn Văn A',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nguyen-van-a',
          rating: 4.9,
          trips: 142,
          earnings: 25000000,
          rank: 1
        },
        {
          id: '2',
          name: 'Lê Thị B',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=le-thi-b',
          rating: 4.8,
          trips: 138,
          earnings: 23000000,
          rank: 2
        },
        {
          id: '3',
          name: 'Trần Văn C',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tran-van-c',
          rating: 4.8,
          trips: 125,
          earnings: 21000000,
          rank: 3
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      title: 'Tổng doanh thu',
      value: `${(kpiData.totalRevenue / 1000000).toFixed(1)}M₫`,
      change: '+5%',
      isPositive: true,
      icon: 'payments',
      iconBg: 'bg-primary/10 text-primary'
    },
    {
      title: 'Cuốc xe hoàn thành',
      value: kpiData.completedRides.toLocaleString(),
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

  // Generate peak hours data for chart
  const chartPeakHours = peakHours.length > 0 
    ? peakHours.map(p => Math.round((p.rides / Math.max(...peakHours.map(x => x.rides))) * 100))
    : [30, 50, 40, 75, 95, 85, 60, 45];

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
            <div className="relative h-[300px] w-full mt-2">
              {dailyRevenue.length > 0 ? (
                <div className="flex gap-2 h-full">
                  {/* Y-axis labels */}
                  <div className="flex flex-col justify-between text-right pr-2 pt-2 pb-6 text-xs text-slate-500 dark:text-slate-400 w-12 flex-shrink-0">
                    <span>Max</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>Min</span>
                  </div>
                  
                  {/* Chart */}
                  <svg className="flex-1 h-full" preserveAspectRatio="none" viewBox="0 0 600 200">
                    {/* Grid Lines */}
                    <line className="text-slate-100 dark:text-slate-700" stroke="currentColor" strokeDasharray="2" strokeWidth="0.4" x1="0" x2="600" y1="40" y2="40" />
                    <line className="text-slate-100 dark:text-slate-700" stroke="currentColor" strokeDasharray="2" strokeWidth="0.4" x1="0" x2="600" y1="80" y2="80" />
                    <line className="text-slate-100 dark:text-slate-700" stroke="currentColor" strokeDasharray="2" strokeWidth="0.4" x1="0" x2="600" y1="120" y2="120" />
                    <line className="text-slate-100 dark:text-slate-700" stroke="currentColor" strokeDasharray="2" strokeWidth="0.4" x1="0" x2="600" y1="160" y2="160" />
                    {/* Gradient Definition */}
                    <defs>
                      <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#137fec" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#137fec" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      if (dailyRevenue.length === 0) return null;
                      
                      // Parse revenue values properly - handle both string and number
                      const revenues = dailyRevenue.map(d => {
                        let rev = d.revenue;
                        if (typeof rev === 'string') {
                          rev = parseInt(rev.replace(/\./g, '').replace(/,/g, ''));
                        }
                        console.log('[Chart] Parsed revenue:', d.revenue, '→', rev);
                        return Math.max(rev || 0, 0);
                      });
                      
                      const maxRevenue = Math.max(...revenues, 1);
                      const minRevenue = Math.min(...revenues);
                      const range = Math.max(maxRevenue - minRevenue, 1);
                      
                      console.log('[Chart] Max:', maxRevenue, 'Min:', minRevenue, 'Range:', range);
                      
                      const chartWidth = 570;
                      const startX = 15;
                      const chartHeight = 140;
                      const baseY = 160;
                      
                      const points = revenues.map((rev, i) => {
                        const x = startX + (i / Math.max(dailyRevenue.length - 1, 1)) * chartWidth;
                        const normalized = (rev - minRevenue) / range;
                        const y = baseY - (normalized * chartHeight);
                        return [x, y, rev];
                      });
                      
                      if (points.length < 2) {
                        return (
                          <>
                            <circle cx={points[0][0]} cy={points[0][1]} fill="#137fec" r="3" stroke="white" strokeWidth="0.6" />
                            <text x={points[0][0]} y={points[0][1] - 8} fill="#137fec" fontSize="3" fontWeight="bold" textAnchor="middle" className="font-bold">
                              {(points[0][2] / 1_000_000).toFixed(0)}M
                            </text>
                          </>
                        );
                      }
                      
                      // Create smooth path
                      let pathData = `M${points[0][0]},${points[0][1]}`;
                      for (let i = 1; i < points.length; i++) {
                        const prev = points[i - 1];
                        const curr = points[i];
                        const next = i < points.length - 1 ? points[i + 1] : curr;
                        
                        const cp1x = prev[0] + (curr[0] - prev[0]) / 3;
                        const cp1y = prev[1] + (curr[1] - prev[1]) / 3;
                        const cp2x = curr[0] - (next[0] - curr[0]) / 3;
                        const cp2y = curr[1] - (next[1] - curr[1]) / 3;
                        
                        pathData += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${curr[0]},${curr[1]}`;
                      }
                      
                      const areaPath = `${pathData} L${points[points.length - 1][0]},172 L${startX},172 Z`;
                      
                      // Format number as K or M
                      const formatCurrency = (num: number) => {
                        if (num >= 1_000_000) {
                          return (num / 1_000_000).toFixed(1) + 'M';
                        } else if (num >= 1_000) {
                          return (num / 1_000).toFixed(0) + 'K';
                        }
                        return num.toFixed(0);
                      };
                      
                      return (
                        <>
                          <path d={areaPath} fill="url(#chartGradient)" />
                          <path d={pathData} fill="none" stroke="#137fec" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          {/* Data Points with value labels */}
                          {points.map((p, i) => (
                            <g key={i}>
                              <circle cx={p[0]} cy={p[1]} fill="#137fec" r="2.5" stroke="white" strokeWidth="0.4" />
                              <text x={p[0]} y={p[1] - 8} fill="#137fec" fontSize="2.5" fontWeight="bold" textAnchor="middle">
                                {formatCurrency(p[2])}
                              </text>
                            </g>
                          ))}
                          {/* Tooltip on last point */}
                          {points.length > 0 && (
                            <g transform={`translate(${points[points.length - 1][0]}, ${points[points.length - 1][1] - 14})`}>
                              <rect fill="#137fec" height="8" rx="1.5" width="28" x="-14" y="-4" />
                              <text fill="white" fontSize="3.2" fontWeight="bold" textAnchor="middle" x="0" y="1">
                                {formatCurrency(points[points.length - 1][2])}
                              </text>
                            </g>
                          )}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Chưa có dữ liệu
                </div>
              )}
            </div>
            <div className="flex justify-between mt-4 px-1">
              {dailyRevenue.length > 0 ? (
                <>
                  {dailyRevenue.map((day, idx) => {
                    // Show labels at intervals to avoid crowding
                    const interval = Math.ceil(dailyRevenue.length / 4);
                    if (idx % interval === 0 || idx === dailyRevenue.length - 1) {
                      return (
                        <p key={idx} className="text-slate-400 text-xs font-medium">
                          {new Date(day.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </p>
                      );
                    }
                    return <p key={idx}></p>;
                  })}
                </>
              ) : (
                <>
                  <p className="text-slate-400 text-xs font-medium">0H</p>
                  <p className="text-slate-400 text-xs font-medium">4H</p>
                  <p className="text-slate-400 text-xs font-medium">8H</p>
                  <p className="text-slate-400 text-xs font-medium">12H</p>
                  <p className="text-slate-400 text-xs font-medium">16H</p>
                  <p className="text-slate-400 text-xs font-medium">20H</p>
                  <p className="text-slate-400 text-xs font-medium">24H</p>
                </>
              )}
            </div>
          </div>

        {/* Peak Hours */}
        <div className="mb-6">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-3">Thời gian cao điểm</h3>
          <div className="bg-white dark:bg-[#1E252B] rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-end gap-2 h-32 justify-between">
              {chartPeakHours.map((height, index) => (
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
              <span>0h</span>
              <span>6h</span>
              <span>12h</span>
              <span>18h</span>
              <span>24h</span>
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
            {topDrivers && topDrivers.length > 0 ? topDrivers.map((driver) => (
              <div
                key={driver.id}
                className="flex items-center gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <div className="bg-slate-200 dark:bg-slate-700 size-12 rounded-full shrink-0 overflow-hidden relative">
                  <img
                    src={driver.avatar || 'https://via.placeholder.com/48'}
                    alt={`Portrait of top performing driver ${driver.name}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onerror={(e) => { e.currentTarget.src = 'https://via.placeholder.com/48'; }}
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
            )) : (
              <div className="py-4 text-center text-gray-400">Không có dữ liệu tài xế</div>
            )}
          </div>
        </div>

        {/* Floating Action Button - Export Report */}
        <div className="fixed bottom-8 right-8 z-50">
          <button 
            onClick={() => {
              // Generate CSV
              const csv = `Báo cáo phân tích,${new Date().toLocaleDateString('vi-VN')}
Tổng doanh thu,${kpiData.totalRevenue}
Cuốc xe hoàn thành,${kpiData.completedRides}
Tỷ lệ hủy,4.5%

Tài xế xuất sắc
${topDrivers.map(d => `${d.rank},${d.name},${d.rating},${d.trips} chuyến,${d.earnings}`).join('\n')}`;
              
              const link = document.createElement('a');
              link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
              link.download = `report-${new Date().toISOString().slice(0,10)}.csv`;
              link.click();
            }}
            className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-primary/40 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">download</span>
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default ReportsAnalytics;
