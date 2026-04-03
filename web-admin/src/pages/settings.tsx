import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface SystemConfig {
  _id?: string;
  key: string;
  value: any;
  description?: string;
  category?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

interface AppSetting {
  _id?: string;
  key: string;
  value: string;
  label: string;
  description?: string;
  group: string;
  isSecret: boolean;
}

const Settings: React.FC = () => {
  const { language, setLanguage: setLanguageInContext, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    newRide: true,
    newDriver: true,
    payment: true,
    systemUpdate: false
  });
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [theme, setTheme] = useState('light');
  const [displaySettings, setDisplaySettings] = useState({
    enableAnimations: true,
    showSidebar: true
  });

  // ── API Integration settings ──────────────────────────────────────────────
  const [apiSettings, setApiSettings] = useState<AppSetting[]>([]);
  const [apiSettingsLoading, setApiSettingsLoading] = useState(false);
  const [apiSettingsError, setApiSettingsError] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const tabs = [
    { id: 'profile', label: t('settings.profile', 'Thông tin cá nhân'), icon: 'person' },
    { id: 'security', label: t('settings.security', 'Bảo mật'), icon: 'shield' },
    { id: 'notifications', label: t('settings.notifications', 'Thông báo'), icon: 'notifications' },
    { id: 'appearance', label: t('settings.appearance', 'Giao diện'), icon: 'palette' },
    { id: 'api-integration', label: 'Tích hợp API', icon: 'api' },
    { id: 'system', label: t('settings.system', 'Hệ thống'), icon: 'settings' },
    { id: 'about', label: t('settings.about', 'Về ứng dụng'), icon: 'info' }
  ];

  // Load system configs and admin profile on mount
  useEffect(() => {
    loadSystemConfig();
    loadAdminProfile();
    loadThemeAndLanguage();
    loadApiSettings();
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const loadThemeAndLanguage = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    setTheme(savedTheme);
    applyTheme(savedTheme);
    console.log('Loaded theme:', savedTheme);
  };

  const applyTheme = (themeValue: string) => {
    const html = document.documentElement;
    
    if (themeValue === 'dark') {
      html.classList.add('dark');
    } else if (themeValue === 'light') {
      html.classList.remove('dark');
    } else if (themeValue === 'auto') {
      // Auto theme based on system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  };

  const loadAdminProfile = async () => {
    try {
      // First try to get profile from localStorage (cached from login)
      const cachedProfile = localStorage.getItem('userProfile');
      console.log('Cached userProfile from localStorage:', cachedProfile);
      
      if (cachedProfile) {
        try {
          const profile = JSON.parse(cachedProfile);
          console.log('✅ Profile loaded from localStorage:', profile);
          setProfileData({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            email: profile.email || '',
            phone: profile.phone || ''
          });
          return; // Stop here - we have the data
        } catch (e) {
          console.log('Could not parse cached profile:', e);
        }
      }

      console.log('No cached profile found, trying API...');
      
      // If not in cache, try API
      const profile = await apiService.getAdminProfile();
      console.log('Raw profile response from API:', JSON.stringify(profile, null, 2));
      
      if (profile && profile.email) {
        const firstName = profile.firstName || profile.first_name || '';
        const lastName = profile.lastName || profile.last_name || '';
        const phone = profile.phone || '';
        console.log('✅ Profile loaded from API:', { firstName, lastName, phone, email: profile.email });
        
        const newProfileData = {
          firstName,
          lastName,
          email: profile.email || '',
          phone
        };
        setProfileData(newProfileData);
        // Cache it
        localStorage.setItem('userProfile', JSON.stringify(newProfileData));
        return;
      }

      // Fallback: extract from JWT token
      console.log('API profile is null, falling back to JWT token');
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded = JSON.parse(atob(token.split('.')[1]));
          console.log('Decoded JWT token:', decoded);
          const fallbackProfile = {
            firstName: decoded.firstName || decoded.first_name || '',
            lastName: decoded.lastName || decoded.last_name || '',
            email: decoded.email || 'admin@firego.com',
            phone: decoded.phone || ''
          };
          console.log('✅ Profile loaded from JWT token:', fallbackProfile);
          setProfileData(fallbackProfile);
          return;
        } catch (e) {
          console.log('Could not decode JWT token:', e);
        }
      }
      
      // Last resort
      console.log('⚠️ Could not load profile from any source');
      setProfileData({
        firstName: '',
        lastName: '',
        email: 'admin@firego.com',
        phone: ''
      });
    } catch (err) {
      console.log('Error loading profile:', err);
    }
  };

  const loadSystemConfig = async () => {
    try {
      const configs = await apiService.getSystemConfigs();
      if (!configs || configs.length === 0) return;
      const configMap: Record<string, any> = {};
      configs.forEach((cfg: SystemConfig) => {
        configMap[cfg.key] = cfg.value;
      });
      
      // Load pricing config for wallet/topup limits
      try {
        const pricingConfig = await apiService.getPricingConfig();
        if (pricingConfig) {
          configMap.minTopupAmountDriver = pricingConfig.minTopupAmountDriver || 10000;
          configMap.minTopupAmountCustomer = pricingConfig.minTopupAmountCustomer || 10000;
          configMap.minWalletBalanceToGoOnline = pricingConfig.minWalletBalanceToGoOnline || 100000;
          configMap.maxTopupAmount = pricingConfig.maxTopupAmount || 100000000;
          configMap.topupDiscountCustomer = pricingConfig.topupDiscountCustomer || 0;
          configMap.topupDiscountDriver = pricingConfig.topupDiscountDriver || 0;
        }
      } catch (err) {
        console.error('Error loading pricing config:', err);
      }
      
      setConfig(configMap);
      
      // Set notification settings from config
      if (configMap.notifications) {
        setNotifications(configMap.notifications);
      }
    } catch (err) {
      // Silently fail - keep defaults
    }
  };

  // ── API Integration functions ───────────────────────────────────────────
  const loadApiSettings = async () => {
    setApiSettingsLoading(true);
    setApiSettingsError(null);
    try {
      const data = await apiService.get('/app-settings');
      console.log('[Settings] /app-settings response:', data);
      const settings: AppSetting[] = Array.isArray(data) ? data : (data?.data || []);
      setApiSettings(settings);
      const vals: Record<string, string> = {};
      settings.forEach((s) => { vals[s.key] = ''; });
      setEditValues(vals);
    } catch (err: any) {
      console.error('[Settings] Load API settings error:', err);
      setApiSettingsError(err?.message || 'Không thể tải cài đặt');
    } finally {
      setApiSettingsLoading(false);
    }
  };

  const toggleReveal = async (key: string) => {
    if (revealedKeys.has(key)) {
      setRevealedKeys(prev => { const s = new Set(prev); s.delete(key); return s; });
      return;
    }
    try {
      const data = await apiService.get('/app-settings?showSecrets=true');
      const settings: AppSetting[] = Array.isArray(data) ? data : data?.data || [];
      const found = settings.find(s => s.key === key);
      if (found) {
        setApiSettings(prev => prev.map(s => s.key === key ? { ...s, value: found.value } : s));
        setRevealedKeys(prev => new Set(prev).add(key));
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Không thể hiện giá trị' });
    }
  };

  const handleSaveApiSetting = async (key: string) => {
    const newVal = editValues[key];
    if (!newVal || !newVal.trim()) {
      setMessage({ type: 'error', text: 'Giá trị không được để trống' });
      return;
    }
    setSavingKey(key);
    try {
      await apiService.patch(`/app-settings/${key}`, { value: newVal.trim() });
      setApiSettings(prev =>
        prev.map(s => s.key === key ? { ...s, value: newVal.trim() } : s)
      );
      setEditValues(prev => ({ ...prev, [key]: '' }));
      setRevealedKeys(prev => { const s = new Set(prev); s.delete(key); return s; });
      setMessage({ type: 'success', text: `Đã cập nhật ${key}` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi cập nhật' });
    } finally {
      setSavingKey(null);
    }
  };

  const GROUP_META: Record<string, { label: string; icon: string; color: string }> = {
    payment_sepay: { label: 'Sepay (Thanh toán QR)', icon: 'qr_code_2', color: 'blue' },
    payment_vnpay: { label: 'VNPay', icon: 'credit_card', color: 'green' },
    maps: { label: 'Google Maps & Định tuyến', icon: 'map', color: 'orange' },
    email: { label: 'Email (SMTP)', icon: 'email', color: 'purple' },
    system: { label: 'Hệ thống', icon: 'settings', color: 'gray' },
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const updateData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone
      };
      const result = await apiService.patch('/auth/profile', updateData);
      if (result) {
        // Cache the updated profile
        localStorage.setItem('userProfile', JSON.stringify({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          phone: profileData.phone
        }));
        setMessage({ type: 'success', text: 'Cập nhật thông tin cá nhân thành công!' });
      } else {
        setMessage({ type: 'error', text: 'Lỗi cập nhật thông tin cá nhân' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi cập nhật thông tin cá nhân: ' + (err instanceof Error ? err.message : 'Unknown') });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      await apiService.setSystemConfig({
        key: 'notifications',
        value: notifications,
        description: 'Notification preferences'
      });
      setMessage({ type: 'success', text: 'Cập nhật cài đặt thông báo thành công!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi cập nhật cài đặt thông báo' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppearance = async () => {
    try {
      setSaving(true);
      
      // Save to localStorage immediately
      localStorage.setItem('theme', theme);
      localStorage.setItem('language', language);
      localStorage.setItem('displaySettings', JSON.stringify(displaySettings));
      
      // Apply theme changes immediately
      applyTheme(theme);
      
      await apiService.setSystemConfig({
        key: 'appearance',
        value: {
          theme,
          language,
          displaySettings
        },
        description: 'Appearance preferences'
      });
      setMessage({ type: 'success', text: 'Cập nhật giao diện thành công!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi cập nhật giao diện' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      setSaving(true);
      const data = {
        settings: config,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `firego-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      setMessage({ type: 'success', text: 'Xuất dữ liệu thành công!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi xuất dữ liệu' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setSaving(true);
      localStorage.clear();
      sessionStorage.clear();
      setMessage({ type: 'success', text: 'Xóa bộ nhớ cache thành công! (340 MB)' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi xóa cache' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteData = async () => {
    if (window.confirm('Bạn chắc chắn muốn xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác.')) {
      try {
        setSaving(true);
        localStorage.clear();
        sessionStorage.clear();
        setMessage({ type: 'success', text: 'Xóa toàn bộ dữ liệu thành công! Vui lòng đăng nhập lại.' });
        setTimeout(() => window.location.href = '/login', 2000);
      } catch (err) {
        setMessage({ type: 'error', text: 'Lỗi xóa dữ liệu' });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại!' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu mới không khớp!' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự!' });
      return;
    }
    try {
      setSaving(true);
      const result = await apiService.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      if (result) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      } else {
        setMessage({ type: 'error', text: 'Lỗi đổi mật khẩu' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi đổi mật khẩu: ' + (err instanceof Error ? err.message : 'Unknown error') });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (firstName?: string, lastName?: string): string => {
    const first = firstName && typeof firstName === 'string' ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName && typeof lastName === 'string' ? lastName.charAt(0).toUpperCase() : '';
    const initials = (first + last).slice(0, 2);
    return initials || 'AD';
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
          }`}>
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Cài đặt</h1>
          <p className="text-slate-600 dark:text-slate-400">Quản lý cài đặt tài khoản và ứng dụng của bạn</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tabs Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#1E252B] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${
                    activeTab === tab.id
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-[#1E252B] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Thông tin cá nhân</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Cập nhật thông tin tài khoản của bạn</p>
                  </div>

                  {/* Avatar */}
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#e56200] flex items-center justify-center text-white font-bold text-3xl">
                        {getInitials(profileData.firstName, profileData.lastName)}
                      </div>
                      <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow-lg hover:bg-[#e56200] transition-colors">
                        <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                      </button>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{profileData.firstName} {profileData.lastName}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{profileData.email}</p>
                      <button className="text-sm text-[#FF6B00] hover:text-[#e56200] font-semibold">
                        Thay đổi ảnh đại diện
                      </button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Tên
                      </label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Họ
                      </label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        disabled
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none opacity-60 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      Hủy
                    </button>
                    <button 
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-6 py-2.5 rounded-lg bg-[#FF6B00] hover:bg-[#e56200] disabled:opacity-50 text-white font-medium transition-colors"
                    >
                      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Bảo mật</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Quản lý mật khẩu và bảo mật tài khoản</p>
                  </div>

                  {/* Change Password */}
                  <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Đổi mật khẩu</h3>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Mật khẩu hiện tại
                      </label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      />
                    </div>
                    <button 
                      onClick={handleChangePassword}
                      disabled={saving}
                      className="px-6 py-2.5 rounded-lg bg-[#FF6B00] hover:bg-[#e56200] disabled:opacity-50 text-white font-medium transition-colors"
                    >
                      {saving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                    </button>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Xác thực hai yếu tố (2FA)</h3>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[20px]">verified_user</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">Đang bật</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Bảo vệ tài khoản với mã xác thực</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        Tắt 2FA
                      </button>
                    </div>
                  </div>

                  {/* Sessions */}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Phiên đăng nhập</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-400">devices</span>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                              Chrome - Windows
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                Hiện tại
                              </span>
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              TP.HCM, Việt Nam • 2 giờ trước
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Thông báo</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Quản lý cách bạn nhận thông báo</p>
                  </div>

                  {/* Notification Channels */}
                  <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Kênh thông báo</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'email', label: 'Email', icon: 'email', desc: 'Nhận thông báo qua email' },
                        { key: 'push', label: 'Push Notification', icon: 'notifications', desc: 'Nhận thông báo đẩy' },
                        { key: 'sms', label: 'SMS', icon: 'sms', desc: 'Nhận thông báo qua tin nhắn' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-400">{item.icon}</span>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notifications[item.key as keyof typeof notifications]}
                              onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF6B00]/20 dark:peer-focus:ring-[#FF6B00]/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FF6B00]"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notification Types */}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Loại thông báo</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'newRide', label: 'Cuốc xe mới', desc: 'Thông báo khi có cuốc xe mới' },
                        { key: 'newDriver', label: 'Tài xế mới', desc: 'Thông báo khi có tài xế đăng ký mới' },
                        { key: 'payment', label: 'Thanh toán', desc: 'Thông báo về giao dịch thanh toán' },
                        { key: 'systemUpdate', label: 'Cập nhật hệ thống', desc: 'Thông báo về bảo trì và cập nhật' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notifications[item.key as keyof typeof notifications]}
                              onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF6B00]/20 dark:peer-focus:ring-[#FF6B00]/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FF6B00]"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      Hủy
                    </button>
                    <button 
                      onClick={handleSaveNotifications}
                      disabled={saving}
                      className="px-6 py-2.5 rounded-lg bg-[#FF6B00] hover:bg-[#e56200] disabled:opacity-50 text-white font-medium transition-colors"
                    >
                      {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
                    </button>
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Giao diện</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Tùy chỉnh giao diện ứng dụng</p>
                  </div>

                  {/* Theme */}
                  <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Chủ đề</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => {
                          setTheme('light');
                          localStorage.setItem('theme', 'light');
                          applyTheme('light');
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          theme === 'light'
                            ? 'border-[#FF6B00] bg-slate-50 dark:bg-slate-800'
                            : 'border-slate-200 dark:border-slate-700 hover:border-[#FF6B00]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="material-symbols-outlined text-slate-900 dark:text-white">light_mode</span>
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            theme === 'light' ? 'border-[#FF6B00]' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {theme === 'light' && <div className="h-3 w-3 rounded-full bg-[#FF6B00]"></div>}
                          </div>
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-white">Sáng</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Giao diện sáng</p>
                      </button>

                      <button
                        onClick={() => {
                          setTheme('dark');
                          localStorage.setItem('theme', 'dark');
                          applyTheme('dark');
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          theme === 'dark'
                            ? 'border-[#FF6B00] bg-slate-50 dark:bg-slate-800'
                            : 'border-slate-200 dark:border-slate-700 hover:border-[#FF6B00]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="material-symbols-outlined text-slate-900 dark:text-white">dark_mode</span>
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            theme === 'dark' ? 'border-[#FF6B00]' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {theme === 'dark' && <div className="h-3 w-3 rounded-full bg-[#FF6B00]"></div>}
                          </div>
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-white">Tối</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Giao diện tối</p>
                      </button>

                      <button
                        onClick={() => {
                          setTheme('auto');
                          localStorage.setItem('theme', 'auto');
                          applyTheme('auto');
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          theme === 'auto'
                            ? 'border-[#FF6B00] bg-slate-50 dark:bg-slate-800'
                            : 'border-slate-200 dark:border-slate-700 hover:border-[#FF6B00]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="material-symbols-outlined text-slate-900 dark:text-white">contrast</span>
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            theme === 'auto' ? 'border-[#FF6B00]' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {theme === 'auto' && <div className="h-3 w-3 rounded-full bg-[#FF6B00]"></div>}
                          </div>
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-white">Tự động</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Theo hệ thống</p>
                      </button>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{t('settings.language', 'Ngôn ngữ')}</h3>
                    <select
                      value={language}
                      onChange={(e) => {
                        const newLang = e.target.value as 'vi' | 'en' | 'ko' | 'ja';
                        setLanguageInContext(newLang);
                        localStorage.setItem('language', newLang);
                      }}
                      className="w-full md:w-1/2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                      <option value="ko">한국어</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>

                  {/* Display Settings */}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Cài đặt hiển thị</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">Hiệu ứng chuyển động</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Bật hiệu ứng animation</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={displaySettings.enableAnimations}
                            onChange={(e) => {
                              const newSettings = { ...displaySettings, enableAnimations: e.target.checked };
                              setDisplaySettings(newSettings);
                              localStorage.setItem('displaySettings', JSON.stringify(newSettings));
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF6B00]/20 dark:peer-focus:ring-[#FF6B00]/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FF6B00]"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">Hiển thị sidebar</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Luôn hiển thị thanh điều hướng</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={displaySettings.showSidebar}
                            onChange={(e) => {
                              const newSettings = { ...displaySettings, showSidebar: e.target.checked };
                              setDisplaySettings(newSettings);
                              localStorage.setItem('displaySettings', JSON.stringify(newSettings));
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF6B00]/20 dark:peer-focus:ring-[#FF6B00]/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FF6B00]"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveAppearance}
                      disabled={saving}
                      className="px-6 py-2.5 rounded-lg bg-[#FF6B00] hover:bg-[#e56200] disabled:opacity-50 text-white font-medium transition-colors"
                    >
                      {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
                    </button>
                  </div>
                </div>
              )}

              {/* System Tab */}
              {activeTab === 'system' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Hệ thống</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Cài đặt hệ thống và dữ liệu</p>
                  </div>

                  {/* Pricing Configuration - Topup Discount */}
                  <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Cấu hình Nạp tiền</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Quản lý chiết khấu khi khách hàng và tài xế nạp tiền</p>
                    
                    <div className="space-y-4">
                      {/* Customer Topup Discount */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">person</span>
                            Chiết khấu nạp tiền khách hàng
                          </span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="0"
                            defaultValue={config.topupDiscountCustomer || 0}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                              setConfig(prev => ({ ...prev, topupDiscountCustomer: val }));
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <span className="text-slate-600 dark:text-slate-400 font-medium">%</span>
                          <button
                            onClick={async () => {
                              setSaving(true);
                              try {
                                await apiService.updateTopupDiscount(
                                  config.topupDiscountCustomer || 0,
                                  undefined
                                );
                                setMessage({ type: 'success', text: 'Lưu chiết khấu khách hàng thành công' });
                              } catch (err) {
                                setMessage({ type: 'error', text: 'Lỗi lưu chiết khấu: ' + (err instanceof Error ? err.message : 'Unknown') });
                              } finally {
                                setSaving(false);
                              }
                            }}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
                          >
                            Lưu
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Ví dụ: 5% có nghĩa khách nạp 100k sẽ chỉ nhận 95k
                        </p>
                      </div>

                      {/* Driver Topup Discount */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">local_taxi</span>
                            Chiết khấu nạp tiền tài xế
                          </span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="0"
                            defaultValue={config.topupDiscountDriver || 0}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                              setConfig(prev => ({ ...prev, topupDiscountDriver: val }));
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <span className="text-slate-600 dark:text-slate-400 font-medium">%</span>
                          <button
                            onClick={async () => {
                              setSaving(true);
                              try {
                                await apiService.updateTopupDiscount(
                                  undefined,
                                  config.topupDiscountDriver || 0
                                );
                                setMessage({ type: 'success', text: 'Lưu chiết khấu tài xế thành công' });
                              } catch (err) {
                                setMessage({ type: 'error', text: 'Lỗi lưu chiết khấu: ' + (err instanceof Error ? err.message : 'Unknown') });
                              } finally {
                                setSaving(false);
                              }
                            }}
                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
                          >
                            Lưu
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Ví dụ: 3% có nghĩa tài xế nạp 100k sẽ chỉ nhận 97k
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Wallet & Topup Limits Configuration */}
                  <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Giới hạn Ví & Nạp tiền</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Quản lý số tiền nạp tối thiểu/tối đa và điều kiện hoạt động</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Min Topup Amount - Driver */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">local_taxi</span>
                            Nạp tối thiểu (Tài xế)
                          </span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="10000"
                            defaultValue={config.minTopupAmountDriver || 10000}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setConfig(prev => ({ ...prev, minTopupAmountDriver: val }));
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <span className="text-slate-600 dark:text-slate-400 text-xs">VNĐ</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Số tiền nạp tối thiểu mỗi lần
                        </p>
                      </div>

                      {/* Min Topup Amount - Customer */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">person</span>
                            Nạp tối thiểu (Khách)
                          </span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="10000"
                            defaultValue={config.minTopupAmountCustomer || 10000}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setConfig(prev => ({ ...prev, minTopupAmountCustomer: val }));
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <span className="text-slate-600 dark:text-slate-400 text-xs">VNĐ</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Số tiền nạp tối thiểu mỗi lần
                        </p>
                      </div>

                      {/* Min Wallet Balance to Go Online */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                            Số dư tối thiểu để online
                          </span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            placeholder="100000"
                            defaultValue={config.minWalletBalanceToGoOnline || 100000}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setConfig(prev => ({ ...prev, minWalletBalanceToGoOnline: val }));
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <span className="text-slate-600 dark:text-slate-400 text-xs">VNĐ</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Tài xế phải có số dư tối thiểu này để bật online
                        </p>
                      </div>

                      {/* Max Topup Amount */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">credit_card</span>
                            Nạp tối đa mỗi lần
                          </span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            step="1000000"
                            placeholder="100000000"
                            defaultValue={config.maxTopupAmount || 100000000}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setConfig(prev => ({ ...prev, maxTopupAmount: val }));
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <span className="text-slate-600 dark:text-slate-400 text-xs">VNĐ</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Giới hạn số tiền nạp tối đa mỗi lần
                        </p>
                      </div>

                      {/* Min Withdraw Amount - Driver */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">local_taxi</span>
                            Rút tối thiểu (Tài xế)
                          </span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            placeholder="50000"
                            defaultValue={config.minWithdrawAmountDriver || 50000}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setConfig(prev => ({ ...prev, minWithdrawAmountDriver: val }));
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <span className="text-slate-600 dark:text-slate-400 text-xs">VNĐ</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Số tiền rút tối thiểu mỗi lần
                        </p>
                      </div>

                      {/* Min Withdraw Amount - Customer */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">person</span>
                            Rút tối thiểu (Khách)
                          </span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            placeholder="50000"
                            defaultValue={config.minWithdrawAmountCustomer || 50000}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setConfig(prev => ({ ...prev, minWithdrawAmountCustomer: val }));
                            }}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                          />
                          <span className="text-slate-600 dark:text-slate-400 text-xs">VNĐ</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Số tiền rút tối thiểu mỗi lần
                        </p>
                      </div>
                    </div>

                    {/* Save Button for Wallet Limits */}
                    <div className="flex justify-end">
                      <button
                        onClick={async () => {
                          setSaving(true);
                          try {
                            await apiService.updatePricingConfig({
                              minTopupAmountDriver: config.minTopupAmountDriver,
                              minTopupAmountCustomer: config.minTopupAmountCustomer,
                              minWalletBalanceToGoOnline: config.minWalletBalanceToGoOnline,
                              maxTopupAmount: config.maxTopupAmount,
                              minWithdrawAmountDriver: config.minWithdrawAmountDriver,
                              minWithdrawAmountCustomer: config.minWithdrawAmountCustomer,
                            });
                            setMessage({ type: 'success', text: 'Lưu cấu hình giới hạn ví thành công!' });
                          } catch (err) {
                            setMessage({ type: 'error', text: 'Lỗi lưu cấu hình: ' + (err instanceof Error ? err.message : 'Unknown') });
                          } finally {
                            setSaving(false);
                          }
                        }}
                        className="px-6 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
                      >
                        Lưu cấu hình
                      </button>
                    </div>
                  </div>

                  {/* Data Management */}
                  <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Quản lý dữ liệu</h3>
                    <div className="space-y-3">
                      <button
                        onClick={handleExportData}
                        disabled={saving}
                        className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-400">download</span>
                          <div className="text-left">
                            <p className="font-medium text-slate-900 dark:text-white">Xuất dữ liệu</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Tải xuống toàn bộ dữ liệu của bạn</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                      </button>

                      <button
                        onClick={handleClearCache}
                        disabled={saving}
                        className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-400">cached</span>
                          <div className="text-left">
                            <p className="font-medium text-slate-900 dark:text-white">Xóa bộ nhớ cache</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Giải phóng dung lượng</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                      </button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div>
                    <h3 className="font-semibold text-red-600 dark:text-red-400 mb-4">Vùng nguy hiểm</h3>
                    <div className="space-y-3">
                      <button
                        onClick={handleDeleteData}
                        disabled={saving}
                        className="w-full flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-red-600 dark:text-red-400">delete_forever</span>
                          <div className="text-left">
                            <p className="font-medium text-red-900 dark:text-red-100">Xóa toàn bộ dữ liệu</p>
                            <p className="text-sm text-red-700 dark:text-red-300">Hành động này không thể hoàn tác</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* About Tab */}
              {activeTab === 'about' && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <div className="h-24 w-24 mx-auto rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#e56200] flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined filled text-white text-5xl">local_fire_department</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">FireGo Admin</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-1">Phiên bản 1.0.0</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">Build 2024.12.27</p>
                  </div>

                  <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Nhà phát triển</span>
                      <span className="text-sm text-slate-900 dark:text-white font-semibold">FireGo Team</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Giấy phép</span>
                      <span className="text-sm text-slate-900 dark:text-white font-semibold">MIT License</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Website</span>
                      <a href="#" className="text-sm text-[#FF6B00] hover:text-[#e56200] font-semibold">firego.com</a>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <span className="font-medium text-slate-900 dark:text-white">Kiểm tra cập nhật</span>
                      <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </button>
                    <button className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <span className="font-medium text-slate-900 dark:text-white">Điều khoản dịch vụ</span>
                      <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </button>
                    <button className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <span className="font-medium text-slate-900 dark:text-white">Chính sách bảo mật</span>
                      <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </button>
                    <button className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <span className="font-medium text-slate-900 dark:text-white">Hỗ trợ & Phản hồi</span>
                      <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </button>
                  </div>

                  <div className="text-center pt-6 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      © 2024 FireGo. All rights reserved.
                    </p>
                  </div>
                </div>
              )}

              {/* ── API Integration Tab ── */}
              {activeTab === 'api-integration' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Tích hợp API bên ngoài</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Quản lý API keys, tài khoản thanh toán và các cấu hình dịch vụ. Thay đổi được áp dụng ngay không cần restart.
                    </p>
                  </div>

                  {apiSettingsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin h-8 w-8 rounded-full border-4 border-[#FF6B00] border-t-transparent" />
                    </div>
                  ) : apiSettingsError ? (
                    <div className="p-5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
                        <div className="flex-1">
                          <p className="font-semibold text-red-700 dark:text-red-400">Không thể tải cài đặt</p>
                          <p className="text-sm text-red-600 dark:text-red-300 mt-1 font-mono">{apiSettingsError}</p>
                          <p className="text-xs text-red-500 mt-2">Backend URL: <code>{import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}</code></p>
                          <button
                            onClick={loadApiSettings}
                            className="mt-3 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium text-sm hover:bg-red-200 transition-colors"
                          >
                            Thử lại
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    Object.entries(GROUP_META).map(([groupKey, groupMeta]) => {
                      const groupSettings = apiSettings.filter(s => s.group === groupKey);
                      if (!groupSettings.length) return null;
                      const colorMap: Record<string, string> = {
                        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                        orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400',
                        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                        gray: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                      };
                      return (
                        <div key={groupKey} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                          {/* Group header */}
                          <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colorMap[groupMeta.color]}`}>
                              <span className="material-symbols-outlined text-[20px]">{groupMeta.icon}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{groupMeta.label}</p>
                              <p className="text-xs text-slate-500">{groupSettings.length} cấu hình</p>
                            </div>
                          </div>

                          {/* Settings rows */}
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {groupSettings.map(setting => (
                              <div key={setting.key} className="px-5 py-4">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                        {setting.label}
                                      </span>
                                      {setting.isSecret && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                          SECRET
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-400">{setting.key}</p>
                                    {setting.description && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{setting.description}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Current value display */}
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-sm text-slate-700 dark:text-slate-300 truncate">
                                    {setting.value || <span className="text-slate-400 italic">Chưa cài đặt</span>}
                                  </div>
                                  {setting.isSecret && (
                                    <button
                                      onClick={() => toggleReveal(setting.key)}
                                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
                                      title={revealedKeys.has(setting.key) ? 'Ẩn giá trị' : 'Hiện giá trị'}
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        {revealedKeys.has(setting.key) ? 'visibility_off' : 'visibility'}
                                      </span>
                                    </button>
                                  )}
                                </div>

                                {/* Edit input */}
                                <div className="flex items-center gap-2">
                                  <input
                                    type={setting.isSecret && !revealedKeys.has(setting.key) ? 'password' : 'text'}
                                    placeholder={`Nhập giá trị mới cho ${setting.label}`}
                                    value={editValues[setting.key] || ''}
                                    onChange={(e) => setEditValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                                  />
                                  <button
                                    onClick={() => handleSaveApiSetting(setting.key)}
                                    disabled={!editValues[setting.key]?.trim() || savingKey === setting.key}
                                    className="px-4 py-2 rounded-lg bg-[#FF6B00] hover:bg-[#e56200] disabled:opacity-40 text-white text-sm font-medium transition-colors whitespace-nowrap"
                                  >
                                    {savingKey === setting.key ? (
                                      <span className="flex items-center gap-1.5">
                                        <span className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent" />
                                        Lưu...
                                      </span>
                                    ) : 'Lưu'}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 mt-0.5">warning</span>
                      <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Lưu ý</p>
                        <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">
                          Thay đổi được lưu vào database và được cache trong 5 phút. Server không cần restart. 
                          Giá trị <strong>SECRET</strong> được ẩn mặc định — bấm icon mắt để xem.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
