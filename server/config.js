module.exports = {
  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/youinsta',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Vite dev server
      credentials: true
    }
  },
  
  // Environment
  env: process.env.NODE_ENV || 'development'
}; 