/**
 * Firebase Configuration for QuranLab
 * 
 * Handles Firebase Studio integration, authentication, database,
 * and real-time features for Quranic recitation analysis
 * 
 * @author Muhammad Adnan Ul Mustafa
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration object
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'quranlab-divine-learning',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID
};

// Development configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const useEmulators = process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Initialize Analytics (only in production)
let analytics = null;
if (typeof window !== 'undefined' && !isDevelopment) {
  analytics = getAnalytics(app);
}

// Connect to emulators in development
if (isDevelopment && useEmulators) {
  try {
    // Auth emulator
    if (!auth._delegate._config.emulator) {
      connectAuthEmulator(auth, 'http://localhost:9099');
    }
    
    // Firestore emulator
    if (!db._delegate._databaseId.projectId.includes('localhost')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    
    // Storage emulator
    if (!storage._delegate._host.includes('localhost')) {
      connectStorageEmulator(storage, 'localhost', 9199);
    }
    
    // Functions emulator
    if (!functions._delegate._url.includes('localhost')) {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
    
    console.log('🔧 Firebase emulators connected for development');
  } catch (error) {
    console.warn('⚠️ Firebase emulator connection failed:', error.message);
  }
}

// Firestore collections configuration
export const COLLECTIONS = {
  USERS: 'users',
  RECITATION_ANALYSIS: 'recitation-analysis',
  CORRECTION_REQUESTS: 'correction-requests',
  EXPERT_PROFILES: 'expert-profiles',
  SCHOLAR_PROFILES: 'scholar-profiles',
  JANNAH_POINTS: 'jannah-points',
  CERTIFICATES: 'certificates',
  PROGRESS_TRACKING: 'progress-tracking',
  AUDIO_RECORDINGS: 'audio-recordings',
  AI_ANALYSIS_RESULTS: 'ai-analysis-results',
  NOTIFICATIONS: 'notifications',
  SYSTEM_LOGS: 'system-logs'
};

// Firebase Security Rules Configuration
export const SECURITY_RULES = {
  // Firestore rules
  firestore: `
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Users can read/write their own data
        match /users/{userId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
        
        // Recitation analysis - users can read/write their own
        match /recitation-analysis/{analysisId} {
          allow read, write: if request.auth != null && 
            (request.auth.uid == resource.data.userId || 
             request.auth.token.expert == true ||
             request.auth.token.scholar == true);
        }
        
        // Correction requests - users and experts can access
        match /correction-requests/{requestId} {
          allow read: if request.auth != null;
          allow write: if request.auth != null && 
            (request.auth.uid == resource.data.userId ||
             request.auth.token.expert == true ||
             request.auth.token.scholar == true);
        }
        
        // Expert profiles - public read, experts can write their own
        match /expert-profiles/{expertId} {
          allow read: if true;
          allow write: if request.auth != null && 
            (request.auth.uid == expertId || request.auth.token.admin == true);
        }
        
        // Scholar profiles - public read, scholars can write their own
        match /scholar-profiles/{scholarId} {
          allow read: if true;
          allow write: if request.auth != null && 
            (request.auth.uid == scholarId || request.auth.token.admin == true);
        }
        
        // Jannah points - users can read their own
        match /jannah-points/{userId} {
          allow read: if request.auth != null && request.auth.uid == userId;
          allow write: if request.auth != null && request.auth.token.system == true;
        }
        
        // Certificates - users can read their own
        match /certificates/{certificateId} {
          allow read: if request.auth != null && 
            request.auth.uid == resource.data.userId;
          allow write: if request.auth != null && request.auth.token.admin == true;
        }
        
        // System logs - admin only
        match /system-logs/{logId} {
          allow read, write: if request.auth != null && request.auth.token.admin == true;
        }
      }
    }
  `,
  
  // Storage rules
  storage: `
    rules_version = '2';
    service firebase.storage {
      match /b/{bucket}/o {
        // Audio recordings - users can upload their own
        match /audio-recordings/{userId}/{fileName} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
        
        // Analysis results - system can write, users can read their own
        match /analysis-results/{userId}/{fileName} {
          allow read: if request.auth != null && request.auth.uid == userId;
          allow write: if request.auth != null && request.auth.token.system == true;
        }
        
        // Certificates - users can read their own
        match /certificates/{userId}/{fileName} {
          allow read: if request.auth != null && request.auth.uid == userId;
          allow write: if request.auth != null && request.auth.token.admin == true;
        }
      }
    }
  `
};

// Zapier Integration Configuration
export const ZAPIER_CONFIG = {
  webhookUrls: {
    recitationAnalysis: process.env.REACT_APP_ZAPIER_RECITATION_WEBHOOK || process.env.ZAPIER_RECITATION_WEBHOOK,
    expertNotification: process.env.REACT_APP_ZAPIER_EXPERT_WEBHOOK || process.env.ZAPIER_EXPERT_WEBHOOK,
    certificateIssued: process.env.REACT_APP_ZAPIER_CERTIFICATE_WEBHOOK || process.env.ZAPIER_CERTIFICATE_WEBHOOK,
    progressMilestone: process.env.REACT_APP_ZAPIER_MILESTONE_WEBHOOK || process.env.ZAPIER_MILESTONE_WEBHOOK,
    systemAlert: process.env.REACT_APP_ZAPIER_ALERT_WEBHOOK || process.env.ZAPIER_ALERT_WEBHOOK
  },
  
  // Zapier trigger configurations
  triggers: {
    recitationCompleted: {
      event: 'recitation.completed',
      fields: ['userId', 'accuracy', 'jannahPoints', 'surahName', 'timestamp']
    },
    expertAssigned: {
      event: 'expert.assigned',
      fields: ['requestId', 'expertId', 'userId', 'priority', 'estimatedTime']
    },
    certificateEarned: {
      event: 'certificate.earned',
      fields: ['userId', 'certificateId', 'achievement', 'totalPoints']
    },
    milestoneReached: {
      event: 'milestone.reached',
      fields: ['userId', 'milestone', 'totalPoints', 'level']
    }
  }
};

// Blockchain Integration Configuration
export const BLOCKCHAIN_CONFIG = {
  network: process.env.REACT_APP_BLOCKCHAIN_NETWORK || 'polygon', // polygon, ethereum, bsc
  contractAddress: process.env.REACT_APP_CONTRACT_ADDRESS || '0x...', // QuranLabAttestation contract
  rpcUrl: process.env.REACT_APP_RPC_URL || 'https://polygon-rpc.com',
  chainId: process.env.REACT_APP_CHAIN_ID || 137, // Polygon mainnet
  
  // Gas configuration
  gasSettings: {
    gasLimit: 500000,
    maxFeePerGas: '30000000000', // 30 gwei
    maxPriorityFeePerGas: '2000000000' // 2 gwei
  },
  
  // IPFS configuration for metadata storage
  ipfs: {
    gateway: process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
    apiUrl: process.env.REACT_APP_IPFS_API || 'https://api.pinata.cloud/pinning/pinFileToIPFS',
    apiKey: process.env.REACT_APP_PINATA_API_KEY,
    secretKey: process.env.REACT_APP_PINATA_SECRET_KEY
  }
};

// AI Analysis Configuration
export const AI_CONFIG = {
  analysisEndpoint: process.env.REACT_APP_AI_ANALYSIS_ENDPOINT || '/api/analyze-recitation',
  modelVersion: process.env.REACT_APP_AI_MODEL_VERSION || 'v2.1',
  accuracyThreshold: 99.9,
  
  // Supported analysis types
  analysisTypes: {
    tajweedPrecision: 'tajweed-precision',
    harakatDetection: 'harakat-detection',
    pronunciationAnalysis: 'pronunciation-analysis',
    rhythmAnalysis: 'rhythm-analysis'
  },
  
  // Language support
  supportedLanguages: ['arabic', 'english', 'urdu', 'turkish', 'malay', 'french'],
  
  // Audio processing settings
  audioSettings: {
    sampleRate: 44100,
    bitDepth: 16,
    channels: 1,
    format: 'wav',
    maxDuration: 300, // 5 minutes
    minDuration: 5 // 5 seconds
  }
};

// Expert System Configuration
export const EXPERT_CONFIG = {
  responseTimeGuarantee: 30, // minutes
  maxConcurrentRequests: 5,
  expertLevels: ['junior', 'senior', 'master', 'scholar'],
  
  // Matching criteria
  matchingCriteria: {
    region: ['global', 'middle-east', 'south-asia', 'southeast-asia', 'africa', 'europe', 'americas'],
    languages: ['arabic', 'english', 'urdu', 'turkish', 'malay', 'french', 'indonesian'],
    specializations: ['tajweed', 'qiraat', 'memorization', 'pronunciation', 'rhythm'],
    recitationStyles: ['hafs', 'warsh', 'qalun', 'duri']
  },
  
  // Quality assurance
  qualityMetrics: {
    minRating: 4.5,
    minExperience: 2, // years
    maxResponseTime: 30, // minutes
    completionRate: 95 // percentage
  }
};

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  channels: {
    email: {
      enabled: true,
      provider: 'gmail',
      templates: {
        recitationCompleted: 'recitation-completed-template',
        expertAssigned: 'expert-assigned-template',
        correctionReceived: 'correction-received-template',
        certificateEarned: 'certificate-earned-template',
        milestoneReached: 'milestone-reached-template'
      }
    },
    
    telegram: {
      enabled: true,
      botToken: process.env.REACT_APP_TELEGRAM_BOT_TOKEN,
      chatId: process.env.REACT_APP_TELEGRAM_CHAT_ID
    },
    
    push: {
      enabled: true,
      vapidKey: process.env.REACT_APP_VAPID_KEY
    }
  },
  
  // Notification preferences
  defaultPreferences: {
    recitationCompleted: { email: true, push: true, telegram: false },
    expertAssigned: { email: true, push: true, telegram: true },
    correctionReceived: { email: true, push: true, telegram: false },
    certificateEarned: { email: true, push: true, telegram: true },
    milestoneReached: { email: true, push: true, telegram: true }
  }
};

// Performance Monitoring Configuration
export const MONITORING_CONFIG = {
  enableAnalytics: !isDevelopment,
  enablePerformanceMonitoring: true,
  enableCrashReporting: true,
  
  // Custom metrics
  customMetrics: {
    recitationAccuracy: 'recitation_accuracy',
    responseTime: 'expert_response_time',
    userEngagement: 'user_engagement_score',
    systemUptime: 'system_uptime'
  },
  
  // Alert thresholds
  alertThresholds: {
    responseTime: 35, // minutes
    systemError: 5, // errors per minute
    userDropoff: 20, // percentage
    accuracyDrop: 5 // percentage points
  }
};

// Export Firebase services and configuration
export {
  app,
  auth,
  db,
  storage,
  functions,
  analytics,
  firebaseConfig,
  isDevelopment
};

// Utility functions
export const initializeFirebaseServices = () => {
  console.log('🔥 Firebase services initialized for QuranLab');
  console.log('📊 Project ID:', firebaseConfig.projectId);
  console.log('🌍 Environment:', isDevelopment ? 'Development' : 'Production');
  
  if (isDevelopment && useEmulators) {
    console.log('🔧 Using Firebase emulators');
  }
  
  return {
    app,
    auth,
    db,
    storage,
    functions,
    analytics
  };
};

// Error handling utility
export const handleFirebaseError = (error) => {
  console.error('Firebase Error:', error);
  
  // Map Firebase errors to user-friendly messages
  const errorMessages = {
    'auth/user-not-found': 'User account not found. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'Email address is already registered.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'permission-denied': 'You do not have permission to perform this action.',
    'unavailable': 'Service is temporarily unavailable. Please try again later.',
    'deadline-exceeded': 'Request timed out. Please check your connection.'
  };
  
  return errorMessages[error.code] || 'An unexpected error occurred. Please try again.';
};

// Default export
export default {
  app,
  auth,
  db,
  storage,
  functions,
  analytics,
  config: firebaseConfig,
  collections: COLLECTIONS,
  zapier: ZAPIER_CONFIG,
  blockchain: BLOCKCHAIN_CONFIG,
  ai: AI_CONFIG,
  expert: EXPERT_CONFIG,
  notifications: NOTIFICATION_CONFIG,
  monitoring: MONITORING_CONFIG
};