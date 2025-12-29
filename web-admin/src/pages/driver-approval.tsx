import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import DriverApprovalModal from '../components/DriverApprovalModal';
import { apiService } from '../services/api';
import { useNotification } from '../context/NotificationContext';

interface PendingDriver {
  _id?: string;
  id?: string;
  displayName?: string;
  bankAccountHolder?: string;
  email?: string;
  phone?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleType?: string;
  status?: string;
  registeredTime?: string;
  licenseStatus?: string;
  fullName?: string;
  vehicleColor?: string;
  bankAccount?: string;
  bankName?: string;
  driverPhoto?: string;
  vehicleDocument?: string;
  insuranceDocument?: string;
  licenseDocument?: string;
  idCardFront?: string;
  idCardBack?: string;
  userId?: string;
}

const DriverApproval: React.FC = () => {
  const [pendingDrivers, setPendingDrivers] = useState<PendingDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<PendingDriver | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const { addNotification } = useNotification();

  // Fetch pending drivers
  useEffect(() => {
    const fetchPendingDrivers = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🚀 Fetching pending drivers...');
        const allDrivers = await apiService.getDrivers();

        const pending = allDrivers.filter((driver) => driver.licenseStatus === 'pending').map((driver) => ({
          ...driver,
          displayName: driver.bankAccountHolder || 'Chưa có tên',
          registeredTime: driver.createdAt
            ? new Date(driver.createdAt).toLocaleDateString('vi-VN')
            : 'N/A',
        }));

        console.log('✅ Pending drivers:', pending.length);
        setPendingDrivers(pending);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Lỗi tải dữ liệu tài xế';
        console.error('❌ Error fetching drivers:', err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingDrivers();
  }, []);

  const handleApproveDriver = async (driverId: string, notes?: string) => {
    try {
      console.log('✅ Approving driver:', driverId);
      // Gọi API để duyệt tài xế
      await apiService.approveDriver(driverId, { notes });
      
      // Cập nhật danh sách
      setPendingDrivers(pendingDrivers.filter((d) => (d._id || d.id) !== driverId));
      setShowApprovalModal(false);
      setSelectedDriver(null);
      
      addNotification({
        id: `success-${Date.now()}`,
        type: 'other',
        title: 'Thành công',
        message: 'Duyệt tài xế thành công!',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'normal',
      });
    } catch (err) {
      console.error('❌ Error approving driver:', err);
      addNotification({
        id: `error-${Date.now()}`,
        type: 'other',
        title: 'Lỗi',
        message: 'Lỗi khi duyệt tài xế: ' + (err instanceof Error ? err.message : 'Unknown error'),
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'high',
      });
    }
  };

  const handleRejectDriver = async (driverId: string, rejectionDetails: any) => {
    try {
      console.log('❌ Rejecting driver:', driverId, rejectionDetails);
      // Gọi API để từ chối tài xế
      await apiService.rejectDriver(driverId, rejectionDetails);
      
      // Cập nhật danh sách
      setPendingDrivers(pendingDrivers.filter((d) => (d._id || d.id) !== driverId));
      setShowApprovalModal(false);
      setSelectedDriver(null);
      
      addNotification({
        id: `success-${Date.now()}`,
        type: 'other',
        title: 'Thành công',
        message: 'Từ chối tài xế thành công! Tài xế sẽ nhận được thông báo.',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'normal',
      });
    } catch (err) {
      console.error('❌ Error rejecting driver:', err);
      addNotification({
        id: `error-${Date.now()}`,
        type: 'other',
        title: 'Lỗi',
        message: 'Lỗi khi từ chối tài xế: ' + (err instanceof Error ? err.message : 'Unknown error'),
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'high',
      });
    }
  };

  const filteredDrivers = pendingDrivers.filter((driver) => {
    const matchesSearch =
      (driver.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (driver.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (driver.phone || '').includes(searchQuery);
    return matchesSearch;
  });

  const stats = [
    {
      title: 'Chờ duyệt',
      value: pendingDrivers.length.toString(),
      icon: 'schedule',
      iconBg: 'bg-yellow-500/10 text-yellow-500',
      color: 'text-yellow-500',
    },
  ];

  return (
    <Layout>
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400">
            <p className="font-medium">Lỗi: {error}</p>
          </div>
        )}

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-[#1E252B] shadow-sm border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between">
                <div className={`flex items-center justify-center size-10 rounded-full ${stat.iconBg}`}>
                  <span className="material-symbols-outlined">{stat.icon}</span>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-slate-500 dark:text-[#9dabb9] text-xs font-medium uppercase tracking-wider">
                  {stat.title}
                </p>
                <p className={`tracking-tight text-2xl font-bold leading-tight mt-1 ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-[#1E252B] rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Drivers Table */}
        <div className="bg-white dark:bg-[#1E252B] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin">
                <span className="material-symbols-outlined text-3xl text-[#FF6B00]">autorenew</span>
              </div>
              <span className="ml-3 text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</span>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">
                person_add
              </span>
              <p className="text-slate-500 dark:text-slate-400">Không có tài xế chờ duyệt</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Tài xế
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Liên hệ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Phương tiện
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Ngày đăng ký
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredDrivers.map((driver) => (
                    <tr
                      key={driver._id || driver.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://i.pravatar.cc/150?u=${driver.bankAccountHolder || driver.userId}`}
                            alt={driver.displayName}
                            className="w-[45px] h-[45px] rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {driver.displayName}
                            </p>
                            <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                              Chờ duyệt
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm min-w-0">
                          <p className="text-slate-900 dark:text-white truncate mb-1">{driver.email}</p>
                          <p className="text-slate-500 dark:text-slate-400 truncate">{driver.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm min-w-0">
                          <p className="text-slate-900 dark:text-white font-semibold">{driver.vehiclePlate}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-xs">{driver.vehicleModel}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-slate-500 dark:text-slate-400">{driver.registeredTime}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => {
                            setSelectedDriver(driver);
                            setShowApprovalModal(true);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#e56200] text-white font-medium rounded-lg transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                          Xem & Duyệt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Approval Modal */}
        {showApprovalModal && selectedDriver && (
          <DriverApprovalModal
            driver={selectedDriver}
            onClose={() => {
              setShowApprovalModal(false);
              setSelectedDriver(null);
            }}
            onApprove={handleApproveDriver}
            onReject={handleRejectDriver}
          />
        )}
      </div>
    </Layout>
  );
};

export default DriverApproval;
