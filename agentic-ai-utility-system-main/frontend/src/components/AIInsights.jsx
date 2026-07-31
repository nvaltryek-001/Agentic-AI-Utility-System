import { useState, useEffect, useRef } from 'react';
import { useIntersectionAnimation, useCountUp, useTypewriter } from '../hooks/useAnimations';
import './AIInsights.css';

// AI Decision Card Component
const DecisionCard = ({ decision, index }) => {
  const [ref, isVisible] = useIntersectionAnimation({ threshold: 0.2 });
  const { count, startAnimation } = useCountUp(decision.confidence || 95, 1500);
  const [showReasoning, setShowReasoning] = useState(false);

  useEffect(() => {
    if (isVisible) {
      startAnimation();
    }
  }, [isVisible, startAnimation]);

  const getDecisionIcon = (type) => {
    switch (type) {
      case 'assignment': return 'person_add';
      case 'priority': return 'trending_up';
      case 'scheduling': return 'schedule';
      case 'prediction': return 'psychology';
      case 'anomaly': return 'warning';
      default: return 'auto_awesome';
    }
  };

  const getDecisionColor = (type) => {
    switch (type) {
      case 'assignment': return '#22c55e';
      case 'priority': return '#f59e0b';
      case 'scheduling': return '#3b82f6';
      case 'prediction': return '#a855f7';
      case 'anomaly': return '#ef4444';
      default: return '#667eea';
    }
  };

  return (
    <div 
      ref={ref}
      className={`decision-card ${isVisible ? 'visible' : ''}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="decision-header">
        <div 
          className="decision-icon"
          style={{ background: `${getDecisionColor(decision.type)}20`, color: getDecisionColor(decision.type) }}
        >
          <span className="material-icons">{getDecisionIcon(decision.type)}</span>
        </div>
        <div className="decision-meta">
          <span className="decision-type">{decision.type}</span>
          <span className="decision-time">{decision.timestamp}</span>
        </div>
        <div className="confidence-badge">
          <div className="confidence-ring" style={{ '--progress': count / 100 }}>
            <span>{count}%</span>
          </div>
        </div>
      </div>

      <div className="decision-content">
        <h4>{decision.title}</h4>
        <p>{decision.description}</p>
      </div>

      <div className="decision-factors">
        <h5>Key Factors:</h5>
        <div className="factors-list">
          {decision.factors?.map((factor, idx) => (
            <span key={idx} className="factor-tag">
              <span className="material-icons">check_circle</span>
              {factor}
            </span>
          ))}
        </div>
      </div>

      <button 
        className="reasoning-toggle"
        onClick={() => setShowReasoning(!showReasoning)}
      >
        <span>{showReasoning ? 'Hide' : 'Show'} AI Reasoning</span>
        <span className={`material-icons ${showReasoning ? 'expanded' : ''}`}>expand_more</span>
      </button>

      {showReasoning && (
        <div className="reasoning-panel">
          <div className="reasoning-steps">
            {decision.reasoning?.map((step, idx) => (
              <div key={idx} className="reasoning-step">
                <span className="step-number">{idx + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
          <div className="model-info">
            <span className="model-badge">
              <span className="material-icons">memory</span>
              {decision.model || 'Valtryek AI v2.0'}
            </span>
            <span className="latency">{decision.latency || '45ms'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Real-time AI Status Component
const AIStatus = ({ isActive, lastUpdate }) => {
  return (
    <div className="ai-status-bar">
      <div className={`ai-indicator ${isActive ? 'active' : ''}`}>
        <div className="ai-pulse">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span className="ai-label">{isActive ? 'AI Active' : 'AI Standby'}</span>
      </div>
      <div className="ai-metrics">
        <span className="metric">
          <span className="material-icons">speed</span>
          Processing: 1,240 ops/sec
        </span>
        <span className="metric">
          <span className="material-icons">update</span>
          Last update: {lastUpdate}
        </span>
      </div>
    </div>
  );
};

// Prediction Card Component
const PredictionCard = ({ prediction }) => {
  const { displayText, isTyping } = useTypewriter(prediction.text, 30);

  return (
    <div className="prediction-card">
      <div className="prediction-icon">
        <span className="material-icons">crystal_ball</span>
      </div>
      <div className="prediction-content">
        <span className="prediction-label">AI Prediction</span>
        <p>{displayText}{isTyping && <span className="cursor">|</span>}</p>
        <div className="prediction-confidence">
          <div className="confidence-bar">
            <div 
              className="confidence-fill"
              style={{ width: `${prediction.confidence}%` }}
            />
          </div>
          <span>{prediction.confidence}% confidence</span>
        </div>
      </div>
    </div>
  );
};

// Main AI Insights Component
const AIInsights = ({ decisions = [], predictions = [] }) => {
  const [activeTab, setActiveTab] = useState('decisions');
  const [isActive, setIsActive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('Just now');
  const scrollRef = useRef(null);

  // Auto-scroll to latest decision
  useEffect(() => {
    if (scrollRef.current && activeTab === 'decisions') {
      scrollRef.current.scrollTop = 0;
    }
  }, [decisions, activeTab]);

  // Simulate AI activity
  useEffect(() => {
    const interval = setInterval(() => {
      setIsActive(true);
      setTimeout(() => setIsActive(false), 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update timestamp
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date().toLocaleTimeString());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const sampleDecisions = decisions.length > 0 ? decisions : [
    {
      type: 'assignment',
      title: 'Auto-assigned Technician to Critical Fault',
      description: 'Technician Rahul K. assigned to Water Main Break based on proximity, skill match, and workload.',
      confidence: 96,
      timestamp: '2 min ago',
      factors: ['2.3km distance', 'Expert in water systems', 'Low workload'],
      reasoning: [
        'Analyzed 12 available technicians in 5km radius',
        'Filtered by water system expertise (3 matches)',
        'Selected based on lowest current workload',
        'Estimated arrival time: 18 minutes'
      ],
      model: 'Assignment Agent v2.1',
      latency: '42ms'
    },
    {
      type: 'priority',
      title: 'Escalated Priority Score',
      description: 'Fault #8X92 priority increased from 72 to 89 due to proximity to hospital and time of day.',
      confidence: 91,
      timestamp: '5 min ago',
      factors: ['Near City Hospital', 'Peak hours', 'Affects 200+ residents'],
      reasoning: [
        'Detected location within 500m of critical infrastructure',
        'Analyzed time-of-day impact patterns',
        'Calculated affected population density',
        'Applied escalation protocol automatically'
      ],
      model: 'Priority Agent v1.8',
      latency: '38ms'
    },
    {
      type: 'prediction',
      title: 'Predicted Equipment Failure',
      description: 'Transformer T-442 showing early failure indicators. Recommended preventive maintenance.',
      confidence: 87,
      timestamp: '12 min ago',
      factors: ['Load patterns', 'Temperature data', 'Age analysis'],
      reasoning: [
        'Analyzed 30 days of load patterns',
        'Detected anomaly in thermal readings',
        'Cross-referenced with equipment age',
        'Predicted 78% failure probability within 14 days'
      ],
      model: 'Predictive Agent v1.5',
      latency: '156ms'
    },
    {
      type: 'scheduling',
      title: 'Optimized Daily Schedule',
      description: 'Rebalanced 23 technician schedules to minimize travel time and maximize coverage.',
      confidence: 94,
      timestamp: '1 hour ago',
      factors: ['Traffic patterns', 'Fault distribution', 'Skill matching'],
      reasoning: [
        'Processed 47 pending assignments',
        'Analyzed real-time traffic data',
        'Applied traveling salesman optimization',
        'Reduced estimated travel time by 32%'
      ],
      model: 'Scheduling Agent v2.3',
      latency: '892ms'
    }
  ];

  const samplePredictions = predictions.length > 0 ? predictions : [
    {
      text: 'High probability of electricity faults in Sector 7 due to forecasted storms in next 6 hours',
      confidence: 84
    },
    {
      text: 'Water pressure issues expected in Downtown area based on maintenance schedule analysis',
      confidence: 76
    }
  ];

  return (
    <div className="ai-insights-container">
      <AIStatus isActive={isActive} lastUpdate={lastUpdate} />
      
      <div className="ai-tabs">
        <button 
          className={`ai-tab ${activeTab === 'decisions' ? 'active' : ''}`}
          onClick={() => setActiveTab('decisions')}
        >
          <span className="material-icons">smart_toy</span>
          AI Decisions
          <span className="badge">{sampleDecisions.length}</span>
        </button>
        <button 
          className={`ai-tab ${activeTab === 'predictions' ? 'active' : ''}`}
          onClick={() => setActiveTab('predictions')}
        >
          <span className="material-icons">crystal_ball</span>
          Predictions
          <span className="badge">{samplePredictions.length}</span>
        </button>
      </div>

      <div className="ai-content" ref={scrollRef}>
        {activeTab === 'decisions' ? (
          <div className="decisions-list">
            {sampleDecisions.map((decision, index) => (
              <DecisionCard key={index} decision={decision} index={index} />
            ))}
          </div>
        ) : (
          <div className="predictions-list">
            {samplePredictions.map((prediction, index) => (
              <PredictionCard key={index} prediction={prediction} />
            ))}
            
            <div className="prediction-insights">
              <h4>Pattern Analysis</h4>
              <div className="insight-grid">
                <div className="insight-item">
                  <span className="material-icons">trending_up</span>
                  <div>
                    <strong>23%</strong>
                    <span>Increase in water faults</span>
                  </div>
                </div>
                <div className="insight-item">
                  <span className="material-icons">schedule</span>
                  <div>
                    <strong>Peak Time</strong>
                    <span>6PM - 9PM weekdays</span>
                  </div>
                </div>
                <div className="insight-item">
                  <span className="material-icons">place</span>
                  <div>
                    <strong>Hot Zone</strong>
                    <span>Sector 4 & 7</span>
                  </div>
                </div>
                <div className="insight-item">
                  <span className="material-icons">build</span>
                  <div>
                    <strong>Top Issue</strong>
                    <span>Street lighting</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsights;
