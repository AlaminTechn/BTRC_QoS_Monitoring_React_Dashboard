/**
 * Main App Component
 * Handles authentication via AuthContext and renders LoginPage or Dashboard
 */

import React, { useState } from 'react';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RegulatoryDashboard from './pages/RegulatoryDashboard';
import MapVisualization    from './pages/MapVisualization';
import LoginPage           from './pages/LoginPage';
import FixedLayout         from './components/layout/FixedLayout';
import './App.css';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState('regulatory');

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Connecting to Metabase...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <FixedLayout activePage={activePage} onNavigate={setActivePage}>
      {activePage === 'regulatory'        && <RegulatoryDashboard />}
      {activePage === 'map-visualization' && <MapVisualization />}
    </FixedLayout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
