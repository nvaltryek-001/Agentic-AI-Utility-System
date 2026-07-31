import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './index.css';

// Lazy load non-critical components for performance
const LazyMapView = lazy(() => import('./pages/MapView'));
const LazyReportFault = lazy(() => import('./pages/ReportFault'));
const LazyProfile = lazy(() => import('./pages/Profile'));

// Premium Loading Screen with Animation
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary gradient-bg noise-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
        role="status"
        aria-label="Loading application"
      >
        <h1 className="text-5xl font-bold gradient-text mb-4">Valtryek</h1>
        <div
          className="spinner w-12 h-12 border-4 mx-auto"
          role="progressbar"
          aria-valuenow={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Loading progress"
        />
        <p className="text-gray-400 mt-4">Loading...</p>
      </motion.div>
    </div>
  );
}

// Suspense wrapper for lazy-loaded routes
function SuspenseWrapper({ children }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      {children}
    </Suspense>
  );
}

// Protected route - requires authentication
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useApp();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
}

// Public route - redirects to dashboard if already logged in
function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useApp();

  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return children;
}

// Main app routes
function AppRoutes() {
  const { isLoading } = useApp();

  if (isLoading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/map" element={
        <ProtectedRoute>
          <SuspenseWrapper>
            <LazyMapView />
          </SuspenseWrapper>
        </ProtectedRoute>
      } />
      <Route path="/report" element={
        <ProtectedRoute>
          <SuspenseWrapper>
            <LazyReportFault />
          </SuspenseWrapper>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <SuspenseWrapper>
            <LazyProfile />
          </SuspenseWrapper>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
