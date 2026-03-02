import { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Switch, Button, message, Space, Divider, Descriptions, Row, Col } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import Layout from '../components/Layout';
import { apiService } from '../services/api';

interface ServiceConfig {
  serviceType: string;
  searchRadiusMeters: number;
  maxDriversToNotify: number;
  requestTimeoutMs: number;
  isActive: boolean;
  description?: string;
}

const serviceTypeLabels: Record<string, string> = {
  hire: 'Lái xe hộ',
  rideshare: 'Ghép xe',
  delivery: 'Giao hàng',
};

export default function DriverSearchSettings() {
  const [configs, setConfigs] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getDriverSearchConfigs();
      if (data) {
        setConfigs(data);
        // Set form initial values
        const formValues: any = {};
        data.forEach((config: ServiceConfig) => {
          formValues[`${config.serviceType}_searchRadius`] = config.searchRadiusMeters / 1000; // Convert to km
          formValues[`${config.serviceType}_maxDrivers`] = config.maxDriversToNotify;
          formValues[`${config.serviceType}_timeout`] = config.requestTimeoutMs / 1000; // Convert to seconds
          formValues[`${config.serviceType}_isActive`] = config.isActive;
        });
        form.setFieldsValue(formValues);
      }
    } catch (error) {
      message.error('Không thể tải cấu hình');
      console.error('Load configs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (serviceType: string) => {
    setSaving(serviceType);
    try {
      const values = form.getFieldsValue();
      const updateData = {
        searchRadiusMeters: values[`${serviceType}_searchRadius`] * 1000, // Convert km to meters
        maxDriversToNotify: values[`${serviceType}_maxDrivers`],
        requestTimeoutMs: values[`${serviceType}_timeout`] * 1000, // Convert seconds to ms
        isActive: values[`${serviceType}_isActive`],
      };

      await apiService.updateDriverSearchConfig(serviceType, updateData);
      message.success(`Đã cập nhật cấu hình ${serviceTypeLabels[serviceType]}`);
      await loadConfigs();
    } catch (error) {
      message.error('Cập nhật thất bại');
      console.error('Update config error:', error);
    } finally {
      setSaving(null);
    }
  };

  const renderServiceCard = (config: ServiceConfig) => {
    const { serviceType } = config;
    return (
      <Card
        key={serviceType}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 600 }}>
              {serviceTypeLabels[serviceType] || serviceType}
            </span>
            <Form.Item
              name={`${serviceType}_isActive`}
              valuePropName="checked"
              style={{ margin: 0 }}
            >
              <Switch
                checkedChildren="Đang bật"
                unCheckedChildren="Đã tắt"
                onChange={() => handleSave(serviceType)}
              />
            </Form.Item>
          </div>
        }
        style={{ height: '100%' }}
        bordered={true}
      >
        <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Mô tả">
            {config.description || 'Không có mô tả'}
          </Descriptions.Item>
        </Descriptions>

        <Form.Item
          label="Bán kính tìm kiếm (km)"
          name={`${serviceType}_searchRadius`}
          rules={[{ required: true, message: 'Vui lòng nhập bán kính' }]}
        >
          <InputNumber
            min={1}
            max={100}
            step={1}
            style={{ width: '100%' }}
            placeholder="VD: 10"
            addonAfter="km"
          />
        </Form.Item>

        <Form.Item
          label="Số tài xế tối đa được thông báo"
          name={`${serviceType}_maxDrivers`}
          rules={[{ required: true, message: 'Vui lòng nhập số tài xế' }]}
        >
          <InputNumber
            min={1}
            max={50}
            step={1}
            style={{ width: '100%' }}
            placeholder="VD: 10"
            addonAfter="tài xế"
          />
        </Form.Item>

        <Form.Item
          label="Thời gian chờ phản hồi (giây)"
          name={`${serviceType}_timeout`}
          rules={[{ required: true, message: 'Vui lòng nhập thời gian' }]}
        >
          <InputNumber
            min={10}
            max={300}
            step={5}
            style={{ width: '100%' }}
            placeholder="VD: 45"
            addonAfter="giây"
          />
        </Form.Item>

        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => handleSave(serviceType)}
            loading={saving === serviceType}
          >
            Lưu cấu hình
          </Button>
        </Space>
      </Card>
    );
  };

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>
            Cấu hình tìm kiếm tài xế
          </h1>
          <p style={{ color: '#666', marginTop: 8 }}>
            Quản lý bán kính tìm kiếm và các thông số cho từng loại dịch vụ
          </p>
        </div>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadConfigs}
            loading={loading}
          >
            Tải lại
          </Button>
        </Space>

        <Divider />

        <Form form={form} layout="vertical">
          <Row gutter={[24, 24]}>
            {configs.map((config) => (
              <Col xs={24} lg={12} xl={8} key={config.serviceType}>
                {renderServiceCard(config)}
              </Col>
            ))}
          </Row>
        </Form>
      </div>
    </Layout>
  );
}
