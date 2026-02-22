/**
 * Main App Component
 * Handles authentication via AuthContext and renders LoginPage or Dashboard
 */

import React from 'react';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RegulatoryDashboard from './pages/RegulatoryDashboard';
import LoginPage from './pages/LoginPage';
import FixedLayout from './components/layout/FixedLayout';
import './App.css';

const AppContent = () => {
  const { user, loading } = useAuth();

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
    <FixedLayout>
      <RegulatoryDashboard />
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
