/**
 * Fixed Layout - Simple and Working
 * No complex positioning, just clean layout
 */

import React, { useState } from 'react';
import { Layout, Menu, Button, Input, Space } from 'antd';
import {
  MenuOutlined,
  HomeOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  FolderOutlined,
  TeamOutlined,
  DeleteOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  ShareAltOutlined,
  InfoCircleOutlined,
  StarOutlined,
  MoreOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Search } = Input;

const FixedLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar - Let Ant Design handle positioning */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        collapsedWidth={80}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 24px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <HomeOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          {!collapsed && <span style={{ marginLeft: 12, fontSize: 16, fontWeight: 'bold' }}>BTRC</span>}
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          selectedKeys={['regulatory']}
          defaultOpenKeys={['collections']}
          style={{ border: 'none', paddingTop: 16 }}
          items={[
            { key: 'home', icon: <HomeOutlined />, label: 'Home' },
            {
              key: 'getting-started',
              label: 'GETTING STARTED',
              type: 'group',
              children: [
                { key: 'add-data', icon: <DatabaseOutlined />, label: 'Add your data' },
                { key: 'how-to-use', icon: <BarChartOutlined />, label: 'How to use Metabase' },
                { key: 'examples', icon: <FolderOutlined />, label: 'Examples' },
              ],
            },
            {
              key: 'collections',
              label: 'COLLECTIONS',
              type: 'group',
              children: [
                { key: 'our-analytics', icon: <BarChartOutlined />, label: 'Our analytics' },
                { key: 'personal', icon: <TeamOutlined />, label: 'Your personal collection' },
                { key: 'executive', icon: <FolderOutlined />, label: 'Executive Dashboard' },
                { key: 'regulatory', icon: <FolderOutlined />, label: 'Regulatory Dashboard', style: { background: '#e6f4ff' } },
              ],
            },
            {
              key: 'data',
              label: 'DATA',
              type: 'group',
              children: [
                { key: 'databases', icon: <DatabaseOutlined />, label: 'Databases' },
                { key: 'models', icon: <BarChartOutlined />, label: 'Models' },
                { key: 'metrics', icon: <BarChartOutlined />, label: 'Metrics' },
              ],
            },
            { key: 'trash', icon: <DeleteOutlined />, label: 'Trash', style: { marginTop: 24 } },
          ]}
        />
      </Sider>

      {/* Main Content Area */}
      <Layout>
        {/* Top Header */}
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Button type="text" icon={<MenuOutlined />} onClick={() => setCollapsed(!collapsed)} />
          <Space>
            <Search placeholder="Search..." style={{ width: 300 }} prefix={<SearchOutlined />} />
            <Button type="primary" icon={<PlusOutlined />}>New</Button>
          </Space>
        </Header>

        {/* Dashboard Title */}
        <Header style={{
          background: '#fff',
          padding: '16px 32px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
        }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Regulatory Operations Dashboard</h1>
          <Space>
            <Button type="text" icon={<EditOutlined />} title="Edit" />
            <Button type="text" icon={<ShareAltOutlined />} title="Share" />
            <Button type="text" icon={<StarOutlined />} title="Bookmark" />
            <Button type="text" icon={<InfoCircleOutlined />} title="Info" />
            <Button type="text" icon={<MoreOutlined />} title="More" />
          </Space>
        </Header>

        {/* Content */}
        <Content style={{ background: '#f0f2f5' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default FixedLayout;
