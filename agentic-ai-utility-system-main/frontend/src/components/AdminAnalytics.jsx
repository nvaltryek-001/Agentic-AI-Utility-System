import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlassCard from './ui/GlassCard';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1', '#a855f7', '#ef4444', '#f97316', '#f59e0b', '#22c55e'];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    faults: [],
    severityDistribution: [],
    categoryDistribution: [],
    resolutionTime: [],
    technicianPerformance: [],
    monthlyTrends: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/faults/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Transform data for charts
        setAnalytics({
          severityDistribution: transformSeverityData(data.severityDistribution),
          categoryDistribution: transformCategoryData(data.categoryDistribution),
          resolutionTime: data.avgResolutionTime ? [{ name: 'Avg Resolution', hours: parseFloat(data.avgResolutionTime.toFixed(2)) }] : [],
          monthlyTrends: generateMonthlyTrends(),
          technicianPerformance: generateTechPerformance()
        });
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const transformSeverityData = (data) => {
    return data.map(item => ({
      name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      value: item.count,
      color: getSeverityColor(item._id)
    }));
  };

  const transformCategoryData = (data) => {
    return data.map(item => ({
      name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      value: item.count
    }));
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#6366f1';
    }
  };

  const generateMonthlyTrends = () => {
    // Mock data - replace with actual API call
    return [
      { month: 'Jan', faults: 45, resolved: 38 },
      { month: 'Feb', faults: 52, resolved: 48 },
      { month: 'Mar', faults: 38, resolved: 35 },
      { month: 'Apr', faults: 65, resolved: 58 },
      { month: 'May', faults: 48, resolved: 45 },
      { month: 'Jun', faults: 58, resolved: 52 },
    ];
  };

  const generateTechPerformance = () => {
    // Mock data - replace with actual API call
    return [
      { name: 'Rajesh K.', completed: 85, rating: 4.8 },
      { name: 'Priya S.', completed: 78, rating: 4.9 },
      { name: 'Amit P.', completed: 92, rating: 4.7 },
      { name: 'Sneha M.', completed: 65, rating: 4.6 },
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold gradient-text mb-2">Admin Analytics Dashboard</h1>
        <p className="text-gray-400">Comprehensive insights into system performance and fault resolution</p>
      </motion.div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Faults', value: '1,234', trend: '+12%', icon: '⚡' },
          { title: 'Resolved Today', value: '45', trend: '+8%', icon: '✅' },
          { title: 'Avg Resolution', value: '2.3h', trend: '-15%', icon: '⏱️' },
          { title: 'Active Techs', value: '28', trend: 'Stable', icon: '👷' },
        ].map((metric, idx) => (
          <GlassCard key={idx} hover={true}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">{metric.title}</p>
                <p className="text-3xl font-bold text-white mt-1">{metric.value}</p>
                <p className={`text-xs mt-2 ${metric.trend.startsWith('+') ? 'text-success' : metric.trend.startsWith('-') ? 'text-danger' : 'text-gray-400'}`}>
                  {metric.trend} vs last week
                </p>
              </div>
              <span className="text-4xl">{metric.icon}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution - Pie Chart */}
        <GlassCard>
          <h3 className="text-xl font-bold text-white mb-4">Fault Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.severityDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.severityDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Category Distribution - Bar Chart */}
        <GlassCard>
          <h3 className="text-xl font-bold text-white mb-4">Fault Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.categoryDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Monthly Trends - Line Chart */}
        <GlassCard>
          <h3 className="text-xl font-bold text-white mb-4">Monthly Fault Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="faults" stroke="#ef4444" strokeWidth={2} name="Reported" />
              <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Technician Performance */}
        <GlassCard>
          <h3 className="text-xl font-bold text-white mb-4">Technician Performance</h3>
          <div className="space-y-4">
            {analytics.technicianPerformance.map((tech, idx) => (
              <div key={idx} className="bg-background-secondary rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                      {tech.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{tech.name}</p>
                      <p className="text-xs text-gray-400">{tech.completed} faults completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="text-white font-bold">{tech.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-background-tertiary rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(tech.completed / 100) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Resolution Time Stats */}
      <GlassCard>
        <h3 className="text-xl font-bold text-white mb-4">Resolution Time Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Average Resolution Time', value: analytics.resolutionTime[0]?.hours || 0, unit: 'hours' },
            { label: 'Fastest Resolution', value: 0.5, unit: 'hours' },
            { label: 'Longest Resolution', value: 8.2, unit: 'hours' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center p-4 bg-background-secondary rounded-lg">
              <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
              <p className="text-3xl font-bold gradient-text">
                {typeof stat.value === 'number' ? stat.value.toFixed(1) : stat.value}
                <span className="text-base text-gray-400 ml-1">{stat.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
