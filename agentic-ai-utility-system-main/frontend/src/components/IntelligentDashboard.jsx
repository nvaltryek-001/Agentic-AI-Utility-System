import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useBehavioralTracking } from '../utils/behavioralTracker';
import './IntelligentDashboard.css';

const AISummary = ({ data, location }) => {
  const generateSummary = () => {
    const insights = [];
    
    // Analyze trends
    const criticalCount = data.filter(f => f.severity === 'critical').length;
    const highCount = data.filter(f => f.severity === 'high').length;
    const recentCount = data.filter(f => {
      const hoursAgo = (Date.now() - new Date(f.createdAt)) / (1000 * 60 * 60);
      return hoursAgo < 24;
    }).length;
    
    if (criticalCount > 0) {
      insights.push({
        type: 'critical',
        icon: 'warning',
        color: '#ef4444',
        message: `⚠️ ${criticalCount} critical ${criticalCount === 1 ? 'issue' : 'issues'} requiring immediate attention in ${location?.city || 'your area'}`
      });
    }
    
    if (recentCount > 5) {
      insights.push({
        type: 'trend',
        icon: 'trending_up',
        color: '#f59e0b',
        message: `📈 ${recentCount} new reports in the last 24 hours - activity is higher than usual`
      });
    }
    
    // Most common issue type
    const typeCounts = data.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {});
    
    const topType = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topType) {
      insights.push({
        type: 'pattern',
        icon: 'psychology',
        color: '#8b5cf6',
        message: `🤖 AI detected: ${topType[0]} issues are most common (${topType[1]} reports)`
      });
    }
    
    if (insights.length === 0) {
      insights.push({
        type: 'positive',
        icon: 'check_circle',
        color: '#10b981',
        message: `✅ All systems normal in ${location?.city || 'your area'}. No critical issues detected.`
      });
    }
    
    return insights;
  };

  const insights = generateSummary();

  return (
    <div className="ai-summary-section">
      <div className="ai-header">
        <span className="material-icons ai-icon">psychology</span>
        <h3>AI Insights</h3>
        <span className="ai-badge">Live</span>
      </div>
      <div className="insights-list">
        {insights.map((insight, index) => (
          <div 
            key={index} 
            className={`insight-card ${insight.type}`}
            style={{ '--insight-color': insight.color }}
          >
            <span className="material-icons" style={{ color: insight.color }}>
              {insight.icon}
            </span>
            <p>{insight.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const RiskIndicator = ({ level, trend }) => {
  const getRiskConfig = () => {
    switch (level) {
      case 'critical':
        return { color: '#ef4444', icon: 'error', label: 'Critical Risk' };
      case 'high':
        return { color: '#f97316', icon: 'warning', label: 'High Risk' };
      case 'medium':
        return { color: '#f59e0b', icon: 'info', label: 'Medium Risk' };
      default:
        return { color: '#10b981', icon: 'check_circle', label: 'Low Risk' };
    }
  };

  const config = getRiskConfig();

  return (
    <div className="risk-indicator" style={{ '--risk-color': config.color }}>
      <div className="risk-gauge">
        <svg viewBox="0 0 100 60">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke={config.color} 
            strokeWidth="8"
            strokeDasharray="126"
            strokeDashoffset={126 - (level === 'critical' ? 126 : level === 'high' ? 95 : level === 'medium' ? 63 : 32)}
            className="risk-arc"
          />
        </svg>
        <div className="risk-icon">
          <span className="material-icons" style={{ color: config.color }}>
            {config.icon}
          </span>
        </div>
      </div>
      <div className="risk-info">
        <span className="risk-label">{config.label}</span>
        <span className={`risk-trend ${trend}`}>
          <span className="material-icons">
            {trend === 'up' ? 'trending_up' : trend === 'down' ? 'trending_down' : 'trending_flat'}
          </span>
          {trend === 'up' ? 'Rising' : trend === 'down' ? 'Improving' : 'Stable'}
        </span>
      </div>
    </div>
  );
};

const ActivityStream = ({ activities }) => {
  return (
    <div className="activity-stream">
      <h3>Live Activity</h3>
      <div className="activity-list">
        {activities.map((activity, index) => (
          <div key={index} className="activity-item" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="activity-icon" style={{ backgroundColor: activity.color }}>
              <span className="material-icons">{activity.icon}</span>
            </div>
            <div className="activity-content">
              <p className="activity-text">{activity.text}</p>
              <span className="activity-time">{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const QuickActions = ({ actions, onAction }) => {
  return (
    <div className="quick-actions">
      <h3>Quick Actions</h3>
      <div className="actions-grid">
        {actions.map((action, index) => (
          <button 
            key={index}
            className="action-card"
            onClick={() => onAction(action.action)}
            style={{ '--action-color': action.color }}
          >
            <span className="material-icons">{action.icon}</span>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const StatsCard = ({ title, value, change, icon, color }) => {
  const isPositive = change >= 0;
  
  return (
    <div className="stats-card" style={{ '--card-color': color }}>
      <div className="stats-icon">
        <span className="material-icons">{icon}</span>
      </div>
      <div className="stats-content">
        <span className="stats-value">{value}</span>
        <span className="stats-title">{title}</span>
        {change !== undefined && (
          <span className={`stats-change ${isPositive ? 'positive' : 'negative'}`}>
            <span className="material-icons">
              {isPositive ? 'arrow_upward' : 'arrow_downward'}
            </span>
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
};

export default function IntelligentDashboard() {
  const { 
    user, 
    location, 
    cityFaults, 
    fetchCityFaults,
    stats 
  } = useApp();
  
  const { getGreeting, getRecommendations, getInsights, trackDashboard } = useBehavioralTracking();
  
  const [greeting, setGreeting] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [insights, setInsights] = useState([]);
  const [timeOnSection, setTimeOnSection] = useState(0);

  // Fetch city faults on mount
  useEffect(() => {
    if (location) {
      fetchCityFaults(location.city, location.state);
    }
  }, [location, fetchCityFaults]);

  // Load personalized data
  useEffect(() => {
    setGreeting(getGreeting());
    setRecommendations(getRecommendations());
    setInsights(getInsights());
  }, [getGreeting, getRecommendations, getInsights]);

  // Track time on dashboard
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOnSection(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      trackDashboard('main', timeOnSection);
    };
  }, [timeOnSection, trackDashboard]);

  // Generate mock activities for demo
  const activities = useMemo(() => [
    { text: 'New electricity fault reported in your area', time: '2 min ago', icon: 'bolt', color: '#f59e0b' },
    { text: 'Technician assigned to water leak on Main St', time: '5 min ago', icon: 'engineering', color: '#3b82f6' },
    { text: 'Road repair completed on Oak Avenue', time: '12 min ago', icon: 'check_circle', color: '#10b981' },
    { text: 'AI detected potential fault pattern', time: '18 min ago', icon: 'psychology', color: '#8b5cf6' },
    { text: 'Critical sewer backup reported', time: '25 min ago', icon: 'warning', color: '#ef4444' }
  ], []);

  const quickActions = [
    { label: 'Report Issue', icon: 'add_circle', action: 'report', color: '#667eea' },
    { label: 'View Map', icon: 'map', action: 'map', color: '#10b981' },
    { label: 'My Reports', icon: 'list_alt', action: 'reports', color: '#f59e0b' },
    { label: 'Settings', icon: 'settings', action: 'settings', color: '#6b7280' }
  ];

  const handleAction = (action) => {
    // Handle navigation based on action
    console.log('Action:', action);
  };

  const cityStats = {
    total: cityFaults?.length || 0,
    critical: cityFaults?.filter(f => f.severity === 'critical').length || 0,
    resolved: cityFaults?.filter(f => f.status === 'completed').length || 0,
    pending: cityFaults?.filter(f => ['reported', 'analyzing', 'assigned'].includes(f.status)).length || 0
  };

  return (
    <div className="intelligent-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>{greeting}</h1>
          <p className="location-badge">
            <span className="material-icons">location_on</span>
            {location ? `${location.city}, ${location.state}` : 'Select your location'}
          </p>
        </div>
        <RiskIndicator level="medium" trend="up" />
      </div>

      {/* AI Summary */}
      <AISummary data={cityFaults || []} location={location} />

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatsCard 
          title="Total Issues" 
          value={cityStats.total} 
          change={12}
          icon="error_outline"
          color="#667eea"
        />
        <StatsCard 
          title="Critical" 
          value={cityStats.critical}
          change={-5}
          icon="warning"
          color="#ef4444"
        />
        <StatsCard 
          title="Resolved" 
          value={cityStats.resolved}
          change={8}
          icon="check_circle"
          color="#10b981"
        />
        <StatsCard 
          title="In Progress" 
          value={cityStats.pending}
          icon="pending"
          color="#f59e0b"
        />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        <ActivityStream activities={activities} />
        <QuickActions actions={quickActions} onAction={handleAction} />
      </div>

      {/* Personalized Insights */}
      {insights.length > 0 && (
        <div className="personal-insights">
          <h3>Your Impact</h3>
          <div className="insights-grid">
            {insights.map((insight, index) => (
              <div key={index} className={`insight-badge ${insight.type}`}>
                <span className="material-icons">{insight.icon}</span>
                <p>{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations">
          <h3>Recommended for You</h3>
          <div className="recommendation-cards">
            {recommendations.map((rec, index) => (
              <button 
                key={index} 
                className="recommendation-card"
                onClick={() => handleAction(rec.action)}
              >
                <span className="material-icons">
                  {rec.type === 'location_based' ? 'location_on' : 
                   rec.type === 'follow_up' ? 'update' : 'explore'}
                </span>
                <span>{rec.title}</span>
                <span className="material-icons arrow">arrow_forward</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
