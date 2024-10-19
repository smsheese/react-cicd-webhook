require('dotenv').config(); // Load environment variables from .env

module.exports = {
  apps: [
    {
      name: 'cicd-webhook',        // Name of the app in PM2
      script: './app.js',          // Path to your app's entry point (app.js)
      watch: true,                 // Optional: Restarts on file changes
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production'  // Use environment variable or default to 'production'
      }
    }
  ]
};
