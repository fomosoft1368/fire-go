import React from 'react';

interface CustomerDetailModalProps {
  customer: any;
  onClose: () => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customer, onClose }) => {
  if (!customer) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'inactive':
        return 'bg-slate-500/20 text-slate-300';
      case 'blocked':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-500/20 text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-0 w-full max-w-4xl shadow-2xl relative border border-slate-700">
        <button
          className="absolute top-4 right-4 text-slate-400 hover:text-primary z-10 bg-slate-800/80 p-2 rounded-full hover:bg-primary/20 transition-all"
          onClick={onClose}
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        {/* Header Section */}
        <div className="bg-gradient-to-r from-primary/20 via-orange-400/10 to-slate-900 p-8 border-b border-slate-700">
          <div className="flex items-start gap-6">
            <img
              src={customer.avatar || `https://i.pravatar.cc/150?u=${customer._id || customer.id}`}
              alt={customer.displayName || customer.name}
              className="w-32 h-32 rounded-2xl border-4 border-primary shadow-lg object-cover"
            />
            <div className="flex-1">
              <h2 className="text-4xl font-black text-white mb-2">{customer.displayName || customer.name || 'Khách hàng'}</h2>
              <div className="flex gap-3 mb-4 flex-wrap">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(customer.displayStatus || customer.status || 'inactive')}`}>
                  <span className="material-symbols-outlined text-base">fiber_manual_record</span>
                  {customer.displayStatus === 'active' ? 'Đang hoạt động' : 
                   customer.displayStatus === 'inactive' ? 'Không hoạt động' : 
                   'Bị khóa'}
                </span>
                {customer.isBlacklisted && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm bg-red-500/20 text-red-400">
                    <span className="material-symbols-outlined text-base">block</span>
                    Danh sách đen
                  </span>
                )}
                {customer.isAccountLocked && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm bg-yellow-500/20 text-yellow-400">
                    <span className="material-symbols-outlined text-base">lock</span>
                    Tài khoản bị khóa
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Email</span>
                  <div className="font-semibold text-white">{customer.email || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Điện thoại</span>
                  <div className="font-semibold text-white">{customer.phone || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Ngày tham gia</span>
                  <div className="font-semibold text-white">{customer.joinedDate || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8">
          {/* Personal Info */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">person</span>
              Thông tin cá nhân
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-primary/50 transition-all">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">person</span>
                  Tên
                </div>
                <div className="font-bold text-white text-lg">{customer.displayName || customer.name || 'N/A'}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-primary/50 transition-all">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">mail</span>
                  Email
                </div>
                <div className="font-bold text-white text-sm break-all">{customer.email || 'N/A'}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-primary/50 transition-all">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">phone</span>
                  Điện thoại
                </div>
                <div className="font-bold text-white text-lg font-mono">{customer.phone || 'N/A'}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-primary/50 transition-all md:col-span-2">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  Địa chỉ
                </div>
                <div className="font-bold text-white">{customer.address || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">trending_up</span>
              Hoạt động & Thống kê
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-4 border border-primary/30">
                <div className="text-xs text-slate-300 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">history_edu</span>
                  Số chuyến
                </div>
                <div className="font-bold text-primary text-lg">{customer.totalTrips || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-orange-400/20 to-orange-400/5 rounded-xl p-4 border border-orange-400/30">
                <div className="text-xs text-slate-300 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">payments</span>
                  Tổng chi tiêu
                </div>
                <div className="font-bold text-orange-400 text-lg">{(customer.totalSpent || 0).toLocaleString('vi-VN')}₫</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-primary/50 transition-all">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">star</span>
                  Đánh giá
                </div>
                <div className="font-bold text-white text-lg">{(customer.averageRating || 0).toFixed(1)} ⭐</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-primary/50 transition-all">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  Hoạt động cuối
                </div>
                <div className="font-bold text-white text-sm">{customer.lastActive || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">security</span>
              Trạng thái tài khoản
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-primary/50 transition-all">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">event</span>
                  Ngày tham gia
                </div>
                <div className="font-bold text-white text-sm">{customer.joinedDate || 'N/A'}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-primary/50 transition-all">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  Lần cập nhật cuối
                </div>
                <div className="font-bold text-white text-sm">{customer.lastActive || 'N/A'}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-primary/50 transition-all">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Xác thực
                </div>
                <div className="font-bold text-white text-sm">
                  {customer.isVerified ? 'Đã xác thực ✓' : 'Chưa xác thực'}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-primary/50 transition-all">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">info</span>
                  ID
                </div>
                <div className="font-bold text-white text-sm font-mono">{customer._id || customer.id || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-8 pb-8 flex gap-3">
          <button className="flex-1 bg-gradient-to-r from-primary via-orange-400 to-orange-500 text-white font-bold py-3 rounded-xl hover:scale-105 transition-all shadow-lg">
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">edit</span>
              Chỉnh sửa
            </span>
          </button>
          <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all">
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">message</span>
              Gửi tin
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailModal;
