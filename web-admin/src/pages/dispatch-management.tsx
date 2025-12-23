import React, { useState } from 'react';
import Layout from '../components/Layout';

interface DisputeItem {
  id: string;
  type: 'urgent' | 'payment' | 'standard';
  title: string;
  description?: string;
  customer: string;
  driver: string;
  timeAgo: string;
  status: string;
}

const DispatchManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'disputes' | 'dispatch'>('disputes');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const disputes: DisputeItem[] = [
    {
      id: 'DIS-9921',
      type: 'urgent',
      title: 'Khách báo cáo tài xế thái độ',
      customer: 'Minh Tuấn',
      driver: 'TX. Hoang Long',
      timeAgo: '2 phút trước',
      status: 'Khẩn cấp'
    },
    {
      id: 'DIS-9840',
      type: 'payment',
      title: 'Sai lệch cước phí chuyến đi',
      description: 'Khách hàng khiếu nại cước phí cao hơn dự kiến ban đầu...',
      customer: 'Ngọc Anh',
      driver: 'TX. Văn Nam',
      timeAgo: '15 phút trước',
      status: 'Thanh toán'
    },
    {
      id: 'DIS-9821',
      type: 'standard',
      title: 'Tìm lại đồ bỏ quên trên xe',
      description: 'Khách hàng để quên điện thoại trên xe, cần hỗ trợ liên hệ tài xế...',
      customer: 'Hải Đăng',
      driver: 'TX. Minh Quân',
      timeAgo: '1 giờ trước',
      status: 'Hỗ trợ'
    }
  ];

  return (
    <Layout>
      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-2xl font-bold text-primary">142</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Cuốc xe</span>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-2xl font-bold text-emerald-500">58</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Tài xế</span>
          </div>

          <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-2xl font-bold text-red-500">3</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Tranh chấp</span>
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          {/* Map Controls */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Bar */}
              <div className="flex-1 flex items-center bg-surface-light/95 dark:bg-surface-dark/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 h-12 px-3">
                <span className="material-symbols-outlined text-slate-400 mr-2">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm w-full text-slate-900 dark:text-white placeholder-slate-400"
                  placeholder="Tìm ID, Tài xế, Khách hàng..."
                />
                <button className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">tune</span>
                </button>
              </div>

              {/* Filter Chips */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all ${
                    activeFilter === 'all'
                      ? 'bg-primary text-white border border-primary'
                      : 'bg-surface-light/90 dark:bg-surface-dark/80 backdrop-blur text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setActiveFilter('active')}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium shadow-md transition-all ${
                    activeFilter === 'active'
                      ? 'bg-primary text-white border border-primary'
                      : 'bg-surface-light/90 dark:bg-surface-dark/80 backdrop-blur text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Đang hoạt động
                </button>
                <button
                  onClick={() => setActiveFilter('disputes')}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium shadow-md border transition-all flex items-center gap-1 ${
                    activeFilter === 'disputes'
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-surface-light/90 dark:bg-surface-dark/80 backdrop-blur text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  Tranh chấp
                </button>
              </div>
            </div>
          </div>

          {/* Map Display */}
          <div className="relative w-full h-[400px] bg-slate-800">
            {/* Map Image */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCylDsB_gyDFlhsD2H9tFPEU1XaCnX1Qt8RK4k9jrxR77ZB9OfR9t47JsTJuO6_abI6c2sKFaBNvvO51KtfDnTKT1WdAzud3_NJ4KHWsl-rGY0d2zbAgWtIOJzK2tg7ESIdmVIa3Y0DGoyfkvjLyXOhhl66sOlbpsCrno8Pg9LhRUsdciPmjQEViG-yfhPgWqFzbUDBAjNQX0KJjN2EPveoCFFba-U3a3Ol84Qw8rQ5htmv9Gsj5oxF-rIXi3KROGZbCG8d3JIgxZ0"
              alt="Map view"
              className="w-full h-full object-cover opacity-60 mix-blend-overlay"
            />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-transparent to-slate-900/90"></div>

            {/* Map Pins */}
            <div className="absolute inset-0">
              {/* Active Driver Pin */}
              <div className="absolute top-[30%] left-[40%] flex flex-col items-center group">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-white dark:border-surface-dark">
                    <span className="material-symbols-outlined text-white text-sm">directions_car</span>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-surface-dark text-white text-[10px] px-2 py-1 rounded mt-1 shadow-lg whitespace-nowrap">
                  Tài xế: Nguyễn Văn A
                </div>
              </div>

              {/* Dispute Alert Pin */}
              <div className="absolute top-[50%] right-[20%] flex flex-col items-center z-20">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-30 animate-ping"></span>
                  <div className="relative w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-lg border-2 border-white transform hover:scale-110 transition-transform cursor-pointer">
                    <span className="material-symbols-outlined text-white text-sm font-bold">priority_high</span>
                  </div>
                </div>
                <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 shadow-lg border border-white/20">
                  SOS
                </div>
              </div>

              {/* User Location Pin */}
              <div className="absolute bottom-[30%] left-[20%]">
                <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-surface-dark shadow-md"></div>
              </div>
            </div>

            {/* Map Tools */}
            <div className="absolute bottom-4 right-0 flex flex-col gap-2">
              <button className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors">
                <span className="material-symbols-outlined">my_location</span>
              </button>
              <button className="w-10 h-10 rounded-full bg-surface-light dark:bg-surface-dark shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors">
                <span className="material-symbols-outlined">layers</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs and Content */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-700 px-6">
            <button
              onClick={() => setActiveTab('disputes')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'disputes'
                  ? 'text-red-500 border-b-2 border-red-500'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Tranh chấp
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">3</span>
            </button>
            <button
              onClick={() => setActiveTab('dispatch')}
              className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${
                activeTab === 'dispatch'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Điều phối
              <span className="ml-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full">12</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'disputes' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {disputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className={`rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${
                      dispute.type === 'urgent'
                        ? 'bg-surface-light dark:bg-[#151e26] border-l-4 border-red-500'
                        : 'bg-surface-light dark:bg-[#151e26] border border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                            dispute.type === 'urgent'
                              ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                              : dispute.type === 'payment'
                              ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'
                              : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {dispute.status}
                        </span>
                        <span className="text-xs text-slate-400">#{dispute.id}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-500">{dispute.timeAgo}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{dispute.title}</h3>

                    {/* Description */}
                    {dispute.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-1">{dispute.description}</p>
                    )}

                    {/* User Info */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                        {dispute.customer}
                      </div>
                      <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">directions_car</span>
                        {dispute.driver}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {dispute.type === 'urgent' ? (
                        <>
                          <button className="flex-1 bg-primary text-white text-xs font-bold py-2.5 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">chat</span>
                            Xử lý
                          </button>
                          <button className="px-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                          </button>
                        </>
                      ) : (
                        <button className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                          Xem chi tiết
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'dispatch' && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-6xl mb-4">route</span>
                <p className="text-slate-500 dark:text-slate-400">Chức năng điều phối đang được phát triển</p>
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button */}
        <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/30 flex items-center justify-center text-white hover:scale-105 transition-transform z-50">
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
    </Layout>
  );
};

export default DispatchManagement;
