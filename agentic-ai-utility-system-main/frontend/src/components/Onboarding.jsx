import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const slides = [
  {
    icon: 'bolt',
    title: 'Smart Fault Detection',
    description: 'AI-powered system detects and analyzes utility faults in real-time across your city.',
    color: '#0ea5e9'
  },
  {
    icon: 'location_on',
    title: 'Interactive Maps',
    description: 'View faults on an interactive map with heatmaps, clustering, and satellite imagery.',
    color: '#8b5cf6'
  },
  {
    icon: 'auto_fix_high',
    title: 'AI Predictions',
    description: 'Get intelligent predictions about high-risk areas and potential faults before they happen.',
    color: '#22c55e'
  },
  {
    icon: 'notifications_active',
    title: 'Real-time Alerts',
    description: 'Receive instant notifications about faults in your area and track repair progress.',
    color: '#f59e0b'
  }
];

export default function Onboarding({ onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];

  return (
    <div className="onboarding-container">
      <div className="onboarding-header">
        <button className="skip-btn" onClick={handleSkip}>
          Skip
        </button>
      </div>

      <div className="onboarding-content">
        <div 
          className="slide-icon"
          style={{ '--slide-color': slide.color }}
        >
          <span className="material-icons">{slide.icon}</span>
        </div>
        
        <h2 className="slide-title">{slide.title}</h2>
        <p className="slide-description">{slide.description}</p>
      </div>

      <div className="onboarding-footer">
        <div className="slide-indicators">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`indicator ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>

        <button 
          className="next-btn"
          onClick={handleNext}
          style={{ background: slide.color }}
        >
          {currentSlide === slides.length - 1 ? (
            <>
              Get Started
              <span className="material-icons">arrow_forward</span>
            </>
          ) : (
            <>
              Next
              <span className="material-icons">arrow_forward</span>
            </>
          )}
        </button>
      </div>

      <div className="onboarding-bg">
        <div 
          className="bg-gradient"
          style={{ background: `radial-gradient(circle at 50% 30%, ${slide.color}20, transparent 50%)` }}
        />
      </div>
    </div>
  );
}
