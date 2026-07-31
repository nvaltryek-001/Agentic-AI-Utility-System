import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './ui/GlassCard';
import AnimatedButton from './ui/AnimatedButton';

export default function NotificationCenter({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n._id === id ? { ...n, isRead: true } : n)
        );
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n._id !== id));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'fault_assigned': return '📋';
      case 'fault_accepted': return '✅';
      case 'fault_completed': return '🎉';
      case 'fault_rejected': return '❌';
      case 'status_update': return '🔄';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'fault_assigned': return 'border-primary';
      case 'fault_completed': return 'border-success';
      case 'fault_rejected': return 'border-danger';
      case 'status_update': return 'border-warning';
      default: return 'border-gray-500';
    }
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl max-h-[80vh] overflow-hidden"
      >
        <GlassCard hover={false} className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                🔔 Notifications
                {unreadCount > 0 && (
                  <span className="bg-danger text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h2>
              <p className="text-gray-400 text-sm mt-1">Stay updated with real-time alerts</p>
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread', count: unreadCount },
              { value: 'read', label: 'Read' }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filter === tab.value
                    ? 'bg-primary text-white shadow-glow-primary'
                    : 'bg-background-tertiary text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 text-xs opacity-75">({tab.count})</span>
                )}
              </button>
            ))}
            
            {unreadCount > 0 && (
              <AnimatedButton
                variant="outline"
                loading={markingAll}
                onClick={markAllAsRead}
                className="ml-auto text-sm py-2"
              >
                Mark all read
              </AnimatedButton>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl block mb-4">🔔</span>
                <p className="text-gray-400 text-lg">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative p-4 rounded-xl border-l-4 transition-all ${
                      notification.isRead
                        ? 'bg-background-secondary/50 border-gray-600'
                        : 'bg-background-tertiary border-primary shadow-lg'
                    } ${getNotificationColor(notification.type)} hover:scale-[1.02]`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className={`font-semibold ${!notification.isRead ? 'text-white' : 'text-gray-300'}`}>
                              {notification.title}
                            </h3>
                            <p className="text-gray-400 text-sm mt-1">{notification.message}</p>
                            
                            {notification.faultId && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs bg-background-secondary px-2 py-1 rounded text-gray-400">
                                  Fault: {notification.faultId.type}
                                </span>
                                <span className="text-xs bg-background-secondary px-2 py-1 rounded text-gray-400">
                                  Status: {notification.faultId.status}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {getTimeAgo(notification.createdAt)}
                            </span>
                            
                            {!notification.isRead && (
                              <button
                                onClick={() => markAsRead(notification._id)}
                                className="text-primary hover:text-primary-light transition-colors"
                                title="Mark as read"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}
                            
                            <button
                              onClick={() => deleteNotification(notification._id)}
                              className="text-gray-500 hover:text-danger transition-colors"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Unread Indicator */}
                    {!notification.isRead && (
                      <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full shadow-glow-primary"></div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
