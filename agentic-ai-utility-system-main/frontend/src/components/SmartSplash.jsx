import { useState, useEffect } from 'react';
import './SmartSplash.css';

const loadingInsights = [
  { text: "Analyzing city infrastructure...", icon: "analytics" },
  { text: "Connecting to smart sensors...", icon: "sensors" },
  { text: "Loading real-time data...", icon: "sync" },
  { text: "Optimizing for your location...", icon: "my_location" },
  { text: "Preparing AI insights...", icon: "psychology" },
  { text: "Syncing with city grid...", icon: "grid_on" },
  { text: "Checking weather patterns...", icon: "cloud" },
  { text: "Loading technician network...", icon: "engineering" }
];

const funFacts = [
  "Valtryek monitors 10,000+ sensors citywide",
  "AI predicts faults 3 hours before they occur",
  "Average response time: 12 minutes",
  "99.7% uptime across all utilities",
  "Connected to 500+ smart devices",
  "Processing 1M+ data points daily"
];

export default function SmartSplash({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [currentInsight, setCurrentInsight] = useState(0);
  const [currentFact, setCurrentFact] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // Non-linear progress for realism
        const increment = Math.random() * 15 + 5;
        return Math.min(prev + increment, 100);
      });
    }, 200);

    // Rotate insights
    const insightInterval = setInterval(() => {
      setCurrentInsight(prev => (prev + 1) % loadingInsights.length);
    }, 1500);

    // Rotate facts
    const factInterval = setInterval(() => {
      setCurrentFact(prev => (prev + 1) % funFacts.length);
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(insightInterval);
      clearInterval(factInterval);
    };
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(onComplete, 600);
      }, 500);
    }
  }, [progress, onComplete]);

  return (
    <div className={`smart-splash ${isExiting ? 'exit' : ''}`}>
      {/* Animated Background */}
      <div className="splash-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="grid-pattern"></div>
      </div>

      {/* Main Content */}
      <div className="splash-content">
        {/* Logo Animation */}
        <div className="logo-container">
          <div className="logo-ring ring-1"></div>
          <div className="logo-ring ring-2"></div>
          <div className="logo-ring ring-3"></div>
          <div className="logo-core">
            <span className="material-icons">bolt</span>
          </div>
          <div className="pulse-waves">
            <div className="wave"></div>
            <div className="wave"></div>
            <div className="wave"></div>
          </div>
        </div>

        {/* Brand */}
        <div className="brand-section">
          <h1 className="brand-name">Valtryek</h1>
          <p className="brand-tagline">Smart City Intelligence</p>
        </div>

        {/* Progress Section */}
        <div className="progress-section">
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ width: `${progress}%` }}
            >
              <div className="progress-glow"></div>
            </div>
            <div 
              className="progress-particles"
              style={{ left: `${progress}%` }}
            >
              {[...Array(5)].map((_, i) => (
                <div key={i} className="particle"></div>
              ))}
            </div>
          </div>
          
          <div className="progress-stats">
            <span className="progress-percentage">{Math.round(progress)}%</span>
            <span className="progress-label">System Ready</span>
          </div>
        </div>

        {/* Dynamic Insight */}
        <div className="insight-container">
          <div className="insight-icon">
            <span className="material-icons">
              {loadingInsights[currentInsight].icon}
            </span>
          </div>
          <p className="insight-text">{loadingInsights[currentInsight].text}</p>
        </div>

        {/* Fun Fact */}
        <div className="fact-container">
          <span className="fact-label">Did you know?</span>
          <p className="fact-text" key={currentFact}>
            {funFacts[currentFact]}
          </p>
        </div>
      </div>

      {/* Bottom Status */}
      <div className="splash-footer">
        <div className="status-indicators">
          <div className="status-item">
            <span className="status-dot online"></span>
            <span>AI Engine</span>
          </div>
          <div className="status-item">
            <span className="status-dot online"></span>
            <span>Live Data</span>
          </div>
          <div className="status-item">
            <span className="status-dot online"></span>
            <span>Network</span>
          </div>
        </div>
        <p className="version">v2.0.0 Elite</p>
      </div>
    </div>
  );
}
