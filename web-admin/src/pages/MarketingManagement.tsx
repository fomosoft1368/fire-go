import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import PlacesAutocomplete from '../components/PlacesAutocomplete';

interface MarketingUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'f1_lead' | 'f2_sub_lead' | 'f3_staff_mkt';
  status: 'active' | 'blocked' | 'inactive';
  address?: string;
  region?: { _id: string; name: string; code: string };
  regionId?: string;
  referralCode?: string;
  walletBalance?: number;
  pendingBalance?: number;
  marketingReferrerId?: string;
  avatar?: string;
  createdAt: string;
}

interface Region {
  _id: string;
  name: string;
  code: string;
}

export default function MarketingManagement() {
  const [userInfo, setUserInfo] = useState<any>(null); // currently logged in dashboard user
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<MarketingUser[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotification();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configData, setConfigData] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    regionId: '',
    regionName: '',
    role: 'f3_staff_mkt'
  });

  // Calculate Allowed Role Options Based on Current Session
  const allowedRoles = (() => {
    if (userInfo?.role === 'admin' || userInfo?.role === 'staff') {
      return [
        { value: 'f1_lead', label: 'F1 - Lead Vùng' },
        { value: 'f2_sub_lead', label: 'F2 - Sub Lead' },
        { value: 'f3_staff_mkt', label: 'F3 - Nhân viên MKT' }
      ];
    }
    if (userInfo?.role === 'f1_lead') {
      return [{ value: 'f2_sub_lead', label: 'F2 - Sub Lead' }];
    }
    if (userInfo?.role === 'f2_sub_lead') {
      return [{ value: 'f3_staff_mkt', label: 'F3 - Nhân viên MKT' }];
    }
    return [];
  })();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.get(`/admin/marketing-staff?search=${searchQuery}`);
      // apiService.get handles unboxing if standardApiResponse is used
      // typically api.get(..) returns raw data or standard response
      if (res && res.data) {
        setUsers(res.data);
      } else {
        setUsers(res || []);
      }
    } catch (err: any) {
      console.error('Error fetching marketing users:', err);
      setError('Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const res = await apiService.get('/regions');
      if (res && res.data) {
        setRegions(res.data);
      } else {
        setRegions(res || []);
      }
    } catch (e) {
      console.error('Failed to load regions', e);
    }
  };

  useEffect(() => {
    // Parse user info from token
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const decoded = JSON.parse(atob(parts[1]));
          setUserInfo(decoded);
        }
      }
    } catch (e) {
      console.log('Failed to decode token');
    }

    fetchUsers();
    fetchRegions();
  }, [searchQuery]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
         ...formData,
         status: 'active',
      };
      await apiService.post('/admin/users', payload);
      addNotification('success', 'Thêm mới thành công');
      setShowAddModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        address: '',
        regionId: '',
        regionName: '',
        role: allowedRoles[0]?.value || 'f3_staff_mkt'
      });
      fetchUsers();
    } catch (err: any) {
      addNotification('error', err.message || 'Lỗi khi thêm người dùng');
    }
  };

  const handleOpenConfig = async () => {
    setShowConfigModal(true);
    setConfigLoading(true);
    try {
      const res = await apiService.get('/teams/config/marketing');
      setConfigData(res.data || res);
    } catch (err) {
      addNotification('error', 'Lỗi khi tải cấu hình');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigLoading(true);
    try {
      await apiService.put('/teams/config/marketing', configData);
      addNotification('success', 'Đã lưu cấu hình Marketing');
      setShowConfigModal(false);
    } catch (err) {
      addNotification('error', 'Lỗi khi lưu cấu hình');
    } finally {
      setConfigLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'f1_lead': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">F1 Lead</span>;
      case 'f2_sub_lead': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">F2 Sub Lead</span>;
      case 'f3_staff_mkt': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">F3 Nhân viên</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{role}</span>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Đội ngũ Marketing</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý mạng lưới Referral (F1, F2, F3)</p>
          </div>
          <div className="flex gap-3">
             <button
               onClick={handleOpenConfig}
               className="px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl font-medium transition-colors border border-purple-200"
             >
                <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">settings</span> Cấu hình chung</span>
             </button>
             <button
               onClick={() => setShowAddModal(true)}
               disabled={allowedRoles.length === 0}
               className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-xl font-medium transition-colors disabled:opacity-50"
             >
               + Thêm mới
             </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
           <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <input
                type="text"
                placeholder="Tìm kiếm Email, Tên, Số điện thoại..."
                className="w-1/3 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead>
                 <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                   <th className="px-6 py-4">Tên</th>
                   <th className="px-6 py-4">Chức vụ</th>
                   <th className="px-6 py-4">Khu vực</th>
                   <th className="px-6 py-4">Mã GT</th>
                   <th className="px-6 py-4 text-right">Ví Pending</th>
                   <th className="px-6 py-4 text-right">Ví Hoa Hồng</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 text-sm">
                 {loading ? (
                   <tr>
                     <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                       Đang tải dữ liệu...
                     </td>
                   </tr>
                 ) : users.length === 0 ? (
                   <tr>
                     <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                       Không có nhân viên marketing nào
                     </td>
                   </tr>
                 ) : (
                   users.map(u => (
                     <tr key={u._id} className="hover:bg-gray-50/50">
                       <td className="px-6 py-4">
                         <div className="font-medium text-gray-900">{u.name}</div>
                         <div className="text-gray-500 text-xs">{u.email} • {u.phone}</div>
                       </td>
                       <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                       <td className="px-6 py-4 text-gray-600">{u.region?.name || '---'}</td>
                       <td className="px-6 py-4 font-mono font-medium text-primary-600">{u.referralCode || '---'}</td>
                       <td className="px-6 py-4 text-right text-orange-600">{u.pendingBalance?.toLocaleString() || 0} đ</td>
                       <td className="px-6 py-4 text-right font-medium text-green-600">{u.walletBalance?.toLocaleString() || 0} đ</td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Thêm người dùng Marketing</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleAddUser} className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Đệm</label>
                      <input required type="text" className="w-full px-4 py-2 border rounded-xl" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
                      <input required type="text" className="w-full px-4 py-2 border rounded-xl" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                   </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Gmail)</label>
                  <input required type="email" className="w-full px-4 py-2 border rounded-xl" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input required type="tel" className="w-full px-4 py-2 border rounded-xl" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                  <input required type="password" minLength={6} className="w-full px-4 py-2 border rounded-xl" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực quản lý</label>
                  <PlacesAutocomplete
                    value={formData.regionName}
                    onChange={(val) => setFormData({ ...formData, regionName: val, regionId: '' })}
                    placeholder="Tìm xã/phường, quận/huyện..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Gõ để tìm kiếm khu vực (VD: Quỳnh Lưu, Phường Hưng Bình...)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ (Hiển thị chi tiết)</label>
                  <input required type="text" className="w-full px-4 py-2 border rounded-xl placeholder-gray-300" placeholder="Số nhà, Tên đường..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ cấp bậc</label>
                  <select required className="w-full px-4 py-2 border rounded-xl" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                     {allowedRoles.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                     ))}
                  </select>
                </div>

              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Hủy</button>
                <button type="submit" className="px-4 py-2 text-white bg-black hover:bg-gray-800 rounded-xl">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showConfigModal && configData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600">settings</span> 
                Cấu hình Hoa hồng & KPI Marketing
              </h2>
              <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveConfig} className="flex-1 overflow-y-auto p-6">
              {configLoading ? (
                <div className="text-center text-gray-500 py-10">Đang tải...</div>
              ) : (
                <div className="space-y-8">
                  {/* Tỷ lệ hoa hồng */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-600 text-lg">payments</span>
                      Cấu hình Tỷ lệ Hoa hồng
                    </h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <label className="block text-sm font-bold text-purple-900 mb-1">F1 Lead (%)</label>
                        <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg focus:ring-purple-500" value={configData.rates?.f1Rate || 0} onChange={e => setConfigData({...configData, rates: {...configData.rates, f1Rate: Number(e.target.value)}})} />
                        <p className="text-xs text-purple-600 mt-2">Phần trăm trích từ Phí nền tảng.</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <label className="block text-sm font-bold text-blue-900 mb-1">F2 Sub Lead (%)</label>
                        <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" value={configData.rates?.f2Rate || 0} onChange={e => setConfigData({...configData, rates: {...configData.rates, f2Rate: Number(e.target.value)}})} />
                      </div>
                      <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <label className="block text-sm font-bold text-green-900 mb-1">F3 Sale (%)</label>
                        <input type="number" step="0.1" className="w-full px-3 py-2 border rounded-lg focus:ring-green-500" value={configData.rates?.f3Rate || 0} onChange={e => setConfigData({...configData, rates: {...configData.rates, f3Rate: Number(e.target.value)}})} />
                      </div>
                    </div>
                  </div>

                  {/* Mục tiêu KPIs */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-orange-600 text-lg">trending_up</span>
                      Mục tiêu KPIs (Giao diện)
                    </h3>
                    <div className="space-y-6">
                      {['f1_lead', 'f2_sub_lead', 'f3_staff_mkt'].map(role => {
                         const roleLabel = role === 'f1_lead' ? 'F1 Lead' : role === 'f2_sub_lead' ? 'F2 Sub Lead' : 'F3 Sale';
                         const bg = role === 'f1_lead' ? 'bg-purple-50/50' : role === 'f2_sub_lead' ? 'bg-blue-50/50' : 'bg-emerald-50/50';
                         if (!configData.kpis || !configData.kpis[role]) return null;
                         
                         return (
                           <div key={role} className={`p-4 rounded-xl border ${bg}`}>
                             <div className="mb-3">
                               <label className="font-bold text-gray-800 flex items-center gap-2 mb-1">{roleLabel} - Mô tả chung</label>
                               <input type="text" className="w-full px-3 py-2 border border-white rounded-lg text-sm" value={configData.kpis[role].label || ''} onChange={e => {
                                  const newKpi = {...configData.kpis};
                                  newKpi[role].label = e.target.value;
                                  setConfigData({...configData, kpis: newKpi});
                               }}/>
                             </div>
                             
                             <div className="grid grid-cols-3 gap-4">
                               {[1, 2, 3].map(m => {
                                  const metric = configData.kpis[role][`metric${m}`];
                                  return (
                                     <div key={m} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                                       <label className="block text-xs font-bold text-gray-700 mb-1">Mục tiêu {m}</label>
                                       <div className="space-y-2">
                                          <input type="text" placeholder="Tên" className="w-full px-2 py-1 border rounded text-sm" value={metric.name} onChange={e => {
                                             const newKpi = {...configData.kpis};
                                             newKpi[role][`metric${m}`].name = e.target.value;
                                             setConfigData({...configData, kpis: newKpi});
                                          }}/>
                                          <input type="number" placeholder="Chỉ tiêu" className="w-full px-2 py-1 border rounded text-sm font-bold text-primary-600" value={metric.target} onChange={e => {
                                             const newKpi = {...configData.kpis};
                                             newKpi[role][`metric${m}`].target = Number(e.target.value);
                                             setConfigData({...configData, kpis: newKpi});
                                          }}/>
                                       </div>
                                     </div>
                                  )
                               })}
                             </div>
                           </div>
                         )
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100 sticky bottom-0 bg-white p-4 -m-6 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <button type="button" onClick={() => setShowConfigModal(false)} className="px-6 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium">Hủy bỏ</button>
                <button type="submit" disabled={configLoading} className="px-6 py-2.5 text-white bg-black hover:bg-gray-800 rounded-xl font-medium flex items-center gap-2">
                  {configLoading ? 'Đang lưu...' : 'Lưu Cấu Hình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
