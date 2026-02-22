/**
 * Login Page
 * Authenticates user against Metabase and resolves group permissions
 */

import React, { useState } from 'react';
import { Form, Input, Button, Alert, Card, Typography, Space, Tag } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

// Test accounts hint for POC — remove in production
const TEST_ACCOUNTS = [
  { email: 'admin@btrc.gov.bd',            role: 'BTRC Admin',       color: 'red' },
  { email: 'ceo@btrc.gov.bd',              role: 'Management',       color: 'purple' },
  { email: 'analyst@btrc.gov.bd',          role: 'Operations Team',  color: 'blue' },
  { email: 'dhaka.officer@btrc.gov.bd',    role: 'Regional Officer (Dhaka)',       color: 'green' },
  { email: 'chittagong.officer@btrc.gov.bd', role: 'Regional Officer (Chittagong)', color: 'cyan' },
  { email: 'consultant@example.com',       role: 'External Viewer',  color: 'orange' },
];

const LoginPage = () => {
  const { login, loading, error } = useAuth();
  const [form] = Form.useForm();
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (values) => {
    setLocalError(null);
    try {
      await login(values.email, values.password);
    } catch (err) {
      setLocalError(err.response?.data?.message || err.message || 'Invalid credentials. Please try again.');
    }
  };

  const fillAccount = (email) => {
    form.setFieldsValue({ email, password: 'Test@12345' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <SafetyCertificateOutlined style={{ fontSize: 52, color: 'white' }} />
          <Title level={2} style={{ color: 'white', margin: '12px 0 4px' }}>
            BTRC QoS Dashboard
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
            Broadband Quality of Service Monitoring
          </Text>
        </div>

        {/* Login Card */}
        <Card
          bordered={false}
          style={{ borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          bodyStyle={{ padding: '32px 36px' }}
        >
          <Title level={4} style={{ marginBottom: 24, color: '#1f2937' }}>
            Sign In
          </Title>

          {(error || localError) && (
            <Alert
              message={localError || error}
              type="error"
              showIcon
              style={{ marginBottom: 20 }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="on"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Enter a valid email address' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                placeholder="you@btrc.gov.bd"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Password"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<LoginOutlined />}
                loading={loading}
                block
                style={{ height: 48, fontWeight: 600, fontSize: 15 }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* POC Test Accounts Hint */}
        <Card
          bordered={false}
          size="small"
          style={{ marginTop: 16, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none' }}
          bodyStyle={{ padding: '14px 20px' }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 10 }}>
            POC Test Accounts (password: Test@12345)
          </Text>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            {TEST_ACCOUNTS.map((acc) => (
              <div
                key={acc.email}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.08)',
                  transition: 'background 0.2s',
                }}
                onClick={() => fillAccount(acc.email)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >
                <Text style={{ color: 'white', fontSize: 11, fontFamily: 'monospace' }}>
                  {acc.email}
                </Text>
                <Tag color={acc.color} style={{ fontSize: 10, margin: 0 }}>
                  {acc.role}
                </Tag>
              </div>
            ))}
          </Space>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block', marginTop: 8 }}>
            Click any account to auto-fill the form
          </Text>
        </Card>

      </div>
    </div>
  );
};

export default LoginPage;
