import React, { useState, useEffect } from 'react';
import { Table, Typography, Card, Modal, Tag, Space, Button } from 'antd';
import { BugOutlined, EyeOutlined } from '@ant-design/icons';
import Layout from '../components/Layout';
import { notification } from 'antd';

const { Title, Text } = Typography;

const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = async (page = 1, pageSize = 50) => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3000/api/logs?page=${page}&limit=${pageSize}`);
      const data = await res.json();
      
      setLogs(data.data || []);
      setPagination({
        current: data.page,
        pageSize: data.limit,
        total: data.total
      });
    } catch (error) {
      notification.error({ message: 'Lỗi tải log', description: 'Không thể kết nối đến server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleTableChange = (pag: any) => {
    fetchLogs(pag.current, pag.pageSize);
  };

  const columns = [
    {
      title: 'Ứng dụng',
      dataIndex: 'appName',
      key: 'appName',
      render: (text: string) => {
        let color = 'blue';
        if (text === 'mobile-driver') color = 'orange';
        if (text === 'mobile-customer') color = 'green';
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Tên Hàm (Function)',
      dataIndex: 'functionName',
      key: 'functionName',
      render: (text: string) => <Text strong><BugOutlined /> {text}</Text>
    },
    {
      title: 'Thông báo lỗi',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
      render: (text: string) => <Text type="danger">{text}</Text>
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString('vi-VN')
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Button 
          type="primary" 
          icon={<EyeOutlined />} 
          onClick={() => {
            setSelectedLog(record);
            setIsModalVisible(true);
          }}
        >
          Chi tiết
        </Button>
      )
    }
  ];

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <Title level={2}>System Logs (Lỗi Hệ Thống)</Title>
        <Card>
          <Table 
            columns={columns} 
            dataSource={logs} 
            rowKey="_id"
            loading={loading}
            pagination={pagination}
            onChange={handleTableChange}
          />
        </Card>

        <Modal
          title={
            <Space>
              <BugOutlined style={{ color: 'red' }} />
              Chi Tiết Lỗi System Log
            </Space>
          }
          visible={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
          width={800}
        >
          {selectedLog && (
            <div>
              <p><strong>Ứng dụng:</strong> <Tag color="red">{selectedLog.appName}</Tag></p>
              <p><strong>Nơi nổ lỗi:</strong> <code>{selectedLog.functionName}</code></p>
              <p><strong>Thông báo lỗi:</strong> <Text type="danger">{selectedLog.errorMessage}</Text></p>
              <p><strong>Thời gian:</strong> {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}</p>
              
              <div style={{ marginTop: 16 }}>
                <strong>Stack Trace (Dòng code bị lỗi):</strong>
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 300, overflow: 'auto' }}>
                  {selectedLog.errorStack || 'No stack trace available'}
                </pre>
              </div>

              {selectedLog.extraData && (
                <div style={{ marginTop: 16 }}>
                  <strong>Dữ liệu đính kèm (Extra Params):</strong>
                  <pre style={{ background: '#e6f7ff', padding: 12, borderRadius: 4, maxHeight: 300, overflow: 'auto' }}>
                    {JSON.stringify(selectedLog.extraData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default SystemLogs;
