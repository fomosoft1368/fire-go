import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';

interface User {
  _id?: string;
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'staff' | 'moderator' | 'support';
  status: 'active' | 'blocked' | 'pending' | 'inactive';
  avatar?: string;
  initials?: string;
  color?: string;
  createdAt?: string;
  department?: string;
  permissions?: string[];
  isVerified?: boolean;
  lastActive?: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

const PERMISSIONS: Permission[] = [
  // Dispatch Management
  { id: 'view_dispatch', name: 'Xem điều phối', description: 'Xem danh sách cuốc xe', category: 'Điều phối' },
  { id: 'manage_dispatch', name: 'Quản lý điều phối', description: 'Chỉnh sửa thông tin cuốc xe', category: 'Điều phối' },
  { id: 'resolve_disputes', name: 'Xử lý tranh chấp', description: 'Xử lý yêu cầu tranh chấp', category: 'Điều phối' },
  
  // Driver Management
  { id: 'view_drivers', name: 'Xem tài xế', description: 'Xem danh sách tài xế', category: 'Tài xế' },
  { id: 'approve_drivers', name: 'Duyệt tài xế', description: 'Duyệt/từ chối tài xế mới', category: 'Tài xế' },
  { id: 'suspend_drivers', name: 'Tạm khóa tài xế', description: 'Tạm khóa tài xế', category: 'Tài xế' },
  { id: 'manage_drivers', name: 'Quản lý tài xế', description: 'Sửa xóa thông tin tài xế', category: 'Tài xế' },
  
  // Customer Management
  { id: 'view_customers', name: 'Xem khách hàng', description: 'Xem danh sách khách hàng', category: 'Khách hàng' },
  { id: 'block_customers', name: 'Khóa khách hàng', description: 'Khóa tài khoản khách hàng', category: 'Khách hàng' },
  { id: 'manage_customers', name: 'Quản lý khách hàng', description: 'Sửa xóa thông tin khách hàng', category: 'Khách hàng' },
  
  // Financial
  { id: 'view_revenue', name: 'Xem doanh thu', description: 'Xem báo cáo doanh thu', category: 'Tài chính' },
  { id: 'manage_payments', name: 'Quản lý thanh toán', description: 'Xử lý hoàn tiền, thanh toán', category: 'Tài chính' },
  { id: 'view_wallets', name: 'Xem ví', description: 'Xem ví khách hàng và tài xế', category: 'Tài chính' },
  
  // System
  { id: 'manage_users', name: 'Quản lý người dùng', description: 'Thêm/sửa/xóa người dùng', category: 'Hệ thống' },
  { id: 'manage_permissions', name: 'Quản lý quyền', description: 'Thay đổi quyền người dùng', category: 'Hệ thống' },
  { id: 'view_logs', name: 'Xem nhật ký', description: 'Xem nhật ký hoạt động', category: 'Hệ thống' },
  { id: 'manage_settings', name: 'Quản lý cài đặt', description: 'Cấu hình hệ thống', category: 'Hệ thống' },
];

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked' | 'pending' | 'inactive'>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'staff' | 'moderator' | 'support'>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    department: '',
    role: 'staff' as 'admin' | 'staff' | 'moderator' | 'support',
    status: 'active' as 'active' | 'blocked' | 'pending' | 'inactive',
    permissions: [] as string[]
  });

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🚀 Fetching admin/staff users from API...');
        const allUsers = await apiService.getAdminUsers({
          role: filterRole !== 'all' ? filterRole : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          search: searchQuery || undefined,
        });

        console.log('📦 API Response:', allUsers);
        console.log('📊 Number of users:', allUsers?.length || 0);

        // Transform API response
        const transformedUsers = allUsers.map((user: any) => ({
          ...user,
          id: user._id,
          initials: user.name
            .split(' ')
            .slice(0, 2)
            .map((n: string) => n[0])
            .join(''),
          color: user.role === 'admin' ? 'bg-red-600' : 'bg-blue-600',
        }));

        setUsers(transformedUsers);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Lỗi tải dữ liệu quản lý viên';
        console.error('❌ Error fetching users:', err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [filterRole, filterStatus, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center rounded-md bg-green-400/10 px-2 py-1 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-400/20">
            Hoạt động
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center rounded-md bg-red-400/10 px-2 py-1 text-xs font-medium text-red-500 ring-1 ring-inset ring-red-400/20">
            Đã khóa
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-400/20">
            Chờ duyệt
          </span>
        );
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'blocked':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleAddUser = async () => {
    if (!formData.firstName || !formData.email || !formData.phone || !formData.password) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const newUser = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        department: formData.department,
        role: formData.role,
        status: formData.status,
        permissions: formData.permissions,
      };

      console.log('📤 Creating user:', newUser);
      await apiService.createUser(newUser);
      console.log('✅ User created successfully');
      alert('Thêm người dùng thành công!');
      setShowAddModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        department: '',
        role: 'staff' as 'admin' | 'staff' | 'moderator' | 'support',
        status: 'active' as 'active' | 'blocked' | 'pending' | 'inactive',
        permissions: []
      });
      
      // Reload users
      const allUsers = await apiService.getAdminUsers();
      const transformedUsers = allUsers.map((user: any) => ({
        ...user,
        id: user._id,
        initials: user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join(''),
        color: user.role === 'admin' ? 'bg-red-600' : 'bg-blue-600',
      }));
      setUsers(transformedUsers);
    } catch (err) {
      console.error('❌ Error adding user:', err);
      alert('Lỗi khi thêm người dùng: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !formData.firstName || !formData.email || !formData.phone) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        role: formData.role,
        status: formData.status,
        permissions: formData.permissions,
      };

      console.log('📝 Updating user:', updateData);
      await apiService.updateUser(selectedUser._id || selectedUser.id || '', updateData);
      console.log('✅ User updated successfully');
      alert('Cập nhật người dùng thành công!');
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        department: '',
        role: 'staff' as 'admin' | 'staff' | 'moderator' | 'support',
        status: 'active' as 'active' | 'blocked' | 'pending' | 'inactive',
        permissions: []
      });
      
      // Reload users
      const allUsers = await apiService.getAdminUsers();
      const transformedUsers = allUsers.map((user: any) => ({
        ...user,
        id: user._id,
        initials: user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join(''),
        color: user.role === 'admin' ? 'bg-red-600' : 'bg-blue-600',
      }));
      setUsers(transformedUsers);
    } catch (err) {
      console.error('❌ Error updating user:', err);
      alert('Lỗi khi cập nhật người dùng: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const userId = selectedUser._id || selectedUser.id;
      if (!userId) {
        alert('Không tìm thấy ID người dùng');
        return;
      }
      console.log('🗑️ Deleting user:', userId);
      await apiService.deleteUser(userId as string);
      console.log('✅ User deleted successfully');
      alert('Xóa người dùng thành công!');
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      setUsers(users.filter(u => u._id !== selectedUser._id && u.id !== selectedUser.id));
    } catch (err) {
      console.error('❌ Error deleting user:', err);
      alert('Lỗi khi xóa người dùng: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName || user.name?.split(' ')[0] || '',
      lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
      email: user.email,
      phone: user.phone,
      password: '',
      department: user.department || '',
      role: user.role,
      status: user.status,
      permissions: user.permissions || []
    });
    setShowEditModal(true);
  };

  const openPermissionsModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName || user.name?.split(' ')[0] || '',
      lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
      email: user.email,
      phone: user.phone,
      password: '',
      department: user.department || '',
      role: user.role,
      status: user.status,
      permissions: user.permissions || []
    });
    setShowPermissionsModal(true);
  };

  const openDetailModal = (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-red-600';
      case 'staff':
        return 'text-blue-600';
      case 'moderator':
        return 'text-purple-600';
      case 'support':
        return 'text-green-600';
      default:
        return 'text-slate-600';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Quản lý viên';
      case 'staff':
        return 'Nhân viên';
      case 'moderator':
        return 'Người kiểm duyệt';
      case 'support':
        return 'Hỗ trợ khách hàng';
      default:
        return 'Không xác định';
    }
  };

  return (
    <Layout>
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400">
            <p className="font-medium">Lỗi: {error}</p>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => {
              setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                password: '',
                department: '',
                role: 'staff' as 'admin' | 'staff' | 'moderator' | 'support',
                status: 'active' as 'active' | 'blocked' | 'pending' | 'inactive',
                permissions: []
              });
              setShowAddModal(true);
            }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-all duration-200 shadow-sm">
              <span className="material-symbols-outlined filled" style={{ fontSize: '20px' }}>add</span>
              <span className="font-semibold">Thêm người dùng</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl w-full">
              <div className="flex w-full items-center rounded-lg h-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                <div className="flex items-center justify-center pl-4 text-slate-400 dark:text-slate-500">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input 
                  className="flex w-full flex-1 bg-transparent border-none text-base font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white focus:ring-0 h-full px-3 rounded-lg" 
                  placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 items-center flex-wrap">
              <button 
                className={`flex h-10 items-center justify-center gap-x-2 rounded-lg px-4 transition-all ${
                  filterStatus === 'all' 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                onClick={() => setFilterStatus('all')}
              >
                <p className="text-sm font-semibold">Tất cả</p>
              </button>
              <button 
                className={`flex h-10 items-center justify-center gap-x-2 rounded-lg px-4 transition-all ${
                  filterStatus === 'active' 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                onClick={() => setFilterStatus('active')}
              >
                <p className="text-sm font-medium">Hoạt động</p>
              </button>
              <button 
                className={`flex h-10 items-center justify-center gap-x-2 rounded-lg px-4 transition-all ${
                  filterStatus === 'blocked' 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                onClick={() => setFilterStatus('blocked')}
              >
                <p className="text-sm font-medium">Đã khóa</p>
              </button>
              <button 
                className={`flex h-10 items-center justify-center gap-x-2 rounded-lg px-4 transition-all ${
                  filterStatus === 'pending' 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                onClick={() => setFilterStatus('pending')}
              >
                <p className="text-sm font-medium">Chờ duyệt</p>
              </button>

              {/* Role Filter */}
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
              <button 
                className={`flex h-10 items-center justify-center gap-x-2 rounded-lg px-4 transition-all text-xs ${
                  filterRole === 'all' 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                onClick={() => setFilterRole('all')}
              >
                <p>Tất cả vai trò</p>
              </button>
              <button 
                className={`flex h-10 items-center justify-center gap-x-2 rounded-lg px-4 transition-all text-xs ${
                  filterRole === 'admin' 
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                onClick={() => setFilterRole('admin')}
              >
                <p>Admin</p>
              </button>
              <button 
                className={`flex h-10 items-center justify-center gap-x-2 rounded-lg px-4 transition-all text-xs ${
                  filterRole === 'staff' 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                onClick={() => setFilterRole('staff')}
              >
                <p>Staff</p>
              </button>
            </div>
        </div>

        {/* Count */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Danh sách ({loading ? '...' : users.length} quản lý viên)
          </p>
        </div>

        {/* User Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin">
              <span className="material-symbols-outlined text-3xl text-primary">autorenew</span>
            </div>
            <span className="ml-3 text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">admin_panel_settings</span>
            <p className="text-slate-500 dark:text-slate-400">Không tìm thấy quản lý viên</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Người dùng</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Điện thoại</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Vai trò</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Phòng ban</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 dark:text-white">Trạng thái</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-900 dark:text-white">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {user.avatar ? (
                            <div 
                              className={`bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 shadow-sm ${user.status === 'blocked' ? 'grayscale' : ''}`}
                              style={{ backgroundImage: `url("${user.avatar}")` }}
                            />
                          ) : (
                            <div className={`flex items-center justify-center ${user.color} rounded-full h-10 w-10 shadow-sm text-white font-bold text-sm`}>
                              {user.initials}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 rounded-full bg-white dark:bg-slate-800 p-0.5">
                            <span className={`block h-3 w-3 rounded-full ${getStatusIndicator(user.status)} ring-1.5 ring-white dark:ring-slate-800`}></span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{user.email}</p>
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{user.phone}</p>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <p className={`text-xs font-semibold ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </p>
                    </td>

                    {/* Department */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{user.department || '—'}</p>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {getStatusBadge(user.status)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openPermissionsModal(user)} className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors" title="Phân quyền">
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock</span>
                        </button>
                        <button onClick={() => openDetailModal(user)} className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors" title="Chi tiết">
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
                        </button>
                        <button onClick={() => openEditModal(user)} className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors" title="Sửa">
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                        </button>
                        <button onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); }} className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Xóa">
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ADD MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Thêm người dùng mới</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Name Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tên</label>
                    <input 
                      type="text" 
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                      placeholder="Tên"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Họ</label>
                    <input 
                      type="text" 
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                      placeholder="Họ"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                    placeholder="Email"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Số điện thoại</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                    placeholder="Số điện thoại"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Mật khẩu</label>
                  <input 
                    type="password" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                    placeholder="Mật khẩu"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Phòng ban</label>
                  <input 
                    type="text" 
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                    placeholder="Phòng ban"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Vai trò</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  >
                    <option value="staff">Nhân viên</option>
                    <option value="moderator">Người kiểm duyệt</option>
                    <option value="support">Hỗ trợ khách hàng</option>
                    <option value="admin">Quản lý viên</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Trạng thái</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Không hoạt động</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="blocked">Đã khóa</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 p-6 flex justify-end gap-3">
                <button onClick={() => setShowAddModal(false)} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition-all">
                  Hủy
                </button>
                <button onClick={handleAddUser} className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-all">
                  Thêm người dùng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chỉnh sửa người dùng</h2>
                <button onClick={() => { setShowEditModal(false); setSelectedUser(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Name Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tên</label>
                    <input 
                      type="text" 
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                      placeholder="Tên"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Họ</label>
                    <input 
                      type="text" 
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                      placeholder="Họ"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                    placeholder="Email"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Số điện thoại</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                    placeholder="Số điện thoại"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Phòng ban</label>
                  <input 
                    type="text" 
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                    placeholder="Phòng ban"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Vai trò</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  >
                    <option value="staff">Nhân viên</option>
                    <option value="moderator">Người kiểm duyệt</option>
                    <option value="support">Hỗ trợ khách hàng</option>
                    <option value="admin">Quản lý viên</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Trạng thái</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Không hoạt động</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="blocked">Đã khóa</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 p-6 flex justify-end gap-3">
                <button onClick={() => { setShowEditModal(false); setSelectedUser(null); }} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition-all">
                  Hủy
                </button>
                <button onClick={handleEditUser} className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-all">
                  Cập nhật
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PERMISSIONS MODAL */}
        {showPermissionsModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Phân quyền</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedUser.name} - {getRoleLabel(selectedUser.role)}</p>
                </div>
                <button onClick={() => { setShowPermissionsModal(false); setSelectedUser(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6">
                {/* Group permissions by category */}
                {Array.from(new Set(PERMISSIONS.map(p => p.category))).map(category => (
                  <div key={category} className="mb-6">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">folder_open</span>
                      {category}
                    </h3>
                    <div className="space-y-2 pl-7">
                      {PERMISSIONS.filter(p => p.category === category).map(permission => (
                        <label key={permission.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-all">
                          <input 
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="w-5 h-5 rounded-lg accent-primary"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 dark:text-white">{permission.name}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{permission.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 p-6 flex justify-end gap-3">
                <button onClick={() => { setShowPermissionsModal(false); setSelectedUser(null); }} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition-all">
                  Hủy
                </button>
                <button onClick={() => {
                  console.log('💾 Saving permissions:', formData.permissions);
                  apiService.updateUserPermissions(selectedUser._id || selectedUser.id || '', formData.permissions)
                    .then(() => {
                      alert('Cập nhật quyền thành công!');
                      setShowPermissionsModal(false);
                      setSelectedUser(null);
                    })
                    .catch((err) => {
                      console.error('❌ Error updating permissions:', err);
                      alert('Lỗi khi cập nhật quyền: ' + (err instanceof Error ? err.message : 'Unknown error'));
                    });
                }} className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-all">
                  Lưu quyền
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DETAIL MODAL */}
        {showDetailModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chi tiết người dùng</h2>
                <button onClick={() => { setShowDetailModal(false); setSelectedUser(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Header Section */}
                <div className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
                  {selectedUser.avatar ? (
                    <div 
                      className="h-20 w-20 rounded-full bg-center bg-no-repeat bg-cover shadow-sm"
                      style={{ backgroundImage: `url("${selectedUser.avatar}")` }}
                    />
                  ) : (
                    <div className={`flex items-center justify-center ${selectedUser.color} rounded-full h-20 w-20 shadow-sm text-white font-bold text-2xl`}>
                      {selectedUser.initials}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedUser.name}</h3>
                    <p className={`text-sm font-semibold mt-1 ${getRoleColor(selectedUser.role)}`}>
                      {getRoleLabel(selectedUser.role)}
                    </p>
                    <div className="mt-2">{getStatusBadge(selectedUser.status)}</div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">mail</span>
                    Thông tin liên hệ
                  </h4>
                  <div className="space-y-3 pl-7">
                    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-600 dark:text-slate-400">Email:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-600 dark:text-slate-400">Điện thoại:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedUser.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Work Information */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">apartment</span>
                    Thông tin công việc
                  </h4>
                  <div className="space-y-3 pl-7">
                    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-600 dark:text-slate-400">Phòng ban:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedUser.department || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-600 dark:text-slate-400">Vai trò:</span>
                      <span className={`font-medium ${getRoleColor(selectedUser.role)}`}>{getRoleLabel(selectedUser.role)}</span>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">account_circle</span>
                    Thông tin tài khoản
                  </h4>
                  <div className="space-y-3 pl-7">
                    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-600 dark:text-slate-400">Trạng thái:</span>
                      <span>{getStatusBadge(selectedUser.status)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-600 dark:text-slate-400">Ngày tạo:</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-600 dark:text-slate-400">Hoạt động cuối:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedUser.lastActive || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                {selectedUser.permissions && selectedUser.permissions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">lock</span>
                      Quyền được phép
                    </h4>
                    <div className="pl-7 flex flex-wrap gap-2">
                      {selectedUser.permissions.map(perm => {
                        const permission = PERMISSIONS.find(p => p.id === perm);
                        return permission ? (
                          <span key={perm} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                            {permission.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 p-6 flex justify-end gap-3">
                <button onClick={() => { setShowDetailModal(false); setSelectedUser(null); }} className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-all">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {showDeleteConfirm && selectedUser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30">
                    <span className="material-symbols-outlined text-3xl text-red-600">delete_outline</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Xóa người dùng?</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Bạn có chắc chắn muốn xóa <strong>{selectedUser.name}</strong>? Hành động này không thể hoàn tác.
                </p>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 p-6 flex justify-end gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setSelectedUser(null); }} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition-all">
                  Hủy
                </button>
                <button onClick={handleDeleteUser} className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all">
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
