require('dotenv').config();  // Load environment variables from .env
const express = require('express');
const bodyParser = require('body-parser');
const simpleGit = require('simple-git');
const { exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

const secret = process.env.WEBHOOK_SECRET;  // GitHub webhook secret from .env
const repoPath = process.env.REPO_PATH;     // Path to the React project from .env
const buildPath = path.join(repoPath, 'build');
const deployPath = process.env.DEPLOY_PATH; // Deployment path from .env
const git = simpleGit(repoPath);

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

    // Check if the pushed branch is 'main'
    if (ref === 'refs/heads/main') {
        console.log('Pulling the latest code from main branch...');

        git.pull('origin', 'main', (err, update) => {
            if (err) {
                console.error('Git Pull Error:', err);
                return res.sendStatus(500);
            }

            if (update && update.summary.changes) {
                console.log('Git pull successful. Running npm install...');

                // Install dependencies with legacy peer deps
                exec('npm install', { cwd: repoPath }, (err, stdout, stderr) => {
                    if (err) {
                        console.error('NPM Install Error:', err, stderr);
                        return res.sendStatus(500);
                    }
                    console.log('NPM install successful:', stdout);

                    console.log('Running npm audit fix...');
                    exec('npm audit fix', { cwd: repoPath }, (err, stdout, stderr) => {
                        if (err) {
                            console.error('NPM Audit Fix Error:', err, stderr);
                            return res.sendStatus(500);
                        }
                        console.log('NPM audit fix successful:', stdout);

                        console.log('Running npm run build...');
                        exec('npm run build', { cwd: repoPath }, (err, stdout, stderr) => {
                            if (err) {
                                console.error('Build Error:', err, stderr);
                                return res.sendStatus(500);
                            }
                            console.log('Build Success:', stdout);

                            console.log(`Moving build files to ${deployPath}...`);
                            exec(`rsync -av --delete ${buildPath}/ ${deployPath}/ && chown -R unidiner:unidiner ${deployPath}`, (err, stdout, stderr) => {
                                if (err) {
                                    console.error('File Move/Permission Error:', err, stderr);
                                    return res.sendStatus(500);
                                }
                                console.log('Build files moved and permissions set successfully:', stdout);
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
        console.log('Not the main branch, ignoring');
        res.sendStatus(200); // Ignore other branches
    }
});

// Start the server
app.listen(4000, () => console.log('Webhook listener running on port 4000'));
