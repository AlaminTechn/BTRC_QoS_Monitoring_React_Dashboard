/**
 * Top Header Component
 * First header with menu toggle, logo, search, and actions
 */

import React from 'react';
import { Layout, Input, Button, Space } from 'antd';
import {
  MenuOutlined,
  SearchOutlined,
  PlusOutlined,
  HomeOutlined,
} from '@ant-design/icons';

const { Header } = Layout;
const { Search } = Input;

const TopHeader = ({ onMenuToggle, sidebarCollapsed }) => {
  const handleSearch = (value) => {
    console.log('Search:', value);
  };

  return (
    <Header
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        height: '64px',
        width: '100%',
        lineHeight: 'normal',
      }}
    >
      {/* Left side: Menu + Logo */}
      <Space size={16}>
        <Button
          type="text"
          icon={<MenuOutlined style={{ fontSize: 18 }} />}
          onClick={onMenuToggle}
          style={{ padding: '4px 8px' }}
        />
        <HomeOutlined style={{ fontSize: 24, color: '#1890ff' }} />
      </Space>

      {/* Right side: Search + New Button */}
      <Space size={16}>
        <Search
          placeholder="Search..."
          allowClear
          onSearch={handleSearch}
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
  );
};

export default TopHeader;
