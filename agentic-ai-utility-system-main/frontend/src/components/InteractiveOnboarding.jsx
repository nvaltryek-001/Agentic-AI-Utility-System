import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './InteractiveOnboarding.css';

const onboardingSteps = [
  {
    id: 'welcome',
    title: 'Welcome to Valtryek',
    subtitle: 'Your Smart City Companion',
    description: 'Experience the future of urban living with AI-powered utility management.',
    icon: 'smart_toy',
    color: '#667eea'
  },
  {
    id: 'ai-power',
    title: 'AI-Powered Intelligence',
    subtitle: 'Predict & Prevent',
    description: 'Our AI predicts faults 3 hours before they occur, ensuring proactive maintenance and minimal disruption.',
    icon: 'psychology',
    color: '#f093fb'
  },
  {
    id: 'real-time',
    title: 'Real-Time Monitoring',
    subtitle: 'Live City Pulse',
    description: 'Track 10,000+ sensors across the city in real-time. See issues as they happen.',
    icon: 'sensors',
    color: '#4facfe'
  },
  {
    id: 'community',
    title: 'Community Power',
    subtitle: 'Report & Track',
    description: 'Report issues directly to authorities, track resolution progress, and stay informed.',
    icon: 'people',
    color: '#f5576c'
  },
  {
    id: 'personalized',
    title: 'Your City, Your Way',
    subtitle: 'Personalized Experience',
    description: 'Get personalized alerts for your area, customized dashboards, and smart recommendations.',
    icon: 'person_pin',
    color: '#48bb78'
  }
];

export default function InteractiveOnboarding({ onComplete }) {
  const navigate = useNavigate();
  const { user } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState('next');
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const step = onboardingSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === onboardingSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
      return;
    }
    setDirection('next');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
      setIsAnimating(false);
    }, 400);
  };

  const handlePrev = () => {
    if (isFirstStep) return;
    setDirection('prev');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev - 1);
      setIsAnimating(false);
    }, 400);
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Touch/swipe handlers
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  // Auto-advance on last step
  useEffect(() => {
    if (isLastStep) {
      const timer = setTimeout(() => {
        // Don't auto-complete, let user click
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isLastStep]);

  return (
    <div 
      className="interactive-onboarding"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Animated Background */}
      <div className="onboarding-bg">
        <div 
          className="gradient-sphere"
          style={{ background: `radial-gradient(circle, ${step.color}40 0%, transparent 70%)` }}
        />
        <div className="particles">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                background: step.color
              }}
            />
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="onboarding-progress">
        <div className="progress-track">
          {onboardingSteps.map((_, index) => (
            <div 
              key={index}
              className={`progress-dot ${index <= currentStep ? 'active' : ''} ${index === currentStep ? 'current' : ''}`}
              style={{ 
                backgroundColor: index <= currentStep ? step.color : undefined 
              }}
              onClick={() => !isAnimating && setCurrentStep(index)}
            />
          ))}
        </div>
        <span className="step-counter">{currentStep + 1} / {onboardingSteps.length}</span>
      </div>

      {/* Skip Button */}
      {!isLastStep && (
        <button className="skip-btn" onClick={handleSkip}>
          Skip
        </button>
      )}

      {/* Main Content */}
      <div className={`onboarding-content ${isAnimating ? `animating-${direction}` : ''}`}>
        {/* Icon Animation */}
        <div className="icon-container" style={{ '--step-color': step.color }}>
          <div className="icon-ring ring-1"></div>
          <div className="icon-ring ring-2"></div>
          <div className="icon-glow"></div>
          <div className="icon-wrapper">
            <span className="material-icons" style={{ color: step.color }}>
              {step.icon}
            </span>
          </div>
        </div>

        {/* Text Content */}
        <div className="text-content">
          <span className="subtitle" style={{ color: step.color }}>
            {step.subtitle}
          </span>
          <h1 className="title">{step.title}</h1>
          <p className="description">{step.description}</p>
        </div>

        {/* Feature Highlights */}
        <div className="feature-highlights">
          {currentStep === 1 && (
            <div className="highlight-stats">
              <div className="stat-item">
                <span className="stat-value">3hrs</span>
                <span className="stat-label">Prediction Window</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">95%</span>
                <span className="stat-label">Accuracy</span>
              </div>
            </div>
          )}
          {currentStep === 2 && (
            <div className="sensor-animation">
              <div className="sensor-node" style={{ animationDelay: '0s' }}></div>
              <div className="sensor-node" style={{ animationDelay: '0.3s' }}></div>
              <div className="sensor-node" style={{ animationDelay: '0.6s' }}></div>
              <div className="sensor-connections"></div>
            </div>
          )}
          {currentStep === 3 && (
            <div className="community-preview">
              <div className="user-avatars">
                <div className="avatar">U1</div>
                <div className="avatar">U2</div>
                <div className="avatar">U3</div>
                <div className="avatar more">+5K</div>
              </div>
              <span className="community-text">5,000+ active citizens</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="onboarding-nav">
        <button 
          className={`nav-btn prev ${isFirstStep ? 'disabled' : ''}`}
          onClick={handlePrev}
          disabled={isFirstStep}
        >
          <span className="material-icons">arrow_back</span>
        </button>

        <button 
          className="nav-btn next primary"
          onClick={handleNext}
          style={{ backgroundColor: step.color }}
        >
          <span>{isLastStep ? 'Get Started' : 'Next'}</span>
          <span className="material-icons">
            {isLastStep ? 'rocket_launch' : 'arrow_forward'}
          </span>
        </button>
      </div>

      {/* Gesture Hint */}
      <div className="gesture-hint">
        <span className="material-icons">swipe</span>
        <span>Swipe to navigate</span>
      </div>

      {/* Personal Welcome for Returning Users */}
      {user && currentStep === 0 && (
        <div className="personal-welcome">
          <span className="welcome-text">Welcome back, {user.name.split(' ')[0]}!</span>
        </div>
      )}
    </div>
  );
}
