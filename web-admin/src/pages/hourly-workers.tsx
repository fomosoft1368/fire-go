import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import {
  Table,
  Button,
  Input,
  Select,
  Modal,
  Card,
  Row,
  Col,
  Tag,
  Space,
  Avatar,
  Rate,
  Statistic,
  Popconfirm,
  message,
  Empty,
} from 'antd'
import {
  EyeOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  LockOutlined,
  SearchOutlined,
} from '@ant-design/icons'

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
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hoa',
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
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Huong',
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
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Linh',
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
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hanh',
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
      const workerList = mockWorkers
      setWorkers(workerList)

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
      message.error('Lỗi tải danh sách nhân viên')
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
    message.success('Phê duyệt nhân viên thành công')
  }

  const handleSuspend = (worker: HourlyWorker) => {
    const updatedWorkers = workers.map((w) =>
      w._id === worker._id ? { ...w, status: 'suspended' as const } : w
    )
    setWorkers(updatedWorkers)
    setSelectedWorker(updatedWorkers.find((w) => w._id === worker._id) || null)
    message.success('Khóa tài khoản nhân viên thành công')
  }

  const handleDelete = (worker: HourlyWorker) => {
    setWorkers(workers.filter((w) => w._id !== worker._id))
    setShowDetail(false)
    setSelectedWorker(null)
    message.success('Xóa nhân viên thành công')
  }

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      active: 'green',
      inactive: 'orange',
      suspended: 'red',
    }
    const labels: Record<string, string> = {
      active: 'Hoạt động',
      inactive: 'Không hoạt động',
      suspended: 'Bị khóa',
    }
    return <Tag color={colors[status] || 'default'}>{labels[status]}</Tag>
  }

  const getApprovalTag = (status: string) => {
    const colors: Record<string, string> = {
      approved: 'green',
      pending: 'orange',
      rejected: 'red',
    }
    const labels: Record<string, string> = {
      approved: 'Đã phê duyệt',
      pending: 'Chờ duyệt',
      rejected: 'Từ chối',
    }
    return <Tag color={colors[status] || 'default'}>{labels[status]}</Tag>
  }

  const columns = [
    {
      title: 'Nhân viên',
      key: 'worker',
      width: 220,
      render: (_, worker: HourlyWorker) => (
        <Space>
          <Avatar src={worker.avatar} alt={worker.firstName} size={40} />
          <div>
            <div style={{ fontWeight: 600 }}>
              {worker.lastName} {worker.firstName}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>ID: {worker._id.slice(0, 8)}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 180,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: 'Đánh giá',
      key: 'rating',
      width: 140,
      render: (_, worker: HourlyWorker) => (
        <Space size="small">
          <Rate value={worker.rating} disabled allowHalf style={{ fontSize: 12 }} />
          <span style={{ fontSize: 12 }}>({worker.totalRatings})</span>
        </Space>
      ),
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'completedServices',
      key: 'completedServices',
      width: 80,
    },
    {
      title: 'Doanh thu',
      key: 'totalEarnings',
      width: 100,
      render: (_, worker: HourlyWorker) => (
        <span style={{ fontWeight: 600 }}>{(worker.totalEarnings / 1000000).toFixed(1)}M</span>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, worker: HourlyWorker) => getStatusTag(worker.status),
    },
    {
      title: 'Phê duyệt',
      key: 'approvalStatus',
      width: 120,
      render: (_, worker: HourlyWorker) => getApprovalTag(worker.approvalStatus),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_, worker: HourlyWorker) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedWorker(worker)
            setShowDetail(true)
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ]

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
            Quản lý nhân viên vệ sinh
          </h1>
          <p style={{ color: '#999' }}>
            Quản lý và phê duyệt nhân viên cung cấp dịch vụ vệ sinh theo giờ
          </p>
        </div>

        {/* Stats Cards */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Tổng nhân viên" value={stats.total} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Đang hoạt động"
                value={stats.active}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Chờ phê duyệt"
                value={stats.pending}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng doanh thu"
                value={(stats.totalEarnings / 1000000).toFixed(1)}
                suffix="M"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Search and Filter */}
        <Card style={{ marginBottom: '24px' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Input
              placeholder="Tìm theo tên, email, số điện thoại..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="large"
              style={{ width: '100%' }}
            />
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value)}
              style={{ width: '200px' }}
              options={[
                { label: 'Tất cả', value: 'all' },
                { label: 'Chờ phê duyệt', value: 'pending' },
                { label: 'Đang hoạt động', value: 'active' },
                { label: 'Không hoạt động', value: 'inactive' },
              ]}
            />
          </Space>
        </Card>

        {/* Workers Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredWorkers}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
            locale={{ emptyText: <Empty description="Không có dữ liệu" /> }}
          />
        </Card>

        {/* Detail Modal */}
        <Modal
          title="Chi tiết nhân viên"
          open={showDetail}
          onCancel={() => setShowDetail(false)}
          width={600}
          footer={
            selectedWorker && [
              selectedWorker.approvalStatus === 'pending' && (
                <Button
                  key="approve"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(selectedWorker)}
                >
                  Phê duyệt
                </Button>
              ),
              selectedWorker.status !== 'suspended' && (
                <Button
                  key="suspend"
                  type="primary"
                  danger
                  icon={<LockOutlined />}
                  onClick={() => handleSuspend(selectedWorker)}
                >
                  Khóa tài khoản
                </Button>
              ),
              <Popconfirm
                key="delete"
                title="Xác nhận xóa"
                description={`Bạn có chắc muốn xóa nhân viên ${selectedWorker?.lastName} ${selectedWorker?.firstName}?`}
                onConfirm={() => handleDelete(selectedWorker)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button key="delete-btn" danger icon={<DeleteOutlined />}>
                  Xóa
                </Button>
              </Popconfirm>,
              <Button key="close" onClick={() => setShowDetail(false)}>
                Đóng
              </Button>,
            ]
          }
        >
          {selectedWorker && (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <Avatar src={selectedWorker.avatar} size={80} />
              </div>

              <div>
                <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>Tên</div>
                <div style={{ fontWeight: 600 }}>
                  {selectedWorker.lastName} {selectedWorker.firstName}
                </div>
              </div>

              <div>
                <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>Email</div>
                <div style={{ fontWeight: 600 }}>{selectedWorker.email}</div>
              </div>

              <div>
                <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>
                  Số điện thoại
                </div>
                <div style={{ fontWeight: 600 }}>{selectedWorker.phone}</div>
              </div>

              <div>
                <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>Đánh giá</div>
                <Space>
                  <Rate value={selectedWorker.rating} disabled allowHalf />
                  <span>({selectedWorker.totalRatings} đánh giá)</span>
                </Space>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Dịch vụ hoàn thành"
                    value={selectedWorker.completedServices}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Doanh thu"
                    value={(selectedWorker.totalEarnings / 1000000).toFixed(1)}
                    suffix="M"
                  />
                </Col>
              </Row>

              <div>
                <div style={{ color: '#999', fontSize: '12px', marginBottom: '8px' }}>
                  Tài liệu xác nhận
                </div>
                <Space direction="vertical">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedWorker.documentVerification.idCard ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <LockOutlined style={{ color: '#ff4d4f' }} />
                    )}
                    <span>CMND/CCCD</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedWorker.documentVerification.backgroundCheck ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <LockOutlined style={{ color: '#ff4d4f' }} />
                    )}
                    <span>Kiểm tra nền tảng</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedWorker.documentVerification.serviceRating ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <LockOutlined style={{ color: '#ff4d4f' }} />
                    )}
                    <span>Đánh giá dịch vụ</span>
                  </div>
                </Space>
              </div>

              <div>
                <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>
                  Trạng thái
                </div>
                {getStatusTag(selectedWorker.status)}
              </div>

              <div>
                <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>
                  Phê duyệt
                </div>
                {getApprovalTag(selectedWorker.approvalStatus)}
              </div>
            </Space>
          )}
        </Modal>
      </div>
    </Layout>
  )
}
