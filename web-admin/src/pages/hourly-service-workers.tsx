import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { apiService } from '../services/api'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  Rating,
  Avatar,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Eye as EyeIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
} from '@mui/icons-material'

interface HourlyWorker {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatar?: string
  status: 'active' | 'inactive' | 'suspended'
  rating: number
  totalRatings: number
  completedServices: number
  totalEarnings: number
  joinDate: string
  approvalStatus: 'pending' | 'approved' | 'rejected'
  documentVerification: {
    idCard: boolean
    backgroundCheck: boolean
    serviceRating: boolean
  }
}

export default function HourlyServiceWorkers() {
  const [workers, setWorkers] = useState<HourlyWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
  const [selectedWorker, setSelectedWorker] = useState<HourlyWorker | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    totalEarnings: 0,
  })

  // Mock data for development
  const mockWorkers: HourlyWorker[] = [
    {
      _id: '1',
      firstName: 'Thị',
      lastName: 'Hoa',
      email: 'hoa.thi@example.com',
      phone: '0987654321',
      avatar: 'https://via.placeholder.com/40?text=Hoa',
      status: 'active',
      rating: 4.9,
      totalRatings: 128,
      completedServices: 245,
      totalEarnings: 15500000,
      joinDate: '2024-01-15',
      approvalStatus: 'approved',
      documentVerification: {
        idCard: true,
        backgroundCheck: true,
        serviceRating: true,
      },
    },
    {
      _id: '2',
      firstName: 'Thu',
      lastName: 'Hương',
      email: 'huong.thu@example.com',
      phone: '0912345678',
      avatar: 'https://via.placeholder.com/40?text=Huong',
      status: 'active',
      rating: 4.7,
      totalRatings: 95,
      completedServices: 187,
      totalEarnings: 12300000,
      joinDate: '2024-02-20',
      approvalStatus: 'approved',
      documentVerification: {
        idCard: true,
        backgroundCheck: true,
        serviceRating: true,
      },
    },
    {
      _id: '3',
      firstName: 'Linh',
      lastName: 'Nguyễn',
      email: 'linh.nguyen@example.com',
      phone: '0923456789',
      avatar: 'https://via.placeholder.com/40?text=Linh',
      status: 'inactive',
      rating: 4.5,
      totalRatings: 62,
      completedServices: 98,
      totalEarnings: 8900000,
      joinDate: '2024-03-10',
      approvalStatus: 'approved',
      documentVerification: {
        idCard: true,
        backgroundCheck: false,
        serviceRating: true,
      },
    },
    {
      _id: '4',
      firstName: 'Hạnh',
      lastName: 'Trần',
      email: 'hanh.tran@example.com',
      phone: '0934567890',
      avatar: 'https://via.placeholder.com/40?text=Hanh',
      status: 'active',
      rating: 0,
      totalRatings: 0,
      completedServices: 0,
      totalEarnings: 0,
      joinDate: '2024-11-01',
      approvalStatus: 'pending',
      documentVerification: {
        idCard: true,
        backgroundCheck: false,
        serviceRating: false,
      },
    },
  ]

  useEffect(() => {
    fetchWorkers()
  }, [])

  const fetchWorkers = async () => {
    try {
      setLoading(true)
      // For now, use mock data. Replace with API call later
      // const response = await apiService.get('/hourly-service-workers')
      const workerList = mockWorkers

      setWorkers(workerList)

      // Calculate stats
      const active = workerList.filter((w) => w.status === 'active').length
      const pending = workerList.filter((w) => w.approvalStatus === 'pending').length
      const totalEarnings = workerList.reduce((sum, w) => sum + w.totalEarnings, 0)

      setStats({
        total: workerList.length,
        active,
        pending,
        totalEarnings,
      })
    } catch (error) {
      console.error('Error fetching workers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredWorkers = workers.filter((worker) => {
    const matchesSearch =
      `${worker.firstName} ${worker.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.phone.includes(searchQuery)

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'pending' && worker.approvalStatus === 'pending') ||
      (filterStatus === 'active' && worker.status === 'active') ||
      (filterStatus === 'inactive' && worker.status === 'inactive')

    return matchesSearch && matchesFilter
  })

  const handleApprove = (worker: HourlyWorker) => {
    const updatedWorkers = workers.map((w) =>
      w._id === worker._id ? { ...w, approvalStatus: 'approved' as const, status: 'active' as const } : w
    )
    setWorkers(updatedWorkers)
    setSelectedWorker(updatedWorkers.find((w) => w._id === worker._id) || null)
  }

  const handleSuspend = (worker: HourlyWorker) => {
    const updatedWorkers = workers.map((w) =>
      w._id === worker._id ? { ...w, status: 'suspended' as const } : w
    )
    setWorkers(updatedWorkers)
    setSelectedWorker(updatedWorkers.find((w) => w._id === worker._id) || null)
  }

  const handleDelete = (worker: HourlyWorker) => {
    setSelectedWorker(worker)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (selectedWorker) {
      setWorkers(workers.filter((w) => w._id !== selectedWorker._id))
      setShowDeleteConfirm(false)
      setShowDetail(false)
      setSelectedWorker(null)
    }
  }

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'active':
        return 'success'
      case 'inactive':
        return 'warning'
      case 'suspended':
        return 'error'
      default:
        return 'default'
    }
  }

  const getApprovalColor = (status: string): 'info' | 'warning' | 'error' | undefined => {
    switch (status) {
      case 'approved':
        return 'info'
      case 'pending':
        return 'warning'
      case 'rejected':
        return 'error'
      default:
        return undefined
    }
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý nhân viên vệ sinh</h1>
          <p className="text-gray-600">Quản lý và phê duyệt nhân viên cung cấp dịch vụ vệ sinh theo giờ</p>
        </div>

        {/* Stats Cards */}
        <Grid container spacing={3} className="mb-6">
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <p className="text-gray-600 text-sm mb-1">Tổng nhân viên</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <p className="text-gray-600 text-sm mb-1">Đang hoạt động</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <p className="text-gray-600 text-sm mb-1">Chờ phê duyệt</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <p className="text-gray-600 text-sm mb-1">Tổng doanh thu</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(stats.totalEarnings / 1000000).toFixed(1)}M
                </p>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <TextField
                placeholder="Tìm theo tên, email, số điện thoại..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                className="flex-1"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chờ phê duyệt</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Workers Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead className="bg-gray-100">
              <TableRow>
                <TableCell className="font-bold">Nhân viên</TableCell>
                <TableCell className="font-bold">Email</TableCell>
                <TableCell className="font-bold">Số điện thoại</TableCell>
                <TableCell className="font-bold">Đánh giá</TableCell>
                <TableCell className="font-bold">Dịch vụ hoàn thành</TableCell>
                <TableCell className="font-bold">Doanh thu</TableCell>
                <TableCell className="font-bold">Trạng thái</TableCell>
                <TableCell className="font-bold">Phê duyệt</TableCell>
                <TableCell className="font-bold">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredWorkers.map((worker) => (
                <TableRow key={worker._id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar src={worker.avatar} alt={worker.firstName} />
                      <div>
                        <p className="font-medium">
                          {worker.lastName} {worker.firstName}
                        </p>
                        <p className="text-xs text-gray-500">ID: {worker._id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{worker.email}</TableCell>
                  <TableCell>{worker.phone}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Rating value={worker.rating} readOnly size="small" />
                      <span className="text-sm">({worker.totalRatings})</span>
                    </div>
                  </TableCell>
                  <TableCell>{worker.completedServices}</TableCell>
                  <TableCell className="font-semibold">
                    {(worker.totalEarnings / 1000000).toFixed(1)}M
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={worker.status === 'active' ? 'Hoạt động' : 
                             worker.status === 'suspended' ? 'Bị khóa' : 'Không hoạt động'}
                      color={getStatusColor(worker.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={worker.approvalStatus === 'approved' ? 'Đã phê duyệt' :
                             worker.approvalStatus === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                      color={getApprovalColor(worker.approvalStatus)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EyeIcon />}
                        onClick={() => {
                          setSelectedWorker(worker)
                          setShowDetail(true)
                        }}
                      >
                        Chi tiết
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Detail Modal */}
        <Dialog open={showDetail} onClose={() => setShowDetail(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Chi tiết nhân viên</DialogTitle>
          <DialogContent className="mt-4">
            {selectedWorker && (
              <div className="space-y-4">
                <div className="flex justify-center mb-4">
                  <Avatar
                    src={selectedWorker.avatar}
                    alt={selectedWorker.firstName}
                    sx={{ width: 80, height: 80 }}
                  />
                </div>

                <div>
                  <p className="text-sm text-gray-600">Tên</p>
                  <p className="font-semibold">
                    {selectedWorker.lastName} {selectedWorker.firstName}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{selectedWorker.email}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Số điện thoại</p>
                  <p className="font-semibold">{selectedWorker.phone}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Đánh giá</p>
                  <div className="flex items-center gap-2">
                    <Rating value={selectedWorker.rating} readOnly />
                    <span>({selectedWorker.totalRatings} đánh giá)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Dịch vụ hoàn thành</p>
                    <p className="text-2xl font-bold">{selectedWorker.completedServices}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Doanh thu</p>
                    <p className="text-2xl font-bold">
                      {(selectedWorker.totalEarnings / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Tài liệu xác nhận</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {selectedWorker.documentVerification.idCard ? (
                        <CheckCircleIcon className="text-green-600" />
                      ) : (
                        <BlockIcon className="text-red-600" />
                      )}
                      <span>CMND/CCCD</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedWorker.documentVerification.backgroundCheck ? (
                        <CheckCircleIcon className="text-green-600" />
                      ) : (
                        <BlockIcon className="text-red-600" />
                      )}
                      <span>Kiểm tra nền tảng</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedWorker.documentVerification.serviceRating ? (
                        <CheckCircleIcon className="text-green-600" />
                      ) : (
                        <BlockIcon className="text-red-600" />
                      )}
                      <span>Đánh giá dịch vụ</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Trạng thái</p>
                  <Chip
                    label={selectedWorker.status === 'active' ? 'Hoạt động' : 
                           selectedWorker.status === 'suspended' ? 'Bị khóa' : 'Không hoạt động'}
                    color={getStatusColor(selectedWorker.status)}
                    className="w-full"
                  />
                </div>

                <div>
                  <p className="text-sm text-gray-600">Phê duyệt</p>
                  <Chip
                    label={selectedWorker.approvalStatus === 'approved' ? 'Đã phê duyệt' :
                           selectedWorker.approvalStatus === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                    color={getApprovalColor(selectedWorker.approvalStatus)}
                    className="w-full"
                    variant="outlined"
                  />
                </div>
              </div>
            )}
          </DialogContent>
          <DialogActions className="p-4">
            {selectedWorker?.approvalStatus === 'pending' && (
              <Button
                variant="contained"
                color="success"
                onClick={() => handleApprove(selectedWorker)}
              >
                Phê duyệt
              </Button>
            )}
            {selectedWorker?.status !== 'suspended' && (
              <Button
                variant="outlined"
                color="warning"
                onClick={() => handleSuspend(selectedWorker!)}
              >
                Khóa tài khoản
              </Button>
            )}
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => handleDelete(selectedWorker!)}
            >
              Xóa
            </Button>
            <Button onClick={() => setShowDetail(false)}>Đóng</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
          <DialogTitle>Xác nhận xóa</DialogTitle>
          <DialogContent>
            <p>Bạn có chắc muốn xóa nhân viên {selectedWorker?.lastName} {selectedWorker?.firstName}?</p>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeleteConfirm(false)}>Hủy</Button>
            <Button variant="contained" color="error" onClick={confirmDelete}>
              Xóa
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </Layout>
  )
}
