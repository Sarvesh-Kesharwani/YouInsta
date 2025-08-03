# MongoDB Setup Guide for YouInsta

## Overview
YouInsta now supports MongoDB for data persistence, with automatic fallback to localStorage when MongoDB is not available.

## Option 1: Local MongoDB Installation

### Windows
1. **Download MongoDB Community Server**:
   - Go to [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Select "Windows" and download the MSI installer
   - Run the installer and follow the setup wizard

2. **Start MongoDB Service**:
   ```cmd
   # Start MongoDB as a Windows service
   net start MongoDB
   
   # Or start manually
   "C:\Program Files\MongoDB\Server\{version}\bin\mongod.exe" --dbpath="C:\data\db"
   ```

### macOS
1. **Using Homebrew**:
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb/brew/mongodb-community
   ```

2. **Manual Installation**:
   - Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Extract and add to PATH
   - Start with: `mongod --dbpath /usr/local/var/mongodb`

### Linux (Ubuntu/Debian)
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Option 2: MongoDB Atlas (Cloud)

1. **Create Free Cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account
   - Create a new cluster (free tier available)

2. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

3. **Update Environment Variables**:
   Create a `.env` file in the server directory:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/youinsta?retryWrites=true&w=majority
   ```

## Option 3: Docker (Recommended for Development)

1. **Install Docker**:
   - Download from [Docker Desktop](https://www.docker.com/products/docker-desktop)

2. **Run MongoDB Container**:
   ```bash
   docker run -d --name mongodb -p 27017:27017 mongo:latest
   ```

3. **Or use Docker Compose**:
   Create `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     mongodb:
       image: mongo:latest
       ports:
         - "27017:27017"
       volumes:
         - mongodb_data:/data/db
   
   volumes:
     mongodb_data:
   ```
   
   Run with: `docker-compose up -d`

## Starting the Application

1. **Start MongoDB** (if using local installation)
2. **Start the Server**:
   ```bash
   npm run server
   ```
3. **Start the Frontend**:
   ```bash
   npm run dev
   ```

## Verification

1. **Check MongoDB Connection**:
   ```bash
   curl http://localhost:5000/api/health
   ```
   Should return: `{"status":"OK","message":"YouInsta API is running"}`

2. **Check Browser Console**:
   Look for these messages:
   ```
   ✅ MongoDB is available
   ✅ MongoDB service initialized
   ```

## Fallback Behavior

If MongoDB is not available, the app will:
- Automatically fall back to localStorage
- Continue functioning normally
- Log warnings in the console
- Attempt to reconnect on next operation

## Troubleshooting

### Common Issues

1. **"MongoDB connection timeout"**:
   - Ensure MongoDB is running
   - Check if port 27017 is available
   - Verify firewall settings

2. **"500 Internal Server Error"**:
   - Check server logs for MongoDB connection errors
   - Ensure MongoDB service is started
   - Verify connection string format

3. **"Operation buffering timed out"**:
   - MongoDB server is overloaded or not responding
   - Check MongoDB logs
   - Restart MongoDB service

### Debug Commands

```bash
# Check if MongoDB is running
netstat -an | grep 27017

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Connect to MongoDB shell
mongosh

# List databases
show dbs

# Use YouInsta database
use youinsta

# Show collections
show collections
```

## Data Migration

The app automatically migrates existing localStorage data to MongoDB when:
- MongoDB is available
- localStorage contains data
- MongoDB is empty

Migration includes:
- User preferences and configuration
- Directory information
- Clips and watch history
- Coin data and statistics
- App state and video ranges

## Environment Variables

Create a `.env` file in the server directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/youinsta

# Server Configuration
PORT=5000
NODE_ENV=development

# Optional: MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/youinsta?retryWrites=true&w=majority
```

## Performance Tips

1. **Indexing**: MongoDB automatically creates indexes for efficient queries
2. **Connection Pooling**: Mongoose handles connection pooling automatically
3. **Caching**: Consider implementing Redis for session caching in production
4. **Backup**: Set up regular MongoDB backups for production deployments

## Production Deployment

For production, consider:
1. **MongoDB Atlas** for managed MongoDB service
2. **Environment Variables** for secure configuration
3. **SSL/TLS** for secure connections
4. **Authentication** for database access
5. **Backup Strategy** for data protection
6. **Monitoring** for performance tracking

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify MongoDB is running and accessible
3. Check server logs for detailed error information
4. Ensure all dependencies are installed correctly 