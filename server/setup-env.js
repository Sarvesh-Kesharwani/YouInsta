#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 Instalearn Environment Setup');
console.log('=============================\n');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  rl.question('Do you want to overwrite it? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      createEnvFile();
    } else {
      console.log('Setup cancelled.');
      rl.close();
    }
  });
} else {
  createEnvFile();
}

function createEnvFile() {
  console.log('\n📝 Creating .env file...\n');
  
  const envContent = `# MongoDB Atlas Configuration
# Replace 'sample_password_123' with your actual MongoDB Atlas password
MONGODB_URI=mongodb+srv://sarveshkumar5513:sample_password_123@cluster0.z40wwdh.mongodb.net/youinsta?retryWrites=true&w=majority&appName=Cluster0

# Alternative: Use individual components
# DB_USER=sarveshkumar5513
# DB_PASSWORD=your_actual_password_here
# DB_CLUSTER=cluster0.z40wwdh.mongodb.net
# DB_NAME=youinsta

# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Security (Change these in production!)
JWT_SECRET=youinsta-dev-secret-key-change-in-production
SESSION_SECRET=youinsta-session-secret-change-in-production

# Instructions:
# 1. Replace 'sample_password_123' with your actual MongoDB Atlas password
# 2. Update JWT_SECRET and SESSION_SECRET for production
# 3. Set NODE_ENV=production for production deployment
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Edit the .env file and replace "sample_password_123" with your actual MongoDB Atlas password');
    console.log('2. Start the server with: node index.js');
    console.log('3. Test the connection at: http://localhost:5000/api/health');
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }
  
  rl.close();
} 