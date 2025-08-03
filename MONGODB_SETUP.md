# MongoDB Setup Guide for YouInsta

This guide will help you set up MongoDB for the YouInsta application.

## Prerequisites

1. **Node.js** (version 16 or higher)
2. **MongoDB** (version 5.0 or higher)

## MongoDB Installation

### Option 1: MongoDB Community Server (Recommended)

1. **Download MongoDB Community Server**:
   - Visit [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Select your operating system and download the installer
   - Follow the installation wizard

2. **Start MongoDB Service**:
   - **Windows**: MongoDB should start automatically as a service
   - **macOS**: `brew services start mongodb-community`
   - **Linux**: `sudo systemctl start mongod`

### Option 2: MongoDB Atlas (Cloud)

1. **Create MongoDB Atlas Account**:
   - Visit [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account
   - Create a new cluster

2. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

## Project Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/youinsta

# Server Configuration
PORT=5000

# Environment
NODE_ENV=development
```

**For MongoDB Atlas**, replace the MONGODB_URI with your connection string:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/youinsta
```

### 3. Start the Application

#### Development Mode (Frontend + Backend)
```bash
npm run dev:full
```

This will start both the React frontend (port 5173) and the Express backend (port 5000).

#### Individual Services
```bash
# Start backend only
npm run server

# Start frontend only
npm run dev
```

## Database Structure

The application creates two collections in MongoDB:

### 1. `userpreferences` Collection
Stores user configuration and application state:
- User directories (relax, study, combined)
- Clip duration settings
- Video ranges and clip queue
- Coin system data
- Application state

### 2. `clips` Collection
Stores individual clip data:
- Video path and name
- Time range (start, end, duration)
- Watch status and statistics
- Directory type (relax/study)

## Migration from localStorage

The application includes automatic migration from localStorage to MongoDB:

1. **Automatic Detection**: The app checks for existing localStorage data on startup
2. **Migration Prompt**: If localStorage data is found, a migration dialog appears
3. **Data Transfer**: All user preferences and clips are transferred to MongoDB
4. **Cleanup**: localStorage is cleared after successful migration

### Manual Migration

You can also trigger migration manually:

```javascript
import { migrationService } from './src/utils/migration';

// Check migration status
const status = await migrationService.checkMigrationStatus();

// Perform migration
const result = await migrationService.migrateFromLocalStorage();
```

## API Endpoints

### User Preferences
- `GET /api/user-preferences/:userId` - Get user preferences
- `PUT /api/user-preferences/:userId` - Update user preferences
- `PATCH /api/user-preferences/:userId` - Patch specific fields
- `DELETE /api/user-preferences/:userId` - Delete user preferences
- `POST /api/user-preferences/:userId/reset` - Reset to defaults

### Clips
- `GET /api/clips` - Get all clips (with filters)
- `GET /api/clips/:id` - Get specific clip
- `POST /api/clips` - Create new clip
- `PUT /api/clips/:id` - Update clip
- `PUT /api/clips/find-and-update` - Find and update clip by video path
- `DELETE /api/clips/:id` - Delete clip
- `POST /api/clips/bulk` - Bulk operations
- `GET /api/clips/stats/summary` - Get clip statistics

### Health Check
- `GET /api/health` - Check API status

## Troubleshooting

### MongoDB Connection Issues

1. **Check MongoDB Service**:
   ```bash
   # Windows
   services.msc  # Look for "MongoDB" service
   
   # macOS/Linux
   sudo systemctl status mongod
   ```

2. **Check Connection String**:
   - Verify the MONGODB_URI in your `.env` file
   - Ensure the database name is correct
   - Check username/password for Atlas

3. **Network Issues**:
   - Ensure MongoDB is running on the correct port (27017)
   - Check firewall settings
   - Verify network connectivity

### Application Issues

1. **Backend Not Starting**:
   - Check if port 5000 is available
   - Verify all dependencies are installed
   - Check console for error messages

2. **Frontend Connection Issues**:
   - Ensure backend is running on port 5000
   - Check CORS settings
   - Verify API_BASE_URL in `src/services/api.ts`

3. **Migration Issues**:
   - Check browser console for errors
   - Verify MongoDB connection
   - Ensure localStorage data is valid

## Development Notes

### File Structure
```
server/
├── index.js              # Main server file
├── config.js             # Configuration
├── models/
│   ├── UserPreferences.js
│   └── Clip.js
└── routes/
    ├── userPreferences.js
    └── clips.js

src/
├── services/
│   └── api.ts            # API service layer
└── utils/
    └── migration.ts      # Migration utilities
```

### Data Flow
1. **Frontend** → **API Service** → **Express Backend** → **MongoDB**
2. **Migration**: localStorage → MongoDB (one-time)
3. **Real-time**: All data operations go through MongoDB

### Performance Considerations
- MongoDB indexes are created for efficient queries
- Bulk operations are used for large data transfers
- Connection pooling is handled by Mongoose

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify MongoDB is running and accessible
3. Ensure all environment variables are set correctly
4. Check the network connectivity between frontend and backend 