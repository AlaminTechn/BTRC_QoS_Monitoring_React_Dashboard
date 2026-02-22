/**
 * Dashboard Layout with Sidebar
 * Tested and stable version
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

const DashboardLayout = ({ children, title = 'Regulatory Operations Dashboard' }) => {
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
        {
          key: 'add-data',
          icon: <DatabaseOutlined />,
          label: 'Add your data',
        },
        {
          key: 'how-to-use',
          icon: <BarChartOutlined />,
          label: 'How to use Metabase',
        },
        {
          key: 'examples',
          icon: <FolderOutlined />,
          label: 'Examples',
        },
      ],
    },
    {
      key: 'collections',
      label: 'COLLECTIONS',
      type: 'group',
      children: [
        {
          key: 'our-analytics',
          icon: <BarChartOutlined />,
          label: 'Our analytics',
        },
        {
          key: 'personal',
          icon: <TeamOutlined />,
          label: 'Your personal collection',
        },
        {
          key: 'executive',
          icon: <FolderOutlined />,
          label: 'Executive Dashboard',
        },
        {
          key: 'regulatory',
          icon: <FolderOutlined />,
          label: 'Regulatory Dashboard',
          style: { background: '#e6f4ff' },
        },
      ],
    },
    {
      key: 'data',
      label: 'DATA',
      type: 'group',
      children: [
        {
          key: 'databases',
          icon: <DatabaseOutlined />,
          label: 'Databases',
        },
        {
          key: 'models',
          icon: <BarChartOutlined />,
          label: 'Models',
        },
        {
          key: 'metrics',
          icon: <BarChartOutlined />,
          label: 'Metrics',
        },
      ],
    },
    {
      key: 'trash',
      icon: <DeleteOutlined />,
      label: 'Trash',
      style: { marginTop: '24px' },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', width: '100%', overflow: 'visible' }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        collapsedWidth={80}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
        trigger={null}
      >
        {/* Logo Area */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 24px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <HomeOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          {!collapsed && (
            <span style={{ marginLeft: 12, fontSize: 16, fontWeight: 'bold' }}>
              BTRC
            </span>
          )}
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

      {/* Main Layout */}
      <Layout
        style={{
          marginLeft: collapsed ? 80 : 260,
          transition: 'margin-left 0.2s',
          minHeight: '100vh',
        }}
      >
        {/* Top Header */}
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            height: 64,
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          {/* Left: Menu Toggle */}
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 18 }} />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ padding: '4px 8px' }}
          />

          {/* Right: Search + New */}
          <Space size={16}>
            <Search
              placeholder="Search..."
              allowClear
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{
                background: '#1890ff',
                borderRadius: '6px',
                fontWeight: 500,
              }}
            >
              New
            </Button>
          </Space>
        </Header>

        {/* Dashboard Title Header */}
        <Header
          style={{
            background: '#fff',
            padding: '16px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            height: 64,
            position: 'sticky',
            top: 64,
            zIndex: 98,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            {title}
          </h1>
          <Space size={8}>
            <Button type="text" icon={<EditOutlined />} />
            <Button type="text" icon={<ShareAltOutlined />} />
            <Button type="text" icon={<StarOutlined />} />
            <Button type="text" icon={<InfoCircleOutlined />} />
            <Button type="text" icon={<MoreOutlined />} />
          </Space>
        </Header>

        {/* Content Area */}
        <Content
          style={{
            padding: 0,
            margin: 0,
            minHeight: 'calc(100vh - 128px)',
            overflow: 'visible',
            width: '100%',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
