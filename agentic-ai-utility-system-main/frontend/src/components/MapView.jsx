import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./ui/GlassCard";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Create custom icons for each severity
const createCustomIcon = (color) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 28px;
      height: 28px;
      background: ${color};
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 3px 10px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Create pulsing marker icon
const createPulsingIcon = (color, size = 20) => {
  return L.divIcon({
    className: "pulsing-marker",
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: ${color};
          border-radius: 50%;
          animation: pulse 2s infinite;
          opacity: 0.6;
        "></div>
        <div style="
          position: absolute;
          top: 2px;
          left: 2px;
          width: calc(100% - 4px);
          height: calc(100% - 4px);
          background: ${color};
          border-radius: 50%;
          animation: pulse 2s infinite 0.5s;
          opacity: 0.4;
        "></div>
        <div style="
          position: absolute;
          top: 5px;
          left: 5px;
          width: calc(100% - 10px);
          height: calc(100% - 10px);
          background: white;
          border: 3px solid ${color};
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const icons = {
  critical: createCustomIcon("#ef4444"),
  high: createCustomIcon("#f97316"),
  medium: createCustomIcon("#f59e0b"),
  low: createCustomIcon("#22c55e"),
};

// Pulsing icons for live technicians
const pulsingIcons = {
  online: createPulsingIcon("#22c55e", 24),
  busy: createPulsingIcon("#f59e0b", 24),
  offline: createPulsingIcon("#6b7280", 20),
};

// Auto-center map
function MapAutoCenter({ faults }) {
  const map = useMap();

  useEffect(() => {
    if (faults.length > 0) {
      const validFaults = faults.filter(f => f.location?.lat && f.location?.lng);
      if (validFaults.length > 0) {
        const bounds = L.latLngBounds(
          validFaults.map(f => [f.location.lat, f.location.lng])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [faults, map]);

  return null;
}

// Heatmap layer component
function HeatmapLayer({ faults }) {
  const map = useMap();

  useEffect(() => {
    // Simple heatmap using circle markers with opacity based on density
    const heatPoints = [];
    
    faults.forEach(fault => {
      if (fault.location?.lat && fault.location?.lng) {
        const intensity = fault.severity === 'critical' ? 0.9 :
                         fault.severity === 'high' ? 0.7 :
                         fault.severity === 'medium' ? 0.5 : 0.3;
        
        heatPoints.push([
          fault.location.lat,
          fault.location.lng,
          intensity
        ]);
      }
    });

    // Create heatmap overlay using CircleMarkers
    const heatmapGroup = L.layerGroup().addTo(map);
    
    heatPoints.forEach(([lat, lng, intensity]) => {
      L.circleMarker([lat, lng], {
        radius: 20 * intensity,
        fillColor: `rgba(239, 68, 68, ${intensity * 0.3})`,
        color: 'transparent',
        fillOpacity: intensity * 0.5,
        weight: 0
      }).addTo(heatmapGroup);
    });

    return () => {
      map.removeLayer(heatmapGroup);
    };
  }, [map, faults]);

  return null;
}

function MapView({ faults, technicians = [], showHeatmap = true, showTechnicians = true, clustering = true }) {
  const defaultCenter = [28.6139, 77.209];
  const [selectedFault, setSelectedFault] = useState(null);
  const [mapMode, setMapMode] = useState('standard'); // standard, heatmap, clustered

  const validFaults = useMemo(() => 
    faults.filter(f => f.location?.lat && f.location?.lng),
    [faults]
  );

  // Cluster faults by proximity (simple implementation)
  const clusteredFaults = useMemo(() => {
    if (!clustering || mapMode !== 'clustered') return validFaults;
    
    const clusters = [];
    const visited = new Set();
    const clusterDistance = 0.01; // ~1km

    validFaults.forEach((fault, idx) => {
      if (visited.has(idx)) return;

      const cluster = [fault];
      visited.add(idx);

      validFaults.forEach((otherFault, otherIdx) => {
        if (idx === otherIdx || visited.has(otherIdx)) return;

        const dist = Math.sqrt(
          Math.pow(fault.location.lat - otherFault.location.lat, 2) +
          Math.pow(fault.location.lng - otherFault.location.lng, 2)
        );

        if (dist < clusterDistance) {
          cluster.push(otherFault);
          visited.add(otherIdx);
        }
      });

      clusters.push({
        faults: cluster,
        center: {
          lat: cluster.reduce((sum, f) => sum + f.location.lat, 0) / cluster.length,
          lng: cluster.reduce((sum, f) => sum + f.location.lng, 0) / cluster.length,
        },
        count: cluster.length,
        maxSeverity: cluster.map(f => ['critical', 'high', 'medium', 'low'].indexOf(f.severity)).sort()[0]
      });
    });

    return clusters;
  }, [validFaults, clustering, mapMode]);

  const getTypeIcon = (type) => {
    const icons = {
      electricity: "⚡",
      water: "💧",
      road: "🛣️",
      streetlight: "💡",
      sewage: "🚰",
      gas: "🔥",
      other: "📋",
    };
    return icons[type?.toLowerCase()] || "📍";
  };

  return (
    <div className="relative h-full w-full">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex gap-2">
        <GlassCard className="p-2 flex gap-1">
          <button
            onClick={() => setMapMode('standard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mapMode === 'standard'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'bg-background-secondary text-gray-400 hover:text-white'
            }`}
          >
            📍 Standard
          </button>
          <button
            onClick={() => setMapMode('heatmap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mapMode === 'heatmap'
                ? 'bg-danger text-white shadow-glow-danger'
                : 'bg-background-secondary text-gray-400 hover:text-white'
            }`}
          >
            🔥 Heatmap
          </button>
          <button
            onClick={() => setMapMode('clustered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mapMode === 'clustered'
                ? 'bg-success text-white shadow-glow-success'
                : 'bg-background-secondary text-gray-400 hover:text-white'
            }`}
          >
            🎯 Clustered
          </button>
        </GlassCard>
      </div>

      {/* Legend */}
      <AnimatePresence>
        {mapMode !== 'standard' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-20 left-4 z-[1000]"
          >
            <GlassCard className="p-3 text-xs">
              <h4 className="font-bold mb-2">Legend</h4>
              {mapMode === 'heatmap' && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 opacity-70"></div>
                    <span>Critical/High density</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 opacity-40"></div>
                    <span>Medium density</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 opacity-20"></div>
                    <span>Low density</span>
                  </div>
                </div>
              )}
              {mapMode === 'clustered' && (
                <div className="space-y-1">
                  <p>🔴 Red: Critical faults</p>
                  <p>🟠 Orange: High severity</p>
                  <p>🟡 Yellow: Medium severity</p>
                  <p>🟢 Green: Low severity</p>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <MapContainer
        center={defaultCenter}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapAutoCenter faults={validFaults} />
        
        {/* Heatmap Layer */}
        {showHeatmap && mapMode === 'heatmap' && (
          <HeatmapLayer faults={validFaults} />
        )}
        
        {/* Fault Markers */}
        {mapMode === 'clustered' ? (
          clusteredFaults.map((cluster, idx) => (
            <CircleMarker
              key={`cluster-${idx}`}
              center={[cluster.center.lat, cluster.center.lng]}
              radius={Math.min(cluster.count * 8, 40)}
              fillColor={cluster.maxSeverity === 0 ? '#ef4444' :
                        cluster.maxSeverity === 1 ? '#f97316' :
                        cluster.maxSeverity === 2 ? '#f59e0b' : '#22c55e'}
              color="#fff"
              weight={2}
              fillOpacity={0.7}
              eventHandlers={{
                click: (e) => {
                  e.target.bindPopup(`
                    <div style="font-family: system-ui; min-width: 200px;">
                      <h4 style="margin: 0 0 8px 0;">Cluster (${cluster.count} faults)</h4>
                      <p>Highest severity: ${['Critical', 'High', 'Medium', 'Low'][cluster.maxSeverity]}</p>
                    </div>
                  `).openPopup();
                }
              }}
            />
          ))
        ) : (
          validFaults.map((fault) => (
            <Marker
              key={fault._id}
              position={[fault.location.lat, fault.location.lng]}
              icon={icons[fault.severity] || icons.low}
              eventHandlers={{
                click: () => setSelectedFault(fault)
              }}
            >
              <Popup>
                <div className="map-popup">
                  <div className="popup-header">
                    <span className="popup-icon">{getTypeIcon(fault.type)}</span>
                    <div>
                      <h4>{fault.type} Fault</h4>
                      <small>ID: {fault._id?.slice(-6).toUpperCase()}</small>
                    </div>
                  </div>
                  
                  <div className={`popup-severity ${fault.severity}`}>
                    {fault.severity}
                  </div>
                  
                  <div className="popup-details">
                    <p><strong>Status:</strong> {fault.status}</p>
                    <p><strong>Reported:</strong> {new Date(fault.createdAt).toLocaleDateString()}</p>
                    {fault.location?.address && (
                      <p><strong>Location:</strong> {fault.location.address}</p>
                    )}
                  </div>
                  
                  <button 
                    className="popup-btn"
                    onClick={() => setSelectedFault(fault)}
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))
        )}
        
        {/* Technician Markers */}
        {showTechnicians && technicians.map((tech) => (
          <Marker
            key={tech.id || tech._id}
            position={[tech.location?.lat || 28.6139, tech.location?.lng || 77.209]}
            icon={pulsingIcons[tech.status === 'available' ? 'online' : tech.status === 'busy' ? 'busy' : 'offline']}
            eventHandlers={{
              click: (e) => {
                e.target.bindPopup(`
                  <div style="font-family: system-ui;">
                    <h4 style="margin: 0 0 8px 0;">${tech.name || 'Technician'}</h4>
                    <p><strong>Status:</strong> ${tech.status || 'Unknown'}</p>
                    <p><strong>Rating:</strong> ⭐ ${tech.rating || 'N/A'}</p>
                    <p><strong>Active Faults:</strong> ${tech.activeFaults || 0}</p>
                  </div>
                `).openPopup();
              }
            }}
          />
        ))}
      </MapContainer>

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.3;
          }
        }
        
        .pulsing-marker div {
          animation: pulse 2s infinite;
        }
        
        .map-popup {
          min-width: 200px;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .popup-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .popup-icon {
          font-size: 24px;
        }
        
        .popup-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          text-transform: capitalize;
        }
        
        .popup-header small {
          color: #6b7280;
          font-size: 11px;
        }
        
        .popup-severity {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        
        .popup-severity.critical {
          background: #fef2f2;
          color: #dc2626;
        }
        
        .popup-severity.high {
          background: #fff7ed;
          color: #ea580c;
        }
        
        .popup-severity.medium {
          background: #fffbeb;
          color: #d97706;
        }
        
        .popup-severity.low {
          background: #f0fdf4;
          color: #16a34a;
        }
        
        .popup-details {
          font-size: 12px;
          color: #4b5563;
          line-height: 1.6;
        }
        
        .popup-details p {
          margin: 4px 0;
        }
        
        .popup-btn {
          width: 100%;
          margin-top: 12px;
          padding: 8px;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .popup-btn:hover {
          background: #4338ca;
        }
      `}</style>
    </div>
  );
}

export default MapView;
