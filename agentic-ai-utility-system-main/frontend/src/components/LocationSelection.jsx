import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getStates, getDistricts, getCities, getCityCoordinates } from '../data/locations';
import './LocationSelection.css';

export default function LocationSelection() {
  const navigate = useNavigate();
  const { user, api, dispatch } = useApp();
  
  const [states] = useState(getStates());
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Load saved location from localStorage if exists
  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      const location = JSON.parse(savedLocation);
      setSelectedState(location.state || '');
      setSelectedDistrict(location.district || '');
      setSelectedCity(location.city || '');
    }
  }, []);

  // Update districts when state changes
  useEffect(() => {
    if (selectedState) {
      const dists = getDistricts(selectedState);
      setDistricts(dists);
      setSelectedDistrict('');
      setSelectedCity('');
      setCities([]);
    }
  }, [selectedState]);

  // Update cities when district changes
  useEffect(() => {
    if (selectedState && selectedDistrict) {
      const cityList = getCities(selectedState, selectedDistrict);
      setCities(cityList);
      setSelectedCity('');
    }
  }, [selectedDistrict, selectedState]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!selectedState || !selectedDistrict || !selectedCity) {
      setError('Please select State, District and City');
      return;
    }

    setIsLoading(true);
    
    try {
      const locationData = {
        state: selectedState,
        district: selectedDistrict,
        city: selectedCity,
        ...getCityCoordinates(selectedCity)
      };

      // Save to localStorage
      localStorage.setItem('userLocation', JSON.stringify(locationData));
      
      // Save to backend
      if (user) {
        await api.put('/auth/profile', {
          location: locationData
        });
      }

      // Update context
      dispatch({ type: 'SET_LOCATION', payload: locationData });
      
      // Navigate to dashboard
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Location save error:', err);
      setError('Failed to save location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="location-selection-page">
      <div className="location-selection-container">
        <div className="location-header">
          <span className="material-icons location-icon">location_on</span>
          <h1>Select Your Location</h1>
          <p>Choose your city to see local issues and reports</p>
        </div>

        {error && (
          <div className="error-banner">
            <span className="material-icons">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="location-form">
          <div className="form-group">
            <label>
              <span className="material-icons">public</span>
              State
            </label>
            <select 
              value={selectedState} 
              onChange={(e) => setSelectedState(e.target.value)}
              required
            >
              <option value="">Select State</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <span className="material-icons">map</span>
              District
            </label>
            <select 
              value={selectedDistrict} 
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
              required
            >
              <option value="">Select District</option>
              {districts.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <span className="material-icons">location_city</span>
              City
            </label>
            <select 
              value={selectedCity} 
              onChange={(e) => setSelectedCity(e.target.value)}
              disabled={!selectedDistrict}
              required
            >
              <option value="">Select City</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {selectedCity && (
            <div className="location-preview">
              <span className="material-icons">check_circle</span>
              <p>You selected: <strong>{selectedCity}, {selectedDistrict}, {selectedState}</strong></p>
            </div>
          )}

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-primary btn-full"
              disabled={isLoading || !selectedCity}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-icons">check</span>
                  Confirm Location
                </>
              )}
            </button>
            
            <button 
              type="button" 
              className="btn-text"
              onClick={handleSkip}
            >
              Skip for now
            </button>
          </div>
        </form>

        <div className="location-info">
          <span className="material-icons">info</span>
          <p>Your location helps us show relevant issues in your area and allows you to report problems to local authorities.</p>
        </div>
      </div>
    </div>
  );
}
