import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import StatsOverview from '../components/StatsOverview';
import FaultCard from '../components/FaultCard';
import BottomNav from '../components/BottomNav';

export default function Home() {
  const navigate = useNavigate();
  const { user, faults, fetchFaults, isLoading } = useApp();
  const [activeTab, setActiveTab] = useState('nearby');

  useEffect(() => {
    fetchFaults();
  }, []);

  const filteredFaults = faults.slice(0, 5);

  return (
    <div className="page home-page">
      <Header title="Valtryek" showMenu />
      
      <div className="page-content">
        <StatsOverview />
        
        <div className="welcome-section">
          <h2>Hello, {user?.name?.split(' ')[0] || 'User'}!</h2>
          <p>Report utility faults and track repairs in real-time</p>
        </div>
        
        <div className="quick-actions">
          <button className="action-btn primary" onClick={() => navigate('/report')}>
            <span className="material-icons">add_location</span>
            <span>Report Fault</span>
          </button>
          <button className="action-btn" onClick={() => navigate('/map')}>
            <span className="material-icons">map</span>
            <span>View Map</span>
          </button>
        </div>
        
        <div className="section-header">
          <h3>Recent Faults</h3>
          <button className="see-all" onClick={() => navigate('/faults')}>
            See All <span className="material-icons">arrow_forward</span>
          </button>
        </div>
        
        <div className="faults-list">
          {isLoading ? (
            <div className="skeleton-list">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          ) : filteredFaults.length > 0 ? (
            filteredFaults.map(fault => (
              <FaultCard key={fault._id} fault={fault} />
            ))
          ) : (
            <div className="empty-state">
              <span className="material-icons">check_circle</span>
              <p>No faults reported in your area</p>
              <button className="btn-primary" onClick={() => navigate('/report')}>
                Report First Fault
              </button>
            </div>
          )}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}
