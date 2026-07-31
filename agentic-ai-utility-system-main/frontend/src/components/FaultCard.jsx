import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const severityConfig = {
  critical: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: 'error' },
  high: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', icon: 'warning' },
  medium: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: 'info' },
  low: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', icon: 'check_circle' }
};

const statusConfig = {
  reported: { label: 'Reported', color: '#64748b' },
  analyzing: { label: 'Analyzing', color: '#3b82f6' },
  assigned: { label: 'Assigned', color: '#8b5cf6' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  resolved: { label: 'Resolved', color: '#22c55e' },
  closed: { label: 'Closed', color: '#10b981' }
};

const typeIcons = {
  electricity: 'bolt',
  water: 'water_drop',
  road: 'add_road',
  streetlight: 'lightbulb',
  sewage: 'waves',
  gas: 'local_fire_department'
};

export default function FaultCard({ fault, compact }) {
  const navigate = useNavigate();
  const { user } = useApp();
  
  const severity = severityConfig[fault.severity] || severityConfig.medium;
  const status = statusConfig[fault.status] || statusConfig.reported;
  const typeIcon = typeIcons[fault.type] || 'report_problem';
  
  const formatTime = (date) => {
    const now = new Date();
    const faultDate = new Date(date);
    const diff = now - faultDate;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return faultDate.toLocaleDateString();
  };

  return (
    <div 
      className={`fault-card ${compact ? 'compact' : ''}`}
      onClick={() => navigate(`/fault/${fault._id}`)}
      style={{ borderLeftColor: severity.color }}
    >
      <div className="fault-card-header">
        <div className="fault-type-badge" style={{ background: severity.bg }}>
          <span className="material-icons" style={{ color: severity.color }}>
            {typeIcon}
          </span>
        </div>
        <div className="fault-meta">
          <span className="fault-id">#{fault._id?.slice(-6).toUpperCase()}</span>
          <span className="fault-time">{formatTime(fault.createdAt)}</span>
        </div>
        <span 
          className="severity-badge"
          style={{ background: severity.bg, color: severity.color }}
        >
          {fault.severity}
        </span>
      </div>
      
      <h3 className="fault-title">{fault.title}</h3>
      
      {!compact && (
        <p className="fault-description">{fault.description}</p>
      )}
      
      <div className="fault-card-footer">
        <div className="fault-location">
          <span className="material-icons">location_on</span>
          <span>{fault.location?.address || 'Location unavailable'}</span>
        </div>
        <span 
          className="status-pill"
          style={{ background: `${status.color}20`, color: status.color }}
        >
          {status.label}
        </span>
      </div>
      
      {fault.aiAnalysis && (
        <div className="ai-insight">
          <span className="material-icons">auto_fix_high</span>
          <span>AI Confidence: {Math.round(fault.aiAnalysis.confidence * 100)}%</span>
        </div>
      )}
    </div>
  );
}
