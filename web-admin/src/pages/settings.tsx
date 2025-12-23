import React, { useState } from 'react';
import Layout from '../components/Layout';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    newRide: true,
    newDriver: true,
    payment: true,
    systemUpdate: false
  });

  const tabs = [
    { id: 'profile', label: 'Thông tin cá nhân', icon: 'person' },
    { id: 'security', label: 'Bảo mật', icon: 'shield' },
    { id: 'notifications', label: 'Thông báo', icon: 'notifications' },
    { id: 'appearance', label: 'Giao diện', icon: 'palette' },
    { id: 'system', label: 'Hệ thống', icon: 'settings' },
    { id: 'about', label: 'Về ứng dụng', icon: 'info' }
  ];

  return (
    <Layout>
      <div className="p-6">
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
                        AD
                      </div>
                      <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow-lg hover:bg-[#e56200] transition-colors">
                        <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                      </button>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Admin User</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">admin@firego.com</p>
                      <button className="text-sm text-[#FF6B00] hover:text-[#e56200] font-semibold">
                        Thay đổi ảnh đại diện
                      </button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        defaultValue="Admin User"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        defaultValue="admin@firego.com"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        defaultValue="0901234567"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Vai trò
                      </label>
                      <input
                        type="text"
                        defaultValue="Quản trị viên"
                        disabled
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      Hủy
                    </button>
                    <button className="px-6 py-2.5 rounded-lg bg-[#FF6B00] hover:bg-[#e56200] text-white font-medium transition-colors">
                      Lưu thay đổi
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
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Mật khẩu mới
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        type="password"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                      />
                    </div>
                    <button className="px-6 py-2.5 rounded-lg bg-[#FF6B00] hover:bg-[#e56200] text-white font-medium transition-colors">
                      Cập nhật mật khẩu
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

                  {/* Login History */}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Lịch sử đăng nhập</h3>
                    <div className="space-y-3">
                      {[
                        { device: 'Chrome - Windows', location: 'TP.HCM, Việt Nam', time: '2 giờ trước', current: true },
                        { device: 'Safari - iPhone', location: 'Hà Nội, Việt Nam', time: '1 ngày trước', current: false },
                        { device: 'Firefox - MacOS', location: 'Đà Nẵng, Việt Nam', time: '3 ngày trước', current: false }
                      ].map((session, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-400">devices</span>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                {session.device}
                                {session.current && (
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                    Hiện tại
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {session.location} • {session.time}
                              </p>
                            </div>
                          </div>
                          {!session.current && (
                            <button className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium">
                              Đăng xuất
                            </button>
                          )}
                        </div>
                      ))}
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
                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-400">email</span>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">Email</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Nhận thông báo qua email</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.email}
                            onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF6B00]/20 dark:peer-focus:ring-[#FF6B00]/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FF6B00]"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-400">notifications</span>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">Push Notification</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Nhận thông báo đẩy</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.push}
                            onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF6B00]/20 dark:peer-focus:ring-[#FF6B00]/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FF6B00]"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-400">sms</span>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">SMS</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Nhận thông báo qua tin nhắn</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications.sms}
                            onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF6B00]/20 dark:peer-focus:ring-[#FF6B00]/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FF6B00]"></div>
                        </label>
                      </div>
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
                      <div className="p-4 rounded-lg border-2 border-[#FF6B00] bg-slate-50 dark:bg-slate-800 cursor-pointer">
                        <div className="flex items-center justify-between mb-3">
                          <span className="material-symbols-outlined text-slate-900 dark:text-white">light_mode</span>
                          <div className="h-5 w-5 rounded-full border-2 border-[#FF6B00] flex items-center justify-center">
                            <div className="h-3 w-3 rounded-full bg-[#FF6B00]"></div>
                          </div>
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-white">Sáng</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Giao diện sáng</p>
                      </div>

                      <div className="p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-[#FF6B00] cursor-pointer transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="material-symbols-outlined text-slate-900 dark:text-white">dark_mode</span>
                          <div className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-white">Tối</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Giao diện tối</p>
                      </div>

                      <div className="p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-[#FF6B00] cursor-pointer transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="material-symbols-outlined text-slate-900 dark:text-white">contrast</span>
                          <div className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-white">Tự động</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Theo hệ thống</p>
                      </div>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Ngôn ngữ</h3>
                    <select className="w-full md:w-1/2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent">
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
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF6B00]/20 dark:peer-focus:ring-[#FF6B00]/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FF6B00]"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">Hiển thị sidebar</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Luôn hiển thị thanh điều hướng</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF6B00]/20 dark:peer-focus:ring-[#FF6B00]/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#FF6B00]"></div>
                        </label>
                      </div>
                    </div>
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

                  {/* Data Management */}
                  <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Quản lý dữ liệu</h3>
                    <div className="space-y-3">
                      <button className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-400">download</span>
                          <div className="text-left">
                            <p className="font-medium text-slate-900 dark:text-white">Xuất dữ liệu</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Tải xuống toàn bộ dữ liệu của bạn</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                      </button>

                      <button className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-400">cached</span>
                          <div className="text-left">
                            <p className="font-medium text-slate-900 dark:text-white">Xóa bộ nhớ cache</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Giải phóng 245 MB dung lượng</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                      </button>
                    </div>
                  </div>

                  {/* Backup */}
                  <div className="space-y-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Sao lưu</h3>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400">cloud_done</span>
                        <p className="font-semibold text-green-900 dark:text-green-100">Sao lưu tự động đang bật</p>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">Lần sao lưu gần nhất: Hôm nay lúc 03:00</p>
                    </div>
                    <button className="px-6 py-2.5 rounded-lg bg-[#FF6B00] hover:bg-[#e56200] text-white font-medium transition-colors">
                      Sao lưu ngay
                    </button>
                  </div>

                  {/* Danger Zone */}
                  <div>
                    <h3 className="font-semibold text-red-600 dark:text-red-400 mb-4">Vùng nguy hiểm</h3>
                    <div className="space-y-3">
                      <button className="w-full flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
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
                    <p className="text-sm text-slate-500 dark:text-slate-500">Build 2024.12.20</p>
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

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
