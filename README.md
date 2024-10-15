# React Deployment Automation

This Node.js application is designed to automate the process of pulling code from a Git repository, installing dependencies, building the frontend project, and deploying it to a specified public directory. The solution is integrated with GitHub webhooks and Telegram notifications, and it includes scheduling capabilities for automated builds.

## Features

1. **GitHub Webhook Integration**:
   - Automatically listens for push events from a GitHub repository.
   - Verifies the payload using a GitHub secret token to ensure request authenticity.
   - Pulls code from a specified branch when a new commit is detected.

2. **Automated Build Process**:
   - Automatically installs dependencies and builds the project whenever changes are pulled.
   - Supports `npm install` with options like `--legacy-peer-deps` and `--force`, as well as `npm audit fix` for resolving security vulnerabilities.

3. **Scheduled Builds**:
   - Uses `node-cron` to schedule periodic builds at a time defined in the `.env` file (default: 3 AM daily).
   - Can trigger builds manually based on incoming webhooks or messages in a Telegram group.

4. **Telegram Notifications**:
   - Sends notifications at key stages (new commits, build start, build success/failure, etc.) to a specified Telegram chat.
   - Includes options to trigger an immediate build by replying with `/forcebuild` (Telegram Bot message handling to be implemented separately).

5. **File Management and Permissions**:
   - After a successful build, the project moves the generated build files to a public directory.
   - Updates file ownership for the public directory, ensuring correct permissions.

6. **Error Handling and Reporting**:
   - Comprehensive error handling with logs and notifications for failed steps.
   - Telegram notifications are sent for build issues, permission errors, and other operational concerns.

## Requirements

Before running this application, make sure to have the following in place:

- **Node.js**: Ensure you have Node.js installed (`>= 12.x.x`).
- **Git**: The application uses `simple-git` to interact with your Git repository.
- **Telegram Bot**: A Telegram bot for sending notifications to a specified chat group.
- **GitHub Webhook Setup**: Ensure your GitHub repository is configured with a webhook that triggers on push events.

## Environment Variables

The application uses a `.env` file for configuration. Create a `.env` file in the project root and add the following variables:

```plaintext
GITHUB_SECRET=secret_token          # Webhook secret for GitHub
REPO_PATH=/home/user/repo-path      # Path to the local repository
GIT_REPO_URL=https://github.com/... # Git repo URL
GIT_BRANCH=main                     # Git branch to pull from
TELEGRAM_BOT_TOKEN=token_here       # Telegram bot token
TELEGRAM_CHAT_ID=chat_id_here       # Telegram chat ID for notifications
FILE_OWNER=user                     # Owner for the build directory files
APP_PORT=4000                       # Port to run the application on
SCHEDULED_TIME='0 3 * * *'          # Cron format for scheduling the build
USE_LEGACY_PEER_DEPS=true           # Use legacy-peer-deps in npm install
USE_FORCE=true                      # Force package installation
USE_AUDIT_FIX=true                  # Run npm audit fix
```

### Key Environment Variables Explained

- **GITHUB_SECRET**: The secret token used to validate incoming webhook requests from GitHub.
- **REPO_PATH**: The path where the repository is cloned or exists.
- **GIT_REPO_URL**: URL of the GitHub repository to be cloned or pulled from.
- **TELEGRAM_BOT_TOKEN**: The API token for the Telegram bot used for sending notifications.
- **TELEGRAM_CHAT_ID**: The chat ID where the notifications will be sent.
- **FILE_OWNER**: The system user that should own the files in the public directory.
- **APP_PORT**: Port number for the webhook listener.
- **SCHEDULED_TIME**: Cron expression to schedule builds automatically.
- **USE_LEGACY_PEER_DEPS**, **USE_FORCE**, **USE_AUDIT_FIX**: Flags to control npm installation options.

## Installation

1. Clone the repository to your server:

    ```bash
    git clone https://github.com/smsheese/react-cicd-webhook.git
    cd react-cicd-webhook
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. To set up the environment variables, simply copy the `.env.sample` file to `.env` and update the necessary details in the new `.env` file. You can do this by running the following command in the root directory:

```bash
cp .env.sample .env
```

After copying, open the `.env` file and update the environment variables as per your specific configuration needs (see **Environment Variables** above).

4. To start the application, use **PM2** for better process management. If you don't have PM2 installed, you can install it globally using the following command:

```bash
npm install -g pm2
```

Once PM2 is installed, you can start the application by running:

```bash
pm2 start app.js
```

To save the PM2 process list and set it to automatically restart on system reboots, use the following command:

```bash
pm2 save
pm2 startup
```

This ensures that your application will restart automatically if the server is rebooted.

5. Configure the GitHub repository to send webhook requests to your server's `/webhook` endpoint.

6. Schedule periodic builds using `node-cron` by setting the `SCHEDULED_TIME` variable in the `.env` file.

## Usage

- **Webhook Triggered Build**: When a commit is pushed to the GitHub repository, the webhook triggers a pull and build process. If there are any changes, the project is built, and notifications are sent to Telegram.
- **Scheduled Builds**: The application automatically runs the build process at the scheduled time, as defined by the `SCHEDULED_TIME` in cron format.
- **Telegram Notifications**: Key updates (new commits, build successes, errors, etc.) are sent to the Telegram group specified in the `.env` file.

### Manual Build

You can also trigger a manual build by interacting with the Telegram bot (handling `/forcebuild` via the Telegram Bot API is to be implemented).

## Logging and Notifications

- **Logs**: The application logs all operations, including Git operations, npm installations, and build outcomes.
- **Notifications**: The Telegram bot sends key updates and error reports, ensuring you stay informed about the state of the project.

## Contributing

Contributions, suggestions, and feedback are welcome! Feel free to open an issue or submit a pull request if you have improvements to the codebase or new features you'd like to see.

## Acknowledgements

This project was developed with the help of **ChatGPT**, which was instrumental in brainstorming, writing code, and improving the overall design of the system. We appreciate any feedback to help us continue refining the project.

---

If you find this project helpful, feel free to give it a ⭐ on GitHub and share your feedback with us!