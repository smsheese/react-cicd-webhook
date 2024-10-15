require('dotenv').config();  // Load environment variables from .env
const express = require('express');
const bodyParser = require('body-parser');
const simpleGit = require('simple-git');
const { exec } = require('child_process');
const crypto = require('crypto');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

const secret = process.env.WEBHOOK_SECRET;
const repoPath = process.env.REPO_PATH;
const buildPath = path.join(repoPath, 'build');
const deployPath = process.env.DEPLOY_PATH;
const git = simpleGit(repoPath);
const branchName = process.env.BRANCH_NAME || 'PROD';  // Default to 'PROD'
const ownerUser = process.env.FILE_OWNER_USER;
const port = process.env.APP_PORT || 4000;

// Telegram credentials from .env
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

// Send a Telegram message
const sendTelegramMessage = async (message) => {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const payload = {
        chat_id: telegramChatId,
        text: message
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!data.ok) {
            console.error('Failed to send Telegram message:', data.description);
        } else {
            console.log('Telegram message sent successfully');
        }
    } catch (error) {
        console.error('Error sending Telegram message:', error);
    }
};

app.post('/webhook', (req, res) => {
    console.log('Received webhook');

    // Verify GitHub signature to ensure request authenticity
    const sig = `sha256=${crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex')}`;
    if (req.headers['x-hub-signature-256'] !== sig) {
        console.error('Invalid signature');
        return res.sendStatus(403);
    }

    const { ref } = req.body;
    console.log('Webhook for branch:', ref);

    // Check if the pushed branch is the one we're interested in
    if (ref === `refs/heads/${branchName}`) {
        console.log(`Pulling the latest code from ${branchName} branch...`);

        sendTelegramMessage(`Build process started for branch ${branchName}`);

        git.pull('origin', branchName, (err, update) => {
            if (err) {
                console.error('Git Pull Error:', err);
                sendTelegramMessage(`Git Pull Error: ${err.message}`);
                return res.sendStatus(500);
            }

            if (update && update.summary.changes) {
                console.log('Git pull successful. Running npm install...');

                exec('npm install', { cwd: repoPath }, (err, stdout, stderr) => {
                    if (err) {
                        console.error('NPM Install Error:', err, stderr);
                        sendTelegramMessage(`NPM Install Error: ${stderr}`);
                        return res.sendStatus(500);
                    }
                    console.log('NPM install successful:', stdout);

                    console.log('Running npm audit fix...');
                    exec('npm audit fix', { cwd: repoPath }, (err, stdout, stderr) => {
                        if (err) {
                            console.error('NPM Audit Fix Error:', err, stderr);
                            sendTelegramMessage(`NPM Audit Fix Error: ${stderr}`);
                            return res.sendStatus(500);
                        }
                        console.log('NPM audit fix successful:', stdout);

                        console.log('Running npm run build...');
                        exec('npm run build', { cwd: repoPath }, (err, stdout, stderr) => {
                            if (err) {
                                console.error('Build Error:', err, stderr);
                                sendTelegramMessage(`Build Error: ${stderr}`);
                                return res.sendStatus(500);
                            }
                            console.log('Build Success:', stdout);

                            console.log(`Moving build files to ${deployPath}...`);
                            exec(`rsync -av --delete ${buildPath}/ ${deployPath}/ && chown -R ${ownerUser}:${ownerUser} ${deployPath}`, (err, stdout, stderr) => {
                                if (err) {
                                    console.error('File Move/Permission Error:', err, stderr);
                                    sendTelegramMessage(`File Move/Permission Error: ${stderr}`);
                                    return res.sendStatus(500);
                                }
                                console.log('Build files moved and permissions set successfully:', stdout);
                                sendTelegramMessage(`Build and deployment successful for branch ${branchName}`);
                                res.sendStatus(200);
                            });
                        });
                    });
                });
            } else {
                console.log('No changes detected in the pull');
                res.sendStatus(200); // No changes
            }
        });
    } else {
        console.log(`Not the ${branchName} branch, ignoring`);
        res.sendStatus(200); // Ignore other branches
    }
});

// Start the server
app.listen(port, () => console.log(`Webhook listener running on port ${port}`));
