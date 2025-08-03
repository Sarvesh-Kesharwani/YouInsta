const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');

const app = express();
const PORT = config.server.port;

// Validate configuration
const validation = config.validateConfig();
if (!validation.isValid) {
  console.error('❌ Configuration errors:', validation.errors);
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(config.db.uri, config.db.options)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully');
    console.log(`📊 Database: ${config.db.database}`);
    console.log(`🌐 Cluster: ${config.db.cluster}`);
    console.log(`👤 User: ${config.db.username}`);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    console.error('💡 Check your database credentials in .env file or config.js');
  });

// Import routes
const userPreferencesRoutes = require('./routes/userPreferences');
const clipsRoutes = require('./routes/clips');

// Use routes
app.use('/api/user-preferences', userPreferencesRoutes);
app.use('/api/clips', clipsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'YouInsta API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}/api`);
  console.log(`📊 MongoDB: Atlas Cluster`);
  console.log(`🔧 Environment: ${config.server.nodeEnv}`);
  console.log(`🔒 Security: ${config.isProduction() ? 'Production' : 'Development'} mode`);
}); 