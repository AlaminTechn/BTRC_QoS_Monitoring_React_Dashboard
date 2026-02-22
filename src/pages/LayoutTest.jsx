/**
 * Layout Test Page
 * Test the sidebar layout before applying to main app
 */

import React from 'react';
import { Card, Row, Col } from 'antd';
import DashboardLayout from '../components/layout/DashboardLayout';

const LayoutTest = () => {
  return (
    <DashboardLayout title="Layout Test - Regulatory Dashboard">
      <div style={{ padding: '24px' }}>
        <Card title="Test Content" style={{ marginBottom: 16 }}>
          <p>This is a test to verify the sidebar layout works correctly.</p>
          <p>✅ If you can see this, the layout is rendering properly!</p>
          <p>✅ Click the hamburger menu to toggle the sidebar</p>
          <p>✅ The sidebar should collapse/expand smoothly</p>
          <p>✅ The content should remain visible at all times</p>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card title="Card 1">
              <p style={{ textAlign: 'center', padding: '40px 0', fontSize: 24 }}>
                Test 1
              </p>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Card 2">
              <p style={{ textAlign: 'center', padding: '40px 0', fontSize: 24 }}>
                Test 2
              </p>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Card 3">
              <p style={{ textAlign: 'center', padding: '40px 0', fontSize: 24 }}>
                Test 3
              </p>
            </Card>
          </Col>
        </Row>

        <Card title="Full Width Content" style={{ marginTop: 16 }}>
          <p>This content should take the full width of the available space.</p>
          <p>When sidebar collapses, this should expand.</p>
          <div style={{
            background: '#e6f7ff',
            border: '1px solid #1890ff',
            padding: '16px',
            borderRadius: '4px',
            marginTop: '16px'
          }}>
            <strong>Layout Status: ✅ Working</strong>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default LayoutTest;
