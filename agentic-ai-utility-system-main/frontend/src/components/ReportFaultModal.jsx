import { useState } from 'react';
import { useApp } from '../context/AppContext';

const FAULT_TYPES = [
  { value: 'electricity', label: '⚡ Electricity', icon: '⚡' },
  { value: 'water', label: '💧 Water', icon: '💧' },
  { value: 'road', label: '🛣️ Road', icon: '🛣️' },
  { value: 'streetlight', label: '💡 Street Light', icon: '💡' },
  { value: 'sewage', label: '🚰 Sewage', icon: '🚰' },
  { value: 'gas', label: '🔥 Gas', icon: '🔥' },
  { value: 'other', label: '📋 Other', icon: '📋' }
];

function ReportFaultModal({ onClose, onSuccess }) {
  const { createFault } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    location: { lat: '', lng: '', address: '' },
    severity: 'medium'
  });

  const detectLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            location: {
              ...prev.location,
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }));
          setGettingLocation(false);
        },
        (err) => {
          setError('Could not get location: ' + err.message);
          setGettingLocation(false);
        }
      );
    } else {
      setError('Geolocation is not supported');
      setGettingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.type) {
      setError('Please select a fault type');
      return;
    }

    if (!formData.location.lat || !formData.location.lng) {
      setError('Please provide location coordinates');
      return;
    }

    setLoading(true);
    const result = await createFault(formData);
    
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚨 Report a Fault</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="auth-error" style={{ marginBottom: '16px' }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Fault Type *</label>
            <div className="fault-type-grid">
              {FAULT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`fault-type-btn ${formData.type === type.value ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, type: type.value })}
                >
                  <span className="fault-type-icon">{type.icon}</span>
                  <span className="fault-type-label">{type.label.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Describe the issue..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location *</label>
            <div className="location-inputs">
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="Latitude"
                value={formData.location.lat}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, lat: e.target.value }
                })}
                required
              />
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="Longitude"
                value={formData.location.lng}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, lng: e.target.value }
                })}
                required
              />
              <button
                type="button"
                className="btn btn-ghost location-btn"
                onClick={detectLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? '📍...' : '📍 Detect'}
              </button>
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="Address (optional)"
              value={formData.location.address}
              onChange={(e) => setFormData({
                ...formData,
                location: { ...formData.location, address: e.target.value }
              })}
              style={{ marginTop: '8px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Severity</label>
            <select
              className="form-select"
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="critical">🔴 Critical</option>
            </select>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Reporting...
              </>
            ) : (
              '🚀 Report Fault'
            )}
          </button>
        </div>
      </div>

      <style>{`
        .fault-type-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        
        .fault-type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 8px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .fault-type-btn.active {
          border-color: #4f46e5;
          background: #eef2ff;
        }
        
        .fault-type-icon {
          font-size: 24px;
        }
        
        .fault-type-label {
          font-size: 11px;
          font-weight: 600;
          color: #374151;
        }
        
        .location-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 8px;
        }
        
        .location-btn {
          padding: 12px;
          white-space: nowrap;
        }
        
        @media (max-width: 480px) {
          .fault-type-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .location-inputs {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default ReportFaultModal;
