import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

const COLORS = ['#0ea5e9', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

const severityData = [
  { name: 'Critical', value: 12, color: '#ef4444' },
  { name: 'High', value: 28, color: '#f97316' },
  { name: 'Medium', value: 45, color: '#f59e0b' },
  { name: 'Low', value: 35, color: '#22c55e' }
];

const categoryData = [
  { name: 'Electricity', value: 42 },
  { name: 'Water', value: 28 },
  { name: 'Road', value: 18 },
  { name: 'Streetlight', value: 12 },
  { name: 'Sewage', value: 15 },
  { name: 'Gas', value: 5 }
];

const weeklyData = [
  { day: 'Mon', faults: 24, resolved: 18 },
  { day: 'Tue', faults: 18, resolved: 15 },
  { day: 'Wed', faults: 32, resolved: 28 },
  { day: 'Thu', faults: 28, resolved: 22 },
  { day: 'Fri', faults: 35, resolved: 30 },
  { day: 'Sat', faults: 15, resolved: 12 },
  { day: 'Sun', faults: 12, resolved: 10 }
];

const hourlyData = [
  { hour: '6AM', count: 5 },
  { hour: '9AM', count: 18 },
  { hour: '12PM', count: 25 },
  { hour: '3PM', count: 22 },
  { hour: '6PM', count: 28 },
  { hour: '9PM', count: 15 },
  { hour: '12AM', count: 8 }
];

export default function Analytics() {
  const navigate = useNavigate();
  const { stats } = useApp();
  const [timeRange, setTimeRange] = useState('week');
  const [activeTab, setActiveTab] = useState('overview');

  const kpis = [
    { label: 'Avg Resolution', value: '4.2h', change: '+12%', positive: true },
    { label: 'AI Accuracy', value: '94%', change: '+3%', positive: true },
    { label: 'Response Rate', value: '98%', change: '+5%', positive: true },
    { label: 'Cost Saved', value: '₹2.4L', change: '+18%', positive: true }
  ];

  return (
    <div className="page analytics-page">
      <Header title="Analytics" showBack onBack={() => navigate(-1)} />
      
      <div className="page-content">
        {/* Time Range Selector */}
        <div className="time-range-selector">
          {['day', 'week', 'month', 'year'].map(range => (
            <button
              key={range}
              className={`range-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
        
        {/* KPI Cards */}
        <div className="kpi-grid">
          {kpis.map((kpi, index) => (
            <div key={index} className="kpi-card">
              <span className="kpi-label">{kpi.label}</span>
              <div className="kpi-value-row">
                <span className="kpi-value">{kpi.value}</span>
                <span className={`kpi-change ${kpi.positive ? 'positive' : 'negative'}`}>
                  {kpi.change}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Tab Navigation */}
        <div className="analytics-tabs">
          {['overview', 'trends', 'performance', 'ai-insights'].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
        
        {/* Charts */}
        {activeTab === 'overview' && (
          <>
            <div className="chart-card">
              <h3>Faults vs Resolved (Weekly)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="faults" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="charts-row">
              <div className="chart-card half">
                <h3>By Severity</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  {severityData.map((item, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ background: item.color }} />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="chart-card half">
                <h3>By Category</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'trends' && (
          <div className="chart-card">
            <h3>Hourly Fault Pattern</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                <Area type="monotone" dataKey="count" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {activeTab === 'ai-insights' && (
          <div className="ai-insights-section">
            <div className="insight-card">
              <div className="insight-header">
                <span className="material-icons">auto_fix_high</span>
                <h3>AI Predictions</h3>
              </div>
              <div className="insight-content">
                <div className="prediction-item">
                  <span className="prediction-label">Expected faults (24h)</span>
                  <span className="prediction-value">24-32</span>
                </div>
                <div className="prediction-item">
                  <span className="prediction-label">High risk areas</span>
                  <span className="prediction-value">Downtown, Industrial</span>
                </div>
                <div className="prediction-item">
                  <span className="prediction-label">Recommended technicians</span>
                  <span className="prediction-value">12 on-duty</span>
                </div>
              </div>
            </div>
            
            <div className="insight-card">
              <div className="insight-header">
                <span className="material-icons">trending_up</span>
                <h3>Model Performance</h3>
              </div>
              <div className="performance-metrics">
                <div className="metric">
                  <span className="metric-label">Severity Accuracy</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '92%' }} />
                  </div>
                  <span className="metric-value">92%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Fault Detection</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '96%' }} />
                  </div>
                  <span className="metric-value">96%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Response Time</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '88%' }} />
                  </div>
                  <span className="metric-value">88%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}
