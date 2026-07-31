import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Dashboard.css';

export default function SmartDashboard() {
  const navigate = useNavigate();
  const { user, faults, stats, fetchFaults, fetchStats, logout } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchStats(), fetchFaults()]);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Premium Header with User Info */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="gradient-text">Valtryek</h1>
          <p className="subtitle">Elite Fault Intelligence Platform</p>
        </div>
        <div className="user-section">
          <div className="user-avatar-glass">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="user-role">{user?.role || 'Citizen'}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout-glass">Logout</button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          Live Map
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-content">
        
        {/* Overview Tab - Complete Dashboard */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <section className="stats-grid">
              <div className="stat-card glass critical-glow">
                <div className="stat-icon">⚡</div>
                <h3>{stats?.total || faults.length}</h3>
                <p>Total Faults</p>
                <div className="stat-trend positive">+12% this week</div>
              </div>
              <div className="stat-card glass danger-glow">
                <div className="stat-icon">🔴</div>
                <h3>{stats?.critical || 0}</h3>
                <p>Critical</p>
                <div className="stat-trend negative">Requires attention</div>
              </div>
              <div className="stat-card glass warning-glow">
                <div className="stat-icon">⚠️</div>
                <h3>{stats?.high || 0}</h3>
                <p>High Priority</p>
                <div className="stat-trend">In progress</div>
              </div>
              <div className="stat-card glass success-glow">
                <div className="stat-icon">✅</div>
                <h3>{stats?.completed || 0}</h3>
                <p>Resolved</p>
                <div className="stat-trend positive">98% success rate</div>
              </div>
            </section>

            {/* Two Column Layout */}
            <div className="dashboard-columns">
              {/* Left Column - Map & Quick Actions */}
              <div className="left-column">
                {/* Mini Map Preview */}
                <section className="map-preview glass-panel">
                  <div className="section-header">
                    <h3>🗺️ Live Fault Map</h3>
                    <button onClick={() => setActiveTab('map')} className="view-all-btn">View All →</button>
                  </div>
                  <div className="map-container-mini">
                    <div className="map-placeholder">
                      <div className="map-icon">🌍</div>
                      <p>Interactive Map View</p>
                      <p className="fault-count">{faults.length} faults across region</p>
                    </div>
                  </div>
                </section>

                {/* Quick Actions */}
                <section className="quick-actions-glass">
                  <h3>⚡ Quick Actions</h3>
                  <div className="action-buttons">
                    <button onClick={() => navigate('/report')} className="action-btn primary">
                      <span className="btn-icon">➕</span>
                      <span>Report Fault</span>
                    </button>
                    <button onClick={() => setActiveTab('analytics')} className="action-btn secondary">
                      <span className="btn-icon">📊</span>
                      <span>Analytics</span>
                    </button>
                  </div>
                </section>
              </div>

              {/* Right Column - Recent Faults & Graph */}
              <div className="right-column">
                {/* Recent Faults */}
                <section className="faults-section glass-panel">
                  <div className="section-header">
                    <h3>📋 Recent Faults</h3>
                    <button onClick={() => setActiveTab('reports')} className="view-all-btn">View All →</button>
                  </div>
                  <div className="fault-list-premium">
                    {faults.slice(0, 5).map((fault) => (
                      <div key={fault._id} className={`fault-item-glass ${fault.severity}`}>
                        <div className="fault-left">
                          <div className="fault-type-badge">{fault.type}</div>
                          <p className="fault-location">{fault.location?.address || 'Unknown location'}</p>
                        </div>
                        <div className="fault-right">
                          <span className={`severity-pill ${fault.severity}`}>{fault.severity}</span>
                          <span className={`status-pill ${fault.status}`}>{fault.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Mini Analytics */}
                <section className="analytics-preview glass-panel">
                  <div className="section-header">
                    <h3>📈 Trends</h3>
                  </div>
                  <div className="trend-chart">
                    <div className="chart-bars">
                      {[65, 45, 78, 52, 89, 73, 95].map((height, idx) => (
                        <div key={idx} className="bar-container">
                          <div 
                            className="bar-fill" 
                            style={{ height: `${height}%` }}
                          ></div>
                          <span className="bar-label">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}

        {/* Map Tab */}
        {activeTab === 'map' && (
          <section className="map-section-full glass-panel">
            <div className="section-header">
              <h3>🗺️ Regional Fault Map</h3>
            </div>
            <div className="map-container-full">
              <div className="map-placeholder-full">
                <div className="map-icon-large">🌍</div>
                <h2>Interactive Map View</h2>
                <p>Real-time fault tracking across all regions</p>
                <div className="map-stats">
                  <div className="map-stat-item">
                    <span className="stat-value">{faults.length}</span>
                    <span className="stat-label">Total Faults</span>
                  </div>
                  <div className="map-stat-item">
                    <span className="stat-value critical">{stats?.critical || 0}</span>
                    <span className="stat-label">Critical</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <section className="analytics-section glass-panel">
            <div className="section-header">
              <h3>📊 Advanced Analytics</h3>
            </div>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h4>Fault Distribution</h4>
                <div className="distribution-chart">
                  <div className="segment critical">45%</div>
                  <div className="segment high">30%</div>
                  <div className="segment medium">15%</div>
                  <div className="segment low">10%</div>
                </div>
              </div>
              <div className="analytics-card">
                <h4>Weekly Trends</h4>
                <div className="trend-graph">
                  <div className="graph-line"></div>
                  <div className="graph-points"></div>
                </div>
              </div>
              <div className="analytics-card">
                <h4>Resolution Time</h4>
                <div className="metric-big">2.4h</div>
                <div className="metric-subtitle">Average resolution</div>
              </div>
              <div className="analytics-card">
                <h4>Success Rate</h4>
                <div className="metric-big success">98%</div>
                <div className="metric-subtitle">Completion rate</div>
              </div>
            </div>
          </section>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <section className="reports-section glass-panel">
            <div className="section-header">
              <h3>📋 Complete Fault Reports</h3>
              <button onClick={() => navigate('/report')} className="btn-report-fab">➕ Report</button>
            </div>
            <div className="reports-list">
              {faults.map((fault) => (
                <div key={fault._id} className={`report-card-glass ${fault.severity}`}>
                  <div className="report-header">
                    <span className="report-type">{fault.type}</span>
                    <span className={`report-severity ${fault.severity}`}>{fault.severity}</span>
                  </div>
                  <p className="report-description">{fault.description}</p>
                  <div className="report-meta">
                    <span className="report-location">📍 {fault.location?.address || 'Unknown'}</span>
                    <span className="report-date">{new Date(fault.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="report-footer">
                    <span className={`report-status ${fault.status}`}>Status: {fault.status}</span>
                    <span className="report-id">ID: {fault._id.slice(-6)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Bottom Premium Navigation */}
      <nav className="bottom-nav-premium">
        <button 
          className={`nav-item-premium ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Overview</span>
        </button>
        <button 
          className={`nav-item-premium ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <span className="nav-icon">🗺️</span>
          <span className="nav-label">Map</span>
        </button>
        <button 
          className={`nav-item-premium ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Analytics</span>
        </button>
        <button 
          className={`nav-item-premium ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-label">Reports</span>
        </button>
      </nav>
    </div>
  );
}
