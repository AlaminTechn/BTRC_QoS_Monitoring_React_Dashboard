/**
 * Main Layout Component
 * Metabase-style layout with sidebar and two-tier header
 */

import React, { useState } from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import SecondHeader from './SecondHeader';

const { Content } = Layout;

const MainLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <Layout style={{ minHeight: '100vh', width: '100%', margin: 0, padding: 0 }}>
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />

      {/* Main Layout Area */}
      <Layout
        style={{
          marginLeft: sidebarCollapsed ? 0 : 260,
          transition: 'margin-left 0.2s',
          minHeight: '100vh',
        }}
      >
        {/* Top Header */}
        <TopHeader
          onMenuToggle={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Second Header - Dashboard Title */}
        <SecondHeader title="Regulatory Operations Dashboard" />

        {/* Main Content */}
        <Content
          style={{
            padding: 0,
            margin: 0,
            background: '#f0f2f5',
            minHeight: 'calc(100vh - 128px)',
            width: '100%',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
