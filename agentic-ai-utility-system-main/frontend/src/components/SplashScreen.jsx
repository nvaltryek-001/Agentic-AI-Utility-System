import { useEffect, useState } from 'react';

export default function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 500);
          }, 300);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <div className="logo-container">
          <div className="logo-pulse">
            <span className="material-icons">bolt</span>
          </div>
          <div className="logo-rings">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
          </div>
        </div>
        
        <h1 className="splash-title">Valtryek</h1>
        <p className="splash-tagline">Smart City Intelligence</p>
        
        <div className="loading-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="loading-text">
            {progress < 30 && 'Initializing AI...'}
            {progress >= 30 && progress < 60 && 'Loading maps...'}
            {progress >= 60 && progress < 90 && 'Syncing data...'}
            {progress >= 90 && 'Ready!'}
          </p>
        </div>
      </div>
      
      <div className="splash-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
    </div>
  );
}
