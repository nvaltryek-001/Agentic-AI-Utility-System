import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './ReportComplaint.css';

const categories = [
  { id: 'water', label: 'Water Supply', icon: 'water_drop' },
  { id: 'electricity', label: 'Electricity', icon: 'bolt' },
  { id: 'road', label: 'Roads & Potholes', icon: 'add_road' },
  { id: 'sewage', label: 'Sewage & Drainage', icon: 'plumbing' },
  { id: 'garbage', label: 'Garbage Collection', icon: 'delete' },
  { id: 'streetlight', label: 'Street Lights', icon: 'lightbulb' },
  { id: 'other', label: 'Other Issues', icon: 'report_problem' }
];

export default function ReportComplaint() {
  const navigate = useNavigate();
  const { location, createComplaint, isLoading } = useApp();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    images: []
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!formData.title || !formData.description || !formData.category) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const complaintData = {
        ...formData,
        location: location ? {
          state: location.state,
          district: location.district,
          city: location.city,
          address: location.address
        } : {}
      };

      await createComplaint(complaintData);
      setSuccess('Complaint submitted successfully! We will forward it to the concerned department.');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        images: []
      });
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint. Please try again.');
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    // In a real app, upload to cloud storage
    const imageUrls = files.map(file => URL.createObjectURL(file));
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...imageUrls]
    }));
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="report-complaint-page">
      <div className="complaint-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h1>Report to Government</h1>
        <p>Submit your civic issue to the concerned department</p>
      </div>

      <div className="complaint-container">
        {location && (
          <div className="location-badge">
            <span className="material-icons">location_on</span>
            <span>Reporting for: <strong>{location.city}, {location.state}</strong></span>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <span className="material-icons">error</span>
            {error}
          </div>
        )}

        {success && (
          <div className="success-banner">
            <span className="material-icons">check_circle</span>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="complaint-form">
          <div className="form-group">
            <label>Issue Category *</label>
            <div className="category-grid">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-card ${formData.category === cat.id ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                >
                  <span className="material-icons">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              placeholder="Brief title of the issue (e.g., 'Broken street light near park')"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              placeholder="Describe the issue in detail. Include landmarks, duration, and any other relevant information."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={5}
              required
            />
          </div>

          <div className="form-group">
            <label>Photos (Optional)</label>
            <div className="image-upload">
              <label className="upload-btn">
                <span className="material-icons">add_a_photo</span>
                <span>Add Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  hidden
                />
              </label>
            </div>
            
            {formData.images.length > 0 && (
              <div className="image-preview-grid">
                {formData.images.map((img, index) => (
                  <div key={index} className="image-preview">
                    <img src={img} alt={`Upload ${index + 1}`} />
                    <button
                      type="button"
                      className="remove-image"
                      onClick={() => removeImage(index)}
                    >
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-info">
            <span className="material-icons">info</span>
            <p>Your complaint will be forwarded to the concerned government department. You will receive updates on the progress.</p>
          </div>

          <button
            type="submit"
            className="btn-primary btn-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Submitting...
              </>
            ) : (
              <>
                <span className="material-icons">send</span>
                Submit Complaint
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
