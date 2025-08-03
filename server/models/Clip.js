const mongoose = require('mongoose');

const clipSchema = new mongoose.Schema({
  videoPath: {
    type: String,
    required: true
  },
  videoName: {
    type: String,
    required: true
  },
  startTime: {
    type: Number,
    required: true
  },
  endTime: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  directoryType: {
    type: String,
    enum: ['relax', 'study'],
    required: true
  },
  isWatched: {
    type: Boolean,
    default: false
  },
  isMemorized: {
    type: Boolean,
    default: false
  },
  watchCount: {
    type: Number,
    default: 0
  },
  lastWatchedAt: {
    type: Date,
    default: null
  },
  memorizedAt: {
    type: Date,
    default: null
  },
  // Additional metadata
  watchPercentage: {
    type: Number,
    default: 0
  },
  totalWatchTime: {
    type: Number,
    default: 0
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
clipSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient queries
clipSchema.index({ videoPath: 1, startTime: 1, endTime: 1 });
clipSchema.index({ isWatched: 1 });
clipSchema.index({ isMemorized: 1 });
clipSchema.index({ directoryType: 1 });

module.exports = mongoose.model('Clip', clipSchema); 