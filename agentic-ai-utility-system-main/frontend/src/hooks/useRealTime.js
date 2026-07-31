import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useRealTime = (user, location) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineTechnicians, setOnlineTechnicians] = useState([]);
  const [systemState, setSystemState] = useState(null);
  const [liveUpdates, setLiveUpdates] = useState([]);

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setIsConnected(true);
      
      // Authenticate with server
      socket.emit('authenticate', {
        userId: user.id || user._id,
        role: user.role,
        location: location
      });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // System state updates
    socket.on('system:state', (data) => {
      setSystemState(data);
      setOnlineTechnicians(data.activeTechnicians || []);
    });

    // Technician events
    socket.on('technician:online', (data) => {
      setOnlineTechnicians(prev => [...prev, data]);
      addLiveUpdate({
        type: 'technician_online',
        message: `Technician is now online`,
        data,
        timestamp: Date.now()
      });
    });

    socket.on('technician:offline', (data) => {
      setOnlineTechnicians(prev => prev.filter(t => t.userId !== data.userId));
    });

    socket.on('technician:moving', (data) => {
      setOnlineTechnicians(prev => 
        prev.map(t => t.userId === data.userId ? { ...t, ...data } : t)
      );
    });

    socket.on('technician:statusUpdate', (data) => {
      setOnlineTechnicians(prev =>
        prev.map(t => t.userId === data.technicianId ? { ...t, status: data.status } : t)
      );
      
      addLiveUpdate({
        type: 'technician_status',
        message: `Technician status: ${data.status}`,
        data,
        timestamp: Date.now()
      });
    });

    socket.on('technician:approaching', (data) => {
      addLiveUpdate({
        type: 'technician_approaching',
        message: `Technician is approaching your location`,
        data,
        timestamp: Date.now(),
        priority: 'high'
      });
    });

    // Fault events
    socket.on('fault:updated', (data) => {
      addLiveUpdate({
        type: 'fault_update',
        message: `Fault status updated to ${data.status}`,
        data,
        timestamp: Date.now()
      });
    });

    socket.on('fault:statusChanged', (data) => {
      // Specific fault update
    });

    // Assignment events
    socket.on('assignment:accepted', (data) => {
      addLiveUpdate({
        type: 'assignment_accepted',
        message: `Technician assigned (ETA: ${data.eta} min)`,
        data,
        timestamp: Date.now(),
        priority: 'high'
      });
    });

    // Admin announcements
    socket.on('admin:announcement', (data) => {
      addLiveUpdate({
        type: 'admin_announcement',
        message: data.message,
        data,
        timestamp: Date.now()
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user, location]);

  // Add live update with auto-cleanup
  const addLiveUpdate = useCallback((update) => {
    setLiveUpdates(prev => {
      const newUpdates = [update, ...prev].slice(0, 50); // Keep last 50
      return newUpdates;
    });
    
    // Auto-remove after 10 seconds for non-priority updates
    if (update.priority !== 'high') {
      setTimeout(() => {
        setLiveUpdates(prev => prev.filter(u => u.timestamp !== update.timestamp));
      }, 10000);
    }
  }, []);

  // Emit functions
  const emitLocation = useCallback((locationData) => {
    if (socketRef.current) {
      socketRef.current.emit('technician:location', {
        userId: user.id || user._id,
        location: locationData,
        timestamp: Date.now()
      });
    }
  }, [user]);

  const emitStatusUpdate = useCallback((faultId, status) => {
    if (socketRef.current) {
      socketRef.current.emit('fault:statusUpdate', {
        faultId,
        status,
        updatedBy: user.id || user._id,
        timestamp: Date.now()
      });
    }
  }, [user]);

  const acceptAssignment = useCallback((faultId, eta) => {
    if (socketRef.current) {
      socketRef.current.emit('technician:accept', {
        faultId,
        technicianId: user.id || user._id,
        eta
      });
    }
  }, [user]);

  const updateTechnicianStatus = useCallback((status, faultId, location) => {
    if (socketRef.current) {
      socketRef.current.emit('technician:status', {
        technicianId: user.id || user._id,
        status,
        faultId,
        location
      });
    }
  }, [user]);

  const subscribeToFault = useCallback((faultId) => {
    if (socketRef.current) {
      socketRef.current.emit('fault:subscribe', faultId);
    }
  }, []);

  const clearUpdates = useCallback(() => {
    setLiveUpdates([]);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    onlineTechnicians,
    systemState,
    liveUpdates,
    emitLocation,
    emitStatusUpdate,
    acceptAssignment,
    updateTechnicianStatus,
    subscribeToFault,
    clearUpdates
  };
};

export default useRealTime;
