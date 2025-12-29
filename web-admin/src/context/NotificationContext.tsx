import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface INotification {
  id: string;
  type: 'driver_registered' | 'customer_registered' | 'ride_created' | 'dispute_created' | 'payment_received' | 'ride_completed' | 'driver_blocked' | 'maintenance_alert' | 'other';
  title: string;
  message: string;
  icon?: string;
  timestamp: string;
  read: boolean;
  relatedId?: string; // Driver ID, Customer ID, Ride ID, etc.
  priority: 'low' | 'normal' | 'high' | 'critical';
}

interface NotificationContextType {
  notifications: INotification[];
  unreadCount: number;
  addNotification: (notification: INotification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<INotification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: INotification) => {
    setNotifications(prev => [notification, ...prev]);
    
    // Auto-remove after 10 seconds if not critical
    if (notification.priority !== 'critical') {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 10000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        removeNotification,
        markAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
