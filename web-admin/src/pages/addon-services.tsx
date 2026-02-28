import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { addonServiceApi } from '../services/addon-service'
import {
  Table,
  Button,
  Input,
  Modal,
  Card,
  Row,
  Col,
  Tag,
  Space,
  Form,
  InputNumber,
  Switch,
  message,
  Empty,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons'

interface AddonService {
  _id: string
  name: string
  icon: string
  description: string
  price: number
  duration: number // minutes
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export default function AddonServices() {
  const [services, setServices] = useState<AddonService[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedService, setSelectedService] = useState<AddonService | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form] = Form.useForm()

  const iconOptions = [
    { value: 'sofa', label: '🛋️ Sofa' },
    { value: 'window', label: '🪟 Rèm cửa' },
    { value: 'refrigerator', label: '🧊 Tủ lạnh' },
    { value: 'air_conditioner', label: '❄️ Điều hòa' },
    { value: 'bed', label: '🛏️ Nệm' },
    { value: 'carpet', label: '🏠 Thảm' },
    { value: 'washing_machine', label: '🧺 Máy giặt' },
    { value: 'kitchen', label: '🍳 Bếp' },
    { value: 'bathroom', label: '🚿 Phòng tắm' },
  ]

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const response = await addonServiceApi.getAll()
      if (response.success && response.data) {
        setServices(response.data)
      } else {
        message.error('Lỗi tải danh sách dịch vụ')
      }
    } catch (error: any) {
      console.error('Error fetching services:', error)
      message.error(error.message || 'Lỗi tải danh sách dịch vụ')
    } finally {
      setLoading(false)
    }
  }

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && service.status === 'active') ||
      (filterStatus === 'inactive' && service.status === 'inactive')

    return matchesSearch && matchesFilter
  })

  const handleOpenModal = (service?: AddonService) => {
    if (service) {
      setIsEditing(true)
      setSelectedService(service)
      form.setFieldsValue({
        name: service.name,
        icon: service.icon,
        description: service.description,
        price: service.price,
        duration: service.duration,
        status: service.status === 'active',
      })
    } else {
      setIsEditing(false)
      setSelectedService(null)
      form.resetFields()
    }
    setShowModal(true)
  }

  const handleSave = async (values: any) => {
    try {
      if (isEditing && selectedService) {
        const response = await addonServiceApi.update(selectedService._id, {
          name: values.name,
          icon: values.icon,
          description: values.description,
          price: values.price,
          duration: values.duration,
          status: values.status ? 'active' : 'inactive',
        })
        if (response.success) {
          message.success('Cập nhật dịch vụ thành công')
          fetchServices()
        } else {
          message.error('Cập nhật dịch vụ thất bại')
        }
      } else {
        const response = await addonServiceApi.create({
          name: values.name,
          icon: values.icon,
          description: values.description,
          price: values.price,
          duration: values.duration,
          status: values.status ? 'active' : 'inactive',
        } as AddonService)
        if (response.success) {
          message.success('Thêm dịch vụ thành công')
          fetchServices()
        } else {
          message.error('Thêm dịch vụ thất bại')
        }
      }
      setShowModal(false)
      form.resetFields()
    } catch (error: any) {
      console.error('Error saving service:', error)
      message.error(error.message || 'Lỗi lưu dịch vụ')
    }
  }

  const handleDelete = async (service: AddonService) => {
    try {
      const response = await addonServiceApi.delete(service._id)
      if (response.success) {
        message.success('Xóa dịch vụ thành công')
        fetchServices()
      } else {
        message.error('Xóa dịch vụ thất bại')
      }
    } catch (error: any) {
      console.error('Error deleting service:', error)
      message.error(error.message || 'Lỗi xóa dịch vụ')
    }
  }

  const handleToggleStatus = async (service: AddonService) => {
    try {
      const response = await addonServiceApi.toggleStatus(service._id)
      if (response.success) {
        message.success('Cập nhật trạng thái thành công')
        fetchServices()
      } else {
        message.error('Cập nhật trạng thái thất bại')
      }
    } catch (error: any) {
      console.error('Error toggling status:', error)
      message.error(error.message || 'Lỗi cập nhật trạng thái')
    }
  }

  const getStatusTag = (status: string) => {
    return status === 'active' ? (
      <Tag color="green">Hoạt động</Tag>
    ) : (
      <Tag color="red">Vô hiệu</Tag>
    )
  }

  const getIconEmoji = (icon: string) => {
    const option = iconOptions.find((opt) => opt.value === icon)
    return option ? option.label.split(' ')[0] : '📦'
  }

  const columns = [
    {
      title: 'Dịch vụ',
      key: 'service',
      width: 250,
      render: (_, service: AddonService) => (
        <Space>
          <span style={{ fontSize: '24px' }}>{getIconEmoji(service.icon)}</span>
          <div>
            <div style={{ fontWeight: 600 }}>{service.name}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>{service.description}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price: number) => (
        <span style={{ fontWeight: 600, color: '#1890ff' }}>{(price / 1000).toFixed(0)}k</span>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => <span>{duration} phút</span>,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, service: AddonService) => getStatusTag(service.status),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_, service: AddonService) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(service)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc muốn xóa dịch vụ này?"
            onConfirm={() => handleDelete(service)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="primary" danger size="small" icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
          <Button
            type="text"
            size="small"
            onClick={() => handleToggleStatus(service)}
          >
            {service.status === 'active' ? 'Vô hiệu' : 'Kích hoạt'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
              Quản lý dịch vụ bổ sung
            </h1>
            <p style={{ color: '#999' }}>
              Quản lý các dịch vụ bổ sung thêm (Sofa, Rèm cửa, Tủ lạnh, v.v)
            </p>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Thêm dịch vụ
          </Button>
        </div>

        {/* Stats */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Tổng dịch vụ</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{services.length}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Đang hoạt động</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#52c41a' }}>
                {services.filter((s) => s.status === 'active').length}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Vô hiệu</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff4d4f' }}>
                {services.filter((s) => s.status === 'inactive').length}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Tổng doanh thu</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {(services.reduce((sum, s) => sum + s.price, 0) / 1000000).toFixed(1)}M
              </div>
            </Card>
          </Col>
        </Row>

        {/* Search and Filter */}
        <Card style={{ marginBottom: '24px' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Input
              placeholder="Tìm theo tên hoặc mô tả..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="large"
              style={{ width: '100%' }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              style={{
                width: '200px',
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
              }}
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Vô hiệu</option>
            </select>
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
            scroll={{ x: 1000 }}
            locale={{ emptyText: <Empty description="Không có dịch vụ nào" /> }}
          />
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          title={isEditing ? 'Sửa dịch vụ bổ sung' : 'Thêm dịch vụ bổ sung'}
          open={showModal}
          onCancel={() => setShowModal(false)}
          width={600}
          footer={[
            <Button key="cancel" onClick={() => setShowModal(false)}>
              Hủy
            </Button>,
            <Button key="submit" type="primary" onClick={() => form.submit()}>
              {isEditing ? 'Cập nhật' : 'Thêm'}
            </Button>,
          ]}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            style={{ marginTop: '20px' }}
          >
            <Form.Item
              label="Tên dịch vụ"
              name="name"
              rules={[{ required: true, message: 'Vui lòng nhập tên dịch vụ' }]}
            >
              <Input placeholder="Vd: Vệ sinh Sofa" size="large" />
            </Form.Item>

            <Form.Item
              label="Icon"
              name="icon"
              rules={[{ required: true, message: 'Vui lòng chọn icon' }]}
            >
              <select style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #d9d9d9', fontSize: '14px' }}>
                <option value="">-- Chọn icon --</option>
                {iconOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Form.Item>

            <Form.Item
              label="Mô tả"
              name="description"
              rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
            >
              <Input.TextArea placeholder="Mô tả chi tiết dịch vụ" rows={3} />
            </Form.Item>

            <Form.Item
              label="Giá (đ)"
              name="price"
              rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="250000"
                min={0}
                step={10000}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>

            <Form.Item
              label="Thời gian bổ sung (phút)"
              name="duration"
              rules={[{ required: true, message: 'Vui lòng nhập thời gian' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="30"
                min={5}
                max={180}
              />
            </Form.Item>

            <Form.Item
              label="Trạng thái"
              name="status"
              valuePropName="checked"
              initialValue={true}
            >
              <Space direction="vertical">
                <Switch />
                <span style={{ fontSize: '12px', color: '#999' }}>
                  {form.getFieldValue('status') ? 'Hoạt động' : 'Vô hiệu hóa'}
                </span>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Layout>
  )
}
