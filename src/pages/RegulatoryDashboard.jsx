/**
 * Regulatory Dashboard
 * Tabs: R2.1 SLA Monitoring, R2.2 Regional Analysis, R2.3 Violation Reporting
 * - Global date range filter
 * - Tab visibility controlled by user's group permissions
 */

import React, { useState, useEffect } from 'react';
import { Tabs, DatePicker, Space, Tag, Button, Tooltip, Avatar, Dropdown } from 'antd';
import {
  DatabaseOutlined, EnvironmentOutlined, WarningOutlined,
  CalendarOutlined, CloseCircleOutlined,
  UserOutlined, LogoutOutlined, LockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { TABS } from '../config/permissions';
import RegionalAnalysis from './RegionalAnalysis';
import SLAMonitoring from './SLAMonitoring';
import ViolationReporting from './ViolationReporting';

const { RangePicker } = DatePicker;

// POC data range: Nov 30 – Dec 15, 2025
const POC_START = dayjs('2025-11-30');
const POC_END   = dayjs('2025-12-15');

const DATE_PRESETS = [
  { label: 'Full Range (POC)', value: [POC_START, POC_END] },
  { label: 'First Week',       value: [POC_START, dayjs('2025-12-06')] },
  { label: 'Second Week',      value: [dayjs('2025-12-07'), POC_END] },
  { label: 'Dec 1–7',          value: [dayjs('2025-12-01'), dayjs('2025-12-07')] },
  { label: 'Dec 8–15',         value: [dayjs('2025-12-08'), POC_END] },
];

// Map tab keys → label + icon
const TAB_META = {
  [TABS.SLA]:      { icon: <DatabaseOutlined />,    label: 'R2.1 SLA Monitoring' },
  [TABS.REGIONAL]: { icon: <EnvironmentOutlined />, label: 'R2.2 Regional Analysis' },
  [TABS.VIOLATION]:{ icon: <WarningOutlined />,     label: 'R2.3 Violation Reporting' },
};

const RegulatoryDashboard = () => {
  const { user, perms, logout } = useAuth();

  // Pick first allowed tab as default
  const defaultTab = perms?.tabs?.[0] || TABS.REGIONAL;
  const [activeTab, setActiveTab] = useState(defaultTab);

  // When perms change (e.g., re-login), reset to first allowed tab
  useEffect(() => {
    if (perms && !perms.tabs.includes(activeTab)) {
      setActiveTab(perms.tabs[0]);
    }
  }, [perms]);

  // Global date range
  const [dateRange, setDateRange] = useState([null, null]);
  const startDate = dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : null;
  const endDate   = dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : null;
  const isDateActive = Boolean(startDate && endDate);

  // Auto-lock division for Regional Officers
  const lockedDivision = perms?.divisionLock || null;

  // Build tab items — only include tabs the user has access to
  const allTabDefs = [
    {
      key: TABS.SLA,
      children: <SLAMonitoring startDate={startDate} endDate={endDate} readOnly={perms?.readOnly} />,
    },
    {
      key: TABS.REGIONAL,
      children: (
        <RegionalAnalysis
          startDate={startDate}
          endDate={endDate}
          readOnly={perms?.readOnly}
          lockedDivision={lockedDivision}
          showISPFilter={perms?.showISPFilter}
        />
      ),
    },
    {
      key: TABS.VIOLATION,
      children: (
        <ViolationReporting
          startDate={startDate}
          endDate={endDate}
          showDetail={perms?.showViolationDetail}
        />
      ),
    },
  ];

  const tabItems = allTabDefs
    .filter((t) => perms?.tabs?.includes(t.key))
    .map((t) => ({
      key: t.key,
      label: (
        <span>
          {TAB_META[t.key].icon}
          {' '}{TAB_META[t.key].label}
        </span>
      ),
      children: t.children,
    }));

  // User dropdown menu
  const userMenuItems = [
    {
      key: 'info',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{user?.email}</div>
          <Tag color="blue" style={{ marginTop: 4 }}>{perms?.label}</Tag>
          {lockedDivision && (
            <Tag color="orange" icon={<LockOutlined />} style={{ marginTop: 4 }}>
              {lockedDivision} only
            </Tag>
          )}
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      danger: true,
      onClick: logout,
    },
  ];

  return (
    <div style={{ width: '100%', minHeight: '100%' }}>

      {/* Top Bar: Date Filter + User Info */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        {/* Date Range Filter */}
        <Space align="center" style={{ flex: 1, flexWrap: 'wrap', gap: 8 }}>
          <CalendarOutlined style={{ color: '#3b82f6', fontSize: 15 }} />
          <span style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>Date Range:</span>

          <RangePicker
            value={dateRange}
            onChange={(vals) => setDateRange(vals || [null, null])}
            format="MMM DD, YYYY"
            allowClear
            presets={DATE_PRESETS}
            disabledDate={(d) => d && (d.isBefore(POC_START, 'day') || d.isAfter(POC_END, 'day'))}
            placeholder={['Start Date', 'End Date']}
            size="middle"
            style={{ width: 270 }}
          />

          {isDateActive ? (
            <>
              <Tag color="blue" style={{ fontSize: 12 }} icon={<CalendarOutlined />}>
                {startDate} → {endDate}
              </Tag>
              <Tooltip title="Clear date filter">
                <Button
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={() => setDateRange([null, null])}
                  type="text"
                  style={{ color: '#6b7280' }}
                >
                  Clear
                </Button>
              </Tooltip>
            </>
          ) : (
            <Tag color="default" style={{ fontSize: 12 }}>
              Showing all POC data (Nov 30 – Dec 15, 2025)
            </Tag>
          )}

          {/* Division lock badge for Regional Officers */}
          {lockedDivision && (
            <Tag color="orange" icon={<LockOutlined />} style={{ fontSize: 12 }}>
              Division: {lockedDivision}
            </Tag>
          )}
        </Space>

        {/* User Avatar + Dropdown */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer', padding: '4px 10px',
            borderRadius: 20, border: '1px solid #e5e7eb',
            transition: 'background 0.2s',
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Avatar size={28} icon={<UserOutlined />} style={{ background: '#3b82f6' }} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>
                {user?.name?.split(' ')[0]}
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>{perms?.label}</div>
            </div>
          </div>
        </Dropdown>
      </div>

      {/* Tabs (filtered by permission) */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        tabBarStyle={{
          margin: 0,
          padding: '0 24px',
          background: 'white',
          borderBottom: '1px solid #f0f0f0',
        }}
        style={{ width: '100%', background: 'white' }}
      />
    </div>
  );
};

export default RegulatoryDashboard;
