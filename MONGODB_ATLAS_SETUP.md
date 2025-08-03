# MongoDB Atlas Setup for YouInsta

## Quick Setup (Recommended)

### 1. Run the Setup Script

```bash
# Navigate to server directory
cd server

# Run the environment setup script
npm run setup
```

This will create a `.env` file with sample configuration.

### 2. Update Your Password

Edit the `.env` file and replace `sample_password_123` with your actual MongoDB Atlas password:

```env
MONGODB_URI=mongodb+srv://sarveshkumar5513:YOUR_ACTUAL_PASSWORD@cluster0.z40wwdh.mongodb.net/youinsta?retryWrites=true&w=majority&appName=Cluster0
```

### 3. Start the Server

```bash
# Install dependencies (if not already done)
npm install

# Start the server
npm start
```

## Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Create .env file

Create a `.env` file in the `server` directory:

```env
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://sarveshkumar5513:YOUR_ACTUAL_PASSWORD@cluster0.z40wwdh.mongodb.net/youinsta?retryWrites=true&w=majority&appName=Cluster0

# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Security (Change these in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```

### 2. Install Dependencies

```bash
cd server
npm install
```

### 3. Start Server

```bash
npm start
```

### 2. Start the Server

```bash
# Navigate to server directory
cd server

# Start the server
node index.js
```

### 3. Verify Connection

You should see these messages:
```
✅ Connected to MongoDB Atlas successfully
📊 Database: youinsta
🌐 Cluster: cluster0.z40wwdh.mongodb.net
🚀 Server running on port 5000
🌐 API URL: http://localhost:5000/api
📊 MongoDB: Atlas Cluster
```

## Alternative: Using Environment Variables

If you prefer to use environment variables (recommended for security):

### 1. Create a `.env` file in the server directory:

```env
MONGODB_URI=mongodb+srv://sarveshkumar5513:YOUR_ACTUAL_PASSWORD@cluster0.z40wwdh.mongodb.net/youinsta?retryWrites=true&w=majority&appName=Cluster0
PORT=5000
NODE_ENV=development
```

### 2. Update server/index.js to use environment variable:

```javascript
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/youinsta';
```

## Troubleshooting

### Common Issues:

1. **"Authentication failed"**:
   - Check your password is correct
   - Ensure your IP address is whitelisted in MongoDB Atlas

2. **"Connection timeout"**:
   - Check your internet connection
   - Verify the cluster is running in MongoDB Atlas

3. **"Network error"**:
   - Add your IP address to MongoDB Atlas Network Access
   - Go to Network Access → Add IP Address → Add Current IP Address

### MongoDB Atlas Configuration:

1. **Database Access**:
   - Username: `sarveshkumar5513`
   - Password: Your chosen password
   - Role: `Read and write to any database`

2. **Network Access**:
   - Add your current IP address
   - Or use `0.0.0.0/0` for access from anywhere (not recommended for production)

3. **Cluster Settings**:
   - Cluster Name: `Cluster0`
   - Database Name: `youinsta` (will be created automatically)

## Testing the Connection

Once the server is running, test the connection:

```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{"status":"OK","message":"YouInsta API is running"}
```

## Security Notes

- Never commit your password to version control
- Use environment variables for production
- Regularly rotate your database password
- Use IP whitelisting for additional security 