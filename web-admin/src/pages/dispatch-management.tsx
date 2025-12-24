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
        {/* Google Map Embed - Only show this map */}
        <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm" style={{height: '400px'}}>
          <iframe
            title="Google Map"
            width="100%"
            height="400"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps/embed/v1/view?key=AIzaSyAai1d44WZ45BaJdj-LCldBozmjconjRos&center=10.762622,106.660172&zoom=12&maptype=roadmap"
          ></iframe>
        </div>

        {/* Stat Cards Row */}
        <div className="flex flex-row gap-4 mb-6">
          <div className="flex-1 bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-2xl font-bold text-primary">142</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Cuốc xe</span>
          </div>
          <div className="flex-1 bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-2xl font-bold text-emerald-500">58</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Tài xế</span>
          </div>
          <div className="flex-1 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-2xl font-bold text-red-500">3</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Tranh chấp</span>
          </div>
        </div>
        </div>

        {/* Map Container */}

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
    </Layout>
  );
};

export default DispatchManagement;
