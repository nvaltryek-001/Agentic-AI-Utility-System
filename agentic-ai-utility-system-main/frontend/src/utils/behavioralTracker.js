// Behavioral Tracking System for Valtryek
// Tracks user interactions, preferences, and patterns for personalization

class BehavioralTracker {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.events = [];
    this.userProfile = this.loadUserProfile();
    this.isTracking = true;
    
    this.init();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  init() {
    // Track page views
    this.trackPageView();
    
    // Track session duration
    this.sessionStart = Date.now();
    
    // Setup beforeunload to save session data
    window.addEventListener('beforeunload', () => {
      this.saveSessionData();
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackEvent('visibility_change', {
        state: document.visibilityState,
        timestamp: Date.now()
      });
    });
  }

  // Track any event
  trackEvent(eventName, data = {}) {
    if (!this.isTracking) return;

    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: eventName,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: {
        ...data,
        url: window.location.pathname,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
      }
    };

    this.events.push(event);
    
    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Update user profile based on event
    this.updateProfileFromEvent(event);

    // Send to analytics (debounced)
    this.debouncedSend();
  }

  // Specific tracking methods
  trackPageView() {
    this.trackEvent('page_view', {
      path: window.location.pathname,
      referrer: document.referrer
    });
  }

  trackFeatureUsage(feature, details = {}) {
    this.trackEvent('feature_usage', {
      feature,
      ...details
    });
  }

  trackFaultReport(faultType, severity) {
    this.trackEvent('fault_report', {
      type: faultType,
      severity,
      location: this.userProfile.preferredLocation
    });
    
    // Update user's report history
    this.userProfile.reportHistory.push({
      type: faultType,
      date: Date.now()
    });
    this.saveUserProfile();
  }

  trackMapInteraction(action, details = {}) {
    this.trackEvent('map_interaction', {
      action,
      ...details
    });
  }

  trackDashboardView(section, timeSpent) {
    this.trackEvent('dashboard_view', {
      section,
      timeSpent,
      city: this.userProfile.preferredLocation?.city
    });
  }

  trackNotificationInteraction(notificationId, action) {
    this.trackEvent('notification_interaction', {
      notificationId,
      action // 'viewed', 'clicked', 'dismissed'
    });
  }

  trackSearch(query, resultsCount) {
    this.trackEvent('search', {
      query,
      resultsCount,
      timestamp: Date.now()
    });
    
    // Add to search history
    this.userProfile.searchHistory.unshift({
      query,
      timestamp: Date.now()
    });
    
    // Keep only last 20 searches
    this.userProfile.searchHistory = this.userProfile.searchHistory.slice(0, 20);
    this.saveUserProfile();
  }

  // Profile management
  loadUserProfile() {
    const saved = localStorage.getItem('valtryek_user_profile');
    if (saved) {
      return JSON.parse(saved);
    }
    
    return {
      userId: null,
      firstVisit: Date.now(),
      lastVisit: Date.now(),
      visitCount: 0,
      preferredLocation: null,
      interests: [],
      reportHistory: [],
      searchHistory: [],
      featureUsage: {},
      peakUsageHours: {},
      preferredFaultTypes: [],
      notificationPreferences: {
        enabled: true,
        types: ['critical', 'high', 'nearby']
      },
      dashboardLayout: 'default',
      theme: 'auto'
    };
  }

  saveUserProfile() {
    this.userProfile.lastVisit = Date.now();
    localStorage.setItem('valtryek_user_profile', JSON.stringify(this.userProfile));
  }

  updateProfileFromEvent(event) {
    const { name, data } = event;
    
    switch (name) {
      case 'fault_report':
        // Track preferred fault types
        if (!this.userProfile.preferredFaultTypes.includes(data.type)) {
          this.userProfile.preferredFaultTypes.push(data.type);
        }
        break;
        
      case 'feature_usage':
        // Track feature usage frequency
        const feature = data.feature;
        this.userProfile.featureUsage[feature] = (this.userProfile.featureUsage[feature] || 0) + 1;
        break;
        
      case 'page_view':
        // Track visit count
        this.userProfile.visitCount++;
        
        // Track peak usage hour
        const hour = new Date().getHours();
        this.userProfile.peakUsageHours[hour] = (this.userProfile.peakUsageHours[hour] || 0) + 1;
        break;
    }
    
    this.saveUserProfile();
  }

  // Personalization methods
  getPersonalizedGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    
    const name = this.userProfile.userId ? this.userProfile.userId.split(' ')[0] : '';
    return name ? `${greeting}, ${name}` : greeting;
  }

  getRecommendedActions() {
    const recommendations = [];
    
    // Based on location
    if (this.userProfile.preferredLocation) {
      recommendations.push({
        type: 'location_based',
        title: `View issues in ${this.userProfile.preferredLocation.city}`,
        action: 'view_city_faults'
      });
    }
    
    // Based on report history
    if (this.userProfile.reportHistory.length > 0) {
      const lastReport = this.userProfile.reportHistory[this.userProfile.reportHistory.length - 1];
      const daysSince = (Date.now() - lastReport.date) / (1000 * 60 * 60 * 24);
      
      if (daysSince > 7) {
        recommendations.push({
          type: 'follow_up',
          title: 'Check status of your recent reports',
          action: 'view_my_reports'
        });
      }
    }
    
    // Based on feature usage
    const mostUsedFeature = Object.entries(this.userProfile.featureUsage)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostUsedFeature && mostUsedFeature[0] === 'map') {
      recommendations.push({
        type: 'feature_based',
        title: 'Explore the interactive city map',
        action: 'open_map'
      });
    }
    
    return recommendations.slice(0, 3);
  }

  getRiskLevelForUser() {
    // Calculate risk based on user's area
    const location = this.userProfile.preferredLocation;
    if (!location) return 'unknown';
    
    // This would be calculated based on actual fault data
    // For now, return a mock risk level
    const riskLevels = ['low', 'medium', 'high', 'critical'];
    return riskLevels[Math.floor(Math.random() * riskLevels.length)];
  }

  getInsights() {
    const insights = [];
    const profile = this.userProfile;
    
    // Usage insights
    if (profile.visitCount > 10) {
      insights.push({
        type: 'engagement',
        message: `You've visited ${profile.visitCount} times. Thanks for being an active citizen!`,
        icon: 'emoji_events'
      });
    }
    
    // Report insights
    if (profile.reportHistory.length > 0) {
      insights.push({
        type: 'impact',
        message: `You've reported ${profile.reportHistory.length} issues. Your contributions help improve the city!`,
        icon: 'volunteer_activism'
      });
    }
    
    // Location insights
    if (profile.preferredLocation) {
      const riskLevel = this.getRiskLevelForUser();
      if (riskLevel === 'high' || riskLevel === 'critical') {
        insights.push({
          type: 'alert',
          message: `⚠️ Risk level increased in ${profile.preferredLocation.city}. Stay informed.`,
          icon: 'warning',
          priority: 'high'
        });
      }
    }
    
    return insights;
  }

  // Debounced send to server
  debouncedSend() {
    if (this.sendTimeout) {
      clearTimeout(this.sendTimeout);
    }
    
    this.sendTimeout = setTimeout(() => {
      this.sendToServer();
    }, 5000);
  }

  async sendToServer() {
    if (this.events.length === 0) return;
    
    const eventsToSend = [...this.events];
    this.events = [];
    
    try {
      // Send to analytics endpoint
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          events: eventsToSend,
          profile: this.userProfile
        })
      });
      
      if (!response.ok) {
        // Restore events if failed
        this.events = [...eventsToSend, ...this.events];
      }
    } catch (error) {
      // Restore events if failed
      this.events = [...eventsToSend, ...this.events];
    }
  }

  saveSessionData() {
    const sessionData = {
      sessionId: this.sessionId,
      duration: Date.now() - this.sessionStart,
      eventCount: this.events.length,
      endTime: Date.now()
    };
    
    localStorage.setItem('valtryek_last_session', JSON.stringify(sessionData));
    this.saveUserProfile();
    this.sendToServer();
  }

  // Set user ID when logged in
  setUserId(userId) {
    this.userProfile.userId = userId;
    this.saveUserProfile();
  }

  // Set preferred location
  setPreferredLocation(location) {
    this.userProfile.preferredLocation = location;
    this.saveUserProfile();
  }

  // Get tracking summary
  getSummary() {
    return {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStart,
      eventsTracked: this.events.length,
      userProfile: this.userProfile
    };
  }

  // Disable tracking
  disable() {
    this.isTracking = false;
  }

  // Enable tracking
  enable() {
    this.isTracking = true;
  }
}

// Create singleton instance
const behavioralTracker = new BehavioralTracker();

export default behavioralTracker;

// React hook for easy integration
export const useBehavioralTracking = () => {
  return {
    track: (eventName, data) => behavioralTracker.trackEvent(eventName, data),
    trackFeature: (feature, details) => behavioralTracker.trackFeatureUsage(feature, details),
    trackFault: (type, severity) => behavioralTracker.trackFaultReport(type, severity),
    trackMap: (action, details) => behavioralTracker.trackMapInteraction(action, details),
    trackDashboard: (section, time) => behavioralTracker.trackDashboardView(section, time),
    trackSearch: (query, results) => behavioralTracker.trackSearch(query, results),
    getGreeting: () => behavioralTracker.getPersonalizedGreeting(),
    getRecommendations: () => behavioralTracker.getRecommendedActions(),
    getInsights: () => behavioralTracker.getInsights(),
    setUserId: (id) => behavioralTracker.setUserId(id),
    setLocation: (loc) => behavioralTracker.setPreferredLocation(loc)
  };
};
