import { useLocation, useNavigate } from 'react-router-dom';
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Home, Map, AlertCircle, User } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/map', icon: Map, label: 'Map' },
  { path: '/report', icon: AlertCircle, label: 'Report' },
  { path: '/profile', icon: User, label: 'Profile' }
];

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.2 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 shadow-2xl"
    >
      <div className="max-w-7xl mx-auto px-2 py-2 flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all relative group ${active
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              <motion.div
                animate={{
                  scale: active ? 1.1 : 1,
                  color: active ? '#4f46e5' : '#666'
                }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <Icon size={24} />
              </motion.div>
              <span className={`text-xs font-medium transition-colors ${active ? 'text-indigo-600' : 'text-gray-600'
                }`}>
                {item.label}
              </span>

              {/* Active indicator dot */}
              {active && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute bottom-0 w-8 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-t-lg"
                  transition={{ type: 'spring', stiffness: 200 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}

export default memo(BottomNav);
