import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';

const NotificationDropdown: React.FC = () => {
  const { notifications, unreadCount, markAsRead, removeNotification, clearAll } = useNotification();
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      driver_registered: 'person_add',
      customer_registered: 'person_add',
      ride_created: 'directions_car',
      dispute_created: 'gavel',
      payment_received: 'payments',
      ride_completed: 'check_circle',
      driver_blocked: 'no_accounts',
      maintenance_alert: 'construction',
      other: 'notifications',
    };
    return icons[type] || 'notifications';
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      driver_registered: 'Tài xế mới',
      customer_registered: 'Khách hàng mới',
      ride_created: 'Chuyến đi mới',
      dispute_created: 'Tranh chấp',
      payment_received: 'Thanh toán',
      ride_completed: 'Hoàn thành',
      driver_blocked: 'Tài xế bị khóa',
      maintenance_alert: 'Cảnh báo',
      other: 'Thông báo',
    };
    return labels[type] || 'Thông báo';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400';
      case 'normal':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'low':
        return 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400';
      default:
        return 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
        title="Thông báo"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 max-h-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white">Thông báo ({unreadCount})</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => clearAll()}
                className="text-xs text-primary hover:underline"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {unreadCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                <p className="text-sm">Không có thông báo mới</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {notifications
                  .filter(n => !n.read) // Chỉ show unread
                  .slice(0, 10) // Limit 10 mới nhất
                  .map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-500/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        <span className={`material-symbols-outlined text-[20px] text-slate-600 dark:text-slate-300`}>
                          {getIcon(notification.type)}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                            {getTypeLabel(notification.type)}
                          </p>
                          {!notification.read && (
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          {new Date(notification.timestamp).toLocaleTimeString('vi-VN')}
                        </p>
                        {notification.priority === 'critical' && (
                          <span className={`inline-block text-xs font-bold px-2 py-1 rounded mt-2 ${getPriorityColor('critical')}`}>
                            🔴 Khẩn cấp
                          </span>
                        )}
                      </div>

                      {/* Close Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-center">
              <button className="text-xs text-primary font-bold hover:underline">
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationDropdown;
