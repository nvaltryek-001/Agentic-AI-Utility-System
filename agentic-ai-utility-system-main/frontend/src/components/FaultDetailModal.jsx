import { useState } from 'react';
import { useApp } from '../context/AppContext';

const STATUS_OPTIONS = [
  { value: 'reported', label: '📝 Reported' },
  { value: 'analyzing', label: '🔍 Analyzing' },
  { value: 'assigned', label: '👤 Assigned' },
  { value: 'in_progress', label: '🔧 In Progress' },
  { value: 'completed', label: '✅ Completed' },
  { value: 'on_hold', label: '⏸️ On Hold' }
];

function FaultDetailModal({ fault, onClose, onDelete }) {
  const { updateFault, user } = useApp();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(fault.status);
  const [notes, setNotes] = useState(fault.resolution?.notes || '');

  const handleStatusUpdate = async () => {
    setLoading(true);
    await updateFault(fault._id, { status, notes });
    setLoading(false);
    setEditing(false);
  };

  const canEdit = user?.role === 'admin' || user?.role === 'technician';
  const isOwner = user?._id === fault.reportedBy?._id;

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#f59e0b',
      low: '#22c55e'
    };
    return colors[severity] || '#6b7280';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Fault Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Header Info */}
          <div className="fault-detail-header">
            <div className="fault-type-badge">
              <span className="fault-icon">
                {fault.type === 'electricity' && '⚡'}
                {fault.type === 'water' && '💧'}
                {fault.type === 'road' && '🛣️'}
                {fault.type === 'streetlight' && '💡'}
                {fault.type === 'sewage' && '🚰'}
                {fault.type === 'gas' && '🔥'}
                {fault.type === 'other' && '📋'}
              </span>
              <span className="fault-type-name">{fault.type}</span>
            </div>
            <span 
              className="fault-severity-badge"
              style={{ 
                backgroundColor: `${getSeverityColor(fault.severity)}20`,
                color: getSeverityColor(fault.severity)
              }}
            >
              {fault.severity}
            </span>
          </div>

          {/* Description */}
          {fault.description && (
            <div className="detail-section">
              <label>Description</label>
              <p className="detail-text">{fault.description}</p>
            </div>
          )}

          {/* Location */}
          <div className="detail-section">
            <label>📍 Location</label>
            <p className="detail-text">
              {fault.location?.address || 
               `${fault.location?.lat?.toFixed(6)}, ${fault.location?.lng?.toFixed(6)}`}
            </p>
          </div>

          {/* Status */}
          <div className="detail-section">
            <label>Status</label>
            {editing && canEdit ? (
              <select 
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <p className={`status-badge ${fault.status}`}>
                {STATUS_OPTIONS.find(s => s.value === fault.status)?.label || fault.status}
              </p>
            )}
          </div>

          {/* Priority Score */}
          <div className="detail-section">
            <label>Priority Score</label>
            <div className="priority-bar">
              <div 
                className="priority-fill"
                style={{ width: `${fault.priorityScore || 0}%` }}
              />
              <span>{fault.priorityScore || 0}/100</span>
            </div>
          </div>

          {/* Assignment */}
          {fault.assignedTo && (
            <div className="detail-section">
              <label>👤 Assigned To</label>
              <p className="detail-text">{fault.assignedTo.name}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="detail-section">
            <label>📅 Timeline</label>
            <div className="timeline">
              <div className="timeline-item">
                <span className="timeline-dot"></span>
                <span className="timeline-label">Reported</span>
                <span className="timeline-time">
                  {new Date(fault.createdAt).toLocaleString()}
                </span>
              </div>
              {fault.assignedAt && (
                <div className="timeline-item">
                  <span className="timeline-dot"></span>
                  <span className="timeline-label">Assigned</span>
                  <span className="timeline-time">
                    {new Date(fault.assignedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {fault.completedAt && (
                <div className="timeline-item">
                  <span className="timeline-dot completed"></span>
                  <span className="timeline-label">Completed</span>
                  <span className="timeline-time">
                    {new Date(fault.completedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes (when editing) */}
          {editing && canEdit && (
            <div className="detail-section">
              <label>Resolution Notes</label>
              <textarea
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about the resolution..."
                rows={3}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          {(canEdit || isOwner) && !editing && (
            <>
              {canEdit && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setEditing(true)}
                >
                  ✏️ Edit Status
                </button>
              )}
              {(canEdit || isOwner) && (
                <button 
                  className="btn btn-danger"
                  onClick={() => onDelete(fault._id)}
                >
                  🗑️ Delete
                </button>
              )}
            </>
          )}
          
          {editing && (
            <>
              <button 
                className="btn btn-ghost"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleStatusUpdate}
                disabled={loading}
              >
                {loading ? 'Saving...' : '💾 Save Changes'}
              </button>
            </>
          )}
          
          {!editing && (
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      <style>{`
        .fault-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .fault-type-badge {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .fault-icon {
          font-size: 28px;
        }
        
        .fault-type-name {
          font-size: 18px;
          font-weight: 600;
          text-transform: capitalize;
        }
        
        .fault-severity-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        
        .detail-section {
          margin-bottom: 16px;
        }
        
        .detail-section label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        
        .detail-text {
          font-size: 14px;
          color: #374151;
          line-height: 1.5;
        }
        
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          background: #f3f4f6;
          color: #374151;
        }
        
        .priority-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f3f4f6;
          border-radius: 10px;
          padding: 4px;
          height: 24px;
        }
        
        .priority-fill {
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444);
          border-radius: 6px;
          transition: width 0.3s;
        }
        
        .priority-bar span {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          white-space: nowrap;
        }
        
        .timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .timeline-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .timeline-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #4f46e5;
          flex-shrink: 0;
        }
        
        .timeline-dot.completed {
          background: #22c55e;
        }
        
        .timeline-label {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          min-width: 80px;
        }
        
        .timeline-time {
          font-size: 12px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

export default FaultDetailModal;
