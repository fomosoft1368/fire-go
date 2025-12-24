import React from 'react';

interface DriverDetailModalProps {
  driver: any;
  onClose: () => void;
}

const DriverDetailModal: React.FC<DriverDetailModalProps> = ({ driver, onClose }) => {
  if (!driver) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-0 w-full max-w-2xl shadow-2xl relative border border-slate-200 dark:border-slate-700">
        <button
          className="absolute top-4 right-4 text-slate-400 hover:text-red-500 z-10"
          onClick={onClose}
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>
        <div className="flex flex-col md:flex-row gap-0 md:gap-8">
          <div className="flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-white dark:from-primary/20 dark:to-slate-900 p-8 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 min-w-[220px]">
            <img
              src={`https://i.pravatar.cc/150?u=${driver.bankAccountHolder || driver.userId}`}
              alt={driver.displayName}
              className="w-28 h-28 rounded-full border-4 border-primary shadow-md object-cover mb-4"
            />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 text-center">{driver.displayName}</h2>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mb-2">{driver.statusText}</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-slate-500 dark:text-slate-400 text-sm">{driver.email || 'N/A'}</span>
              <span className="text-slate-500 dark:text-slate-400 text-sm">{driver.phone || 'N/A'}</span>
            </div>
          </div>
          <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">badge</span>
              <div>
                <div className="text-xs text-slate-400">Biển số</div>
                <div className="font-semibold text-slate-900 dark:text-white">{driver.vehiclePlate || 'N/A'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">directions_car</span>
              <div>
                <div className="text-xs text-slate-400">Phương tiện</div>
                <div className="font-semibold text-slate-900 dark:text-white">{driver.vehicleModel || 'N/A'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">history_edu</span>
              <div>
                <div className="text-xs text-slate-400">Số chuyến</div>
                <div className="font-semibold text-slate-900 dark:text-white">{driver.totalRides || 0}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">payments</span>
              <div>
                <div className="text-xs text-slate-400">Doanh thu</div>
                <div className="font-semibold text-slate-900 dark:text-white">{(driver.totalEarnings || 0).toLocaleString('vi-VN')}₫</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">star</span>
              <div>
                <div className="text-xs text-slate-400">Đánh giá</div>
                <div className="font-semibold text-slate-900 dark:text-white">{(driver.averageRating || 0).toFixed(1)} ⭐</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">event</span>
              <div>
                <div className="text-xs text-slate-400">Ngày đăng ký</div>
                <div className="font-semibold text-slate-900 dark:text-white">{driver.registeredTime}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDetailModal;
