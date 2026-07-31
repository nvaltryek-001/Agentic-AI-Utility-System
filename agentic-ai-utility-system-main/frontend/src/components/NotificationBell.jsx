import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationCenter from './NotificationCenter';
import { useApp } from '../context/AppContext';

export default function NotificationBell() {
  const [showCenter, setShowCenter] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const { state } = useApp();

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time notifications via Socket.io
  useEffect(() => {
    if (!state.socket) return;

    const handleNotification = (data) => {
      // Play notification sound
      playNotificationSound();
      
      // Vibrate device (if supported)
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      
      // Update unread count
      setUnreadCount(prev => prev + 1);
      
      // Add to recent notifications
      setRecentNotifications(prev => [data.notification, ...prev].slice(0, 5));
    };

    const userId = state.user?._id || state.user?.id;
    if (userId) {
      state.socket.on(`notification:${userId}`, handleNotification);
    }

    return () => {
      if (userId) {
        state.socket.off(`notification:${userId}`, handleNotification);
      }
    };
  }, [state.socket, state.user]);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (error) {
      // Sound file might not exist, that's okay
      console.log('Notification sound not available');
    }
  };

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCenter(true)}
          className="relative p-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          
          {/* Unread Badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 bg-danger text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-lg"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Recent Notifications Dropdown */}
        <AnimatePresence>
          {recentNotifications.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-80 bg-background-secondary rounded-xl shadow-2xl border border-white/10 overflow-hidden z-40"
            >
              <div className="p-3 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">Recent Notifications</h3>
                  <button
                    onClick={() => setRecentNotifications([])}
                    className="text-xs text-primary hover:text-primary-light"
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {recentNotifications.map((notification, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 border-b border-white/5 hover:bg-background-tertiary transition-colors cursor-pointer"
                    onClick={() => setShowCenter(true)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">
                        {notification.type === 'fault_assigned' && '📋'}
                        {notification.type === 'fault_completed' && '🎉'}
                        {notification.type === 'status_update' && '🔄'}
                        {notification.type === 'system' && '⚙️'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{notification.title}</p>
                        <p className="text-xs text-gray-400 truncate">{notification.message}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="p-3 bg-background-tertiary/50">
                <button
                  onClick={() => setShowCenter(true)}
                  className="w-full text-center text-sm text-primary hover:text-primary-light transition-colors font-semibold"
                >
                  View All Notifications
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notification Center Modal */}
      <AnimatePresence>
        {showCenter && (
          <NotificationCenter onClose={() => setShowCenter(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
