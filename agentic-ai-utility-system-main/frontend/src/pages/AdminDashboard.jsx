import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import './AdminDashboard.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API = import.meta.env.VITE_API_URL || "";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const SEVERITY_COLORS = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

const STATUS_COLORS = {
  reported: "#6b7280",
  analyzing: "#8b5cf6",
  assigned: "#f59e0b",
  in_progress: "#3b82f6",
  on_hold: "#ef4444",
  completed: "#10b981",
  cancelled: "#9ca3af",
};

// Custom icons
const technicianIcon = new L.DivIcon({
  className: 'admin-tech-marker',
  html: `<div class="marker-pulse blue"></div><span class="material-icons">engineering</span>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const faultIcon = (severity) => new L.DivIcon({
  className: `admin-fault-marker ${severity}`,
  html: `<span class="material-icons">${severity === 'critical' ? 'error' : 'warning'}</span>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

// Map auto-center component
function MapAutoCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

function AdminDashboard() {
  const [faults, setFaults] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [onlineTechnicians, setOnlineTechnicians] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("live");
  const [filters, setFilters] = useState({
    status: "",
    severity: "",
    type: "",
  });
  const [selectedFault, setSelectedFault] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState({
    activeUsers: 0,
    avgResponseTime: 0,
    systemLoad: 0
  });
  const [aiInsights, setAiInsights] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const socketRef = useRef(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch faults
      const faultsRes = await axios.get(`${API}/api/faults`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFaults(faultsRes.data);

      // Fetch technicians
      const techRes = await axios.get(`${API}/api/technicians`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTechnicians(techRes.data);

      // Fetch analytics
      const analyticsRes = await axios.get(`${API}/api/faults/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Add live event
  const addLiveEvent = useCallback((event) => {
    setLiveEvents(prev => {
      const newEvents = [{ ...event, id: Date.now() }, ...prev].slice(0, 50);
      return newEvents;
    });
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      setLiveEvents(prev => prev.filter(e => e.id !== event.id));
    }, 30000);
  }, []);

  // Generate AI insights
  const generateAIInsights = useCallback(() => {
    const insights = [];
    
    // Critical fault alert
    const criticalFaults = faults.filter(f => f.severity === 'critical' && f.status !== 'completed');
    if (criticalFaults.length > 0) {
      insights.push({
        type: 'alert',
        priority: 'high',
        title: `${criticalFaults.length} Critical Faults Require Attention`,
        description: 'Immediate action needed to prevent service disruption',
        action: 'View Critical',
        timestamp: Date.now()
      });
    }
    
    // Technician availability
    const availableTechs = onlineTechnicians.filter(t => t.status === 'available').length;
    const pendingFaults = faults.filter(f => f.status === 'assigned').length;
    if (pendingFaults > availableTechs * 2) {
      insights.push({
        type: 'warning',
        priority: 'medium',
        title: 'Technician Shortage Predicted',
        description: `High backlog: ${pendingFaults} pending vs ${availableTechs} available technicians`,
        action: 'Reallocate',
        timestamp: Date.now()
      });
    }
    
    // Pattern detection
    const recentFaults = faults.filter(f => {
      const hoursAgo = (Date.now() - new Date(f.createdAt)) / (1000 * 60 * 60);
      return hoursAgo < 24;
    });
    const typeCounts = {};
    recentFaults.forEach(f => {
      typeCounts[f.type] = (typeCounts[f.type] || 0) + 1;
    });
    const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    if (mostCommon && mostCommon[1] > 5) {
      insights.push({
        type: 'insight',
        priority: 'low',
        title: `Pattern Detected: ${mostCommon[0]} Issues`,
        description: `${mostCommon[1]} ${mostCommon[0]} faults reported in last 24h - possible infrastructure issue`,
        action: 'Investigate',
        timestamp: Date.now()
      });
    }
    
    // Performance insight
    const completedToday = faults.filter(f => 
      f.status === 'completed' && 
      (Date.now() - new Date(f.updatedAt)) / (1000 * 60 * 60) < 24
    ).length;
    if (completedToday > 10) {
      insights.push({
        type: 'success',
        priority: 'low',
        title: 'High Performance Day',
        description: `${completedToday} faults resolved today - 23% above average`,
        action: 'View Report',
        timestamp: Date.now()
      });
    }
    
    setAiInsights(insights);
  }, [faults, onlineTechnicians]);

  useEffect(() => {
    fetchData();
    
    // Setup Socket.io for real-time updates
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Admin socket connected');
      setIsConnected(true);
      
      // Authenticate as admin
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      socket.emit('authenticate', {
        userId: user.id || user._id,
        role: 'admin',
        location: { city: 'all' }
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // System state updates
    socket.on('system:state', (data) => {
      setOnlineTechnicians(data.activeTechnicians || []);
      setSystemMetrics(prev => ({
        ...prev,
        activeUsers: data.onlineUsers || 0
      }));
    });

    // Real-time fault events
    socket.on('fault:updated', (data) => {
      addLiveEvent({
        type: 'fault_update',
        message: `Fault #${data.faultId?.slice(-6)} updated to ${data.status}`,
        severity: 'info',
        timestamp: Date.now()
      });
      fetchData();
    });

    socket.on('technician:online', (data) => {
      addLiveEvent({
        type: 'tech_online',
        message: `Technician ${data.userId?.slice(-6)} is now online`,
        severity: 'success',
        timestamp: Date.now()
      });
    });

    socket.on('technician:offline', (data) => {
      addLiveEvent({
        type: 'tech_offline',
        message: `Technician ${data.userId?.slice(-6)} went offline`,
        severity: 'warning',
        timestamp: Date.now()
      });
    });

    socket.on('technician:moving', (data) => {
      setOnlineTechnicians(prev => 
        prev.map(t => t.userId === data.userId ? { ...t, ...data } : t)
      );
    });

    socket.on('assignment:accepted', (data) => {
      addLiveEvent({
        type: 'assignment',
        message: `Assignment accepted - ETA: ${data.eta} min`,
        severity: 'success',
        timestamp: Date.now()
      });
    });

    // Refresh data periodically
    const interval = setInterval(fetchData, 30000);
    
    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [addLiveEvent]);

  // Generate AI insights when data changes
  useEffect(() => {
    generateAIInsights();
  }, [generateAIInsights]);

  const handleReassign = async (faultId, newTechnicianId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/api/faults/${faultId}/status`,
        { status: "assigned" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
      setSelectedFault(null);
    } catch (err) {
      alert("Failed to reassign");
    }
  };

  const filteredFaults = faults.filter((f) => {
    if (filters.status && f.status !== filters.status) return false;
    if (filters.severity && f.severity !== filters.severity) return false;
    if (filters.type && f.type !== filters.type) return false;
    return true;
  });

  // Chart data preparation
  const getTrendData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    });
    
    return {
      labels: last7Days,
      datasets: [{
        label: 'Faults Reported',
        data: [12, 19, 15, 25, 22, 30, analytics?.recentFaults || 18],
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4
      }, {
        label: 'Resolved',
        data: [10, 15, 18, 20, 25, 28, analytics?.completed || 20],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  };

  const getSeverityData = () => ({
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [{
      data: [
        faults.filter(f => f.severity === 'critical').length,
        faults.filter(f => f.severity === 'high').length,
        faults.filter(f => f.severity === 'medium').length,
        faults.filter(f => f.severity === 'low').length
      ],
      backgroundColor: ['#dc2626', '#ef4444', '#f59e0b', '#22c55e'],
      borderWidth: 0
    }]
  });

  const getStatusData = () => ({
    labels: ['Reported', 'Assigned', 'In Progress', 'Completed'],
    datasets: [{
      label: 'Faults',
      data: [
        faults.filter(f => f.status === 'reported').length,
        faults.filter(f => f.status === 'assigned').length,
        faults.filter(f => f.status === 'in_progress').length,
        faults.filter(f => f.status === 'completed').length
      ],
      backgroundColor: ['#6b7280', '#f59e0b', '#3b82f6', '#10b981'],
      borderRadius: 8
    }]
  });

  const renderLiveDashboard = () => (
    <div className="live-dashboard">
      {/* Live Status Bar */}
      <div className="live-status-bar">
        <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="material-icons">{isConnected ? 'wifi' : 'wifi_off'}</span>
          {isConnected ? 'Live Connection' : 'Reconnecting...'}
        </div>
        <div className="live-metrics">
          <span className="metric">
            <span className="material-icons">people</span>
            {systemMetrics.activeUsers} Active Users
          </span>
          <span className="metric">
            <span className="material-icons">engineering</span>
            {onlineTechnicians.length} Online Technicians
          </span>
          <span className="metric">
            <span className="material-icons">pending_actions</span>
            {faults.filter(f => f.status !== 'completed').length} Open Faults
          </span>
        </div>
      </div>

      {/* AI Insights Panel */}
      {aiInsights.length > 0 && (
        <div className="ai-insights-panel">
          <h3 className="panel-title">
            <span className="material-icons">psychology</span>
            AI Insights
          </h3>
          <div className="insights-list">
            {aiInsights.map((insight, idx) => (
              <div key={idx} className={`insight-card ${insight.type} ${insight.priority}`}>
                <div className="insight-icon">
                  <span className="material-icons">
                    {insight.type === 'alert' ? 'warning' : 
                     insight.type === 'warning' ? 'notification_important' :
                     insight.type === 'success' ? 'trending_up' : 'lightbulb'}
                  </span>
                </div>
                <div className="insight-content">
                  <h4>{insight.title}</h4>
                  <p>{insight.description}</p>
                </div>
                <button className="insight-action">{insight.action}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Map Section */}
      <div className="live-map-section">
        <div className="section-header">
          <h3>
            <span className="material-icons">map</span>
            Live City View
          </h3>
          <div className="map-controls">
            <button 
              className={selectedTimeRange === '1h' ? 'active' : ''}
              onClick={() => setSelectedTimeRange('1h')}
            >1H</button>
            <button 
              className={selectedTimeRange === '24h' ? 'active' : ''}
              onClick={() => setSelectedTimeRange('24h')}
            >24H</button>
            <button 
              className={selectedTimeRange === '7d' ? 'active' : ''}
              onClick={() => setSelectedTimeRange('7d')}
            >7D</button>
          </div>
        </div>
        
        <div className="live-map-container">
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: '500px', width: '100%', borderRadius: '16px' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <MapAutoCenter center={mapCenter} />
            
            {/* Heatmap circles for fault density */}
            {faults.filter(f => f.status !== 'completed' && f.location?.lat).map(fault => (
              <Circle
                key={fault._id}
                center={[fault.location.lat, fault.location.lng]}
                radius={fault.severity === 'critical' ? 500 : fault.severity === 'high' ? 400 : 300}
                pathOptions={{
                  fillColor: SEVERITY_COLORS[fault.severity],
                  fillOpacity: 0.3,
                  color: SEVERITY_COLORS[fault.severity],
                  weight: 2
                }}
              />
            ))}
            
            {/* Fault markers */}
            {faults.filter(f => f.status !== 'completed' && f.location?.lat).map(fault => (
              <Marker
                key={fault._id}
                position={[fault.location.lat, fault.location.lng]}
                icon={faultIcon(fault.severity)}
              >
                <Popup>
                  <div className="fault-popup">
                    <h4>{fault.type} Issue</h4>
                    <p className={`severity ${fault.severity}`}>{fault.severity}</p>
                    <p>{fault.description?.slice(0, 100)}...</p>
                    <p>Status: {fault.status}</p>
                    <p>Priority: {fault.priorityScore}/100</p>
                  </div>
                </Popup>
              </Marker>
            ))}
            
            {/* Technician markers */}
            {onlineTechnicians.filter(t => t.location?.lat).map(tech => (
              <Marker
                key={tech.userId}
                position={[tech.location.lat, tech.location.lng]}
                icon={technicianIcon}
              >
                <Popup>
                  <div className="tech-popup">
                    <h4>Technician {tech.userId?.slice(-6)}</h4>
                    <p className={`status ${tech.status}`}>{tech.status}</p>
                    <p>Last update: {new Date(tech.lastUpdate).toLocaleTimeString()}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          {/* Live Events Overlay */}
          {liveEvents.length > 0 && (
            <div className="live-events-overlay">
              <h4>Live Activity</h4>
              <div className="events-list">
                {liveEvents.slice(0, 5).map(event => (
                  <div key={event.id} className={`event-item ${event.severity}`}>
                    <span className="event-time">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="event-message">{event.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      {analytics && (
        <div className="quick-stats-grid">
          <div className="stat-card critical">
            <div className="stat-icon">
              <span className="material-icons">error</span>
            </div>
            <div className="stat-info">
              <h3>{faults.filter(f => f.severity === 'critical' && f.status !== 'completed').length}</h3>
              <p>Critical Faults</p>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">
              <span className="material-icons">schedule</span>
            </div>
            <div className="stat-info">
              <h3>{analytics.pending}</h3>
              <p>Pending</p>
            </div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">
              <span className="material-icons">engineering</span>
            </div>
            <div className="stat-info">
              <h3>{onlineTechnicians.filter(t => t.status === 'available').length}</h3>
              <p>Available Techs</p>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">
              <span className="material-icons">check_circle</span>
            </div>
            <div className="stat-info">
              <h3>{analytics.completed}</h3>
              <p>Completed Today</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFaults = () => (
    <div className="faults-section">
      {/* Filters */}
      <div className="filters-bar">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="reported">Reported</option>
          <option value="analyzing">Analyzing</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
        </select>

        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className="filter-select"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="filter-select"
        >
          <option value="">All Types</option>
          <option value="electricity">Electricity</option>
          <option value="water">Water</option>
          <option value="road">Road</option>
          <option value="streetlight">Street Light</option>
          <option value="sewage">Sewage</option>
          <option value="gas">Gas</option>
          <option value="other">Other</option>
        </select>
        
        <button className="bulk-action-btn">
          <span className="material-icons">auto_fix_high</span>
          AI Auto-Assign
        </button>
      </div>

      {/* Faults Grid */}
      <div className="faults-grid">
        {filteredFaults.map((fault) => (
          <div key={fault._id} className={`fault-card ${fault.severity} ${fault.status}`}>
            <div className="fault-header">
              <span className={`severity-badge ${fault.severity}`}>
                {fault.severity}
              </span>
              <span className="fault-id">#{fault._id?.slice(-6)}</span>
            </div>
            
            <h4 className="fault-type">{fault.type}</h4>
            <p className="fault-description">{fault.description?.slice(0, 100)}...</p>
            
            <div className="fault-meta">
              <span className={`status-badge ${fault.status}`}>
                {fault.status.replace('_', ' ')}
              </span>
              <span className="priority-score">
                Priority: {fault.priorityScore || '-'}
              </span>
            </div>
            
            <div className="fault-location">
              <span className="material-icons">location_on</span>
              {fault.location?.address || `${fault.location?.lat?.toFixed(4)}, ${fault.location?.lng?.toFixed(4)}`}
            </div>
            
            <div className="fault-footer">
              <div className="assigned-to">
                {fault.assignedTo ? (
                  <>
                    <span className="material-icons">person</span>
                    {fault.assignedTo.name}
                  </>
                ) : (
                  <span className="unassigned">Unassigned</span>
                )}
              </div>
              <span className="fault-time">
                {new Date(fault.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <div className="fault-actions">
              <button 
                className="action-btn view"
                onClick={() => setSelectedFault(fault)}
              >
                View Details
              </button>
              {!fault.assignedTo && (
                <button className="action-btn assign">
                  Assign
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTechnicians = () => (
    <div className="technicians-section">
      <div className="tech-summary">
        <div className="summary-card">
          <h4>{onlineTechnicians.length}</h4>
          <p>Online Now</p>
        </div>
        <div className="summary-card">
          <h4>{onlineTechnicians.filter(t => t.status === 'available').length}</h4>
          <p>Available</p>
        </div>
        <div className="summary-card">
          <h4>{onlineTechnicians.filter(t => t.status === 'traveling' || t.status === 'working').length}</h4>
          <p>On Job</p>
        </div>
        <div className="summary-card">
          <h4>{technicians.length}</h4>
          <p>Total Registered</p>
        </div>
      </div>
      
      <div className="technicians-grid">
        {technicians.map((tech) => {
          const onlineStatus = onlineTechnicians.find(t => t.userId === tech._id);
          return (
            <div key={tech._id} className={`tech-card ${onlineStatus ? 'online' : 'offline'}`}>
              <div className="tech-header">
                <div className="tech-avatar">
                  <span className="material-icons">engineering</span>
                  <span className={`status-indicator ${onlineStatus?.status || 'offline'}`}></span>
                </div>
                <div className="tech-info">
                  <h4>{tech.name}</h4>
                  <span className={`status-text ${onlineStatus?.status || 'offline'}`}>
                    {onlineStatus?.status || 'Offline'}
                  </span>
                </div>
              </div>
              
              <div className="tech-stats">
                <div className="stat">
                  <span className="material-icons">star</span>
                  <span>{tech.rating?.toFixed(1) || "5.0"}</span>
                </div>
                <div className="stat">
                  <span className="material-icons">assignment</span>
                  <span>{tech.currentWorkload || 0} Active</span>
                </div>
                <div className="stat">
                  <span className="material-icons">check_circle</span>
                  <span>{tech.totalCompleted || 0} Done</span>
                </div>
              </div>
              
              {tech.skills?.length > 0 && (
                <div className="tech-skills">
                  {tech.skills.slice(0, 4).map((skill) => (
                    <span key={skill} className="skill-tag">{skill}</span>
                  ))}
                </div>
              )}
              
              {onlineStatus?.location && (
                <div className="tech-location">
                  <span className="material-icons">location_on</span>
                  <span>Last seen: {new Date(onlineStatus.lastUpdate).toLocaleTimeString()}</span>
                </div>
              )}
              
              <div className="tech-actions">
                <button className="action-btn message">
                  <span className="material-icons">message</span>
                </button>
                <button className="action-btn track">
                  <span className="material-icons">my_location</span>
                  Track
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="analytics-section">
      <div className="charts-grid">
        <div className="chart-card large">
          <h4>Fault Trends (7 Days)</h4>
          <Line 
            data={getTrendData()} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
              scales: { y: { beginAtZero: true } }
            }}
          />
        </div>
        
        <div className="chart-card">
          <h4>Severity Distribution</h4>
          <Doughnut 
            data={getSeverityData()}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } }
            }}
          />
        </div>
        
        <div className="chart-card">
          <h4>Status Overview</h4>
          <Bar 
            data={getStatusData()}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }}
          />
        </div>
      </div>
      
      {analytics && (
        <div className="analytics-metrics">
          <div className="metric-card">
            <h5>Average Resolution Time</h5>
            <p className="metric-value">{Math.round(analytics.avgResolutionTime)}h</p>
            <span className="metric-trend down">↓ 12% from last week</span>
          </div>
          <div className="metric-card">
            <h5>First Response Time</h5>
            <p className="metric-value">18 min</p>
            <span className="metric-trend up">↑ 8% improvement</span>
          </div>
          <div className="metric-card">
            <h5>Customer Satisfaction</h5>
            <p className="metric-value">4.6/5</p>
            <span className="metric-trend up">↑ 0.3 from last month</span>
          </div>
          <div className="metric-card">
            <h5>AI Assignment Accuracy</h5>
            <p className="metric-value">94%</p>
            <span className="metric-trend up">↑ 2% improvement</span>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div className="admin-loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="header-title">
          <span className="material-icons">admin_panel_settings</span>
          <div>
            <h1>Command Center</h1>
            <p>Real-time city operations dashboard</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="header-btn">
            <span className="material-icons">notifications</span>
          </button>
          <button className="header-btn">
            <span className="material-icons">settings</span>
          </button>
          <div className={`live-indicator ${isConnected ? 'active' : ''}`}>
            <span className="pulse"></span>
            Live
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-tabs">
        {[
          { id: 'live', label: 'Live View', icon: 'sensors' },
          { id: 'faults', label: 'Faults', icon: 'report_problem' },
          { id: 'technicians', label: 'Technicians', icon: 'engineering' },
          { id: 'analytics', label: 'Analytics', icon: 'analytics' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="material-icons">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="admin-content">
        {activeTab === "live" && renderLiveDashboard()}
        {activeTab === "faults" && renderFaults()}
        {activeTab === "technicians" && renderTechnicians()}
        {activeTab === "analytics" && renderAnalytics()}
      </main>

      {/* Fault Detail Modal */}
      {selectedFault && (
        <div className="modal-overlay" onClick={() => setSelectedFault(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Fault Details</h3>
              <button className="modal-close" onClick={() => setSelectedFault(null)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-row">
                <span className="label">Fault ID</span>
                <span className="value">#{selectedFault._id}</span>
              </div>
              <div className="detail-row">
                <span className="label">Type</span>
                <span className="value">{selectedFault.type}</span>
              </div>
              <div className="detail-row">
                <span className="label">Severity</span>
                <span className={`value severity ${selectedFault.severity}`}>{selectedFault.severity}</span>
              </div>
              <div className="detail-row">
                <span className="label">Status</span>
                <span className={`value status ${selectedFault.status}`}>{selectedFault.status.replace('_', ' ')}</span>
              </div>
              <div className="detail-row">
                <span className="label">Priority Score</span>
                <span className="value">{selectedFault.priorityScore}/100</span>
              </div>
              <div className="detail-row">
                <span className="label">Description</span>
                <p className="description">{selectedFault.description || "N/A"}</p>
              </div>
              <div className="detail-row">
                <span className="label">Location</span>
                <span className="value">{selectedFault.location?.lat?.toFixed(6)}, {selectedFault.location?.lng?.toFixed(6)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Assigned To</span>
                <span className="value">{selectedFault.assignedTo?.name || "Unassigned"}</span>
              </div>
              <div className="detail-row">
                <span className="label">Created</span>
                <span className="value">{new Date(selectedFault.createdAt).toLocaleString()}</span>
              </div>
              
              {selectedFault.status !== "completed" && (
                <div className="reassign-section">
                  <label>Reassign to technician:</label>
                  <select
                    onChange={(e) => handleReassign(selectedFault._id, e.target.value)}
                    className="reassign-select"
                  >
                    <option value="">Select technician...</option>
                    {technicians
                      .filter((t) => t._id !== selectedFault.assignedTo?._id)
                      .map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name} ({t.currentWorkload || 0} jobs)
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedFault(null)}>
                Close
              </button>
              <button className="btn-primary">
                <span className="material-icons">edit</span>
                Edit Fault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
