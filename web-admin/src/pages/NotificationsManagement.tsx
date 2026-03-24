import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';
import Layout from '../components/Layout';

interface Driver {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  driverId?: string;
  customerId?: string;
  driver?: Driver;
  customer?: Customer;
  channels: string[];
  isRead: boolean;
  sentAt: string;
}

const NotificationsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  
  // Form states
  const [recipientType, setRecipientType] = useState<'driver' | 'customer'>('driver');
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('system_message');
  const [channels, setChannels] = useState<string[]>(['in_app']);
  const [description, setDescription] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  
  // Search states
  const [searchResults, setSearchResults] = useState<(Driver | Customer)[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  // History states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Search recipients
  const handleSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    try {
      const endpoint = recipientType === 'driver' 
        ? `${API_BASE_URL}/drivers/search`
        : `${API_BASE_URL}/customers/search`;
      
      const response = await axios.get(endpoint, {
        params: { q: query },
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      
      setSearchResults(response.data || []);
      setShowSearchDropdown(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  // Send notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !message || (!isBroadcast && !selectedId)) {
      setStatusMessage('Vui lòng điền đủ thông tin');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setSending(true);
    try {
      const payload: any = {
        title,
        message,
        type: notificationType,
        channels,
      };

      if (isBroadcast) {
        payload.broadcastTo = recipientType === 'driver' ? 'drivers' : 'customers';
      } else {
        if (recipientType === 'driver') {
          payload.driverId = selectedId;
        } else {
          payload.customerId = selectedId;
        }
      }

      if (description) payload.description = description;
      if (actionUrl) payload.actionUrl = actionUrl;

      await axios.post(`${API_BASE_URL}/notifications/send`, payload, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });

      setStatusMessage('✅ Gửi thông báo thành công');
      
      // Reset form
      setTitle('');
      setMessage('');
      setDescription('');
      setActionUrl('');
      setSelectedId('');
      setSearchQuery('');
      setSearchResults([]);
      setIsBroadcast(false);
      setChannels(['in_app']);
      
      // Reload history
      setTimeout(() => {
        setActiveTab('history');
        fetchNotifications(1, filterType);
      }, 1500);
    } catch (error: any) {
      console.error('Send notification error:', error.response?.data);
      setStatusMessage('❌ Lỗi: ' + (error.response?.data?.message || JSON.stringify(error.response?.data) || 'Không thể gửi thông báo'));
    } finally {
      setSending(false);
    }
  };

  // Fetch notifications history
  const fetchNotifications = async (page: number, type?: string) => {
    setLoading(true);
    try {
      const params: any = {
        limit: 10,
        skip: (page - 1) * 10,
      };
      if (type) params.type = type;

      const response = await axios.get(`${API_BASE_URL}/notifications/admin/all`, {
        params,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });

      setNotifications(response.data.data || []);
      setTotalNotifications(response.data.total || 0);
      setPageNum(page);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchNotifications(1, filterType);
    }
  }, [activeTab, filterType]);

  const totalPages = Math.ceil(totalNotifications / 10);
  const getRecipientName = (notif: Notification) => {
    if (notif.driver?.firstName) return `${notif.driver.firstName} ${notif.driver.lastName}`;
    if (notif.customer?.firstName) return `${notif.customer.firstName} ${notif.customer.lastName}`;
    return 'Broadcast';
  };

  const getRecipientPhone = (notif: Notification) => {
    if (notif.driver?.phone) return notif.driver.phone;
    if (notif.customer?.phone) return notif.customer.phone;
    return '-';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'SYSTEM_MESSAGE': 'bg-blue-900/30 text-blue-300 border border-blue-700/50',
      'PROMOTION': 'bg-green-900/30 text-green-300 border border-green-700/50',
      'UPDATE': 'bg-cyan-900/30 text-cyan-300 border border-cyan-700/50',
      'ALERT': 'bg-red-900/30 text-red-300 border border-red-700/50',
      'SUPPORT': 'bg-purple-900/30 text-purple-300 border border-purple-700/50',
    };
    return colors[type] || 'bg-gray-700/30 text-gray-300 border border-gray-600/50';
  };

  const getStatusColor = (isRead: boolean) => {
    return isRead 
      ? 'bg-gray-700/30 text-gray-300' 
      : 'bg-orange-900/30 text-orange-300';
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header with Title */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quản lý Thông báo</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              activeTab === 'send'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] inline mr-2 align-text-bottom">mail</span>
            Gửi Thông báo
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] inline mr-2 align-text-bottom">history</span>
            Lịch sử ({totalNotifications})
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`p-4 rounded-lg border ${
            statusMessage.includes('✅')
              ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300'
          }`}>
            {statusMessage}
          </div>
        )}

        {/* Content Tabs */}
        <div>
          {/* Send Tab */}
          {activeTab === 'send' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <form onSubmit={handleSendNotification} className="space-y-6">
                {/* Row 1: Recipient Type & Notification Type */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        <span className="material-symbols-outlined text-[18px] align-text-bottom mr-2">person</span>
                        Loại Người Nhận
                      </label>
                      <select
                        value={recipientType}
                        onChange={(e) => {
                          setRecipientType(e.target.value as 'driver' | 'customer');
                          setSelectedId('');
                          setSearchResults([]);
                          setIsBroadcast(false);
                        }}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none transition"
                      >
                        <option value="driver">Tài xế</option>
                        <option value="customer">Khách hàng</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        <span className="material-symbols-outlined text-[18px] align-text-bottom mr-2">label</span>
                        Loại Thông báo
                      </label>
                      <select
                        value={notificationType}
                        onChange={(e) => setNotificationType(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none transition"
                      >
                        <option value="system_message">Tin nhắn hệ thống</option>
                        <option value="promotion">Khuyến mại</option>
                        <option value="document_expired">Tài liệu hết hạn</option>
                        <option value="safety_alert">Cảnh báo an toàn</option>
                        <option value="payment_confirmation">Xác nhận thanh toán</option>
                      </select>
                    </div>
                  </div>

                  {/* Broadcast Toggle */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isBroadcast}
                        onChange={(e) => {
                          setIsBroadcast(e.target.checked);
                          setSelectedId('');
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="w-5 h-5 rounded border-slate-300 accent-orange-600"
                      />
                      <span className="ml-3 text-slate-700 dark:text-slate-300 font-semibold">
                        <span className="material-symbols-outlined text-[18px] align-text-bottom mr-1">broadcast_on_home</span>
                        Gửi cho tất cả {recipientType === 'driver' ? 'Tài xế' : 'Khách hàng'} (Broadcast)
                      </span>
                    </label>
                  </div>

                  {/* Recipient Search */}
                  {!isBroadcast && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        <span className="material-symbols-outlined text-[18px] align-text-bottom mr-2">search</span>
                        Chọn {recipientType === 'driver' ? 'Tài xế' : 'Khách hàng'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={`Tìm theo tên hoặc số điện thoại...`}
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleSearch(e.target.value);
                          }}
                          onFocus={() => setShowSearchDropdown(searchResults.length > 0)}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none transition"
                        />
                        {showSearchDropdown && searchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg max-h-64 overflow-y-auto shadow-xl z-10">
                            {searchResults.map((result) => (
                              <button
                                key={result._id}
                                type="button"
                                onClick={() => {
                                  setSelectedId(result._id);
                                  setSearchQuery(`${result.firstName} ${result.lastName}`);
                                  setSearchResults([]);
                                  setShowSearchDropdown(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-600 border-b border-slate-200 dark:border-slate-600 last:border-b-0 transition"
                              >
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{result.firstName} {result.lastName}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">{result.phone}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedId && (
                        <div className="mt-3 inline-block bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 px-3 py-2 rounded-full text-sm border border-orange-200 dark:border-orange-500/30">
                          <span className="material-symbols-outlined text-[14px] align-text-bottom mr-1">check_circle</span>
                          {searchQuery}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      <span className="material-symbols-outlined text-[18px] align-text-bottom mr-2">edit</span>
                      Tiêu đề
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="VD: Yêu cầu xác minh tài khoản"
                      maxLength={100}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none transition"
                    />
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{title.length}/100</div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      <span className="material-symbols-outlined text-[18px] align-text-bottom mr-2">message</span>
                      Nội dung Thông báo
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Nhập nội dung thông báo..."
                      rows={5}
                      maxLength={1000}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none transition resize-none"
                    />
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{message.length}/1000</div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      <span className="material-symbols-outlined text-[18px] align-text-bottom mr-2">description</span>
                      Mô tả (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Thêm chi tiết hoặc hướng dẫn..."
                      maxLength={500}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Action URL */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      <span className="material-symbols-outlined text-[18px] align-text-bottom mr-2">link</span>
                      Link / Hành động (Tùy chọn)
                    </label>
                    <input
                      type="url"
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                      placeholder="VD: https://example.com/promo hoặc /promotion"
                      maxLength={500}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none transition"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Có thể là URL đầy đủ hoặc đường dẫn nội bộ</p>
                  </div>

                  {/* Channels */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      <span className="material-symbols-outlined text-[18px] align-text-bottom mr-2">send</span>
                      Kênh Gửi
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={channels.includes('in_app')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setChannels([...channels, 'in_app']);
                            } else {
                              setChannels(channels.filter(c => c !== 'in_app'));
                            }
                          }}
                          className="w-5 h-5 rounded border-slate-300 accent-orange-600"
                        />
                        <span className="ml-2 text-slate-700 dark:text-slate-300">Trong ứng dụng</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={channels.includes('push')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setChannels([...channels, 'push']);
                            } else {
                              setChannels(channels.filter(c => c !== 'push'));
                            }
                          }}
                          className="w-5 h-5 rounded border-slate-300 accent-orange-600"
                        />
                        <span className="ml-2 text-slate-700 dark:text-slate-300">Push Notification</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={channels.includes('sms')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setChannels([...channels, 'sms']);
                            } else {
                              setChannels(channels.filter(c => c !== 'sms'));
                            }
                          }}
                          className="w-5 h-5 rounded border-slate-300 accent-orange-600"
                        />
                        <span className="ml-2 text-slate-700 dark:text-slate-300">SMS</span>
                      </label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={sending || (!isBroadcast && !selectedId) || !title || !message}
                    className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-bold rounded-lg transition disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">{sending ? 'hourglass_bottom' : 'send'}</span>
                    {sending ? 'Đang gửi...' : 'Gửi Thông báo'}
                  </button>
                </form>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                {/* Filter */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    <span className="material-symbols-outlined text-[18px] align-text-bottom mr-2">filter_list</span>
                    Lọc theo loại
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value);
                      setPageNum(1);
                    }}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none transition"
                  >
                    <option value="">Tất cả loại</option>
                    <option value="system_message">Tin nhắn hệ thống</option>
                    <option value="promotion">Khuyến mại</option>
                    <option value="document_expired">Tài liệu hết hạn</option>
                    <option value="safety_alert">Cảnh báo an toàn</option>
                    <option value="payment_confirmation">Xác nhận thanh toán</option>
                  </select>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Tiêu đề</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Người nhận</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Loại</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Trạng thái</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Ngày gửi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                              <span className="material-symbols-outlined text-[24px] inline mr-2">hourglass_bottom</span>
                              Đang tải...
                            </td>
                          </tr>
                        ) : notifications.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                              <span className="material-symbols-outlined text-[24px] inline mr-2">inbox</span>
                              Không có thông báo nào
                            </td>
                          </tr>
                        ) : (
                          notifications.map((notif) => (
                            <tr key={notif._id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                              <td className="px-6 py-4">
                                <div className="font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">{notif.title}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs truncate">{notif.message}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{getRecipientName(notif)}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{getRecipientPhone(notif)}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(notif.type)}`}>
                                  {notif.type}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(notif.isRead)}`}>
                                  {notif.isRead ? (
                                    <>
                                      <span className="material-symbols-outlined text-[14px] inline mr-1">done</span>
                                      Đã xem
                                    </>
                                  ) : (
                                    <>
                                      <span className="material-symbols-outlined text-[14px] inline mr-1">schedule</span>
                                      Chưa xem
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                {new Date(notif.sentAt).toLocaleString('vi-VN')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Trang {pageNum} / {totalPages} ({totalNotifications} thông báo)
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchNotifications(Math.max(1, pageNum - 1), filterType)}
                        disabled={pageNum === 1}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[18px] inline mr-1">chevron_left</span>
                        Trước
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        const page = Math.max(1, pageNum - 2) + i;
                        if (page > totalPages) return null;
                        return (
                          <button
                            key={page}
                            onClick={() => fetchNotifications(page, filterType)}
                            className={`px-3 py-2 rounded-lg transition ${
                              page === pageNum
                                ? 'bg-orange-600 text-white font-semibold shadow-md shadow-orange-600/20'
                                : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => fetchNotifications(Math.min(totalPages, pageNum + 1), filterType)}
                        disabled={pageNum === totalPages}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:cursor-not-allowed"
                      >
                        Sau
                        <span className="material-symbols-outlined text-[18px] inline ml-1">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </Layout>
  );
};

export default NotificationsManagement;
