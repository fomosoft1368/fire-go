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
          <button
            onClick={() => setShowAddModal(true)}
            disabled={allowedRoles.length === 0}
            className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            + Thêm mới
          </button>
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
    </Layout>
  );
}
