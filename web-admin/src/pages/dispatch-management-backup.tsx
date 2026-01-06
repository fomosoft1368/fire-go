import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import RideMap from '../components/RideMap';
import { apiService } from '../services/api';

interface Ride {
  _id: string;
  customerId: any;
  driverId?: any;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  pickupAddress: string;
  dropoffAddress: string;
  pickupLocation?: { coordinates: [number, number] };
  dropoffLocation?: { coordinates: [number, number] };
  totalFare: number;
  distance: number;
  duration: number;
  createdAt: string;
  rating?: number;
  paymentMethod?: string;
  isPaid?: boolean;
  driver?: {
    name: string;
    phone?: string;
    rating?: number;
  };
  customer?: {
    name: string;
    phone?: string;
  };
}

interface Dispute {
  id: string;
  rideId: string;
  type: 'urgent' | 'payment' | 'standard';
  title: string;
  description?: string;
  customerName: string;
  driverName: string;
  status: 'pending' | 'resolved' | 'escalated';
  createdAt: string;
}

const DispatchManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'disputes'>('dispatch');
  const [rides, setRides] = useState<Ride[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const ridesData = await apiService.getRides();
      const mappedRides = (ridesData || []).map((ride: any) => {
        let driverName = 'Tài xế';
        if (ride.driverId && typeof ride.driverId === 'object') {
          const driver = ride.driverId;
          const userId = driver.userId || driver;
          if (userId?.firstName && userId?.lastName) {
            driverName = `${userId.firstName} ${userId.lastName}`.trim();
          } else if (userId?.firstName) {
            driverName = userId.firstName;
          }
        }

        let customerName = 'Khách hàng';
        if (ride.customerId && typeof ride.customerId === 'object') {
          const customer = ride.customerId;
          const userId = customer.userId || customer;
          if (userId?.firstName && userId?.lastName) {
            customerName = `${userId.firstName} ${userId.lastName}`.trim();
          } else if (userId?.firstName) {
            customerName = userId.firstName;
          }
        }

        return {
          ...ride,
          driver: ride.driverId && typeof ride.driverId === 'object' ? {
            name: driverName,
            phone: ride.driverId?.phone,
            rating: ride.driverId?.averageRating,
          } : undefined,
          customer: ride.customerId && typeof ride.customerId === 'object' ? {
            name: customerName,
            phone: ride.customerId?.phone,
          } : undefined,
        };
      });
      setRides(mappedRides);

      // Load disputes - for now using mock data until backend API is ready
      try {
        const disputesData = await apiService.getDisputes();
        setDisputes(disputesData && disputesData.length > 0 ? disputesData : getMockDisputes());
      } catch {
        setDisputes(getMockDisputes());
      }
    } catch (err) {
      console.error('Error loading rides:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMockDisputes = (): Dispute[] => [
    {
      id: '1',
      rideId: 'ride123',
      type: 'payment',
      title: 'Khách hàng không thanh toán đầy đủ',
      description: 'Khách hàng nói chi tiết quá ước tính ban đầu',
      customerName: 'Nguyễn Văn A',
      driverName: 'Trần Văn B',
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      rideId: 'ride124',
      type: 'urgent',
      title: 'Tài xế bỏ cuốc xe',
      description: 'Tài xế chấp nhận rồi hủy sau 5 phút',
      customerName: 'Lê Thị C',
      driverName: 'Phạm Văn D',
      status: 'escalated',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '3',
      rideId: 'ride125',
      type: 'standard',
      title: 'Khách hàng khiếu nại chất lượng xe',
      description: 'Xe bẩn, không đạt tiêu chuẩn',
      customerName: 'Hoàng Văn E',
      driverName: 'Vũ Văn F',
      status: 'resolved',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  const filteredRides = rides.filter(ride => {
    const matchStatus = filterStatus === 'all' || ride.status === filterStatus;
    const matchSearch = searchQuery === '' || 
      ride.pickupAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.dropoffAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.driver?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredDisputes = disputes.filter(dispute => {
    const matchStatus = filterStatus === 'all' || dispute.status === filterStatus;
    const matchSearch = searchQuery === '' ||
      dispute.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.driverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filteredRides.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRides = filteredRides.slice(startIndex, startIndex + pageSize);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', label: 'Chờ tài xế' },
      accepted: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Đã chấp nhận' },
      in_progress: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Đang chạy' },
      completed: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'Hoàn thành' },
      cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Đã hủy' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Điều phối & Tranh chấp</h1>
          <p className="text-slate-600 dark:text-slate-400">Quản lý cuốc xe và xử lý tranh chấp</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-4 py-3 font-semibold border-b-2 transition-all ${
              activeTab === 'dispatch'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined">local_taxi</span>
              Điều phối ({rides.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-4 py-3 font-semibold border-b-2 transition-all ${
              activeTab === 'disputes'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined">gavel</span>
              Tranh chấp ({disputes.length})
            </span>
          </button>
        </div>

        {/* Dispatch Tab */}
        {activeTab === 'dispatch' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Map */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Bản đồ điều phối</h3>
                  {selectedRide && selectedRide.pickupLocation?.coordinates && selectedRide.dropoffLocation?.coordinates ? (
                    <RideMap
                      pickupCoords={[selectedRide.pickupLocation.coordinates[0], selectedRide.pickupLocation.coordinates[1]]}
                      dropoffCoords={[selectedRide.dropoffLocation.coordinates[0], selectedRide.dropoffLocation.coordinates[1]]}
                      pickupAddress={selectedRide.pickupAddress}
                      dropoffAddress={selectedRide.dropoffAddress}
                    />
                  ) : (
                    <div className="h-96 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-center">
                      <div>
                        <p className="text-sm font-semibold mb-1">Chọn cuốc xe để xem bản đồ</p>
                        <p className="text-xs">Click vào cuốc xe trong danh sách</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Selected Ride Info */}
                {selectedRide && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Cuốc xe</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">#{selectedRide._id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Tài xế</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{selectedRide.driver?.name}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Khách hàng</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{selectedRide.customer?.name}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Khoảng cách</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{selectedRide.distance?.toFixed(1)} km</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Giá tiền</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{(selectedRide.totalFare || 0).toLocaleString('vi-VN')}đ</p>
                      </div>
                    </div>
                    {getStatusBadge(selectedRide.status)}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Rides List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="flex w-full items-center rounded-lg h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary">
                  <span className="material-symbols-outlined pl-3 text-slate-400">search</span>
                  <input
                    className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 px-3"
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex gap-2 overflow-x-auto">
                {(['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterStatus(status);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-semibold transition-all ${
                      filterStatus === status
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status === 'all' ? 'Tất cả' : status === 'pending' ? 'Chờ' : status === 'in_progress' ? 'Đang chạy' : status}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tổng cuốc xe</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{rides.length}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Đang chạy</p>
                <p className="text-2xl font-bold text-green-600">{rides.filter(r => r.status === 'in_progress').length}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Hoàn thành</p>
                <p className="text-2xl font-bold text-purple-600">{rides.filter(r => r.status === 'completed').length}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Doanh thu</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {(rides.reduce((sum, r) => sum + (r.totalFare || 0), 0) / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin">
                  <span className="material-symbols-outlined text-3xl text-primary">autorenew</span>
                </div>
                <span className="ml-3 text-slate-500 dark:text-slate-400">Đang tải...</span>
              </div>
            ) : rides.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">local_taxi</span>
                <p className="text-slate-500 dark:text-slate-400">Không có cuốc xe</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">ID</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Tuyến đường</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Tài xế</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Khách hàng</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Khoảng cách</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Giá tiền</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Trạng thái</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-900 dark:text-white">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {paginatedRides.map((ride) => (
                        <tr 
                          key={ride._id} 
                          onClick={() => setSelectedRide(ride)}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                            selectedRide?._id === ride._id ? 'bg-primary/10' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">#{ride._id.slice(-6).toUpperCase()}</p>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <div className="flex flex-col gap-1">
                              <p className="text-xs text-slate-600 dark:text-slate-400 truncate" title={ride.pickupAddress}>📍 {ride.pickupAddress}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 truncate" title={ride.dropoffAddress}>📍 {ride.dropoffAddress}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{ride.driver?.name || 'N/A'}</p>
                            {ride.driver?.rating && (
                              <p className="text-xs text-yellow-500">⭐ {ride.driver.rating.toFixed(1)}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{ride.customer?.name || 'N/A'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-900 dark:text-white">{ride.distance?.toFixed(1) || '0'} km</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{(ride.totalFare || 0).toLocaleString('vi-VN')}đ</p>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(ride.status)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedRide(ride);
                                setShowDetailModal(true);
                              }}
                              className="px-3 py-1 rounded-lg text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      ))}
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
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Trước
                    </button>

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
                          onClick={() => setCurrentPage(pageNum)}
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

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
        )}

        {/* Disputes Tab */}
        {activeTab === 'disputes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Map */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Bản đồ tranh chấp</h3>
                  {selectedDispute ? (
                    <div className="h-96 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-center">
                      <div>
                        <p className="text-sm font-semibold mb-1">Chi tiết tranh chấp</p>
                        <p className="text-xs">ID: {selectedDispute.rideId}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-96 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-center">
                      <div>
                        <p className="text-sm font-semibold mb-1">Chọn tranh chấp để xem chi tiết</p>
                        <p className="text-xs">Click vào tranh chấp trong danh sách</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Selected Dispute Info */}
                {selectedDispute && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Tranh chấp</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">#{selectedDispute.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Loại</p>
                        <p className="font-semibold text-slate-900 dark:text-white capitalize">{selectedDispute.type}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Trạng thái</p>
                        <p className="font-semibold text-slate-900 dark:text-white capitalize">{selectedDispute.status}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-xs">
                      <p className="font-semibold text-slate-900 dark:text-white mb-1">{selectedDispute.title}</p>
                      {selectedDispute.description && (
                        <p className="text-slate-600 dark:text-slate-400 text-xs line-clamp-2">{selectedDispute.description}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Disputes List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex w-full items-center rounded-lg h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary">
                    <span className="material-symbols-outlined pl-3 text-slate-400">search</span>
                    <input
                      className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 px-3"
                      placeholder="Tìm kiếm..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="flex gap-2 overflow-x-auto">
                  {(['all', 'pending', 'resolved', 'escalated'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilterStatus(status === 'all' ? 'all' : (status as any));
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-semibold transition-all ${
                        (filterStatus === 'all' && status === 'all') || 
                        (filterStatus === status && status !== 'all')
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {status === 'all' ? 'Tất cả' : status === 'pending' ? 'Chờ xử lý' : status === 'resolved' ? 'Đã giải quyết' : 'Nâng cấp'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tổng tranh chấp</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{disputes.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Chờ xử lý</p>
                  <p className="text-2xl font-bold text-orange-600">{disputes.filter(d => d.status === 'pending').length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Đã giải quyết</p>
                  <p className="text-2xl font-bold text-green-600">{disputes.filter(d => d.status === 'resolved').length}</p>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin">
                    <span className="material-symbols-outlined text-3xl text-primary">autorenew</span>
                  </div>
                  <span className="ml-3 text-slate-500 dark:text-slate-400">Đang tải...</span>
                </div>
              ) : disputes.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">gavel</span>
                  <p className="text-slate-500 dark:text-slate-400">Không có tranh chấp</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">ID</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Tiêu đề</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Loại</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Tài xế</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Khách hàng</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Trạng thái</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-900 dark:text-white">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredDisputes.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((dispute) => (
                        <tr 
                          key={dispute.id}
                          onClick={() => setSelectedDispute(dispute)}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                            selectedDispute?.id === dispute.id ? 'bg-primary/10' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">#{dispute.id.slice(-6).toUpperCase()}</p>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{dispute.title}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              dispute.type === 'urgent'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : dispute.type === 'payment'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            }`}>
                              {dispute.type === 'urgent' ? 'Khẩn' : dispute.type === 'payment' ? 'Thanh toán' : 'Thường'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-900 dark:text-white">{dispute.driverName}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-900 dark:text-white">{dispute.customerName}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              dispute.status === 'pending'
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                : dispute.status === 'resolved'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {dispute.status === 'pending' ? 'Chờ' : dispute.status === 'resolved' ? 'Giải quyết' : 'Nâng cấp'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDispute(dispute);
                              }}
                              className="text-primary hover:text-primary/80 font-medium text-sm"
                            >
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {filteredDisputes.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Hiển thị {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredDisputes.length)} của {filteredDisputes.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Trước
                    </button>
                    {Array.from({ length: Math.min(5, Math.ceil(disputes.length / pageSize)) }, (_, i) => {
                      const totalPages = Math.ceil(disputes.length / pageSize);
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
                          onClick={() => setCurrentPage(pageNum)}
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
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(filteredDisputes.length / pageSize)}
                      className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedRide && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chi tiết cuốc xe</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Header Info */}
                <div className="flex justify-between items-start pb-6 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">ID Cuốc xe</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">#{selectedRide._id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Giá tiền</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{(selectedRide.totalFare || 0).toLocaleString('vi-VN')}đ</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Trạng thái</span>
                  {getStatusBadge(selectedRide.status)}
                </div>

                {/* Route */}
                <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">route</span>
                    Tuyến đường & Bản đồ
                  </h3>
                  <RideMap
                    pickupCoords={selectedRide.pickupLocation?.coordinates || [106.6309, 10.7895]}
                    dropoffCoords={selectedRide.dropoffLocation?.coordinates || [106.6654, 10.8123]}
                    pickupAddress={selectedRide.pickupAddress}
                    dropoffAddress={selectedRide.dropoffAddress}
                  />
                  <div className="space-y-2 ml-0">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Điểm đón</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedRide.pickupAddress}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Điểm trả</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedRide.dropoffAddress}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Khoảng cách</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedRide.distance?.toFixed(1) || '0'} km</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Thời gian</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedRide.duration} phút</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Driver & Customer */}
                <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                  {/* Driver */}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">local_taxi</span>
                      Tài xế
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Tên</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedRide.driver?.name || 'N/A'}</p>
                      </div>
                      {selectedRide.driver?.phone && (
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Điện thoại</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedRide.driver.phone}</p>
                        </div>
                      )}
                      {selectedRide.driver?.rating && (
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Xếp hạng</p>
                          <p className="text-sm font-semibold text-yellow-500">⭐ {selectedRide.driver.rating.toFixed(1)}/5.0</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer */}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">person</span>
                      Khách hàng
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Tên</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedRide.customer?.name || 'N/A'}</p>
                      </div>
                      {selectedRide.customer?.phone && (
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Điện thoại</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedRide.customer.phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                {(selectedRide.paymentMethod || selectedRide.rating) && (
                  <div className="space-y-2">
                    {selectedRide.paymentMethod && (
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Phương thức thanh toán</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedRide.paymentMethod}</p>
                      </div>
                    )}
                    {selectedRide.rating && (
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Đánh giá cuốc xe</p>
                        <p className="text-sm font-semibold text-yellow-500">⭐ {selectedRide.rating.toFixed(1)}/5.0</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 p-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-all"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DispatchManagement;
