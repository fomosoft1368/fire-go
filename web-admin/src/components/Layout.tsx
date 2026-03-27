import { ReactNode, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import NotificationDropdown from './NotificationDropdown';
import NotificationToast from './NotificationToast';
import { apiService } from '../services/api';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const location = useLocation();
  const { t } = useLanguage();
  const [darkMode, setDarkMode] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const addedNotificationIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Get user info from localStorage or API
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Parse user info from token or set default
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const decoded = JSON.parse(atob(parts[1]));
        setUserInfo({
          email: decoded.email || 'admin@firego.com',
          firstName: decoded.firstName || 'Admin',
          lastName: decoded.lastName || 'User',
          role: decoded.role || 'admin',
        });
      }
    } catch (err) {
      console.log('Could not decode token, using defaults');
      setUserInfo({
        email: 'admin@firego.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      });
    }

    // Load theme preference (prioritize settings theme, fallback to old darkMode setting)
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyThemeOnLayout(savedTheme);
    
    // For backward compatibility, also check old darkMode setting
    if (!localStorage.getItem('theme')) {
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      if (savedDarkMode) {
        setDarkMode(true);
        applyThemeOnLayout('dark');
      }
    }

    // Setup notification polling
    const pollNotifications = async () => {
      try {
        const notifications = await apiService.getUnreadNotifications();
        
        if (Array.isArray(notifications) && notifications.length > 0) {
          notifications.forEach((notif: any) => {
            // Only add if we haven't already added this notification ID
            if (!addedNotificationIds.current.has(notif._id) && !notif.read) {
              addedNotificationIds.current.add(notif._id);
              addNotification({
                id: notif._id,
                type: notif.type,
                title: notif.title,
                message: notif.message,
                timestamp: notif.createdAt,
                read: notif.read,
                priority: notif.priority || 'normal',
              });
            }
          });
        }
      } catch (error) {
        console.log('Notification polling error (expected if API not ready):', error);
      }
    };

    // Poll every 10 seconds
    const notificationInterval = setInterval(pollNotifications, 10000);
    // Also poll immediately on first load
    pollNotifications();
    
    return () => {
      clearInterval(notificationInterval);
      // Clear deduplication set when component unmounts or location changes
      addedNotificationIds.current.clear();
    };
  }, [navigate, addNotification, location.pathname]);

  const applyThemeOnLayout = (themeValue: string) => {
    const html = document.documentElement;
    
    if (themeValue === 'dark') {
      html.classList.add('dark');
      setDarkMode(true);
    } else if (themeValue === 'light') {
      html.classList.remove('dark');
      setDarkMode(false);
    } else if (themeValue === 'auto') {
      // Auto theme based on system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
        setDarkMode(true);
      } else {
        html.classList.remove('dark');
        setDarkMode(false);
      }
    }
  };

  // Listen for storage changes (when settings are saved from another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        applyThemeOnLayout(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('darkMode');
    navigate('/login');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const userInitials = userInfo ? `${userInfo.firstName[0]}${userInfo.lastName[0]}`.toUpperCase() : 'AD';

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-card-dark border-r border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <span className="material-symbols-outlined filled text-white" style={{ fontSize: '24px' }}>local_fire_department</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">FireGo</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/') ? 'filled' : ''}`}>dashboard</span>
            <span className="font-semibold">{t('sidebar.dashboard', 'Dashboard')}</span>
          </button>

          <button
            onClick={() => navigate('/user-management')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/user-management')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/user-management') ? 'filled' : ''}`}>group</span>
            <span className="font-semibold">{t('sidebar.userManagement', 'User Management')}</span>
          </button>

          <button
            onClick={() => navigate('/drivers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/drivers')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/drivers') ? 'filled' : ''}`}>local_taxi</span>
            <span className="font-semibold">{t('sidebar.driverManagement', 'Driver Management')}</span>
          </button>

          <button
            onClick={() => navigate('/driver-approval')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/driver-approval')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/driver-approval') ? 'filled' : ''}`}>check_circle</span>
            <span className="font-semibold">{t('sidebar.driverApproval', 'Driver Approval')}</span>
          </button>

          <button
            onClick={() => navigate('/rides')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/rides')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/rides') ? 'filled' : ''}`}>route</span>
            <span className="font-semibold">{t('sidebar.rideManagement', 'Ride Management')}</span>
          </button>

          <button
            onClick={() => navigate('/customers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/customers')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/customers') ? 'filled' : ''}`}>person</span>
            <span className="font-semibold">{t('sidebar.customerManagement', 'Customer Management')}</span>
          </button>

          <button
            onClick={() => navigate('/revenue')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/revenue')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/revenue') ? 'filled' : ''}`}>payments</span>
            <span className="font-semibold">{t('sidebar.revenueManagement', 'Revenue Management')}</span>
          </button>

          <button
            onClick={() => navigate('/transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/transactions')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/transactions') ? 'filled' : ''}`}>swap_horiz</span>
            <span className="font-semibold">{t('sidebar.transactionManagement', 'Transactions')}</span>
          </button>

          <button
            onClick={() => navigate('/pricing-config')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/pricing-config')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/pricing-config') ? 'filled' : ''}`}>attach_money</span>
            <span className="font-semibold">{t('sidebar.pricingConfig', 'Pricing Config')}</span>
          </button>

          <button
            onClick={() => navigate('/driver-search-settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/driver-search-settings')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/driver-search-settings') ? 'filled' : ''}`}>my_location</span>
            <span className="font-semibold whitespace-nowrap">{t('sidebar.driverSearchSettings', 'Tìm kiếm tài xế')}</span>
          </button>

          <button
            onClick={() => navigate('/dispatch')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/dispatch')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/dispatch') ? 'filled' : ''}`}>assignment_late</span>
            <span className="font-semibold whitespace-nowrap">{t('sidebar.dispatchManagement', 'Dispatch & Disputes')}</span>
          </button>

          <button
            onClick={() => navigate('/notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/notifications')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/notifications') ? 'filled' : ''}`}>notifications</span>
            <span className="font-semibold whitespace-nowrap">{t('sidebar.notifications', 'Quản lý Thông báo')}</span>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/reports')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/reports') ? 'filled' : ''}`}>analytics</span>
            <span className="font-semibold whitespace-nowrap">{t('sidebar.reportsAnalytics', 'Reports & Analytics')}</span>
          </button>

          <button
            onClick={() => navigate('/hourly-service-workers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/hourly-service-workers')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/hourly-service-workers') ? 'filled' : ''}`}>home_repair_service</span>
            <span className="font-semibold whitespace-nowrap">Nhân viên Vệ sinh</span>
          </button>

          <button
            onClick={() => navigate('/hourly-services')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/hourly-services')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/hourly-services') ? 'filled' : ''}`}>cleaning_services</span>
            <span className="font-semibold whitespace-nowrap">Dịch vụ Vệ sinh</span>
          </button>

          <button
            onClick={() => navigate('/addon-services')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/addon-services')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/addon-services') ? 'filled' : ''}`}>add_circle</span>
            <span className="font-semibold whitespace-nowrap">Dịch vụ Bổ sung</span>
          </button>

          <button
            onClick={() => navigate('/legal-documents')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/legal-documents')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/legal-documents') ? 'filled' : ''}`}>gavel</span>
            <span className="font-semibold whitespace-nowrap">Tài liệu pháp lý</span>
          </button>

          <button
            onClick={() => navigate('/bonus-management')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive('/bonus-management')
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive('/bonus-management') ? 'filled' : ''}`}>card_giftcard</span>
            <span className="font-semibold whitespace-nowrap">Quản lý Thưởng</span>
          </button>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
            <button
              onClick={() => navigate('/settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive('/settings')
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive('/settings') ? 'filled' : ''}`}>settings</span>
              <span className="font-semibold">{t('sidebar.settings', 'Settings')}</span>
            </button>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-sm">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'Admin User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {userInfo?.email || 'admin@firego.com'}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {location.pathname === '/' && 'Tổng quan'}
              {location.pathname === '/user-management' && 'Quản lý Người dùng'}
              {location.pathname === '/drivers' && 'Quản lý Tài xế'}
              {location.pathname === '/rides' && 'Quản lý Cuốc xe'}
              {location.pathname === '/customers' && 'Quản lý Khách hàng'}
              {location.pathname === '/revenue' && 'Quản lý Doanh thu'}
              {location.pathname === '/transactions' && 'Quản lý Giao dịch'}
              {location.pathname === '/pricing-config' && 'Cấu hình Giá cước'}
              {location.pathname === '/dispatch' && 'Điều phối & Tranh chấp'}
              {location.pathname === '/notifications' && 'Quản lý Thông báo'}
              {location.pathname === '/reports' && 'Báo cáo & Thống kê'}
              {location.pathname === '/settings' && 'Cài đặt'}
              {location.pathname === '/bonus-management' && 'Quản lý Thưởng'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notifications Dropdown */}
            <NotificationDropdown />

            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined">{darkMode ? 'light_mode' : 'dark_mode'}</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Notification Toast */}
        <NotificationToast />
      </div>
    </div>
  );
}
