import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import CustomerDetailModal from '../components/CustomerDetailModal';
import { apiService } from '../services/api';

interface Customer {
  _id?: string;
  id?: string;
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  totalTrips: number;
  totalSpent: number;
  averageRating: number;
  status?: 'active' | 'inactive' | 'blocked';
  joinedDate?: string;
  lastActive?: string;
  displayName?: string;
  displayStatus?: 'active' | 'inactive' | 'blocked';
  isBlacklisted?: boolean;
  isAccountLocked?: boolean;
  createdAt?: string;
  address?: string;
}

const Customers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    avatar: '',
    password: ''
  });
  const itemsPerPage = 10;

  // Fetch customers data
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🚀 Fetching customers from API...');
        const allCustomers = await apiService.getCustomers();

        console.log('📦 API Response:', allCustomers);
        console.log('📊 Number of customers:', allCustomers?.length || 0);

        if (!allCustomers || allCustomers.length === 0) {
          console.warn('⚠️ No customers found in response');
          setCustomers([]);
          setLoading(false);
          return;
        }

        // Transform API response to UI format
        const transformedCustomers = allCustomers.map((customer: any, idx: number) => {
          // Get name from firstName/lastName or from populated userId
          const userInfo = customer.userId || {};
          const firstName = customer.firstName || userInfo.fullName?.split(' ')[0] || userInfo.name?.split(' ')[0] || '';
          const lastName = customer.lastName || userInfo.fullName?.split(' ').slice(1).join(' ') || '';
          const displayName = `${firstName} ${lastName}`.trim() || 'Chưa có tên';
          const email = customer.email || userInfo.email || 'N/A';
          const phone = customer.phone || userInfo.phone || 'N/A';
          const avatar = customer.avatar || `https://i.pravatar.cc/150?u=${email}`;
          
          return {
            ...customer,
            displayName,
            email,
            phone,
            avatar,
            displayStatus: customer.isBlacklisted ? 'blocked' : 
                          customer.isAccountLocked ? 'inactive' : 'active',
            status: customer.isBlacklisted ? 'blocked' : 
                   customer.isAccountLocked ? 'inactive' : 'active',
            joinedDate: customer.createdAt ? 
              new Date(customer.createdAt).toLocaleDateString('vi-VN') : 'N/A',
            lastActive: '2 giờ trước' // Placeholder - need to track in backend
          };
        });

        console.log('✅ Transformed customers:', transformedCustomers.length, transformedCustomers);
        setCustomers(transformedCustomers);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Lỗi tải dữ liệu khách hàng';
        console.error('❌ Error fetching customers:', err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleAddCustomer = async () => {
    if (!formData.firstName || !formData.email || !formData.phone) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const newCustomer: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        avatar: formData.avatar || `https://i.pravatar.cc/150?u=${formData.email}`,
        password: formData.password
      };

      // Chỉ thêm dateOfBirth nếu có dữ liệu
      if (formData.dateOfBirth) {
        newCustomer.dateOfBirth = formData.dateOfBirth;
      }

      await apiService.createCustomer(newCustomer);
      alert('Thêm khách hàng thành công!');
      setShowAddModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        dateOfBirth: '',
        avatar: '',
        password: ''
      });
      
      // Reload customers
      const allCustomers = await apiService.getCustomers();
      const transformedCustomers = allCustomers.map((customer: any) => {
        const userInfo = customer.userId || {};
        return {
          ...customer,
          displayName: userInfo.fullName || userInfo.name || 'Chưa có tên',
          email: userInfo.email || 'N/A',
          phone: userInfo.phone || 'N/A',
          avatar: `https://i.pravatar.cc/150?u=${userInfo._id || customer._id}`,
          displayStatus: customer.isBlacklisted ? 'blocked' : 
                        customer.isAccountLocked ? 'inactive' : 'active',
          status: customer.isBlacklisted ? 'blocked' : 
                 customer.isAccountLocked ? 'inactive' : 'active',
          joinedDate: customer.createdAt ? 
            new Date(customer.createdAt).toLocaleDateString('vi-VN') : 'N/A',
          lastActive: '2 giờ trước'
        };
      });
      setCustomers(transformedCustomers);
    } catch (err) {
      console.error('Error adding customer:', err);
      alert('Lỗi khi thêm khách hàng: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer || !formData.firstName || !formData.email || !formData.phone) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address
      };

      // Chỉ thêm dateOfBirth nếu có dữ liệu
      if (formData.dateOfBirth) {
        updateData.dateOfBirth = formData.dateOfBirth;
      }

      await apiService.updateCustomer(selectedCustomer._id || selectedCustomer.id || '', updateData);
      alert('Cập nhật khách hàng thành công!');
      setShowEditModal(false);
      setSelectedCustomer(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        dateOfBirth: '',
        avatar: '',
        password: ''
      });
      
      // Reload customers
      const allCustomers2 = await apiService.getCustomers();
      const transformedCustomers2 = allCustomers2.map((customer: any) => {
        const userInfo = customer.userId || {};
        const firstName = customer.firstName || userInfo.fullName?.split(' ')[0] || userInfo.name?.split(' ')[0] || '';
        const lastName = customer.lastName || userInfo.fullName?.split(' ').slice(1).join(' ') || '';
        const displayName = `${firstName} ${lastName}`.trim() || 'Chưa có tên';
        const email = customer.email || userInfo.email || 'N/A';
        const phone = customer.phone || userInfo.phone || 'N/A';
        const avatar = customer.avatar || `https://i.pravatar.cc/150?u=${email}`;
        
        return {
          ...customer,
          displayName,
          email,
          phone,
          avatar,
          displayStatus: customer.isBlacklisted ? 'blocked' : 
                        customer.isAccountLocked ? 'inactive' : 'active',
          status: customer.isBlacklisted ? 'blocked' : 
                 customer.isAccountLocked ? 'inactive' : 'active',
          joinedDate: customer.createdAt ? 
            new Date(customer.createdAt).toLocaleDateString('vi-VN') : 'N/A',
          lastActive: '2 giờ trước'
        };
      });
      setCustomers(transformedCustomers2);
    } catch (err) {
      console.error('Error updating customer:', err);
      alert('Lỗi khi cập nhật khách hàng: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      const customerId = selectedCustomer._id || selectedCustomer.id;
      if (!customerId) {
        alert('Không tìm thấy ID khách hàng');
        return;
      }

      console.log('🗑️ Deleting customer:', customerId);
      const response = await apiService.deleteCustomer(customerId);
      console.log('✅ Delete response:', response);
      
      alert('Xóa khách hàng thành công!');
      setShowDeleteConfirm(false);
      setSelectedCustomer(null);
      // Remove from state
      setCustomers(customers.filter(c => c._id !== selectedCustomer._id && c.id !== selectedCustomer.id));
    } catch (err) {
      console.error('❌ Error deleting customer:', err);
      alert('Lỗi khi xóa khách hàng: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const openEditModal = (customer: Customer) => {
    const userInfo = customer.userId || {};
    const [firstName, ...lastNameParts] = ((userInfo as any).fullName || (userInfo as any).name || '').split(' ');
    setSelectedCustomer(customer);
    setFormData({
      firstName: firstName || '',
      lastName: lastNameParts.join(' ') || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      dateOfBirth: customer.createdAt ? new Date(customer.createdAt).toISOString().split('T')[0] : '',
      avatar: customer.avatar || '',
      password: ''
    });
    setShowEditModal(true);
  };

  const stats = [
    {
      title: 'Tổng khách hàng',
      value: customers.length.toString(),
      change: '+12%',
      isPositive: true,
      icon: 'group',
      iconBg: 'bg-[#FF6B00]/10 text-[#FF6B00]'
    },
    {
      title: 'Khách hàng mới',
      value: customers.filter(c => {
        const createdDate = new Date(c.createdAt || 0);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return createdDate > sevenDaysAgo;
      }).length.toString(),
      change: '+8%',
      isPositive: true,
      icon: 'person_add',
      iconBg: 'bg-green-500/10 text-green-500'
    },
    {
      title: 'Khách hàng hoạt động',
      value: customers.filter(c => c.displayStatus === 'active').length.toString(),
      change: '+5%',
      isPositive: true,
      icon: 'trending_up',
      iconBg: 'bg-orange-500/10 text-orange-500'
    },
    {
      title: 'Bị chặn',
      value: customers.filter(c => c.displayStatus === 'blocked').length.toString(),
      change: '-15%',
      isPositive: true,
      icon: 'block',
      iconBg: 'bg-red-500/10 text-red-500'
    }
  ];

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = (customer.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (customer.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (customer.phone || '').includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'inactive':
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
      case 'blocked':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Hoạt động';
      case 'inactive':
        return 'Không hoạt động';
      case 'blocked':
        return 'Bị chặn';
      default:
        return '';
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-xl p-5 bg-white dark:bg-[#1E252B] shadow-sm border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between">
                <div className={`flex items-center justify-center size-10 rounded-full ${stat.iconBg}`}>
                  <span className="material-symbols-outlined">{stat.icon}</span>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold leading-normal flex items-center gap-1 ${
                    stat.isPositive ? 'text-[#0bda5b] bg-[#0bda5b]/10' : 'text-red-500 bg-red-500/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {stat.isPositive ? 'trending_up' : 'trending_down'}
                  </span>
                  {stat.change}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-slate-500 dark:text-[#9dabb9] text-xs font-medium uppercase tracking-wider">
                  {stat.title}
                </p>
                <p className="text-slate-900 dark:text-white tracking-tight text-2xl font-bold leading-tight mt-1">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-[#1E252B] rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 w-full md:w-auto">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'active', label: 'Hoạt động' },
                { id: 'inactive', label: 'Không hoạt động' },
                { id: 'blocked', label: 'Bị chặn' }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === filter.id
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Add Customer Button */}
            <button 
              onClick={() => {
                setFormData({
                  firstName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  address: '',
                  dateOfBirth: '',
                  avatar: '',
                  password: ''
                });
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#e56200] text-white font-medium rounded-lg shadow-sm transition-all whitespace-nowrap">
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Thêm khách hàng</span>
            </button>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white dark:bg-[#1E252B] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin">
                <span className="material-symbols-outlined text-3xl text-[#FF6B00]">autorenew</span>
              </div>
              <span className="ml-3 text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</span>
            </div>
          ) : paginatedCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">group</span>
              <p className="text-slate-500 dark:text-slate-400">Không tìm thấy khách hàng</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Khách hàng
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Liên hệ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Số chuyến
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Tổng chi tiêu
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Đánh giá
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Hoạt động gần đây
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {paginatedCustomers.map((customer) => (
                    <tr
                      key={customer._id || customer.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={customer.avatar}
                            alt={customer.displayName}
                            className="w-[45px] h-[45px] rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {customer.displayName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {customer.joinedDate}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm min-w-0">
                          <p className="text-slate-900 dark:text-white truncate mb-1">{customer.email}</p>
                          <p className="text-slate-500 dark:text-slate-400 truncate">{customer.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {customer.totalTrips || 0}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {(customer.totalSpent || 0).toLocaleString('vi-VN')}₫
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-yellow-500 text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                            star
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {(customer.averageRating || 0).toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(customer.displayStatus || 'active')}`}>
                          {getStatusText(customer.displayStatus || 'active')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {customer.lastActive}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowDetailModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                            title="Xem chi tiết">
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </button>
                          <button 
                            onClick={() => openEditModal(customer)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Hiển thị {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} trong tổng số {filteredCustomers.length} khách hàng
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentPage === i + 1
                        ? 'bg-[#FF6B00] text-white'
                        : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1E252B] rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Thêm khách hàng mới</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tên</label>
                  <input 
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    placeholder="Tên"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Họ</label>
                  <input 
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    placeholder="Họ"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Số điện thoại</label>
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="0901234567"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mật khẩu</label>
                <input 
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Nhập mật khẩu"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Địa chỉ</label>
                <input 
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Địa chỉ"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ngày sinh</label>
                <input 
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Avatar</label>
                <div className="flex items-center gap-3">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar preview" className="w-12 h-12 rounded-full object-cover border border-slate-300 dark:border-slate-600" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                  )}
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setFormData({...formData, avatar: evt.target?.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Nếu không tải avatar sẽ tự động tạo avatar từ email</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Hủy
              </button>
              <button 
                onClick={handleAddCustomer}
                className="flex-1 px-4 py-2 bg-[#FF6B00] text-white font-medium rounded-lg hover:bg-[#e56200] transition-colors">
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1E252B] rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sửa thông tin khách hàng</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tên</label>
                  <input 
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    placeholder="Tên"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Họ</label>
                  <input 
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    placeholder="Họ"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Số điện thoại</label>
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="0901234567"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Địa chỉ</label>
                <input 
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Địa chỉ"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ngày sinh</label>
                <input 
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Avatar</label>
                <div className="flex items-center gap-3">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar preview" className="w-12 h-12 rounded-full object-cover border border-slate-300 dark:border-slate-600" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                  )}
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setFormData({...formData, avatar: evt.target?.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] text-sm"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Nếu không tải avatar sẽ tự động tạo avatar từ email</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Hủy
              </button>
              <button 
                onClick={handleEditCustomer}
                className="flex-1 px-4 py-2 bg-[#FF6B00] text-white font-medium rounded-lg hover:bg-[#e56200] transition-colors">
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1E252B] rounded-xl shadow-lg max-w-sm w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-2">
              Xác nhận xóa khách hàng
            </h3>
            
            <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
              Bạn có chắc chắn muốn xóa khách hàng <strong>{selectedCustomer.displayName}</strong>? Hành động này không thể hoàn tác.
            </p>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Hủy
              </button>
              <button 
                onClick={handleDeleteCustomer}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {showDetailModal && selectedCustomer && (
        <CustomerDetailModal 
          customer={selectedCustomer} 
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCustomer(null);
          }} 
        />
      )}
    </Layout>
  );
};

export default Customers;
