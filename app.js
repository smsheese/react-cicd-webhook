const express = require('express');
const bodyParser = require('body-parser');
const simpleGit = require('simple-git');
const { exec } = require('child_process');
const crypto = require('crypto');
const authorizedUsers = process.env.AUTHORIZED_USERS ? process.env.AUTHORIZED_USERS.split(',') : [];
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();
const cron = require('node-cron');

const app = express();
app.use(bodyParser.json());

const secret = process.env.GITHUB_SECRET;  // GitHub webhook secret token
const repoPath = process.env.REPO_PATH;  // Path to your React project
const gitRepoUrl = process.env.GIT_REPO_URL;  // Git repository URL
const branch = process.env.GIT_BRANCH || 'main';  // Git branch to pull
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const buildPath = process.env.BUILD_PATH;  // Path to your build project
const buildOwner = process.env.BUILD_OWNER;  // Build path owner
const appPort = process.env.APP_PORT || 4000;  // Application port

// Options for installation and build
const useLegacyPeerDeps = process.env.USE_LEGACY_PEER_DEPS === 'true'; // Enable legacy-peer-deps
const useForce = process.env.USE_FORCE === 'true'; // Enable force install
const useAuditFix = process.env.USE_AUDIT_FIX === 'true'; // Enable audit fix

const git = simpleGit(repoPath);

// Function to send Telegram message
const sendTelegramMessage = (message) => {
    if (telegramBotToken && telegramChatId) {
        const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        axios.post(url, {
            chat_id: telegramChatId,
            text: message
        })
        .then(() => console.log('Telegram notification sent successfully'))
        .catch(err => console.error('Error sending Telegram message:', err));
    }
};

// Clone the repository if not already present
const cloneRepoIfNeeded = async () => {
    if (!fs.existsSync(repoPath)) {
        console.log('Repository not found at path, cloning...');
        try {
            await git.clone(gitRepoUrl, repoPath, ['--branch', branch]);
            console.log(`Repository cloned to ${repoPath}`);
        } catch (err) {
            console.error('Git Clone Error:', err);
            sendTelegramMessage(`🚫 Error cloning repo: ${err.message}`);
        }
    } else {
        console.log('Repository already exists at path:', repoPath);
    }
};

// Set ownership and permissions of the build folder
const setOwnershipAndPermissions = () => {
    return new Promise((resolve, reject) => {
        const commands = `
            chown -R ${fileOwner}:${fileOwner} ${buildPath} && \
            find ${buildPath} -type d -exec chmod 755 {} \\; && \
            find ${buildPath} -type f -exec chmod 644 {} \\;
        `;
        exec(commands, (err, stdout, stderr) => {
            if (err) {
                console.error('Ownership or permissions change error:', err, stderr);
                return reject(err);
            }
            console.log('Ownership and permissions set successfully:', stdout);
            resolve();
        });
    });
};

// Move build folder to the public directory
const moveBuildFolder = () => {
    return new Promise((resolve, reject) => {
        exec(`mv ${repoPath}/build/* ${buildPath}`, (err, stdout, stderr) => {
            if (err) {
                console.error('Error moving build folder:', err, stderr);
                return reject(err);
            }
            console.log('Build folder moved successfully:', stdout);
            resolve();
        });
    });
};

// Build process function
const runBuildProcess = async () => {
    console.log('Starting build process...');
    
    try {
        await cloneRepoIfNeeded();

        console.log(`Pulling the latest code from ${branch} branch...`);
        const pullResult = await git.pull('origin', branch);
        
        if (pullResult && pullResult.summary.changes) {
            console.log('Changes detected, proceeding with npm install...');
            
            let installCommand = 'npm install';
            if (useLegacyPeerDeps) installCommand += ' --legacy-peer-deps';
            if (useForce) installCommand += ' --force';
            
            console.log('Running:', installCommand);
            exec(`${installCommand}${useAuditFix ? ' && npm audit fix' : ''}`, { cwd: repoPath }, async (err, stdout, stderr) => {
                if (err) {
                    console.error('NPM Install Error:', err, stderr);
                    sendTelegramMessage(`🚫 NPM Install Error: ${err.message}`);
                    return;
                }
                console.log('NPM install successful:', stdout);

                console.log('Running npm run build...');
                exec('npm run build', { cwd: repoPath }, async (err, stdout, stderr) => {
                    if (err) {
                        console.error('Build Error:', err, stderr);
                        sendTelegramMessage(`🚫 Build Error: ${err.message}`);
                        return;
                    }
                    console.log('Build Success:', stdout);
                    sendTelegramMessage('✅ Build completed successfully.');

                    // Move build folder and set permissions
                    try {
                        await moveBuildFolder();
                        await setOwnershipAndPermissions();
                        sendTelegramMessage('✅ Build folder moved and permissions set.');
                    } catch (err) {
                        console.error('Error in post-build steps:', err);
                        sendTelegramMessage(`🚫 Post-build Error: ${err.message}`);
                    }
                });
            });
        } else {
            console.log('No changes detected in the pull');
            sendTelegramMessage('🔄 No changes detected in the pull.');
        }
    } catch (error) {
        console.error('Error in runBuildProcess:', error);
        sendTelegramMessage(`🚫 Error in build process: ${error.message}`);
    }
};

// Schedule build process
const scheduleBuildProcess = (cronTime) => {
    cron.schedule(cronTime, () => {
        console.log('Scheduled build process running...');
        runBuildProcess();
    });
};

// Function to listen for Telegram /forcebuild command
const listenForTelegramCommands = () => {
    const telegramBotUrl = `https://api.telegram.org/bot${telegramBotToken}/getUpdates`;

    setInterval(async () => {
        try {
            const response = await axios.get(telegramBotUrl);
            const updates = response.data.result;

            // Process each message
            updates.forEach(update => {
                const message = update.message;
                if (message && message.text === '/forcebuild') {
                    const userId = message.from.id;

                    // Check if the user is authorized
                    if (authorizedUsers.includes(String(userId))) {
                        sendTelegramMessage('✅ Force build command received. Starting build process...');
                        runBuildProcess();  // Trigger the build process
                    } else {
                        sendTelegramMessage('🚫 You are not authorized to run the build.');
                    }
                }
            });
        } catch (err) {
            console.error('Error fetching Telegram updates:', err);
        }
    }, 5000);  // Poll Telegram API every 5 seconds
};

// Webhook handler
app.post('/webhook', async (req, res) => {
    console.log('Received webhook');

    // Verify GitHub signature to ensure request authenticity
    const sig = `sha256=${crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex')}`;
    if (req.headers['x-hub-signature-256'] !== sig) {
        console.error('Invalid signature');
        return res.sendStatus(403);
    }

    const { ref } = req.body;
    console.log('Webhook for branch:', ref);

    // Notify of new commit and scheduled build
    sendTelegramMessage(`📦 New commit detected on branch ${branch}. Scheduled build process will run at ${process.env.SCHEDULED_TIME}. Reply with /forcebuild to trigger immediately.`);

    // If specific user replies with /forcebuild, trigger build immediately
    // This requires Telegram Bot API to handle messages, which would be implemented separately.

    res.sendStatus(200);
});

// Start the server
app.listen(appPort, () => {
    console.log(`Webhook listener running on port ${appPort}`);
    scheduleBuildProcess(process.env.SCHEDULED_TIME || '0 3 * * *'); // Default to run at 3 AM daily
    
    // Start listening for Telegram commands
    listenForTelegramCommands();
});
