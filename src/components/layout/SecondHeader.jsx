/**
 * Second Header Component
 * Dashboard title and action buttons
 */

import React from 'react';
import { Space, Button, Tooltip } from 'antd';
import {
  EditOutlined,
  ShareAltOutlined,
  InfoCircleOutlined,
  StarOutlined,
  MoreOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const SecondHeader = ({ title = 'Regulatory Operations Dashboard' }) => {
  return (
    <div
      style={{
        background: '#fff',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        minHeight: '64px',
        width: '100%',
      }}
    >
      {/* Dashboard Title */}
      <h1
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 600,
          color: '#262626',
        }}
      >
        {title}
      </h1>

      {/* Action Buttons */}
      <Space size={8}>
        <Tooltip title="Edit dashboard">
          <Button type="text" icon={<EditOutlined />} />
        </Tooltip>
        <Tooltip title="Share">
          <Button type="text" icon={<ShareAltOutlined />} />
        </Tooltip>
        <Tooltip title="Auto-refresh">
          <Button type="text" icon={<ClockCircleOutlined />} />
        </Tooltip>
        <Tooltip title="Bookmark">
          <Button type="text" icon={<StarOutlined />} />
        </Tooltip>
        <Tooltip title="Dashboard info">
          <Button type="text" icon={<InfoCircleOutlined />} />
        </Tooltip>
        <Tooltip title="More options">
          <Button type="text" icon={<MoreOutlined />} />
        </Tooltip>
      </Space>
    </div>
  );
};

export default SecondHeader;
