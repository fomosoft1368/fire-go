import { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Select,
  Input,
  DatePicker,
  Space,
  Card,
  Statistic,
  Row,
  Col,
  message,
  Modal,
  Descriptions,
  Button,
} from 'antd';
import {
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  GiftOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import Layout from '../components/Layout';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface WalletTransaction {
  _id: string;
  driverId: {
    _id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  type: 'topup' | 'withdrawal' | 'commission' | 'bonus' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: string;
  description: string;
  transactionId?: string;
  tripId?: string;
  createdAt: string;
  completedAt?: string;
}

interface TransactionResponse {
  transactions: WalletTransaction[];
  total: number;
  limit: number;
  skip: number;
}

export default function WalletTransactionsPage() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    type: undefined as string | undefined,
    status: undefined as string | undefined,
    driverId: undefined as string | undefined,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });
  const [searchText, setSearchText] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalTopup: 0,
    totalWithdrawal: 0,
    totalCommission: 0,
    pendingCount: 0,
  });

  useEffect(() => {
    loadTransactions();
  }, [pagination.current, pagination.pageSize, filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('limit', pagination.pageSize.toString());
      params.append('skip', ((pagination.current - 1) * pagination.pageSize).toString());

      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.driverId) params.append('driverId', filters.driverId);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/wallet/admin/transactions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data: TransactionResponse = await response.json();
      setTransactions(data.transactions);
      setTotal(data.total);

      // Calculate stats
      calculateStats(data.transactions);
    } catch (error: any) {
      console.error('[WalletTransactions] Error:', error);
      message.error(error.message || 'Không thể tải giao dịch');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (txns: WalletTransaction[]) => {
    const totalTopup = txns
      .filter((t) => t.type === 'topup' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawal = txns
      .filter((t) => t.type === 'withdrawal' && t.status === 'completed')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalCommission = txns
      .filter((t) => t.type === 'commission')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const pendingCount = txns.filter((t) => t.status === 'pending').length;

    setStats({
      totalTopup,
      totalWithdrawal,
      totalCommission,
      pendingCount,
    });
  };

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    setPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
    });
  };

  const showTransactionDetail = (transaction: WalletTransaction) => {
    setSelectedTransaction(transaction);
    setDetailModalVisible(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'topup':
        return 'green';
      case 'withdrawal':
        return 'orange';
      case 'commission':
        return 'red';
      case 'bonus':
        return 'blue';
      case 'refund':
        return 'purple';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'topup':
        return <ArrowDownOutlined />;
      case 'withdrawal':
        return <ArrowUpOutlined />;
      case 'commission':
        return <DollarOutlined />;
      case 'bonus':
        return <GiftOutlined />;
      default:
        return <WalletOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined />;
      case 'pending':
        return <ClockCircleOutlined />;
      case 'failed':
        return <CloseCircleOutlined />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'topup':
        return 'Nạp tiền';
      case 'withdrawal':
        return 'Rút tiền';
      case 'commission':
        return 'Chiết khấu';
      case 'bonus':
        return 'Thưởng';
      case 'refund':
        return 'Hoàn tiền';
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Chờ xử lý';
      case 'completed':
        return 'Hoàn thành';
      case 'failed':
        return 'Thất bại';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const columns = [
    {
      title: 'Mã GD',
      dataIndex: 'transactionId',
      key: 'transactionId',
      width: 120,
      render: (text: string, record: WalletTransaction) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {record._id.substring(record._id.length - 8).toUpperCase()}
        </span>
      ),
    },
    {
      title: 'Tài xế',
      dataIndex: 'driverId',
      key: 'driverId',
      render: (driver: any) =>
        driver ? (
          <div>
            <div style={{ fontWeight: 600 }}>
              {driver.firstName} {driver.lastName}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>{driver.phoneNumber}</div>
          </div>
        ) : (
          '-'
        ),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={getTypeColor(type)} icon={getTypeIcon(type)}>
          {getTypeLabel(type)}
        </Tag>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (amount: number, record: WalletTransaction) => {
        const isPositive = ['topup', 'bonus', 'refund'].includes(record.type);
        return (
          <span
            style={{
              color: isPositive ? '#52c41a' : '#ff4d4f',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            {isPositive ? '+' : '-'}
            {Math.abs(amount).toLocaleString('vi-VN')}đ
          </span>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: 'Phương thức',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method: string) => {
        if (!method) return '-';
        const label = method === 'bank_transfer' ? 'Chuyển khoản' : method;
        return <span style={{ fontSize: '13px' }}>{label}</span>;
      },
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <span style={{ fontSize: '13px', color: '#666' }}>{text || '-'}</span>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => (
        <span style={{ fontSize: '13px' }}>{dayjs(date).format('DD/MM/YYYY HH:mm')}</span>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 100,
      render: (_: any, record: WalletTransaction) => (
        <Button type="link" size="small" onClick={() => showTransactionDetail(record)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
            <WalletOutlined /> Quản lý Ví & Giao dịch
          </h1>
          <p style={{ color: '#888', marginTop: '8px' }}>
            Xem lịch sử nạp tiền, rút tiền, chiết khấu của tài xế
          </p>
        </div>

        {/* Stats Cards */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Tổng nạp tiền"
                value={stats.totalTopup}
                suffix="đ"
                valueStyle={{ color: '#52c41a' }}
                prefix={<ArrowDownOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Tổng rút tiền"
                value={stats.totalWithdrawal}
                suffix="đ"
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<ArrowUpOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Tổng chiết khấu"
                value={stats.totalCommission}
                suffix="đ"
                valueStyle={{ color: '#1890ff' }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Chờ xử lý"
                value={stats.pendingCount}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: '16px' }}>
          <Space size="middle" wrap>
            <Input
              placeholder="Tìm tài xế..."
              style={{ width: 200 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />

            <Select
              placeholder="Loại giao dịch"
              style={{ width: 150 }}
              value={filters.type}
              onChange={(value) => setFilters({ ...filters, type: value })}
              allowClear
            >
              <Option value="topup">Nạp tiền</Option>
              <Option value="withdrawal">Rút tiền</Option>
              <Option value="commission">Chiết khấu</Option>
              <Option value="bonus">Thưởng</Option>
              <Option value="refund">Hoàn tiền</Option>
            </Select>

            <Select
              placeholder="Trạng thái"
              style={{ width: 150 }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              allowClear
            >
              <Option value="pending">Chờ xử lý</Option>
              <Option value="completed">Hoàn thành</Option>
              <Option value="failed">Thất bại</Option>
              <Option value="cancelled">Đã hủy</Option>
            </Select>

            <Button type="primary" onClick={loadTransactions}>
              Tìm kiếm
            </Button>
          </Space>
        </Card>

        {/* Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={transactions}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} giao dịch`,
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* Transaction Detail Modal */}
        <Modal
          title="Chi tiết giao dịch"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={null}
          width={600}
        >
          {selectedTransaction && (
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Mã giao dịch">
                <span style={{ fontFamily: 'monospace' }}>
                  {selectedTransaction._id}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Tài xế">
                {selectedTransaction.driverId ? (
                  <>
                    {selectedTransaction.driverId.firstName}{' '}
                    {selectedTransaction.driverId.lastName}
                    <br />
                    <span style={{ color: '#888' }}>
                      {selectedTransaction.driverId.phoneNumber}
                    </span>
                  </>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Loại">
                <Tag color={getTypeColor(selectedTransaction.type)}>
                  {getTypeLabel(selectedTransaction.type)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Số tiền">
                <span
                  style={{
                    color: ['topup', 'bonus', 'refund'].includes(selectedTransaction.type)
                      ? '#52c41a'
                      : '#ff4d4f',
                    fontWeight: 600,
                    fontSize: '16px',
                  }}
                >
                  {selectedTransaction.amount > 0 ? '+' : ''}
                  {selectedTransaction.amount.toLocaleString('vi-VN')}đ
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Số dư trước">
                {selectedTransaction.balanceBefore?.toLocaleString('vi-VN')}đ
              </Descriptions.Item>
              <Descriptions.Item label="Số dư sau">
                {selectedTransaction.balanceAfter?.toLocaleString('vi-VN')}đ
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={getStatusColor(selectedTransaction.status)}>
                  {getStatusLabel(selectedTransaction.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức">
                {selectedTransaction.paymentMethod || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Mô tả">
                {selectedTransaction.description}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian tạo">
                {dayjs(selectedTransaction.createdAt).format('DD/MM/YYYY HH:mm:ss')}
              </Descriptions.Item>
              {selectedTransaction.completedAt && (
                <Descriptions.Item label="Hoàn thành lúc">
                  {dayjs(selectedTransaction.completedAt).format('DD/MM/YYYY HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
