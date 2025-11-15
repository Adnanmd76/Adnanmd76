# QuranLab Installation Guide 🕌

> *"Every letter counts for Jannah"* - Complete setup guide for the QuranLab Divine Learning Module

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Firebase Configuration](#firebase-configuration)
4. [Zapier Integration](#zapier-integration)
5. [Blockchain Setup](#blockchain-setup)
6. [Environment Variables](#environment-variables)
7. [Development Setup](#development-setup)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Support](#support)

## 🔧 Prerequisites

Before installing QuranLab, ensure you have the following installed:

### Required Software
- **Node.js** (v16.0.0 or higher)
- **npm** (v8.0.0 or higher) or **yarn** (v1.22.0 or higher)
- **Git** (latest version)
- **Firebase CLI** (v11.0.0 or higher)

### Required Accounts
- **Firebase Account** (Google account)
- **Zapier Account** (Pro plan recommended)
- **Blockchain Wallet** (MetaMask or similar)
- **IPFS Storage** (Pinata account recommended)
- **Gmail Account** (for notifications)
- **Telegram Bot** (optional, for mobile notifications)

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **OS**: Windows 10+, macOS 10.15+, or Linux Ubuntu 18.04+

## 🚀 Project Setup

### 1. Clone the Repository

```bash
# Clone the QuranLab repository
git clone https://github.com/Adnanmd76/Adnanmd76.git

# Navigate to the QuranLab directory
cd Adnanmd76/QuranLab

# Install dependencies
npm install
# or
yarn install
```

### 2. Project Structure Overview

```
QuranLab/
├── README.md                    # Project overview
├── package.json                 # Dependencies and scripts
├── src/                         # Source code
│   ├── components/              # React components
│   │   ├── RecitationAnalyzer.js
│   │   ├── HafizCorrectionEngine.js
│   │   └── JannahPointsCalculator.js
│   ├── pages/                   # Page components
│   ├── utils/                   # Utility functions
│   └── data/                    # Data files
├── config/                      # Configuration files
│   └── firebase-config.js       # Firebase configuration
├── contracts/                   # Smart contracts
│   └── QuranLabAttestation.sol  # Blockchain attestation
├── docs/                        # Documentation
│   ├── installation-guide.md   # This file
│   ├── api-documentation.md     # API documentation
│   └── troubleshooting.md       # Troubleshooting guide
└── templates/                   # Email and database templates
```

## 🔥 Firebase Configuration

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `quranlab-divine-learning`
4. Enable Google Analytics (recommended)
5. Choose your Analytics account

### 2. Enable Firebase Services

#### Authentication
```bash
# Enable Authentication
1. Go to Authentication > Sign-in method
2. Enable Email/Password
3. Enable Google Sign-in
4. Add authorized domains if needed
```

#### Firestore Database
```bash
# Create Firestore Database
1. Go to Firestore Database
2. Click "Create database"
3. Choose "Start in test mode" (we'll update rules later)
4. Select your preferred location
```

#### Storage
```bash
# Enable Cloud Storage
1. Go to Storage
2. Click "Get started"
3. Choose "Start in test mode"
4. Select your preferred location
```

#### Functions
```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select the following services:
# - Firestore
# - Functions
# - Hosting
# - Storage
```

### 3. Configure Security Rules

#### Firestore Rules
Replace the default rules in `firestore.rules`:

```javascript
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
    
    // Add other rules as defined in firebase-config.js
  }
}
```

#### Storage Rules
Replace the default rules in `storage.rules`:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Audio recordings - users can upload their own
    match /audio-recordings/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Add other rules as defined in firebase-config.js
  }
}
```

### 4. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" > Web app
4. Register your app with nickname "QuranLab"
5. Copy the configuration object

## ⚡ Zapier Integration

### 1. Create Zapier Account

1. Sign up at [Zapier.com](https://zapier.com)
2. Upgrade to Pro plan (recommended for advanced features)

### 2. Create Webhooks

Create the following webhooks in Zapier:

#### Recitation Analysis Webhook
```bash
1. Create new Zap
2. Trigger: Webhooks by Zapier > Catch Hook
3. Copy the webhook URL
4. Test with sample data:
   {
     "userId": "user123",
     "accuracy": 95.5,
     "jannahPoints": 955,
     "surahName": "Al-Fatiha",
     "timestamp": "2023-11-14T20:00:00Z"
   }
```

#### Expert Notification Webhook
```bash
1. Create new Zap
2. Trigger: Webhooks by Zapier > Catch Hook
3. Action: Gmail > Send Email
4. Configure email template for expert notifications
```

#### Certificate Issued Webhook
```bash
1. Create new Zap
2. Trigger: Webhooks by Zapier > Catch Hook
3. Action: Multiple actions (Gmail + Telegram)
4. Configure certificate celebration notifications
```

### 3. Configure Zapier Tables

1. Create a new table: "QuranLab Progress"
2. Add columns:
   - User ID (Text)
   - Total Points (Number)
   - Current Level (Number)
   - Last Activity (Date)
   - Accuracy Average (Number)

## ⛓️ Blockchain Setup

### 1. Choose Blockchain Network

Recommended: **Polygon** (low gas fees, fast transactions)

Alternatives:
- Ethereum (higher fees, more established)
- Binance Smart Chain (BSC)
- Avalanche

### 2. Deploy Smart Contract

#### Install Dependencies
```bash
npm install --save-dev hardhat @openzeppelin/contracts
```

#### Configure Hardhat
Create `hardhat.config.js`:

```javascript
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.19",
  networks: {
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

#### Deploy Contract
```bash
# Compile contract
npx hardhat compile

# Deploy to Polygon
npx hardhat run scripts/deploy.js --network polygon

# Verify contract (optional)
npx hardhat verify --network polygon DEPLOYED_CONTRACT_ADDRESS
```

### 3. IPFS Setup (Pinata)

1. Create account at [Pinata.cloud](https://pinata.cloud)
2. Get API Key and Secret Key
3. Test upload:

```bash
curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "pinata_api_key: YOUR_API_KEY" \
  -H "pinata_secret_api_key: YOUR_SECRET_KEY" \
  -F "file=@test-file.json"
```

## 🔐 Environment Variables

Create `.env` file in the project root:

```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=quranlab-divine-learning
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Zapier Webhooks
REACT_APP_ZAPIER_RECITATION_WEBHOOK=https://hooks.zapier.com/hooks/catch/...
REACT_APP_ZAPIER_EXPERT_WEBHOOK=https://hooks.zapier.com/hooks/catch/...
REACT_APP_ZAPIER_CERTIFICATE_WEBHOOK=https://hooks.zapier.com/hooks/catch/...
REACT_APP_ZAPIER_MILESTONE_WEBHOOK=https://hooks.zapier.com/hooks/catch/...

# Blockchain Configuration
REACT_APP_BLOCKCHAIN_NETWORK=polygon
REACT_APP_CONTRACT_ADDRESS=0x...
REACT_APP_RPC_URL=https://polygon-rpc.com
REACT_APP_CHAIN_ID=137
PRIVATE_KEY=your_wallet_private_key

# IPFS Configuration
REACT_APP_IPFS_GATEWAY=https://ipfs.io/ipfs/
REACT_APP_PINATA_API_KEY=your_pinata_api_key
REACT_APP_PINATA_SECRET_KEY=your_pinata_secret_key

# AI Analysis
REACT_APP_AI_ANALYSIS_ENDPOINT=/api/analyze-recitation
REACT_APP_AI_MODEL_VERSION=v2.1

# Notifications
REACT_APP_TELEGRAM_BOT_TOKEN=your_telegram_bot_token
REACT_APP_TELEGRAM_CHAT_ID=your_chat_id

# Development
REACT_APP_USE_FIREBASE_EMULATORS=true
NODE_ENV=development
```

### Environment Variables for Production

For production, set `NODE_ENV=production` and disable emulators:

```bash
NODE_ENV=production
REACT_APP_USE_FIREBASE_EMULATORS=false
```

## 💻 Development Setup

### 1. Start Firebase Emulators

```bash
# Install Firebase emulators
firebase setup:emulators:firestore
firebase setup:emulators:auth
firebase setup:emulators:storage
firebase setup:emulators:functions

# Start emulators
firebase emulators:start
```

### 2. Start Development Server

```bash
# Start React development server
npm start
# or
yarn start

# The app will open at http://localhost:3000
```

### 3. Development Workflow

```bash
# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## 🚀 Production Deployment

### 1. Firebase Hosting

```bash
# Build the project
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy functions
firebase deploy --only functions

# Deploy all
firebase deploy
```

### 2. Custom Domain (Optional)

```bash
# Add custom domain in Firebase Console
1. Go to Hosting
2. Click "Add custom domain"
3. Enter your domain (e.g., quranlab.com)
4. Follow DNS configuration instructions
```

### 3. SSL Certificate

Firebase automatically provides SSL certificates for custom domains.

### 4. Performance Optimization

```bash
# Enable compression
# Add to firebase.json:
{
  "hosting": {
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

## 🔧 Troubleshooting

### Common Issues

#### Firebase Connection Issues
```bash
# Check Firebase configuration
firebase projects:list

# Verify project selection
firebase use --add

# Test Firestore connection
firebase firestore:indexes
```

#### Build Errors
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear React build cache
rm -rf build
npm run build
```

#### Blockchain Connection Issues
```bash
# Test RPC connection
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://polygon-rpc.com

# Verify contract deployment
npx hardhat verify --network polygon CONTRACT_ADDRESS
```

### Performance Issues

#### Slow Loading
1. Enable Firebase Performance Monitoring
2. Optimize images and assets
3. Implement code splitting
4. Use React.lazy() for components

#### High Firebase Costs
1. Review Firestore queries
2. Implement proper indexing
3. Use Firebase emulators for development
4. Monitor usage in Firebase Console

## 📞 Support

### Getting Help

- **Documentation**: Check the [API Documentation](api-documentation.md)
- **Issues**: Create an issue on GitHub
- **Email**: Contact Muhammad Adnan Ul Mustafa at adnanmd76@gmail.com
- **Community**: Join our Discord server (link in README)

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code of Conduct

This project follows Islamic principles and values. Please:
- Be respectful and kind
- Help fellow Muslims in their learning journey
- Report any inappropriate content
- Contribute positively to the Ummah

---

**May Allah accept our efforts and make this project a source of continuous reward (Sadaqah Jariyah) for all contributors. Ameen.**

*Built with ❤️ for the Muslim Ummah*

---

## 📝 Changelog

### Version 1.0.0 (Current)
- Initial release
- Core recitation analysis
- Expert correction system
- Blockchain attestation
- Jannah Points system

### Upcoming Features
- Mobile app (React Native)
- Offline mode
- Multiple Qira'at support
- Advanced analytics dashboard
- Community features

---

*Last updated: November 14, 2025*