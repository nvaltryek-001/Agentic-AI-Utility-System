import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, MapPin, AlertCircle, Loader } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BottomNav from '../components/BottomNav';

// Fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Severity icon mapping for map markers
const getSeverityIcon = (severity) => {
  const iconMap = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
  };
  return iconMap[severity?.toLowerCase()] || '⚪';
};

const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#3b82f6';
    default: return '#6b7280';
  }
};

export default function MapView() {
  const navigate = useNavigate();
  const { faults, location: userLocation } = useApp();
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [loading, setLoading] = useState(true);

  // Get user location and set map center
  useEffect(() => {
    if (userLocation?.lat && userLocation?.lng) {
      setMapCenter([userLocation.lat, userLocation.lng]);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => console.log('Location access denied')
      );
    }
    setLoading(false);
  }, [userLocation]);

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
            Fault Map
          </h1>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Map Container */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-96 bg-white rounded-2xl flex items-center justify-center border border-gray-200"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader className="animate-spin text-indigo-600" size={32} />
              <p className="text-gray-600 font-medium">Loading map...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200 mb-6"
          >
            <MapContainer
              center={mapCenter}
              zoom={12}
              style={{ height: '400px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />

              {/* User location marker */}
              {mapCenter && (
                <Circle
                  center={mapCenter}
                  radius={100}
                  fill
                  fillColor="#3b82f6"
                  fillOpacity={0.2}
                  stroke
                  color="#3b82f6"
                  weight={2}
                />
              )}

              {/* Fault markers */}
              {faults && faults.map((fault) => (
                <Marker
                  key={fault._id}
                  position={[fault.location?.lat || 20.5937, fault.location?.lng || 78.9629]}
                  icon={L.icon({
                    iconUrl: `data:image/svg+xml;base64,${btoa(
                      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
                        <circle cx="16" cy="16" r="14" fill="${getSeverityColor(fault.severity)}"/>
                        <text x="16" y="22" font-size="20" text-anchor="middle" fill="white">${getSeverityIcon(fault.severity)}</text>
                      </svg>`
                    )}`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32],
                  })}
                  eventHandlers={{
                    click: () => navigate(`/fault/${fault._id}`),
                  }}
                >
                  <Popup>
                    <div className="p-2 text-sm">
                      <p className="font-bold capitalize">{fault.type || 'Fault'}</p>
                      <p className="text-gray-600 truncate">{fault.description}</p>
                      <p className={`text-xs font-bold mt-1 ${fault.severity === 'critical' ? 'text-red-600' :
                          fault.severity === 'high' ? 'text-orange-600' :
                            fault.severity === 'medium' ? 'text-yellow-600' :
                              'text-blue-600'
                        }`}>
                        {fault.severity?.toUpperCase()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </motion.div>
        )}

        {/* Fault Count Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6"
        >
          <p className="text-indigo-700 text-sm">
            📍 Showing <span className="font-bold">{faults?.length || 0}</span> faults in your area
          </p>
        </motion.div>

        {/* Nearby Faults List */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Nearby Faults</h2>
          {!faults || faults.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-white rounded-xl border border-gray-200"
            >
              <span className="text-5xl block mb-4">🎉</span>
              <p className="text-gray-600 font-medium">No faults nearby</p>
              <p className="text-gray-500 text-sm mt-2">Great service quality in your area!</p>
            </motion.div>
          ) : (
            <motion.div className="space-y-3">
              <AnimatePresence>
                {faults.slice(0, 10).map((fault, i) => (
                  <motion.div
                    key={fault._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ x: 4 }}
                    onClick={() => navigate(`/fault/${fault._id}`)}
                    className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{getSeverityIcon(fault.severity)}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-gray-900 capitalize">{fault.type || 'Fault'}</h3>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${fault.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            fault.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                              fault.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                            {fault.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{fault.description || 'No description'}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPin size={14} />
                          {fault.location?.address || `${fault.location?.lat?.toFixed(4)}, ${fault.location?.lng?.toFixed(4)}`}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            Severity Legend
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🔴', label: 'Critical', desc: 'Immediate action needed' },
              { icon: '🟠', label: 'High', desc: 'Urgent attention' },
              { icon: '🟡', label: 'Medium', desc: 'Schedule a fix' },
              { icon: '🔵', label: 'Low', desc: 'Monitor situation' }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <span className="text-3xl block mb-2">{item.icon}</span>
                <p className="font-bold text-sm text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
