/**
 * Sidebar Navigation Component
 * Metabase-style collapsible sidebar
 */

import React from 'react';
import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  FolderOutlined,
  TeamOutlined,
  SettingOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;

const Sidebar = ({ collapsed, onCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: 'Home',
      onClick: () => navigate('/'),
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
    <Sider
      collapsible={false}
      collapsed={collapsed}
      width={260}
      collapsedWidth={0}
      trigger={null}
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
        transition: 'all 0.2s',
        transform: collapsed ? 'translateX(-260px)' : 'translateX(0)',
      }}
    >
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <HomeOutlined style={{ fontSize: 24, color: '#1890ff' }} />
      </div>

      <Menu
        mode="inline"
        selectedKeys={['regulatory']}
        defaultOpenKeys={['collections']}
        items={menuItems}
        style={{
          border: 'none',
          paddingTop: 16,
        }}
      />
    </Sider>
  );
};

export default Sidebar;
