import { useState, useEffect, useMemo, memo, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Bell, LogOut, Plus } from 'lucide-react';
import BottomNav from '../components/BottomNav';

function Dashboard() {
  const navigate = useNavigate();
  const { user, faults, stats, fetchFaults, logout } = useApp();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await fetchFaults();
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Failed to load. Try again?');
    } finally {
      setLoading(false);
    }
  }, [fetchFaults]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleReportFault = () => {
    navigate('/report');
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'high': return 'bg-orange-50 border-orange-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      case 'low': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  };

  // Memoize filtered faults to prevent unnecessary recalculations
  const filteredFaults = useMemo(() => {
    if (filter === 'all') {
      return faults;
    }
    return faults.filter(f => f.severity?.toLowerCase() === filter.toLowerCase());
  }, [faults, filter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
      {/* Premium Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Valtryek
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Fault Intelligence</p>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 md:p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bell size={20} className="text-gray-600" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="p-2 md:p-3 rounded-lg hover:bg-gray-100 transition-colors"
                title="Logout"
              >
                <LogOut size={20} className="text-gray-600" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome Card with CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg mb-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Hello, {user?.name?.split(' ')[0] || 'User'}!</h2>
              <p className="text-white/90">Report faults in real-time and help us improve services</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReportFault}
              className="bg-white text-indigo-600 font-bold py-2 px-4 rounded-xl flex items-center gap-2 hover:bg-gray-100 transition-colors"
            >
              <Plus size={20} />
              <span className="text-sm">Report</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          {[
            { label: 'Total', value: stats?.total || 0, icon: '📊' },
            { label: 'Critical', value: stats?.critical || 0, icon: '🔴' },
            { label: 'In Progress', value: stats?.inProgress || 0, icon: '⚙️' },
            { label: 'Completed', value: stats?.completed || 0, icon: '✅' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between"
            >
              <span className="text-red-700 font-medium">⚠️ {error}</span>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'critical', 'high', 'medium', 'low'].map((f) => (
            <motion.button
              key={f}
              onClick={() => setFilter(f)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${filter === f
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </motion.button>
          ))}
        </div>

        {/* Faults List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <motion.div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredFaults.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <span className="text-5xl mb-4 block">🎉</span>
            <p className="text-gray-600 font-medium">No faults found!</p>
            <p className="text-gray-500 text-sm mt-2">Great service quality in your area</p>
          </motion.div>
        ) : (
          <motion.div className="space-y-3">
            <AnimatePresence>
              {filteredFaults.map((fault, i) => (
                <motion.div
                  key={fault._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ x: 4 }}
                  className={`${getSeverityColor(fault.severity)} border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all`}
                  onClick={() => navigate(`/fault/${fault._id}`)}
                >
                  <div className="flex gap-4">
                    <div className="text-2xl flex-shrink-0">
                      {getSeverityIcon(fault.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{fault.type || 'Fault'}</h3>
                      <p className="text-sm text-gray-600 truncate">{fault.description || 'No description'}</p>
                      <div className="flex gap-2 mt-2 text-xs text-gray-500">
                        <span>{fault.status || 'pending'}</span>
                        <span>•</span>
                        <span>{new Date(fault.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default memo(Dashboard);