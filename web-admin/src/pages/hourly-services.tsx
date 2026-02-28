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
  Statistic,
  Popconfirm,
  message,
  Empty,
  Badge,
  Descriptions,
} from 'antd'
import {
  EyeOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'

interface HourlyService {
  _id: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAvatar?: string
  workerId?: string
  workerName?: string
  workerAvatar?: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  serviceType: 'standard' | 'premium' | 'economy'
  hours: number
  address: string
  selectedDate: string
  selectedTime: string
  estimatedPrice: number
  actualPrice?: number
  notes?: string
  services: Array<{
    name: string
    price: number
    selected: boolean
  }>
  createdAt: string
  completedAt?: string
}

export default function HourlyServices() {
  const [services, setServices] = useState<HourlyService[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [selectedService, setSelectedService] = useState<HourlyService | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    totalRevenue: 0,
  })

  const mockServices: HourlyService[] = [
    {
      _id: 'svc-001',
      customerId: 'cust-001',
      customerName: 'Trần Thị Hương',
      customerEmail: 'huong.tran@example.com',
      customerPhone: '0987654321',
      customerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Huong',
      workerId: 'worker-001',
      workerName: 'Nguyễn Thị Hoa',
      workerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hoa',
      status: 'in_progress',
      serviceType: 'standard',
      hours: 2,
      address: '123 Đường Lê Lợi, Quận 1, TP.HCM',
      selectedDate: '2024-02-27',
      selectedTime: '09:00',
      estimatedPrice: 500000,
      notes: 'Dọn giàn phơi, lau cửa kính',
      services: [
        { name: 'Sofa', price: 250000, selected: true },
        { name: 'Rèm cửa', price: 150000, selected: false },
        { name: 'Tủ lạnh', price: 100000, selected: false },
      ],
      createdAt: '2024-02-27T08:00:00Z',
    },
    {
      _id: 'svc-002',
      customerId: 'cust-002',
      customerName: 'Phạm Văn An',
      customerEmail: 'an.pham@example.com',
      customerPhone: '0912345678',
      customerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=An',
      status: 'pending',
      serviceType: 'premium',
      hours: 3,
      address: '456 Đường Nguyễn Huệ, Quận 1, TP.HCM',
      selectedDate: '2024-02-28',
      selectedTime: '14:00',
      estimatedPrice: 750000,
      notes: 'Vệ sinh toàn bộ căn hộ',
      services: [
        { name: 'Sofa', price: 250000, selected: true },
        { name: 'Rèm cửa', price: 150000, selected: true },
        { name: 'Tủ lạnh', price: 100000, selected: false },
      ],
      createdAt: '2024-02-27T10:30:00Z',
    },
    {
      _id: 'svc-003',
      customerId: 'cust-003',
      customerName: 'Lê Thị Lan',
      customerEmail: 'lan.le@example.com',
      customerPhone: '0923456789',
      customerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lan',
      workerId: 'worker-002',
      workerName: 'Trần Thị Thu Hương',
      workerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Huong2',
      status: 'completed',
      serviceType: 'standard',
      hours: 1,
      address: '789 Đường Võ Văn Kiệt, Quận 5, TP.HCM',
      selectedDate: '2024-02-26',
      selectedTime: '10:00',
      estimatedPrice: 250000,
      actualPrice: 250000,
      notes: 'Dọn dẹp phòng ngủ',
      services: [
        { name: 'Sofa', price: 250000, selected: false },
        { name: 'Rèm cửa', price: 150000, selected: false },
        { name: 'Tủ lạnh', price: 100000, selected: false },
      ],
      createdAt: '2024-02-26T09:00:00Z',
      completedAt: '2024-02-26T10:30:00Z',
    },
    {
      _id: 'svc-004',
      customerId: 'cust-004',
      customerName: 'Ngô Minh Hùng',
      customerEmail: 'hung.ngo@example.com',
      customerPhone: '0934567890',
      customerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hung',
      status: 'cancelled',
      serviceType: 'economy',
      hours: 1,
      address: '321 Đường Trần Hưng Đạo, Quận 3, TP.HCM',
      selectedDate: '2024-02-27',
      selectedTime: '16:00',
      estimatedPrice: 200000,
      notes: 'Vệ sinh nhanh',
      services: [
        { name: 'Sofa', price: 250000, selected: false },
        { name: 'Rèm cửa', price: 150000, selected: false },
        { name: 'Tủ lạnh', price: 100000, selected: false },
      ],
      createdAt: '2024-02-27T14:00:00Z',
    },
  ]

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const serviceList = mockServices
      setServices(serviceList)

      const pending = serviceList.filter((s) => s.status === 'pending').length
      const inProgress = serviceList.filter((s) => s.status === 'in_progress').length
      const completed = serviceList.filter((s) => s.status === 'completed').length
      const totalRevenue = serviceList.reduce((sum, s) => sum + (s.actualPrice || s.estimatedPrice), 0)

      setStats({
        total: serviceList.length,
        pending,
        inProgress,
        completed,
        totalRevenue,
      })
    } catch (error) {
      console.error('Error fetching services:', error)
      message.error('Lỗi tải danh sách dịch vụ')
    } finally {
      setLoading(false)
    }
  }

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.customerPhone.includes(searchQuery) ||
      service.address.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'pending' && service.status === 'pending') ||
      (filterStatus === 'in_progress' && service.status === 'in_progress') ||
      (filterStatus === 'completed' && service.status === 'completed')

    return matchesSearch && matchesFilter
  })

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      confirmed: 'blue',
      in_progress: 'processing',
      completed: 'green',
      cancelled: 'red',
    }
    const labels: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      in_progress: 'Đang tiến hành',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    }
    return <Tag color={colors[status] || 'default'}>{labels[status]}</Tag>
  }

  const getServiceTypeTag = (type: string) => {
    const colors: Record<string, string> = {
      standard: 'blue',
      premium: 'gold',
      economy: 'cyan',
    }
    const labels: Record<string, string> = {
      standard: 'Tiêu chuẩn',
      premium: 'Premium',
      economy: 'Tiết kiệm',
    }
    return <Tag color={colors[type] || 'default'}>{labels[type]}</Tag>
  }

  const handleUpdateStatus = (service: HourlyService, newStatus: string) => {
    const updatedServices = services.map((s) =>
      s._id === service._id
        ? { ...s, status: newStatus as any, completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined }
        : s
    )
    setServices(updatedServices)
    setSelectedService(updatedServices.find((s) => s._id === service._id) || null)
    message.success('Cập nhật trạng thái thành công')
  }

  const handleDelete = (service: HourlyService) => {
    setServices(services.filter((s) => s._id !== service._id))
    setShowDetail(false)
    setSelectedService(null)
    message.success('Xóa dịch vụ thành công')
  }

  const columns = [
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 220,
      render: (_, service: HourlyService) => (
        <Space>
          <Avatar src={service.customerAvatar} alt={service.customerName} size={40} />
          <div>
            <div style={{ fontWeight: 600 }}>{service.customerName}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>{service.customerPhone}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      width: 200,
      render: (text: string) => (
        <div style={{ fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {text}
        </div>
      ),
    },
    {
      title: 'Nhân viên',
      key: 'worker',
      width: 180,
      render: (_, service: HourlyService) =>
        service.workerName ? (
          <Space>
            <Avatar src={service.workerAvatar} alt={service.workerName} size={32} />
            <div style={{ fontSize: '13px' }}>{service.workerName}</div>
          </Space>
        ) : (
          <Tag color="orange">Chờ gán</Tag>
        ),
    },
    {
      title: 'Loại',
      key: 'serviceType',
      width: 120,
      render: (_, service: HourlyService) => getServiceTypeTag(service.serviceType),
    },
    {
      title: 'Giờ',
      dataIndex: 'hours',
      key: 'hours',
      width: 60,
      render: (hours: number) => <span>{hours}h</span>,
    },
    {
      title: 'Giá',
      key: 'price',
      width: 100,
      render: (_, service: HourlyService) => (
        <span style={{ fontWeight: 600 }}>{(service.estimatedPrice / 1000).toFixed(0)}k</span>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 130,
      render: (_, service: HourlyService) => getStatusTag(service.status),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_, service: HourlyService) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedService(service)
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
            Quản lý dịch vụ vệ sinh
          </h1>
          <p style={{ color: '#999' }}>
            Quản lý các dịch vụ vệ sinh theo giờ, theo dõi tiến độ và doanh thu
          </p>
        </div>

        {/* Stats Cards */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Tổng dịch vụ" value={stats.total} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Chờ xác nhận"
                value={stats.pending}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Đang tiến hành"
                value={stats.inProgress}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Hoàn thành"
                value={stats.completed}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} style={{ marginTop: '8px' }}>
            <Card>
              <Statistic
                title="Tổng doanh thu"
                value={(stats.totalRevenue / 1000000).toFixed(2)}
                suffix="M"
                valueStyle={{ color: '#eb2f96', fontSize: '24px' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Search and Filter */}
        <Card style={{ marginBottom: '24px' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Input
              placeholder="Tìm theo tên khách, email, SĐT, địa chỉ..."
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
                { label: 'Chờ xác nhận', value: 'pending' },
                { label: 'Đang tiến hành', value: 'in_progress' },
                { label: 'Hoàn thành', value: 'completed' },
              ]}
            />
          </Space>
        </Card>

        {/* Services Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredServices}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1400 }}
            locale={{ emptyText: <Empty description="Không có dữ liệu" /> }}
          />
        </Card>

        {/* Detail Modal */}
        <Modal
          title="Chi tiết dịch vụ"
          open={showDetail}
          onCancel={() => setShowDetail(false)}
          width={700}
          footer={
            selectedService && [
              selectedService.status === 'pending' && (
                <Button
                  key="confirm"
                  type="primary"
                  onClick={() => handleUpdateStatus(selectedService, 'confirmed')}
                >
                  Xác nhận
                </Button>
              ),
              selectedService.status === 'confirmed' && (
                <Button
                  key="start"
                  type="primary"
                  onClick={() => handleUpdateStatus(selectedService, 'in_progress')}
                >
                  Bắt đầu
                </Button>
              ),
              selectedService.status === 'in_progress' && (
                <Button
                  key="complete"
                  type="primary"
                  onClick={() => handleUpdateStatus(selectedService, 'completed')}
                >
                  Hoàn thành
                </Button>
              ),
              <Popconfirm
                key="delete"
                title="Xác nhận xóa"
                description={`Bạn có chắc muốn xóa dịch vụ này?`}
                onConfirm={() => handleDelete(selectedService)}
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
          {selectedService && (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* Trạng thái */}
              <div>
                <h3>Trạng thái</h3>
                {getStatusTag(selectedService.status)}
              </div>

              {/* Thông tin khách hàng */}
              <div>
                <h3>Thông tin khách hàng</h3>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Tên">
                    <Space>
                      <Avatar src={selectedService.customerAvatar} size={32} />
                      {selectedService.customerName}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    <Space>
                      <MailOutlined />
                      {selectedService.customerEmail}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">
                    <Space>
                      <PhoneOutlined />
                      {selectedService.customerPhone}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ">
                    <Space>
                      <EnvironmentOutlined />
                      {selectedService.address}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </div>

              {/* Thông tin nhân viên */}
              {selectedService.workerName ? (
                <div>
                  <h3>Thông tin nhân viên</h3>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Tên">
                      <Space>
                        <Avatar src={selectedService.workerAvatar} size={32} />
                        {selectedService.workerName}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              ) : (
                <div>
                  <Tag color="orange">Chưa gán nhân viên</Tag>
                </div>
              )}

              {/* Thông tin dịch vụ */}
              <div>
                <h3>Thông tin dịch vụ</h3>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Loại dịch vụ">
                    {getServiceTypeTag(selectedService.serviceType)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Giờ">{selectedService.hours}h</Descriptions.Item>
                  <Descriptions.Item label="Ngày">{selectedService.selectedDate}</Descriptions.Item>
                  <Descriptions.Item label="Giờ">{selectedService.selectedTime}</Descriptions.Item>
                </Descriptions>
              </div>

              {/* Dịch vụ bổ sung */}
              <div>
                <h3>Dịch vụ bổ sung</h3>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedService.services
                    .filter((s) => s.selected)
                    .map((addon, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                      >
                        <span>{addon.name}</span>
                        <span style={{ fontWeight: 600 }}>{(addon.price / 1000).toFixed(0)}k</span>
                      </div>
                    ))}
                  {selectedService.services.filter((s) => s.selected).length === 0 && (
                    <span style={{ color: '#999' }}>Không có dịch vụ bổ sung</span>
                  )}
                </Space>
              </div>

              {/* Ghi chú */}
              {selectedService.notes && (
                <div>
                  <h3>Ghi chú</h3>
                  <p>{selectedService.notes}</p>
                </div>
              )}

              {/* Giá */}
              <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <span style={{ fontSize: '14px', color: '#999' }}>Giá dự kiến:</span>
                  </Col>
                  <Col>
                    <span style={{ fontWeight: 600, fontSize: '16px' }}>
                      {(selectedService.estimatedPrice / 1000).toFixed(0)}k
                    </span>
                  </Col>
                </Row>
                {selectedService.actualPrice && (
                  <Row justify="space-between" align="middle" style={{ marginTop: '8px' }}>
                    <Col>
                      <span style={{ fontSize: '14px', color: '#999' }}>Giá thực tế:</span>
                    </Col>
                    <Col>
                      <span style={{ fontWeight: 600, fontSize: '16px', color: '#52c41a' }}>
                        {(selectedService.actualPrice / 1000).toFixed(0)}k
                      </span>
                    </Col>
                  </Row>
                )}
              </div>

              {/* Thời gian */}
              <div style={{ fontSize: '12px', color: '#999' }}>
                Tạo lúc: {new Date(selectedService.createdAt).toLocaleString('vi-VN')}
                {selectedService.completedAt && (
                  <div>
                    Hoàn thành lúc: {new Date(selectedService.completedAt).toLocaleString('vi-VN')}
                  </div>
                )}
              </div>
            </Space>
          )}
        </Modal>
      </div>
    </Layout>
  )
}
