import React, { useEffect, useState } from 'react';
import { INotification, useNotification } from '../context/NotificationContext';

const NotificationToast: React.FC = () => {
  const { notifications, removeNotification, markAsRead } = useNotification();
  const [displayedNotifications, setDisplayedNotifications] = useState<INotification[]>([]);

  useEffect(() => {
    // Keep only the last 3 notifications displayed
    setDisplayedNotifications(notifications.slice(0, 3));
  }, [notifications]);

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

  const getColor = (type: string, priority: string) => {
    if (priority === 'critical') return 'bg-red-500 dark:bg-red-600';
    if (priority === 'high') return 'bg-orange-500 dark:bg-orange-600';
    
    switch (type) {
      case 'driver_registered':
      case 'customer_registered':
        return 'bg-green-500 dark:bg-green-600';
      case 'ride_created':
        return 'bg-blue-500 dark:bg-blue-600';
      case 'dispute_created':
        return 'bg-red-500 dark:bg-red-600';
      case 'payment_received':
        return 'bg-emerald-500 dark:bg-emerald-600';
      case 'ride_completed':
        return 'bg-green-500 dark:bg-green-600';
      case 'driver_blocked':
        return 'bg-red-500 dark:bg-red-600';
      case 'maintenance_alert':
        return 'bg-yellow-500 dark:bg-yellow-600';
      default:
        return 'bg-blue-500 dark:bg-blue-600';
    }
  };

  const getTitle = (type: string) => {
    const titles: { [key: string]: string } = {
      driver_registered: 'Tài xế mới đăng ký',
      customer_registered: 'Khách hàng mới',
      ride_created: 'Chuyến đi mới',
      dispute_created: 'Tranh chấp mới',
      payment_received: 'Thanh toán nhận được',
      ride_completed: 'Chuyến đi hoàn thành',
      driver_blocked: 'Tài xế bị khóa',
      maintenance_alert: 'Cảnh báo bảo trì',
      other: 'Thông báo',
    };
    return titles[type] || 'Thông báo';
  };

  return (
    <div className="fixed top-20 right-6 z-50 space-y-3 max-w-md">
      {displayedNotifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
          onMouseEnter={() => markAsRead(notification.id)}
          icon={getIcon(notification.type)}
          bgColor={getColor(notification.type, notification.priority)}
          title={getTitle(notification.type)}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  notification: INotification;
  onClose: () => void;
  onMouseEnter: () => void;
  icon: string;
  bgColor: string;
  title: string;
}

const ToastItem: React.FC<ToastItemProps> = ({
  notification,
  onClose,
  onMouseEnter,
  icon,
  bgColor,
  title,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          onClose();
          return 100;
        }
        return prev - (100 / 50); // 10 seconds = 10000ms, update every 200ms
      });
    }, 200);

    return () => clearInterval(interval);
  }, [onClose]);

  return (
    <div
      onMouseEnter={onMouseEnter}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-slide-in"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`${bgColor} p-3 rounded-lg flex-shrink-0`}>
          <span className="material-symbols-outlined text-white text-[20px]">{icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
            {title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            {new Date(notification.timestamp).toLocaleTimeString('vi-VN')}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-100 dark:bg-slate-700">
        <div
          className={`h-full ${bgColor} transition-all duration-200`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default NotificationToast;
