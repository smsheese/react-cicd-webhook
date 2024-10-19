require('dotenv').config(); // Load environment variables from .env

module.exports = {
    apps: [
      {
        name: 'cicd-webhook',
        script: './app.js',
        watch: true,
        watch_options: {
          followSymlinks: false,
          ignored: ['logs/*'], // Ignore log files
        },
        env: {
          NODE_ENV: process.env.NODE_ENV || 'production'
        },
        output: './logs/output.log',
        error: './logs/error.log',
      }
    ]
};
