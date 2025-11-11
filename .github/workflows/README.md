# GitHub Actions Deployment Guide

This workflow automatically builds and deploys your application when code is pushed to the `main` branch.

## Workflow Overview

The deployment consists of two independent jobs:

1. **Frontend Deployment**: Builds the React/Vite frontend and deploys it via SFTP
2. **Backend Deployment**: Deploys the Node.js/Express backend via SSH and restarts the service

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository settings:
**Settings → Secrets and variables → Actions → New repository secret**

### Frontend Deployment Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `FRONTEND_SFTP_HOST` | SFTP server hostname or IP | `frontend.example.com` |
| `FRONTEND_SFTP_USERNAME` | SFTP username | `deploy-user` |
| `FRONTEND_SFTP_PRIVATE_KEY` | SSH private key for authentication | `-----BEGIN RSA PRIVATE KEY-----...` |
| `FRONTEND_SFTP_PORT` | SFTP port (optional, defaults to 22) | `22` |
| `FRONTEND_REMOTE_PATH` | Remote directory path | `/var/www/html` |

### Backend Deployment Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `BACKEND_SSH_HOST` | Backend server hostname or IP | `backend.example.com` |
| `BACKEND_SSH_USERNAME` | SSH username | `deploy-user` |
| `BACKEND_SSH_PRIVATE_KEY` | SSH private key for authentication | `-----BEGIN RSA PRIVATE KEY-----...` |
| `BACKEND_SSH_PORT` | SSH port (optional, defaults to 22) | `22` |
| `BACKEND_REMOTE_PATH` | Git repository path on server | `/opt/nextcloud-register` |

## Setup Instructions

### 1. Generate SSH Key Pairs

Generate SSH keys for authentication (if you don't have them):

```bash
# For frontend server
ssh-keygen -t rsa -b 4096 -C "github-actions-frontend" -f ~/.ssh/github_actions_frontend

# For backend server
ssh-keygen -t rsa -b 4096 -C "github-actions-backend" -f ~/.ssh/github_actions_backend
```

### 2. Configure Frontend Server (SFTP)

Copy the public key to your frontend server:

```bash
ssh-copy-id -i ~/.ssh/github_actions_frontend.pub user@frontend-server
```

Or manually add the public key to `~/.ssh/authorized_keys` on the frontend server.

### 3. Configure Backend Server (SSH)

#### a. Copy SSH Key

```bash
ssh-copy-id -i ~/.ssh/github_actions_backend.pub user@backend-server
```

#### b. Clone Repository on Backend Server

```bash
ssh user@backend-server
cd /opt  # or your preferred location
git clone https://github.com/fsiwi-hka/NextcloudRegisterIWI.git nextcloud-register
cd nextcloud-register/backend
npm install
```

#### c. Install PM2 (Process Manager)

```bash
npm install -g pm2

# Start your backend
pm2 start server.js --name nextcloud-register-backend

# Enable PM2 startup on boot
pm2 startup
pm2 save
```

#### d. Configure Environment Variables

Create a `.env` file in the backend directory with your configuration:

```bash
cd /opt/nextcloud-register/backend
nano .env
```

### 4. Add Secrets to GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Add each secret with its corresponding value
5. For the private keys, paste the entire content of the private key file (e.g., `cat ~/.ssh/github_actions_frontend`)

### 5. Test the Workflow

You can trigger the workflow by:

- Pushing to the `main` branch
- Manually triggering it from **Actions → Build and Deploy → Run workflow**

## Workflow Details

### Frontend Build & Deploy

1. Checks out the code
2. Sets up Node.js 20
3. Installs dependencies with `npm ci`
4. Builds the frontend with `npm run build` (outputs to `./dist`)
5. Uploads the `dist` folder contents via SFTP to the frontend server

### Backend Deploy

1. Checks out the code
2. Connects to the backend server via SSH
3. Navigates to the repository directory
4. Pulls the latest changes from `main` branch
5. Installs backend dependencies with `npm ci`
6. Restarts the backend service using PM2

## Customization

### Change Target Branch

Edit `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main      # Change to your desired branch
      - production
```

### Modify Backend Restart Command

If you're not using PM2, modify the script in the workflow:

```yaml
script: |
  cd ${{ secrets.BACKEND_REMOTE_PATH }}
  git pull origin main
  cd backend
  npm ci
  # Use your preferred process manager
  systemctl restart nextcloud-backend
```

### Deploy Only on Specific Paths

To deploy only when specific files change:

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'src/**'
      - 'backend/**'
      - 'package.json'
```

## Troubleshooting

### SFTP Connection Issues

- Verify the SSH key is correctly added to `authorized_keys`
- Check file permissions: `chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`
- Ensure the remote path exists and has write permissions

### Backend Deployment Issues

- Check if PM2 is installed: `pm2 --version`
- Verify the repository path is correct
- Ensure the deploy user has permission to pull from the Git repository
- Check PM2 logs: `pm2 logs nextcloud-register-backend`

### View Workflow Logs

1. Go to **Actions** tab in your GitHub repository
2. Click on the workflow run
3. Expand each step to see detailed logs

## Security Best Practices

1. **Use separate SSH keys** for frontend and backend
2. **Limit key permissions** - only give necessary access
3. **Rotate keys regularly**
4. **Use deploy keys** with read-only access to the repository when possible
5. **Never commit secrets** to the repository
6. **Review workflow runs** regularly for any anomalies

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SFTP Deploy Action](https://github.com/wlixcc/SFTP-Deploy-Action)
- [SSH Action](https://github.com/appleboy/ssh-action)
- [PM2 Documentation](https://pm2.keymetrics.io/)
