import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  isOffline: !navigator.onLine,
  faults: [],
  technicians: [],
  notifications: [],
  stats: {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    today: 0
  },
  filters: {
    status: 'all',
    severity: 'all',
    type: 'all',
    dateRange: 'all'
  },
  socket: null,
  isConnected: false,
  pendingSync: [],
  location: JSON.parse(localStorage.getItem('userLocation') || 'null'),
  unreadCount: 0,
  cityFaults: [],
  complaints: []
};

const AppContext = createContext();

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_OFFLINE':
      return { ...state, isOffline: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload };
    case 'SET_TOKEN':
      if (action.payload) {
        localStorage.setItem('token', action.payload);
      } else {
        localStorage.removeItem('token');
      }
      return { ...state, token: action.payload };
    case 'SET_FAULTS':
      return { ...state, faults: action.payload };
    case 'ADD_FAULT':
      return { ...state, faults: [action.payload, ...state.faults] };
    case 'UPDATE_FAULT':
      return {
        ...state,
        faults: state.faults.map(f => f._id === action.payload._id ? action.payload : f)
      };
    case 'DELETE_FAULT':
      return {
        ...state,
        faults: state.faults.filter(f => f._id !== action.payload)
      };
    case 'SET_TECHNICIANS':
      return { ...state, technicians: action.payload };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'SET_SOCKET':
      return { ...state, socket: action.payload };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1
      };
    case 'MARK_NOTIFICATIONS_READ':
      return { ...state, unreadCount: 0 };
    case 'SET_LOCATION':
      if (action.payload) {
        localStorage.setItem('userLocation', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('userLocation');
      }
      return { ...state, location: action.payload };
    case 'SET_CITY_FAULTS':
      return { ...state, cityFaults: action.payload };
    case 'ADD_COMPLAINT':
      return { ...state, complaints: [action.payload, ...state.complaints] };
    case 'SET_COMPLAINTS':
      return { ...state, complaints: action.payload };
    case 'ADD_PENDING_SYNC':
      return { ...state, pendingSync: [...state.pendingSync, action.payload] };
    case 'CLEAR_PENDING_SYNC':
      return { ...state, pendingSync: [] };
    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('userLocation');
      if (state.socket) state.socket.disconnect();
      return { ...initialState, token: null, isLoading: false, location: null };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Create API instance with useMemo to prevent recreation on every render
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' }
    });

    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          dispatch({ type: 'LOGOUT' });
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, []);

  const initSocket = useCallback(() => {
    if (!state.token || state.socket) return;

    const socket = io(API_URL.replace('/api', ''), {
      auth: { token: state.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socket.on('connect', () => {
      dispatch({ type: 'SET_CONNECTED', payload: true });
      reconnectAttempts.current = 0;
      syncPendingData();
    });

    socket.on('disconnect', () => {
      dispatch({ type: 'SET_CONNECTED', payload: false });
    });

    socket.on('reconnect_attempt', (attempt) => {
      reconnectAttempts.current = attempt;
    });

    socket.on('fault:created', (fault) => {
      dispatch({ type: 'ADD_FAULT', payload: fault });
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { type: 'new_fault', message: `New fault reported: ${fault.title}`, data: fault }
      });
    });

    socket.on('fault:updated', (fault) => {
      dispatch({ type: 'UPDATE_FAULT', payload: fault });
    });

    socket.on('fault:assigned', ({ faultId, technician }) => {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { type: 'assigned', message: `Fault assigned to ${technician.name}`, data: { faultId, technician } }
      });
    });

    socket.on('fault:completed', (fault) => {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { type: 'completed', message: `Fault resolved: ${fault.title}`, data: fault }
      });
    });

    dispatch({ type: 'SET_SOCKET', payload: socket });
  }, [state.token]);

  const syncPendingData = async () => {
    if (state.pendingSync.length === 0) return;
    
    for (const item of state.pendingSync) {
      try {
        if (item.type === 'create') {
          await api.post('/faults', item.data);
        } else if (item.type === 'update') {
          await api.put(`/faults/${item.id}`, item.data);
        }
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
    dispatch({ type: 'CLEAR_PENDING_SYNC' });
  };

  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          dispatch({ type: 'SET_LOCATION', payload: loc });
          resolve(loc);
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  const fetchFaults = useCallback(async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
      if (filters.type && filters.type !== 'all') params.append('type', filters.type);
      
      const response = await api.get(`/faults?${params}`);
      dispatch({ type: 'SET_FAULTS', payload: response.data });
      return response.data;
    } catch (error) {
      console.error('Fetch faults error:', error);
      throw error;
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/faults/stats/dashboard');
      dispatch({ type: 'SET_STATS', payload: response.data });
      return response.data;
    } catch (error) {
      console.error('Fetch stats error:', error);
      throw error;
    }
  }, []);

  const createFault = async (faultData) => {
    try {
      if (state.isOffline) {
        dispatch({ type: 'ADD_PENDING_SYNC', payload: { type: 'create', data: faultData } });
        const tempFault = { ...faultData, _id: Date.now().toString(), temp: true };
        dispatch({ type: 'ADD_FAULT', payload: tempFault });
        return tempFault;
      }
      
      const response = await api.post('/faults', faultData);
      dispatch({ type: 'ADD_FAULT', payload: response.data });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const updateFault = async (id, updates) => {
    try {
      if (state.isOffline) {
        dispatch({ type: 'ADD_PENDING_SYNC', payload: { type: 'update', id, data: updates } });
        dispatch({ type: 'UPDATE_FAULT', payload: { _id: id, ...updates } });
        return { _id: id, ...updates };
      }
      
      const response = await api.put(`/faults/${id}`, updates);
      dispatch({ type: 'UPDATE_FAULT', payload: response.data });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const deleteFault = async (id) => {
    try {
      await api.delete(`/faults/${id}`);
      dispatch({ type: 'DELETE_FAULT', payload: id });
    } catch (error) {
      throw error;
    }
  };

  // Fetch faults for specific city
  const fetchCityFaults = useCallback(async (city, state) => {
    try {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      if (state) params.append('state', state);
      
      const response = await api.get(`/faults?${params.toString()}`);
      dispatch({ type: 'SET_CITY_FAULTS', payload: response.data });
      return response.data;
    } catch (error) {
      console.error('Error fetching city faults:', error);
      return [];
    }
  }, [api]);

  // Create government complaint
  const createComplaint = async (complaintData) => {
    try {
      const response = await api.post('/complaints', complaintData);
      dispatch({ type: 'ADD_COMPLAINT', payload: response.data });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Fetch complaints
  const fetchComplaints = useCallback(async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.status) params.append('status', filters.status);
      
      const response = await api.get(`/complaints?${params.toString()}`);
      dispatch({ type: 'SET_COMPLAINTS', payload: response.data });
      return response.data;
    } catch (error) {
      console.error('Error fetching complaints:', error);
      return [];
    }
  }, [api]);

  const login = async (email, password) => {
    try {
      console.log('[Login] Attempting login for:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('[Login] Response:', response.data);
      
      // Backend now returns token in data.accessToken
      if (!response.data?.data?.accessToken) {
        console.error('[Login] No token in response!');
        throw new Error('No token received from server');
      }
      
      const token = response.data.data.accessToken;
      console.log('[Login] Token received:', token.substring(0, 20) + '...');
      localStorage.setItem('token', token);
      console.log('[Login] Token stored in localStorage');
      
      dispatch({ type: 'SET_TOKEN', payload: token });
      dispatch({ type: 'SET_USER', payload: response.data.data.user });
      console.log('[Login] User set:', response.data.data.user);
      
      return response.data;
    } catch (error) {
      console.error('[Login] Error:', error.response?.data || error.message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      console.log('[Register] Attempting registration for:', userData.email);
      const response = await api.post('/auth/register', userData);
      console.log('[Register] Response:', response.data);
      
      // Backend now returns token in data.accessToken
      if (!response.data?.data?.accessToken) {
        console.error('[Register] No token in response!');
        throw new Error('No token received from server');
      }
      
      const token = response.data.data.accessToken;
      console.log('[Register] Token received:', token.substring(0, 20) + '...');
      localStorage.setItem('token', token);
      console.log('[Register] Token stored in localStorage');
      
      dispatch({ type: 'SET_TOKEN', payload: token });
      dispatch({ type: 'SET_USER', payload: response.data.data.user });
      console.log('[Register] User set:', response.data.data.user);
      
      return response.data;
    } catch (error) {
      console.error('[Register] Error:', error.response?.data || error.message);
      throw error;
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_OFFLINE', payload: false });
    const handleOffline = () => dispatch({ type: 'SET_OFFLINE', payload: true });
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const verifyToken = async () => {
      if (!state.token) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      
      try {
        console.log('[VerifyToken] Verifying token, calling /auth/profile');
        const response = await api.get('/auth/profile');
        console.log('[VerifyToken] User verified:', response.data);
        dispatch({ type: 'SET_USER', payload: response.data });
      } catch (error) {
        console.error('[VerifyToken] Token verification failed:', error.response?.data || error.message);
        localStorage.removeItem('token');
        dispatch({ type: 'LOGOUT' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    verifyToken();
  }, [state.token]);

  useEffect(() => {
    if (state.isAuthenticated && !state.socket) {
      try {
        initSocket();
      } catch (error) {
        console.error('[Socket] Failed to initialize:', error);
      }
    }
  }, [state.isAuthenticated, state.socket, initSocket]);

  const value = {
    ...state,
    dispatch,
    api,
    login,
    register,
    logout,
    fetchFaults,
    fetchStats,
    createFault,
    updateFault,
    deleteFault,
    fetchCityFaults,
    createComplaint,
    fetchComplaints,
    getLocation,
    syncPendingData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
