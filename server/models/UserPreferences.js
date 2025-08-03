const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: 'default'
  },
  // Video directories
  relaxDirectories: [{
    name: String,
    path: String,
    handle: String // Serialized FileSystemHandle
  }],
  studyDirectories: [{
    name: String,
    path: String,
    handle: String // Serialized FileSystemHandle
  }],
  combinedDirectory: {
    name: String,
    path: String,
    handle: String // Serialized FileSystemHandle
  },
  
  // Clip settings
  clipDurationMinutes: {
    type: Number,
    default: 1
  },
  isRandomClipDurationEnabled: {
    type: Boolean,
    default: false
  },
  randomClipDurationRange: {
    min: { type: Number, default: 0.5 },
    max: { type: Number, default: 2 }
  },
  
  // App state
  isAppStarted: {
    type: Boolean,
    default: false
  },
  
  // Video ranges (calculated time ranges)
  videoRanges: [{
    videoPath: String,
    videoName: String,
    timeRanges: [{
      start: Number,
      end: Number,
      duration: Number
    }],
    directoryType: String // 'relax' or 'study'
  }],
  
  // Clip queue
  clipQueue: {
    clips: [{
      videoPath: String,
      videoName: String,
      startTime: Number,
      endTime: Number,
      duration: Number,
      directoryType: String
    }],
    currentIndex: { type: Number, default: 0 },
    lastUsed: { type: Number, default: 0 },
    preloadedVideos: [String]
  },
  
  // Coin system
  coinData: {
    totalCoins: { type: Number, default: 0 },
    coinsEarned: [{
      amount: Number,
      reason: String,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userPreferencesSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('UserPreferences', userPreferencesSchema); 