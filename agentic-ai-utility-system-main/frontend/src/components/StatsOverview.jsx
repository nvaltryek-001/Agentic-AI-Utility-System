import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

const statCards = [
  { key: 'total', label: 'Total Faults', icon: 'assignment', color: '#3b82f6' },
  { key: 'critical', label: 'Critical', icon: 'error', color: '#ef4444' },
  { key: 'inProgress', label: 'In Progress', icon: 'engineering', color: '#f59e0b' },
  { key: 'completed', label: 'Resolved', icon: 'check_circle', color: '#22c55e' }
];

export default function StatsOverview() {
  const { stats, fetchStats } = useApp();

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="stats-overview">
      <div className="stats-scroll">
        {statCards.map((card) => (
          <div key={card.key} className="stat-card" style={{ '--stat-color': card.color }}>
            <div className="stat-icon" style={{ background: `${card.color}20`, color: card.color }}>
              <span className="material-icons">{card.icon}</span>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats[card.key] || 0}</span>
              <span className="stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="quick-filters">
        <button className="filter-chip active">
          <span className="material-icons">filter_list</span>
          All
        </button>
        <button className="filter-chip">
          <span className="material-icons">schedule</span>
          Today
        </button>
        <button className="filter-chip">
          <span className="material-icons">calendar_today</span>
          Week
        </button>
        <button className="filter-chip">
          <span className="material-icons">location_on</span>
          Nearby
        </button>
      </div>
    </div>
  );
}
