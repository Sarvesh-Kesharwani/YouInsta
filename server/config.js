const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Database configuration
const dbConfig = {
  // MongoDB Atlas connection string
  uri: process.env.MONGODB_URI || 'mongodb+srv://sarveshkumar5513:sample_password_123@cluster0.z40wwdh.mongodb.net/youinsta?retryWrites=true&w=majority&appName=Cluster0',
  
  // Individual database components (for flexibility)
  username: process.env.DB_USER || 'sarveshkumar5513',
  password: process.env.DB_PASSWORD || 'sample_password_123',
  cluster: process.env.DB_CLUSTER || 'cluster0.z40wwdh.mongodb.net',
  database: process.env.DB_NAME || 'youinsta',
  
  // Connection options
  options: {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    serverApi: {
      version: '1',
      strict: true,
      deprecationErrors: true,
    }
  }
};

// Server configuration
const serverConfig = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

// Security configuration
const securityConfig = {
  jwtSecret: process.env.JWT_SECRET || 'youinsta-dev-secret-key-change-in-production',
  sessionSecret: process.env.SESSION_SECRET || 'youinsta-session-secret-change-in-production',
};

// Helper function to build MongoDB URI from components
const buildMongoURI = () => {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }
  
  const { username, password, cluster, database } = dbConfig;
  return `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
};

module.exports = {
  db: {
    ...dbConfig,
    uri: buildMongoURI(),
  },
  server: serverConfig,
  security: securityConfig,
  
  // Helper functions
  isDevelopment: () => serverConfig.nodeEnv === 'development',
  isProduction: () => serverConfig.nodeEnv === 'production',
  
  // Validation
  validateConfig: () => {
    const errors = [];
    
    if (!dbConfig.uri && (!dbConfig.username || !dbConfig.password)) {
      errors.push('Database credentials not configured');
    }
    
    if (serverConfig.port < 1 || serverConfig.port > 65535) {
      errors.push('Invalid port number');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}; 