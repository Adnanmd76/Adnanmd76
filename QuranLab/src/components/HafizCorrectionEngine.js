import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

/**
 * HafizCorrectionEngine Component
 * 
 * Multi-layer validation system: AI → Human → Scholar
 * 30-minute response guarantee with region/language-based expert matching
 * 
 * @component
 * @author Muhammad Adnan Ul Mustafa
 */
const HafizCorrectionEngine = ({ analysisResult, userId }) => {
  // State management
  const [correctionRequest, setCorrectionRequest] = useState(null);
  const [availableExperts, setAvailableExperts] = useState([]);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [correctionStatus, setCorrectionStatus] = useState('pending'); // pending, assigned, in-progress, completed
  const [humanFeedback, setHumanFeedback] = useState(null);
  const [scholarReview, setScholarReview] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Timer for 30-minute guarantee
  const responseTimerRef = useRef(null);
  const requestStartTime = useRef(null);

  // Firebase configuration
  const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  /**
   * Initialize correction request
   */
  useEffect(() => {
    if (analysisResult && analysisResult.accuracy < 95) {
      initiateCorrectionRequest();
    }
  }, [analysisResult]);

  /**
   * Listen for real-time updates on correction status
   */
  useEffect(() => {
    if (correctionRequest?.id) {
      const unsubscribe = onSnapshot(
        query(
          collection(db, 'correction-requests'),
          where('id', '==', correctionRequest.id)
        ),
        (snapshot) => {
          snapshot.forEach((doc) => {
            const data = doc.data();
            setCorrectionStatus(data.status);
            if (data.humanFeedback) setHumanFeedback(data.humanFeedback);
            if (data.scholarReview) setScholarReview(data.scholarReview);
            updateResponseTime(data.updatedAt);
          });
        }
      );

      return () => unsubscribe();
    }
  }, [correctionRequest]);

  /**
   * Initiate correction request with expert matching
   */
  const initiateCorrectionRequest = async () => {
    setLoading(true);
    requestStartTime.current = new Date();
    
    try {
      // Find available experts based on user's region and language
      const experts = await findMatchingExperts();
      setAvailableExperts(experts);
      
      // Create correction request
      const request = {
        id: `correction_${Date.now()}`,
        userId: userId,
        analysisResult: analysisResult,
        status: 'pending',
        priority: calculatePriority(analysisResult.accuracy),
        requestedAt: serverTimestamp(),
        guaranteedResponseBy: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        userProfile: await getUserProfile(userId)
      };
      
      // Save to Firebase
      await addDoc(collection(db, 'correction-requests'), request);
      setCorrectionRequest(request);
      
      // Start 30-minute timer
      startResponseTimer();
      
      // Auto-assign best matching expert
      if (experts.length > 0) {
        await assignExpert(experts[0]);
      }
      
      addNotification('Correction request submitted. Expert will respond within 30 minutes.', 'info');
      
    } catch (err) {
      setError('Failed to initiate correction request. Please try again.');
      console.error('Correction request error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Find matching experts based on region, language, and availability
   */
  const findMatchingExperts = async () => {
    try {
      const response = await fetch('/api/find-experts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userRegion: 'global', // Get from user profile
          preferredLanguage: 'english', // Get from user profile
          recitationStyle: analysisResult.detectedStyle || 'hafs',
          urgency: calculatePriority(analysisResult.accuracy)
        })
      });

      const experts = await response.json();
      return experts.filter(expert => expert.available && expert.rating >= 4.5);
    } catch (err) {
      console.error('Expert matching error:', err);
      return [];
    }
  };

  /**
   * Calculate priority based on accuracy score
   */
  const calculatePriority = (accuracy) => {
    if (accuracy < 70) return 'high';
    if (accuracy < 85) return 'medium';
    return 'low';
  };

  /**
   * Get user profile for expert matching
   */
  const getUserProfile = async (userId) => {
    // Mock user profile - replace with actual user data
    return {
      region: 'global',
      language: 'english',
      level: 'beginner',
      preferences: {
        recitationStyle: 'hafs',
        correctionStyle: 'detailed'
      }
    };
  };

  /**
   * Assign expert to correction request
   */
  const assignExpert = async (expert) => {
    try {
      setSelectedExpert(expert);
      setCorrectionStatus('assigned');
      
      // Notify expert via webhook/email
      await fetch('/api/notify-expert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expertId: expert.id,
          correctionRequestId: correctionRequest.id,
          priority: calculatePriority(analysisResult.accuracy),
          estimatedTime: expert.averageResponseTime
        })
      });
      
      addNotification(`Expert ${expert.name} has been assigned to your correction.`, 'success');
      
    } catch (err) {
      console.error('Expert assignment error:', err);
    }
  };

  /**
   * Start 30-minute response timer
   */
  const startResponseTimer = () => {
    responseTimerRef.current = setTimeout(() => {
      if (correctionStatus === 'pending' || correctionStatus === 'assigned') {
        addNotification('Response time exceeded. Escalating to senior expert.', 'warning');
        escalateToSeniorExpert();
      }
    }, 30 * 60 * 1000); // 30 minutes
  };

  /**
   * Escalate to senior expert if 30-minute guarantee is not met
   */
  const escalateToSeniorExpert = async () => {
    try {
      const seniorExperts = availableExperts.filter(expert => expert.level === 'senior');
      if (seniorExperts.length > 0) {
        await assignExpert(seniorExperts[0]);
        addNotification('Request escalated to senior expert for immediate attention.', 'info');
      }
    } catch (err) {
      console.error('Escalation error:', err);
    }
  };

  /**
   * Update response time calculation
   */
  const updateResponseTime = (updatedAt) => {
    if (requestStartTime.current && updatedAt) {
      const responseTimeMs = updatedAt.toDate() - requestStartTime.current;
      const responseTimeMinutes = Math.floor(responseTimeMs / (1000 * 60));
      setResponseTime(responseTimeMinutes);
    }
  };

  /**
   * Add notification to the list
   */
  const addNotification = (message, type) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5 notifications
  };

  /**
   * Render expert profile card
   */
  const renderExpertCard = (expert) => {
    return (
      <div key={expert.id} className="expert-card">
        <div className="expert-avatar">
          <img src={expert.avatar || '/default-avatar.png'} alt={expert.name} />
        </div>
        <div className="expert-info">
          <h4>{expert.name}</h4>
          <p className="expert-title">{expert.title}</p>
          <div className="expert-stats">
            <span className="rating">⭐ {expert.rating}</span>
            <span className="response-time">⏱️ {expert.averageResponseTime}min</span>
            <span className="specialization">{expert.specialization}</span>
          </div>
          <div className="expert-languages">
            {expert.languages.map(lang => (
              <span key={lang} className="language-tag">{lang}</span>
            ))}
          </div>
        </div>
        <div className="expert-status">
          <span className={`status-indicator ${expert.available ? 'available' : 'busy'}`}>
            {expert.available ? '🟢 Available' : '🔴 Busy'}
          </span>
        </div>
      </div>
    );
  };

  /**
   * Render correction feedback
   */
  const renderCorrectionFeedback = () => {
    if (!humanFeedback && !scholarReview) return null;

    return (
      <div className="correction-feedback">
        {humanFeedback && (
          <div className="human-feedback">
            <h3>👨‍🏫 Expert Correction</h3>
            <div className="feedback-content">
              <p><strong>Overall Assessment:</strong> {humanFeedback.assessment}</p>
              <div className="corrections-list">
                <h4>Specific Corrections:</h4>
                {humanFeedback.corrections.map((correction, index) => (
                  <div key={index} className="correction-item">
                    <span className="arabic-text">{correction.original}</span>
                    <span className="arrow">→</span>
                    <span className="corrected-text">{correction.corrected}</span>
                    <p className="correction-note">{correction.note}</p>
                  </div>
                ))}
              </div>
              <div className="practice-recommendations">
                <h4>Practice Recommendations:</h4>
                <ul>
                  {humanFeedback.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {scholarReview && (
          <div className="scholar-review">
            <h3>🎓 Scholar Review</h3>
            <div className="review-content">
              <p><strong>Scholarly Opinion:</strong> {scholarReview.opinion}</p>
              <p><strong>Tajweed Ruling:</strong> {scholarReview.ruling}</p>
              <p><strong>Additional Notes:</strong> {scholarReview.notes}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="hafiz-correction-engine">
      <div className="engine-header">
        <h2>👨‍🏫 Hafiz Correction Engine</h2>
        <p>Multi-layer validation with 30-minute response guarantee</p>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications">
          {notifications.map(notification => (
            <div key={notification.id} className={`notification ${notification.type}`}>
              <span className="notification-message">{notification.message}</span>
              <span className="notification-time">
                {notification.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Correction Status */}
      <div className="correction-status">
        <h3>📊 Correction Status</h3>
        <div className="status-timeline">
          <div className={`status-step ${correctionStatus === 'pending' ? 'active' : 'completed'}`}>
            <span className="step-icon">🤖</span>
            <span className="step-label">AI Analysis</span>
          </div>
          <div className={`status-step ${correctionStatus === 'assigned' || correctionStatus === 'in-progress' ? 'active' : correctionStatus === 'completed' ? 'completed' : ''}`}>
            <span className="step-icon">👨‍🏫</span>
            <span className="step-label">Human Expert</span>
          </div>
          <div className={`status-step ${scholarReview ? 'completed' : ''}`}>
            <span className="step-icon">🎓</span>
            <span className="step-label">Scholar Review</span>
          </div>
        </div>
        
        {responseTime !== null && (
          <div className="response-time">
            <p>⏱️ Response Time: {responseTime} minutes</p>
            <div className={`time-indicator ${responseTime <= 30 ? 'on-time' : 'delayed'}`}>
              {responseTime <= 30 ? '✅ Within Guarantee' : '⚠️ Exceeded Guarantee'}
            </div>
          </div>
        )}
      </div>

      {/* Selected Expert */}
      {selectedExpert && (
        <div className="selected-expert">
          <h3>🎯 Assigned Expert</h3>
          {renderExpertCard(selectedExpert)}
        </div>
      )}

      {/* Available Experts */}
      {availableExperts.length > 0 && !selectedExpert && (
        <div className="available-experts">
          <h3>👥 Available Experts</h3>
          <div className="experts-grid">
            {availableExperts.slice(0, 3).map(expert => renderExpertCard(expert))}
          </div>
        </div>
      )}

      {/* Correction Feedback */}
      {renderCorrectionFeedback()}

      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Finding the best expert for your correction...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}

      <style jsx>{`
        .hafiz-correction-engine {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Arial', sans-serif;
        }

        .engine-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .engine-header h2 {
          color: #2c5530;
          margin-bottom: 10px;
        }

        .notifications {
          margin-bottom: 20px;
        }

        .notification {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          margin-bottom: 5px;
          border-radius: 5px;
          font-size: 14px;
        }

        .notification.info {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
        }

        .notification.success {
          background: #e8f5e8;
          border-left: 4px solid #4caf50;
        }

        .notification.warning {
          background: #fff3e0;
          border-left: 4px solid #ff9800;
        }

        .correction-status {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .status-timeline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 20px 0;
        }

        .status-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0.5;
          transition: opacity 0.3s ease;
        }

        .status-step.active,
        .status-step.completed {
          opacity: 1;
        }

        .status-step.completed .step-icon {
          background: #4caf50;
          color: white;
        }

        .step-icon {
          font-size: 24px;
          background: #e0e0e0;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
        }

        .response-time {
          text-align: center;
          margin-top: 15px;
        }

        .time-indicator.on-time {
          color: #4caf50;
          font-weight: bold;
        }

        .time-indicator.delayed {
          color: #f44336;
          font-weight: bold;
        }

        .expert-card {
          background: white;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 15px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .expert-avatar img {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
        }

        .expert-info {
          flex: 1;
        }

        .expert-info h4 {
          margin: 0 0 5px 0;
          color: #2c5530;
        }

        .expert-title {
          color: #666;
          font-size: 14px;
          margin: 0 0 10px 0;
        }

        .expert-stats {
          display: flex;
          gap: 15px;
          margin-bottom: 10px;
        }

        .expert-stats span {
          font-size: 12px;
          background: #f0f0f0;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .expert-languages {
          display: flex;
          gap: 5px;
        }

        .language-tag {
          background: #2c5530;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 8px;
        }

        .status-indicator.available {
          color: #4caf50;
        }

        .status-indicator.busy {
          color: #f44336;
        }

        .correction-feedback {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
          margin-top: 20px;
        }

        .correction-item {
          background: white;
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .arabic-text {
          font-size: 18px;
          font-weight: bold;
        }

        .corrected-text {
          font-size: 18px;
          font-weight: bold;
          color: #4caf50;
        }

        .arrow {
          color: #666;
          font-size: 16px;
        }

        .correction-note {
          font-size: 12px;
          color: #666;
          margin: 5px 0 0 0;
        }

        .loading-indicator {
          text-align: center;
          padding: 20px;
        }

        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #2c5530;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 10px;
          border-radius: 5px;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default HafizCorrectionEngine;