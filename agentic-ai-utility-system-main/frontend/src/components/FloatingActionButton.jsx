import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FloatingActionButton() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { 
      icon: 'report_problem', 
      label: 'Report Fault',
      action: () => navigate('/report'),
      color: '#ef4444'
    },
    { 
      icon: 'camera_alt', 
      label: 'Photo Report',
      action: () => navigate('/report?photo=true'),
      color: '#8b5cf6'
    },
    { 
      icon: 'mic', 
      label: 'Voice Report',
      action: () => navigate('/report?voice=true'),
      color: '#22c55e'
    }
  ];

  return (
    <div className="fab-container">
      <div className={`fab-menu ${isOpen ? 'open' : ''}`}>
        {menuItems.map((item, index) => (
          <button
            key={index}
            className="fab-item"
            onClick={() => {
              item.action();
              setIsOpen(false);
            }}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <span className="material-icons" style={{ color: item.color }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      
      <button 
        className="fab"
        onClick={() => setIsOpen(!isOpen)}
        style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0)' }}
      >
        <span className="material-icons">add</span>
      </button>
    </div>
  );
}
