import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';

/**
 * JannahPointsCalculator Component
 * 
 * Handles the Jannah Points System with spiritual progression tracking
 * 1% improvement = 10 points, gamified learning experience
 * 
 * @component
 * @author Muhammad Adnan Ul Mustafa
 */
const JannahPointsCalculator = ({ userId, currentAccuracy, previousAccuracy }) => {
  // State management
  const [totalPoints, setTotalPoints] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [pointsToNextLevel, setPointsToNextLevel] = useState(1000);
  const [recentEarnings, setRecentEarnings] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [levelUpAnimation, setLevelUpAnimation] = useState(false);
  
  // Animation refs
  const pointsCounterRef = useRef(null);
  const celebrationRef = useRef(null);

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

  // Level thresholds and names
  const LEVEL_THRESHOLDS = [
    { level: 1, points: 0, name: "Seeker of Knowledge", color: "#8bc34a" },
    { level: 2, points: 1000, name: "First Steps in Jannah", color: "#4caf50" },
    { level: 3, points: 5000, name: "Devoted Reciter", color: "#2196f3" },
    { level: 4, points: 10000, name: "Quran Guardian", color: "#9c27b0" },
    { level: 5, points: 25000, name: "Hafiz Aspirant", color: "#ff9800" },
    { level: 6, points: 50000, name: "Master Reciter", color: "#f44336" },
    { level: 7, points: 100000, name: "Quran Champion", color: "#ffd700" }
  ];

  // Milestone definitions
  const MILESTONES = [
    { id: 'first_recitation', name: 'First Recitation', points: 100, icon: '🎤' },
    { id: 'accuracy_80', name: '80% Accuracy Achieved', points: 500, icon: '🎯' },
    { id: 'accuracy_90', name: '90% Accuracy Achieved', points: 1000, icon: '⭐' },
    { id: 'accuracy_95', name: '95% Accuracy Achieved', points: 2000, icon: '🌟' },
    { id: 'perfect_recitation', name: 'Perfect Recitation', points: 5000, icon: '👑' },
    { id: 'daily_streak_7', name: '7-Day Streak', points: 300, icon: '🔥' },
    { id: 'daily_streak_30', name: '30-Day Streak', points: 1500, icon: '💎' },
    { id: 'expert_validated', name: 'Expert Validated', points: 500, icon: '✅' },
    { id: 'scholar_approved', name: 'Scholar Approved', points: 1000, icon: '🎓' },
    { id: 'community_helper', name: 'Community Helper', points: 750, icon: '🤝' }
  ];

  /**
   * Listen to user's Jannah Points in real-time
   */
  useEffect(() => {
    if (!userId) return;

    const userDocRef = doc(db, 'jannah-points', userId);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setTotalPoints(data.totalPoints || 0);
        setCurrentLevel(data.currentLevel || 1);
        setRecentEarnings(data.recentEarnings || []);
        setMilestones(data.milestones || []);
        setAchievements(data.achievements || []);
        
        // Calculate points to next level
        const nextLevelThreshold = getNextLevelThreshold(data.currentLevel || 1);
        setPointsToNextLevel(nextLevelThreshold - (data.totalPoints || 0));
      }
    });

    return () => unsubscribe();
  }, [userId]);

  /**
   * Calculate points when accuracy changes
   */
  useEffect(() => {
    if (currentAccuracy !== null && previousAccuracy !== null && currentAccuracy !== previousAccuracy) {
      calculateAndAwardPoints();
    }
  }, [currentAccuracy, previousAccuracy]);

  /**
   * Calculate and award Jannah Points based on improvement
   */
  const calculateAndAwardPoints = async () => {
    if (!userId || currentAccuracy === null || previousAccuracy === null) return;

    setLoading(true);
    
    try {
      // Calculate improvement
      const improvement = currentAccuracy - previousAccuracy;
      
      // Base points calculation: 1% improvement = 10 points
      let basePoints = Math.max(0, Math.floor(improvement * 10));
      
      // Bonus multipliers
      let bonusMultiplier = 1;
      
      // High accuracy bonus
      if (currentAccuracy >= 95) {
        bonusMultiplier += 0.5; // 50% bonus for 95%+ accuracy
      } else if (currentAccuracy >= 90) {
        bonusMultiplier += 0.25; // 25% bonus for 90%+ accuracy
      } else if (currentAccuracy >= 80) {
        bonusMultiplier += 0.1; // 10% bonus for 80%+ accuracy
      }
      
      // Consistency bonus (if user has been improving consistently)
      const consistencyBonus = await checkConsistencyBonus();
      if (consistencyBonus) {
        bonusMultiplier += 0.2; // 20% bonus for consistency
      }
      
      // Calculate final points
      const finalPoints = Math.floor(basePoints * bonusMultiplier);
      
      if (finalPoints > 0) {
        await awardPoints(finalPoints, {
          type: 'recitation_improvement',
          improvement: improvement,
          accuracy: currentAccuracy,
          basePoints: basePoints,
          bonusMultiplier: bonusMultiplier
        });
        
        // Trigger celebration animation
        triggerCelebration(finalPoints);
      }
      
      // Check for milestone achievements
      await checkMilestoneAchievements();
      
    } catch (error) {
      console.error('Error calculating Jannah Points:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Award points to user
   */
  const awardPoints = async (points, metadata) => {
    try {
      const userDocRef = doc(db, 'jannah-points', userId);
      
      // Create earning record
      const earning = {
        points: points,
        timestamp: new Date(),
        metadata: metadata
      };
      
      // Update user's total points
      await updateDoc(userDocRef, {
        totalPoints: increment(points),
        [`recentEarnings`]: [...recentEarnings.slice(-9), earning], // Keep last 10 earnings
        lastUpdated: new Date()
      });
      
      // Check for level up
      const newTotal = totalPoints + points;
      const newLevel = calculateLevel(newTotal);
      
      if (newLevel > currentLevel) {
        await levelUp(newLevel);
      }
      
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  /**
   * Handle level up
   */
  const levelUp = async (newLevel) => {
    try {
      const userDocRef = doc(db, 'jannah-points', userId);
      await updateDoc(userDocRef, {
        currentLevel: newLevel,
        levelUpTimestamp: new Date()
      });
      
      // Trigger level up animation
      setLevelUpAnimation(true);
      setTimeout(() => setLevelUpAnimation(false), 3000);
      
      // Award level up bonus
      const levelUpBonus = newLevel * 100;
      await awardPoints(levelUpBonus, {
        type: 'level_up',
        newLevel: newLevel,
        bonus: levelUpBonus
      });
      
    } catch (error) {
      console.error('Error handling level up:', error);
    }
  };

  /**
   * Check for consistency bonus
   */
  const checkConsistencyBonus = async () => {
    // Check if user has been improving consistently over last 5 recitations
    const recentImprovements = recentEarnings
      .filter(earning => earning.metadata?.type === 'recitation_improvement')
      .slice(-5);
    
    return recentImprovements.length >= 3 && 
           recentImprovements.every(earning => earning.metadata.improvement > 0);
  };

  /**
   * Check and award milestone achievements
   */
  const checkMilestoneAchievements = async () => {
    const newAchievements = [];
    
    // Check accuracy milestones
    if (currentAccuracy >= 80 && !milestones.includes('accuracy_80')) {
      newAchievements.push('accuracy_80');
    }
    if (currentAccuracy >= 90 && !milestones.includes('accuracy_90')) {
      newAchievements.push('accuracy_90');
    }
    if (currentAccuracy >= 95 && !milestones.includes('accuracy_95')) {
      newAchievements.push('accuracy_95');
    }
    if (currentAccuracy >= 99.5 && !milestones.includes('perfect_recitation')) {
      newAchievements.push('perfect_recitation');
    }
    
    // Award milestone points
    for (const achievementId of newAchievements) {
      const milestone = MILESTONES.find(m => m.id === achievementId);
      if (milestone) {
        await awardPoints(milestone.points, {
          type: 'milestone_achievement',
          milestone: milestone.name,
          achievementId: achievementId
        });
        
        // Update milestones
        const userDocRef = doc(db, 'jannah-points', userId);
        await updateDoc(userDocRef, {
          milestones: [...milestones, achievementId],
          [`achievements.${achievementId}`]: {
            name: milestone.name,
            points: milestone.points,
            achievedAt: new Date(),
            icon: milestone.icon
          }
        });
      }
    }
  };

  /**
   * Calculate user level based on total points
   */
  const calculateLevel = (points) => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (points >= LEVEL_THRESHOLDS[i].points) {
        return LEVEL_THRESHOLDS[i].level;
      }
    }
    return 1;
  };

  /**
   * Get next level threshold
   */
  const getNextLevelThreshold = (level) => {
    const nextLevel = LEVEL_THRESHOLDS.find(l => l.level > level);
    return nextLevel ? nextLevel.points : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].points;
  };

  /**
   * Get current level info
   */
  const getCurrentLevelInfo = () => {
    return LEVEL_THRESHOLDS.find(l => l.level === currentLevel) || LEVEL_THRESHOLDS[0];
  };

  /**
   * Trigger celebration animation
   */
  const triggerCelebration = (points) => {
    setCelebrationActive(true);
    
    // Animate points counter
    if (pointsCounterRef.current) {
      pointsCounterRef.current.style.animation = 'pointsEarned 2s ease-out';
    }
    
    setTimeout(() => {
      setCelebrationActive(false);
      if (pointsCounterRef.current) {
        pointsCounterRef.current.style.animation = '';
      }
    }, 2000);
  };

  /**
   * Format number with commas
   */
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  /**
   * Calculate progress percentage to next level
   */
  const getProgressPercentage = () => {
    const currentLevelInfo = getCurrentLevelInfo();
    const nextLevelThreshold = getNextLevelThreshold(currentLevel);
    const pointsInCurrentLevel = totalPoints - currentLevelInfo.points;
    const pointsNeededForLevel = nextLevelThreshold - currentLevelInfo.points;
    
    return Math.min(100, (pointsInCurrentLevel / pointsNeededForLevel) * 100);
  };

  const currentLevelInfo = getCurrentLevelInfo();
  const progressPercentage = getProgressPercentage();

  return (
    <div className="jannah-points-calculator">
      <div className="calculator-header">
        <h2>🏆 Jannah Points System</h2>
        <p>"Every letter counts for Jannah" - Earn spiritual rewards for your progress</p>
      </div>

      {/* Main Points Display */}
      <div className="points-display">
        <div className="total-points" ref={pointsCounterRef}>
          <span className="points-number">{formatNumber(totalPoints)}</span>
          <span className="points-label">Total Jannah Points</span>
        </div>
        
        <div className="level-info">
          <div className="current-level" style={{ backgroundColor: currentLevelInfo.color }}>
            <span className="level-number">Level {currentLevel}</span>
            <span className="level-name">{currentLevelInfo.name}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-header">
          <span>Progress to Next Level</span>
          <span>{formatNumber(pointsToNextLevel)} points needed</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: `${progressPercentage}%`,
              backgroundColor: currentLevelInfo.color 
            }}
          ></div>
        </div>
        <div className="progress-percentage">{Math.round(progressPercentage)}%</div>
      </div>

      {/* Recent Earnings */}
      {recentEarnings.length > 0 && (
        <div className="recent-earnings">
          <h3>📈 Recent Earnings</h3>
          <div className="earnings-list">
            {recentEarnings.slice(-5).reverse().map((earning, index) => (
              <div key={index} className="earning-item">
                <div className="earning-info">
                  <span className="earning-type">
                    {earning.metadata?.type === 'recitation_improvement' ? '🎯 Recitation' :
                     earning.metadata?.type === 'milestone_achievement' ? '🏅 Milestone' :
                     earning.metadata?.type === 'level_up' ? '⬆️ Level Up' : '✨ Bonus'}
                  </span>
                  <span className="earning-details">
                    {earning.metadata?.improvement && 
                     `+${earning.metadata.improvement.toFixed(1)}% accuracy`}
                  </span>
                </div>
                <div className="earning-points">+{earning.points}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {Object.keys(achievements).length > 0 && (
        <div className="achievements-section">
          <h3>🏅 Achievements</h3>
          <div className="achievements-grid">
            {Object.entries(achievements).map(([id, achievement]) => (
              <div key={id} className="achievement-card">
                <div className="achievement-icon">{achievement.icon}</div>
                <div className="achievement-name">{achievement.name}</div>
                <div className="achievement-points">+{achievement.points} points</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Level Up Animation */}
      {levelUpAnimation && (
        <div className="level-up-overlay">
          <div className="level-up-content">
            <div className="level-up-icon">🎉</div>
            <h2>Level Up!</h2>
            <p>You've reached Level {currentLevel}</p>
            <p className="level-name">{currentLevelInfo.name}</p>
          </div>
        </div>
      )}

      {/* Celebration Animation */}
      {celebrationActive && (
        <div className="celebration-overlay">
          <div className="confetti">🎊</div>
          <div className="celebration-text">Points Earned!</div>
        </div>
      )}

      <style jsx>{`
        .jannah-points-calculator {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Arial', sans-serif;
          position: relative;
        }

        .calculator-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .calculator-header h2 {
          color: #2c5530;
          margin-bottom: 10px;
        }

        .points-display {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #2c5530, #4a7c59);
          color: white;
          padding: 30px;
          border-radius: 15px;
          margin-bottom: 20px;
        }

        .total-points {
          text-align: center;
        }

        .points-number {
          display: block;
          font-size: 48px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .points-label {
          font-size: 16px;
          opacity: 0.9;
        }

        .level-info {
          text-align: center;
        }

        .current-level {
          background: rgba(255, 255, 255, 0.2);
          padding: 15px 20px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }

        .level-number {
          display: block;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .level-name {
          font-size: 14px;
          opacity: 0.9;
        }

        .progress-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 14px;
          color: #666;
        }

        .progress-bar {
          height: 20px;
          background: #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 5px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4caf50, #8bc34a);
          transition: width 0.5s ease;
        }

        .progress-percentage {
          text-align: center;
          font-weight: bold;
          color: #2c5530;
        }

        .recent-earnings {
          background: white;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .recent-earnings h3 {
          color: #2c5530;
          margin-bottom: 15px;
        }

        .earning-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .earning-item:last-child {
          border-bottom: none;
        }

        .earning-info {
          display: flex;
          flex-direction: column;
        }

        .earning-type {
          font-weight: bold;
          margin-bottom: 2px;
        }

        .earning-details {
          font-size: 12px;
          color: #666;
        }

        .earning-points {
          font-weight: bold;
          color: #4caf50;
          font-size: 18px;
        }

        .achievements-section {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .achievements-section h3 {
          color: #2c5530;
          margin-bottom: 15px;
        }

        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .achievement-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          border: 2px solid #e0e0e0;
        }

        .achievement-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .achievement-name {
          font-weight: bold;
          margin-bottom: 5px;
          font-size: 14px;
        }

        .achievement-points {
          color: #4caf50;
          font-size: 12px;
        }

        .level-up-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: levelUpFade 3s ease-out;
        }

        .level-up-content {
          background: white;
          padding: 40px;
          border-radius: 20px;
          text-align: center;
          animation: levelUpBounce 0.6s ease-out;
        }

        .level-up-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .level-up-content h2 {
          color: #2c5530;
          margin-bottom: 10px;
        }

        .celebration-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 100;
        }

        .confetti {
          font-size: 48px;
          animation: confettiFall 2s ease-out;
        }

        .celebration-text {
          color: #4caf50;
          font-weight: bold;
          font-size: 24px;
          animation: celebrationPulse 2s ease-out;
        }

        @keyframes pointsEarned {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        @keyframes levelUpFade {
          0% { opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes levelUpBounce {
          0% { transform: scale(0.3); }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }

        @keyframes confettiFall {
          0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100px) rotate(360deg); opacity: 0; }
        }

        @keyframes celebrationPulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default JannahPointsCalculator;