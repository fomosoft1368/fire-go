import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiService, type Driver } from '../services/api';

export default function DriverDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'feedback'>('info');
  const [feedback, setFeedback] = useState<Record<string, { status: string; comment: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDriver = async () => {
      try {
        setLoading(true);
        if (id) {
          const data = await apiService.getDriverById(id);
          setDriver(data);
          setFeedback({
            license: { status: data.licenseStatus || 'pending', comment: '' },
            id: { status: data.idStatus || 'pending', comment: '' },
          });
        }
      } catch (err) {
        console.error('Error fetching driver:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDriver();
  }, [id]);

  const handleStatusChange = (docType: string, status: string) => {
    setFeedback(prev => ({
      ...prev,
      [docType]: { ...prev[docType], status }
    }));
  };

  const handleCommentChange = (docType: string, comment: string) => {
    setFeedback(prev => ({
      ...prev,
      [docType]: { ...prev[docType], comment }
    }));
  };

  const handleSubmitFeedback = async () => {
    try {
      setSaving(true);
      if (id) {
        await apiService.updateDriver(id, {
          licenseStatus: feedback.license.status as any,
          idStatus: feedback.id.status as any,
        });
        alert('Đã cập nhật trạng thái tài xế');
      }
    } catch (err) {
      alert('Lỗi: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'rejected': return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800';
      case 'expired': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      default: return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'approved': return 'Đã phê duyệt';
      case 'rejected': return 'Bị từ chối';
      case 'expired': return 'Hết hạn';
      default: return 'Chờ duyệt';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <div className="animate-spin"><span className="material-symbols-outlined text-4xl">autorenew</span></div>
        </div>
      </Layout>
    );
  }

  if (!driver) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <div className="text-slate-500">Không tìm thấy tài xế</div>
        </div>
      </Layout>
    );
  }

  const displayName = driver.firstName && driver.lastName ? `${driver.firstName} ${driver.lastName}` : driver.bankAccountHolder || 'Chưa có tên';
  const avatar = `https://i.pravatar.cc/150?u=${driver.email || driver.id}`;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Hero Section */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-6">
                <button
                  onClick={() => navigate('/drivers')}
                  className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition mt-1"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                  <div className="flex items-center gap-4">
                    <img src={avatar} alt={displayName} className="w-16 h-16 rounded-full border-2 border-slate-200 dark:border-slate-700" />
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{displayName}</h1>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">ID: {driver._id || driver.id}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-end gap-2 ${getStatusBadgeColor(driver.licenseStatus || 'pending')}`}>
                  <span className="material-symbols-outlined text-base">card_membership</span>
                  {getStatusText(driver.licenseStatus || 'pending')}
                </span>
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-end gap-2 ${getStatusBadgeColor(driver.idStatus || 'pending')}`}>
                  <span className="material-symbols-outlined text-base">badge</span>
                  {getStatusText(driver.idStatus || 'pending')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-8">
              {[
                { id: 'info', label: 'Hồ sơ', icon: 'person' },
                { id: 'documents', label: 'Giấy tờ', icon: 'description' },
                { id: 'feedback', label: 'Phản hồi', icon: 'edit_note' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-1 py-4 font-semibold flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-[#FF6B00] text-[#FF6B00]'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Personal & Vehicle Info */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Personal Info */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">person</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Thông tin cá nhân</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Tên</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{driver.firstName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Họ</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{driver.lastName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Email</p>
                      <p className="text-base text-slate-900 dark:text-white break-all">{driver.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Điện thoại</p>
                      <p className="text-base text-slate-900 dark:text-white">{driver.phone || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Địa chỉ</p>
                      <p className="text-base text-slate-900 dark:text-white">{driver.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Banking Info */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">account_balance</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ngân hàng</h2>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Chủ tài khoản</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">{driver.bankAccountHolder || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Số tài khoản</p>
                      <p className="text-base font-mono text-slate-900 dark:text-white">{driver.bankAccount || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Ngân hàng</p>
                      <p className="text-base text-slate-900 dark:text-white">{driver.bankName || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle & Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vehicle Info */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">directions_car</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Thông tin phương tiện</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Biển số</p>
                      <p className="text-lg font-mono font-semibold text-slate-900 dark:text-white">{driver.vehiclePlate}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Model</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{driver.vehicleModel || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Màu sắc</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{driver.vehicleColor || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">info</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Trạng thái</h2>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Tình trạng hiện tại</p>
                      <span className="inline-block px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold capitalize">{driver.status}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Đăng ký lúc</p>
                      <p className="text-base text-slate-900 dark:text-white">{driver.createdAt ? new Date(driver.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* License */}
              {driver.licenseImage && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">card_membership</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bằng lái xe</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getStatusBadgeColor(driver.licenseStatus || 'pending')}`}>
                      {getStatusText(driver.licenseStatus || 'pending')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <img src={driver.licenseImage} alt="License" className="w-full h-auto rounded-lg border border-slate-200 dark:border-slate-700 object-cover" />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Số bằng</p>
                        <p className="text-base font-mono text-slate-900 dark:text-white">{driver.licenseNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Hết hạn</p>
                        <p className="text-base text-slate-900 dark:text-white">{driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString('vi-VN') : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CCCD - 2 mặt */}
              {driver.idImage && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">badge</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">CCCD / Hộ chiếu</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getStatusBadgeColor(driver.idStatus || 'pending')}`}>
                      {getStatusText(driver.idStatus || 'pending')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Mặt trước</p>
                      <img src={driver.idImage} alt="ID Front" className="w-full h-auto rounded-lg border border-slate-200 dark:border-slate-700 object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Mặt sau</p>
                      {driver.idImage ? (
                        <img src={driver.idImage} alt="ID Back" className="w-full h-auto rounded-lg border border-slate-200 dark:border-slate-700 object-cover" />
                      ) : (
                        <div className="w-full aspect-video rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-700">
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Chưa có ảnh</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Số ID</p>
                    <p className="text-base font-mono text-slate-900 dark:text-white">{driver.idNumber || 'N/A'}</p>
                  </div>
                </div>
              )}

              {/* Vehicle Document */}
              {driver.vehicleImage && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">folder_open</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Giấy tờ phương tiện</h3>
                  </div>
                  <img src={driver.vehicleImage} alt="Vehicle" className="w-full max-w-2xl h-auto rounded-lg border border-slate-200 dark:border-slate-700" />
                </div>
              )}

              {/* Vehicle Registration */}
              {driver.vehicleRegistration && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                      <span className="material-symbols-outlined text-cyan-600 dark:text-cyan-400">document_scanner</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Giấy đăng kí xe</h3>
                  </div>
                  <img src={driver.vehicleRegistration} alt="Vehicle Registration" className="w-full max-w-2xl h-auto rounded-lg border border-slate-200 dark:border-slate-700" />
                </div>
              )}

              {/* Insurance */}
              {driver.insuranceCertificate && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                      <span className="material-symbols-outlined text-rose-600 dark:text-rose-400">verified</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bảo hiểm</h3>
                  </div>
                  <img src={driver.insuranceCertificate} alt="Insurance" className="w-full max-w-2xl h-auto rounded-lg border border-slate-200 dark:border-slate-700 mb-4" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Nhà cung cấp</p>
                    <p className="text-base text-slate-900 dark:text-white">{driver.insuranceProvider || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-6">
              {/* License Feedback */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">card_membership</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bằng lái xe</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Quyết định</label>
                    <select
                      value={feedback.license.status}
                      onChange={(e) => handleStatusChange('license', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                    >
                      <option value="pending">⏳ Chờ duyệt</option>
                      <option value="approved">✓ Phê duyệt</option>
                      <option value="rejected">✕ Từ chối</option>
                      <option value="expired">⚠️ Hết hạn</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Ghi chú cho tài xế</label>
                    <textarea
                      value={feedback.license.comment}
                      onChange={(e) => handleCommentChange('license', e.target.value)}
                      placeholder="VD: Ảnh mờ, cần chụp lại rõ ràng hơn"
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* ID Feedback */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">badge</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">CCCD / Hộ chiếu</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Quyết định</label>
                    <select
                      value={feedback.id.status}
                      onChange={(e) => handleStatusChange('id', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                    >
                      <option value="pending">⏳ Chờ duyệt</option>
                      <option value="approved">✓ Phê duyệt</option>
                      <option value="rejected">✕ Từ chối</option>
                      <option value="expired">⚠️ Hết hạn</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Ghi chú cho tài xế</label>
                    <textarea
                      value={feedback.id.comment}
                      onChange={(e) => handleCommentChange('id', e.target.value)}
                      placeholder="VD: Thông tin không rõ, cần chụp lại từng trang"
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSubmitFeedback}
                  disabled={saving}
                  className="flex-1 px-6 py-4 bg-[#FF6B00] text-white rounded-lg font-bold hover:bg-[#e56200] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">check_circle</span>
                  {saving ? 'Đang lưu...' : 'Lưu phản hồi'}
                </button>
                <button
                  onClick={() => navigate('/driver-management')}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Quay lại
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
