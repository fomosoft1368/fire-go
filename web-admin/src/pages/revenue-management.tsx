import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';

interface DailyRevenue {
  id: string;
  date: string;
  month: string;
  day: string;
  rides: number;
  revenue: string;
}

interface RevenueStats {
  totalRevenue: number;
  totalRides: number;
  averageFare: number;
}

interface RevenueByType {
  type: string;
  revenue: number;
  rides: number;
  percentage: string | number;
}

export default function RevenueManagement() {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [loading, setLoading] = useState(true);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [dailyRevenues, setDailyRevenues] = useState<DailyRevenue[]>([]);
  const [revenueByType, setRevenueByType] = useState<RevenueByType[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchRevenueData();
  }, [timeFilter]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      console.log('[Revenue] Fetching data for filter:', timeFilter);
      
      // Calculate date range based on filter
      const endDate = new Date();
      const startDate = new Date();
      let days = 7;
      
      if (timeFilter === 'custom') {
        // Use custom date range
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          // Set start to beginning of day
          start.setHours(0, 0, 0, 0);
          // Set end to end of day
          end.setHours(23, 59, 59, 999);
          
          startDate.setTime(start.getTime());
          endDate.setTime(end.getTime());
          
          const diffTime = Math.abs(end.getTime() - start.getTime());
          days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        } else {
          // If custom dates not set, default to week
          days = 7;
          startDate.setDate(startDate.getDate() - 6);
        }
      } else if (timeFilter === 'today') {
        days = 1;
        startDate.setDate(startDate.getDate());
      } else if (timeFilter === 'week') {
        days = 7;
        startDate.setDate(startDate.getDate() - 6);
      } else if (timeFilter === 'month') {
        days = 30;
        startDate.setDate(startDate.getDate() - 29);
      }

      // Fetch actual revenue stats from all sources (rides + combined trips + deliveries)
      const statsResponse = await apiService.getActualRevenueStats(
        startDate.toISOString(),
        endDate.toISOString()
      );
      console.log('[Revenue] Actual stats response:', statsResponse);
      if (statsResponse) {
        setRevenueStats(statsResponse);
      }

      // Fetch actual daily revenue from all sources
      const dailyResponse = await apiService.getActualDailyRevenue(days);
      console.log('[Revenue] Actual daily response:', dailyResponse);
      if (Array.isArray(dailyResponse) && dailyResponse.length > 0) {
        const formattedDaily: DailyRevenue[] = dailyResponse.map((item, idx) => {
          const revenueNum = typeof item.revenue === 'string' ? parseInt(item.revenue) : item.revenue;
          return {
            id: idx.toString(),
            date: item.date || '',
            month: item.month || 'T12',
            day: item.day?.toString() || '',
            rides: item.rides || 0,
            revenue: revenueNum.toLocaleString('vi-VN'),
          };
        });
        console.log('[Revenue] Formatted daily:', formattedDaily);
        setDailyRevenues(formattedDaily);
      }

      // Fetch actual revenue by type from all sources
      const typeResponse = await apiService.getActualRevenueByType(
        startDate.toISOString(),
        endDate.toISOString()
      );
      console.log('[Revenue] Actual type response:', typeResponse);
      if (Array.isArray(typeResponse) && typeResponse.length > 0) {
        setRevenueByType(typeResponse);
      }
    } catch (error) {
      console.error('[Revenue] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total revenue from stats
  const totalRevenue = revenueStats?.totalRevenue || 0;
  const previousRevenue = totalRevenue * 0.95; // Assume 5% growth
  const growthPercentage = totalRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1) : '0';

  // Generate chart data from daily revenues
  const generateChartPath = () => {
    const width = 375;
    const height = 150;
    const padding = 20;
    
    // Get the number of days based on filter
    let daysToShow = 7;
    if (timeFilter === 'today') daysToShow = 1;
    else if (timeFilter === 'week') daysToShow = 7;
    else if (timeFilter === 'month') daysToShow = 30;
    
    // Fill missing days with 0 revenue to ensure we have enough data points
    const today = new Date();
    const filledData: DailyRevenue[] = [];
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Find matching data from API
      const existingData = dailyRevenues.find(d => {
        const dataDate = new Date(d.date);
        return dataDate.getDate() === date.getDate() && 
               dataDate.getMonth() === date.getMonth();
      });
      
      if (existingData) {
        filledData.push(existingData);
      } else {
        // Fill with empty data
        filledData.push({
          id: `empty-${i}`,
          date: date.toISOString(),
          month: `T${date.getMonth() + 1}`,
          day: date.getDate().toString(),
          rides: 0,
          revenue: '0',
        });
      }
    }
    
    console.log('[Chart] Filled data:', filledData);
    
    // Get last 7 days of filled data for chart
    const recentData = filledData.slice(-7);
    console.log('[Chart] Recent data for chart:', recentData);
    
    if (!recentData || recentData.length === 0) {
      console.log('[Chart] No data available, using default path');
      return 'M20 110 L355 110';
    }
    
    // Parse revenue values safely
    const revenueValues = recentData.map(r => {
      const revStr = typeof r.revenue === 'string' ? r.revenue.replace(/\./g, '').replace(/,/g, '') : String(r.revenue);
      return parseInt(revStr) || 0;
    });
    
    console.log('[Chart] Parsed revenue values:', revenueValues);
    
    // Calculate max revenue, use actual max or a reasonable minimum
    const maxRevenue = Math.max(...revenueValues);
    const minRevenue = Math.min(...revenueValues);
    
    console.log('[Chart] Min:', minRevenue, 'Max:', maxRevenue);
    
    // If all values are 0, draw flat line at bottom
    if (maxRevenue === 0) {
      console.log('[Chart] All values are zero, drawing flat line at bottom');
      return 'M20 130 L355 130';
    }
    
    // Add 10% padding to max for better visualization
    // If min = max (flat line), add artificial range for positioning
    const displayMax = maxRevenue * 1.2; // 20% above for padding
    const displayMin = 0; // Always start from 0 for better visual
    const range = displayMax - displayMin;
    
    // Generate points with correct x-coordinate spacing
    const points = recentData.map((item, idx) => {
      const revenue = revenueValues[idx] || 0;
      const x = (idx / Math.max(recentData.length - 1, 1)) * (width - padding * 2) + padding;
      // Normalize to range for better visualization
      const normalizedValue = range > 0 ? (revenue - displayMin) / range : 0.5;
      const y = height - (normalizedValue * (height - padding * 2)) - padding;
      return { x, y: Math.max(padding, Math.min(height - padding, y)) };
    });

    console.log('[Chart] Generated points:', points);

    if (points.length < 2) {
      return `M${points[0].x} ${points[0].y} L${width - padding} ${points[0].y}`;
    }

    // Generate smooth curve using cubic Bezier
    let path = `M${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
      const cp1y = points[i - 1].y;
      const cp2x = points[i].x - (points[i].x - points[i - 1].x) / 3;
      const cp2y = points[i].y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`;
    }

    console.log('[Chart] Final path:', path);
    return path;
  };

  const generateFillPath = () => {
    const linePath = generateChartPath();
    return linePath + ' V 150 H 0 Z';
  };

  // Get chart labels (last 7 days with filled data)
  const getChartLabels = () => {
    const today = new Date();
    const labels = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      labels.push({
        month: `T${date.getMonth() + 1}`,
        day: date.getDate().toString(),
      });
    }
    
    return labels;
  };

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
          <button 
            className={`flex h-10 shrink-0 items-center justify-center px-4 rounded-lg transition-all ${
              timeFilter === 'custom'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'border border-slate-300 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setShowDatePicker(!showDatePicker);
            }}
          >
            <span className="material-symbols-outlined text-xl">calendar_month</span>
          </button>
        </div>

        {/* Date Picker Modal - Fixed position to avoid overflow issues */}
        {showDatePicker && (
          <div 
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
            onClick={() => setShowDatePicker(false)}
          >
            <div 
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-4 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Chọn khoảng thời gian</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Từ ngày</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    max={customEndDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Đến ngày</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowDatePicker(false);
                      setTimeFilter('week');
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      if (customStartDate && customEndDate) {
                        setTimeFilter('custom');
                        setShowDatePicker(false);
                      }
                    }}
                    disabled={!customStartDate || !customEndDate}
                    className="flex-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Display selected date range */}
        {timeFilter === 'custom' && customStartDate && customEndDate && (
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="material-symbols-outlined text-base">date_range</span>
            <span>
              Từ <span className="font-bold text-slate-900 dark:text-white">{new Date(customStartDate).toLocaleDateString('vi-VN')}</span> đến <span className="font-bold text-slate-900 dark:text-white">{new Date(customEndDate).toLocaleDateString('vi-VN')}</span>
            </span>
          </div>
        )}

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
                {loading ? '...' : totalRevenue.toLocaleString('vi-VN')} <span className="text-xl text-slate-400 font-bold">₫</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-2 z-10">
              <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded text-green-500">
                <span className="material-symbols-outlined text-base">trending_up</span>
                <p className="text-sm font-bold">+{growthPercentage}%</p>
              </div>
              <p className="text-slate-500 text-sm">so với thời kỳ trước</p>
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
                <path d={generateFillPath()} fill="url(#chartGradient)" />
                <path d={generateChartPath()} fill="none" stroke="#FF6B00" strokeLinecap="round" strokeWidth="3" />
              </svg>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 px-1">
                {getChartLabels().map((item, idx) => (
                  <span key={idx}>{item.month.replace('T', '')}/{item.day}</span>
                ))}
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
              {revenueByType.length > 0 ? (
                revenueByType.map((item, idx) => {
                  const colors = ['bg-primary', 'bg-purple-500', 'bg-blue-500', 'bg-emerald-500'];
                  const typeNames: Record<string, string> = {
                    hire: 'Lái xe hộ',
                    share: 'Ghép xe',
                    delivery: 'Giao hàng',
                    hourly: 'Dọn dẹp',
                  };
                  const percentage = typeof item.percentage === 'string' ? parseFloat(item.percentage) : item.percentage;
                  return (
                    <div key={item.type || idx} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`}></span>
                          {typeNames[item.type] || item.type}
                        </span>
                        <span className="text-slate-900 dark:text-white font-bold">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500`} 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500">Không có dữ liệu</div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-card-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-1">
                <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Chi trả tài xế</p>
              <p className="text-slate-900 dark:text-white text-xl font-bold">
                {loading ? '...' : totalRevenue > 0 ? `${(totalRevenue * 0.68 / 1000000).toFixed(0)}M` : '0'}
              </p>
            </div>
            <div className="bg-white dark:bg-card-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-1">
                <span className="material-symbols-outlined text-xl">savings</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Tổng hoa hồng</p>
              <p className="text-slate-900 dark:text-white text-xl font-bold">
                {loading ? '...' : totalRevenue > 0 ? `${(totalRevenue * 0.2 / 1000000).toFixed(0)}M` : '0'}
              </p>
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
                      20% <span className="text-slate-500 text-xs font-normal">(Hệ thống)</span>
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
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Tổng kết {timeFilter === 'today' ? 'hôm nay' : timeFilter === 'week' ? 'tuần này' : 'tháng này'}</h3>
          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Đang tải dữ liệu...</div>
            ) : dailyRevenues.length > 0 ? (
              dailyRevenues.map((item) => (
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
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">Không có dữ liệu</div>
            )}
          </div>
          <button className="w-full mt-4 py-3 text-sm text-primary font-bold bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors">
            Xem báo cáo chi tiết
          </button>
        </div>
      </div>
    </Layout>
  );
}
