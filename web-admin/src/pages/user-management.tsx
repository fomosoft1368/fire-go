import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';

interface User {
  _id?: string;
  id?: string;
  userId?: string;
  name: string;
  role: 'admin' | 'staff';
  phone: string;
  email: string;
  status: 'active' | 'blocked' | 'pending' | 'inactive';
  avatar?: string;
  initials?: string;
  color?: string;
  createdAt?: string;
}

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked' | 'pending' | 'inactive'>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'staff'>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-all duration-200 shadow-sm">
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
            </div>
        </div>

        {/* Count */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Danh sách ({loading ? '...' : users.length} quản lý viên)
          </p>
        </div>

        {/* User Grid */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {users.map((user) => (
              <div key={user.id} className="group flex flex-col rounded-xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {user.avatar ? (
                      <div 
                        className={`bg-center bg-no-repeat bg-cover rounded-full h-16 w-16 shadow-sm ${user.status === 'blocked' ? 'grayscale' : ''}`}
                        style={{ backgroundImage: `url("${user.avatar}")` }}
                      />
                    ) : (
                      <div className={`flex items-center justify-center ${user.color} rounded-full h-16 w-16 shadow-sm text-white font-bold text-xl`}>
                        {user.initials}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-white dark:bg-slate-800 p-0.5">
                      <span className={`block h-4 w-4 rounded-full ${getStatusIndicator(user.status)} ring-2 ring-white dark:ring-slate-800`}></span>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold leading-tight truncate">{user.name}</h3>
                        <p className={`text-xs font-semibold mt-1 ${user.role === 'admin' ? 'text-red-600' : 'text-blue-600'}`}>
                          {user.role === 'admin' ? 'Quản lý viên' : 'Nhân viên'}
                        </p>
                      </div>
                      <button className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </div>
                    
                    <div className="mb-3">
                      {getStatusBadge(user.status)}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-[18px]">call</span>
                        <p className="text-sm font-normal">{user.phone}</p>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                        <p className="text-sm font-normal truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
