import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Mail, LogOut, Shield, Calendar } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useApp();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50"
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </motion.button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
            Profile
          </h1>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{user?.name || 'User'}</h2>
          <p className="text-gray-600 mb-4">{user?.email}</p>
          <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full font-bold text-sm capitalize">
            {user?.role || 'Citizen'}
          </div>
        </motion.div>

        {/* User Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3 mb-8"
        >
          <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-4">
            <Mail className="text-indigo-600" size={24} />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Email</p>
              <p className="text-gray-900 font-medium">{user?.email}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-4">
            <Shield className="text-indigo-600" size={24} />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Role</p>
              <p className="text-gray-900 font-medium capitalize">{user?.role || 'Citizen'}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-4">
            <Calendar className="text-indigo-600" size={24} />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Member Since</p>
              <p className="text-gray-900 font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}</p>
            </div>
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogout}
          className="w-full py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold rounded-xl hover:from-red-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Sign Out
        </motion.button>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
