import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Header({ title, showBack, onBack, showMenu }) {
  const { user, isOffline, unreadCount } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="app-header">
      <div className="header-left">
        {showBack && (
          <button className="header-btn" onClick={onBack}>
            <span className="material-icons">arrow_back</span>
          </button>
        )}
        <h1 className="header-title">{title}</h1>
      </div>
      
      <div className="header-right">
        {isOffline && (
          <span className="offline-indicator">
            <span className="material-icons">cloud_off</span>
            Offline
          </span>
        )}
        
        <button className="header-btn notification-btn">
          <span className="material-icons">notifications</span>
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </button>
        
        {showMenu && (
          <div className="menu-container">
            <button className="header-btn" onClick={() => setMenuOpen(!menuOpen)}>
              <span className="material-icons">more_vert</span>
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                <button onClick={() => {}}>Settings</button>
                <button onClick={() => {}}>Help</button>
                <button onClick={() => {}}>Logout</button>
              </div>
            )}
          </div>
        )}
        
        {user && (
          <div className="user-avatar">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
      </div>
    </header>
  );
}
