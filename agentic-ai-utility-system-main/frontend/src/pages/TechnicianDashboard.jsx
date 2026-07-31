import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useRealTime } from '../hooks/useRealTime';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './TechnicianDashboard.css';

// Custom marker icons
const technicianIcon = new L.DivIcon({
  className: 'technician-marker',
  html: `<div class="marker-pulse"></div><span class="material-icons">engineering</span>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const faultIcon = (severity) => new L.DivIcon({
  className: `fault-marker ${severity}`,
  html: `<span class="material-icons">${severity === 'critical' ? 'error' : 'warning'}</span>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const STATUS_FLOW = ['available', 'assigned', 'traveling', 'working', 'completed'];

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const { user, location, api } = useApp();
  const { 
    isConnected, 
    emitLocation, 
    acceptAssignment, 
    updateTechnicianStatus,
    liveUpdates 
  } = useRealTime(user, location);
  
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [technicianLocation, setTechnicianLocation] = useState(null);
  const [status, setStatus] = useState('available');
  const [stats, setStats] = useState({ completed: 0, rating: 5.0, earnings: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Get technician location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading,
            speed: position.coords.speed
          };
          setTechnicianLocation(loc);
          emitLocation(loc);
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [emitLocation]);

  // Fetch assigned tasks
  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/faults?assignedTo=' + user.id);
      setTasks(response.data);
      
      // Find active task
      const active = response.data.find(t => 
        ['assigned', 'in_progress', 'traveling'].includes(t.status)
      );
      if (active) {
        setCurrentTask(active);
        setStatus(active.status === 'assigned' ? 'assigned' : 
                  active.status === 'in_progress' ? 'working' : 'traveling');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/technicians/stats/' + user.id);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAcceptTask = async (task) => {
    setIsLoading(true);
    try {
      await api.put(`/faults/${task._id}/accept`);
      acceptAssignment(task._id, 15); // 15 min ETA
      setCurrentTask(task);
      setStatus('traveling');
      updateTechnicianStatus('traveling', task._id, technicianLocation);
      
      // Update task status
      await api.put(`/faults/${task._id}/status`, { status: 'in_progress' });
    } catch (error) {
      console.error('Error accepting task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!currentTask) return;
    
    setIsLoading(true);
    try {
      await api.put(`/faults/${currentTask._id}/status`, { status: newStatus });
      updateTechnicianStatus(newStatus, currentTask._id, technicianLocation);
      setStatus(newStatus);
      
      if (newStatus === 'completed') {
        setCurrentTask(null);
        setStatus('available');
        fetchTasks();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusButton = () => {
    switch (status) {
      case 'assigned':
        return (
          <button 
            className="status-btn traveling"
            onClick={() => handleStatusUpdate('traveling')}
            disabled={isLoading}
          >
            <span className="material-icons">directions</span>
            Start Navigation
          </button>
        );
      case 'traveling':
        return (
          <button 
            className="status-btn working"
            onClick={() => handleStatusUpdate('working')}
            disabled={isLoading}
          >
            <span className="material-icons">build</span>
            Arrived & Start Work
          </button>
        );
      case 'working':
        return (
          <button 
            className="status-btn completed"
            onClick={() => handleStatusUpdate('completed')}
            disabled={isLoading}
          >
            <span className="material-icons">check_circle</span>
            Mark Complete
          </button>
        );
      default:
        return (
          <div className="status-available">
            <span className="pulse-dot"></span>
            Available for assignments
          </div>
        );
    }
  };

  return (
    <div className="technician-dashboard">
      {/* Header */}
      <header className="tech-header">
        <div className="tech-profile">
          <div className="tech-avatar">
            <span className="material-icons">engineering</span>
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
          </div>
          <div className="tech-info">
            <h2>{user?.name}</h2>
            <span className="tech-rating">
              <span className="material-icons">star</span>
              {stats.rating}
            </span>
          </div>
        </div>
        <div className="tech-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">₹{stats.earnings}</span>
            <span className="stat-label">Earnings</span>
          </div>
        </div>
      </header>

      {/* Connection Status */}
      <div className={`connection-bar ${isConnected ? 'connected' : 'disconnected'}`}>
        <span className="material-icons">
          {isConnected ? 'wifi' : 'wifi_off'}
        </span>
        {isConnected ? 'Live tracking active' : 'Reconnecting...'}
      </div>

      {/* Live Updates */}
      {liveUpdates.length > 0 && (
        <div className="live-updates">
          {liveUpdates.slice(0, 3).map((update, index) => (
            <div key={index} className={`update-toast ${update.type}`}>
              <span className="material-icons">
                {update.type === 'technician_approaching' ? 'directions_walk' : 'notifications'}
              </span>
              <span>{update.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="tech-content">
        {/* Current Task Card */}
        {currentTask ? (
          <div className="current-task-card">
            <div className="task-header">
              <span className={`severity-badge ${currentTask.severity}`}>
                {currentTask.severity}
              </span>
              <span className="task-id">#{currentTask._id?.slice(-6)}</span>
            </div>
            
            <h3>{currentTask.type} Issue</h3>
            <p className="task-description">{currentTask.description}</p>
            
            <div className="task-location">
              <span className="material-icons">location_on</span>
              <span>{currentTask.location?.address || 'Location loading...'}</span>
            </div>

            <div className="task-meta">
              <span className="priority-score">
                Priority: {currentTask.priorityScore}/100
              </span>
              <span className="eta">
                ETA: 15 min
              </span>
            </div>

            <div className="status-actions">
              {getStatusButton()}
            </div>
          </div>
        ) : (
          <div className="no-task-card">
            <span className="material-icons">check_circle</span>
            <h3>No Active Task</h3>
            <p>You're available for new assignments</p>
          </div>
        )}

        {/* Map View */}
        {technicianLocation && (
          <div className="tech-map-container">
            <MapContainer
              center={[technicianLocation.lat, technicianLocation.lng]}
              zoom={14}
              style={{ height: '300px', width: '100%', borderRadius: '16px' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              
              {/* Technician marker */}
              <Marker 
                position={[technicianLocation.lat, technicianLocation.lng]}
                icon={technicianIcon}
              >
                <Popup>Your location</Popup>
              </Marker>

              {/* Current task marker */}
              {currentTask?.location?.lat && (
                <>
                  <Marker
                    position={[currentTask.location.lat, currentTask.location.lng]}
                    icon={faultIcon(currentTask.severity)}
                  >
                    <Popup>Task location</Popup>
                  </Marker>
                  
                  {/* Route line */}
                  <Polyline
                    positions={[
                      [technicianLocation.lat, technicianLocation.lng],
                      [currentTask.location.lat, currentTask.location.lng]
                    ]}
                    color="#667eea"
                    weight={4}
                    dashArray="10, 10"
                  />
                </>
              )}
            </MapContainer>
          </div>
        )}

        {/* Task Queue */}
        <div className="task-queue">
          <h3>Available Tasks ({tasks.filter(t => t.status === 'assigned').length})</h3>
          
          {tasks.filter(t => t.status === 'assigned').map(task => (
            <div key={task._id} className="task-item">
              <div className="task-item-info">
                <span className={`severity-dot ${task.severity}`}></span>
                <div>
                  <h4>{task.type}</h4>
                  <p>{task.location?.address?.slice(0, 40)}...</p>
                </div>
              </div>
              <button 
                className="accept-btn"
                onClick={() => handleAcceptTask(task)}
                disabled={currentTask !== null || isLoading}
              >
                Accept
              </button>
            </div>
          ))}
          
          {tasks.filter(t => t.status === 'assigned').length === 0 && (
            <div className="empty-queue">
              <span className="material-icons">inbox</span>
              <p>No available tasks</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="tech-nav">
        <button 
          className={activeTab === 'tasks' ? 'active' : ''}
          onClick={() => setActiveTab('tasks')}
        >
          <span className="material-icons">assignment</span>
          Tasks
        </button>
        <button 
          className={activeTab === 'map' ? 'active' : ''}
          onClick={() => setActiveTab('map')}
        >
          <span className="material-icons">map</span>
          Map
        </button>
        <button 
          className={activeTab === 'earnings' ? 'active' : ''}
          onClick={() => setActiveTab('earnings')}
        >
          <span className="material-icons">account_balance_wallet</span>
          Earnings
        </button>
        <button 
          className={activeTab === 'profile' ? 'active' : ''}
          onClick={() => navigate('/profile')}
        >
          <span className="material-icons">person</span>
          Profile
        </button>
      </nav>
    </div>
  );
}
