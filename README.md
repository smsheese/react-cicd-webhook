# GitHub Webhook with Build Process

This is a simple Node.js app that listens for GitHub webhook events and triggers a build process when changes are pushed to the `main` branch. The webhook includes signature verification to ensure that only valid requests from GitHub are processed.

## Features
- Listens for webhook events from GitHub.
- Verifies request authenticity using a secret token.
- Automatically pulls the latest code from the `main` branch.
- Installs dependencies (`npm install`) and runs a production build (`npm run build`).
- Designed for a React project, but can be adapted for any Node.js app.

## Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/smsheese/react-cicd-webhook.git
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Set up your GitHub webhook to point to `/webhook` with the secret token (`secret_token`).
4. Replace `/home/user/repo-path` with the actual path to your project directory.
5. Start the server:
   ```bash
   node app.js
   ```

## Usage
- Push changes to the `main` branch to trigger the webhook.
- The app will automatically pull the latest changes, install dependencies, and run the build process.

## Acknowledgments
This app was created with assistance from ChatGPT during the development process.
