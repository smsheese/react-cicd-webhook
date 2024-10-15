## GitHub Webhook with Build, Deployment Automation & Telegram Alerts

This Node.js app listens for GitHub webhook events, triggers a build process, automates deployment, and sends Telegram notifications at key stages (build start, success, or failure).

### Features
- **Webhook Listener**: Listens for GitHub push events.
- **Signature Verification**: Verifies request authenticity using a secret token stored in `.env`.
- **Automated Pull and Build**: Pulls the latest changes from a specified branch, runs `npm install` and `npm audit fix`, then builds the project.
- **Deployment**: Automatically deploys the built files to a specified directory using `rsync`, with file ownership and permissions set.
- **Telegram Notifications**: Sends notifications via Telegram when the build process starts, succeeds, or encounters an error.

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/smsheese/react-cicd-webhook.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following environment variables:
   ```bash
   WEBHOOK_SECRET=your_github_webhook_secret
   REPO_PATH=/path/to/your/project
   DEPLOY_PATH=/path/to/deployment/directory
   FILE_OWNER_USER=username
   BRANCH_NAME=main
   APP_PORT=4000
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   TELEGRAM_CHAT_ID=your-telegram-chat-id
   ```
4. Set up your GitHub webhook to point to `/webhook` with the secret token from `.env`.
5. Start the server:
   ```bash
   node app.js
   ```

### Usage
- Push changes to the branch defined in `.env` to trigger the webhook. Duplicate the `.env.sample` file and update the details.
- The app will pull the latest changes, run the build process, deploy the build files, and send Telegram notifications for key events (build start, success, failure).

### Acknowledgments
This app was enhanced with ChatGPT's assistance for adding environment variables, improving security, and automating deployment steps.