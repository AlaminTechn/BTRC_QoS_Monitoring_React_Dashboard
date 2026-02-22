/**
 * Simple Dashboard Layout
 * Stable sidebar + content layout
 */

import React, { useState } from 'react';
import { Layout, Menu, Button, Input, Space, Tooltip } from 'antd';
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

const SimpleDashboardLayout = ({ children, title = 'Regulatory Operations Dashboard' }) => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: 'Home',
    },
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
    { key: 'trash', icon: <DeleteOutlined />, label: 'Trash', style: { marginTop: '24px' } },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        collapsedWidth={80}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 24px',
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
          items={menuItems}
          style={{ border: 'none', paddingTop: 16 }}
        />
      </Sider>

      {/* Main Area */}
      <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'margin-left 0.2s' }}>
        {/* Top Header */}
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
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
          position: 'sticky',
          top: 64,
          zIndex: 98,
        }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{title}</h1>
          <Space>
            <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} /></Tooltip>
            <Tooltip title="Share"><Button type="text" icon={<ShareAltOutlined />} /></Tooltip>
            <Tooltip title="Bookmark"><Button type="text" icon={<StarOutlined />} /></Tooltip>
            <Tooltip title="Info"><Button type="text" icon={<InfoCircleOutlined />} /></Tooltip>
            <Tooltip title="More"><Button type="text" icon={<MoreOutlined />} /></Tooltip>
          </Space>
        </Header>

        {/* Content */}
        <Content style={{ minHeight: 'calc(100vh - 128px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default SimpleDashboardLayout;
