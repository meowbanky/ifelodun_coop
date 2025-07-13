# CI/CD Setup Guide for Ifelodun Cooperative - cPanel Hosting

This guide will help you set up automated deployment using GitHub Actions for your Ifelodun Cooperative application on cPanel hosting.

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **cPanel Hosting**: FTP access to your hosting
3. **Node.js Support**: Your hosting supports Node.js v22.16.0

## Step 1: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add the following secrets:

### Required Secrets:
```
FTP_SERVER          - ftp.ifeloduncms.com.ng
FTP_USERNAME        - ifelodu3
FTP_PASSWORD        - [Your FTP password]
BACKEND_DIR         - /home/ifelodu3/api/
FRONTEND_DIR        - /home/ifelodu3/public_html/
VITE_API_BASE_URL   - https://ifeloduncms.com.ng/api
```

## Step 2: Update Environment Variables

### Frontend Environment
Create or update `frontend/.env.production`:
```env
VITE_API_BASE_URL=https://ifeloduncms.com.ng/api
```

### Backend Environment
Ensure your backend has proper environment variables in production.

## Step 3: Configure Your cPanel Hosting

### For Backend (Node.js):
1. **Node.js Selector**: Go to cPanel → Node.js Selector
2. **Create Application**: 
   - Node.js version: 22.16.0
   - Application root: /home/ifelodu3/api/
   - Application URL: https://ifeloduncms.com.ng/api
   - Application startup file: server.js
3. **Environment Variables**: Add any required environment variables
4. **Start Application**: Click "Create" and then "Start"

### For Frontend:
1. **File Manager**: Go to cPanel → File Manager
2. **Navigate to**: /home/ifelodu3/public_html/
3. **Upload Files**: The CI/CD will handle this automatically
4. **Set Permissions**: Ensure proper file permissions (644 for files, 755 for directories)

## Step 4: Test the Workflow

1. Make a small change to your code
2. Commit and push to main/master branch
3. Check the Actions tab in GitHub to see the deployment progress

## Deployment Workflows

### Option 1: Combined Deployment (Recommended)
Use `deploy-all.yml` - Automatically detects which part changed and deploys accordingly

### Option 2: Separate Deployments
- `deploy-backend.yml` - Deploys only backend changes
- `deploy-frontend.yml` - Deploys only frontend changes

## Manual Steps After Backend Deployment

Since you don't have SSH access, after backend deployment you'll need to:

1. **Go to cPanel → Node.js Selector**
2. **Find your application** (ifelodun-backend)
3. **Click "Restart"** to apply changes
4. **Or run npm install** if you have terminal access

## Troubleshooting

### Common Issues:

1. **FTP Connection Failed**
   - Verify FTP credentials
   - Check if your hosting allows FTP connections
   - Try SFTP instead of FTP

2. **Build Failed**
   - Check Node.js version compatibility (should be 22.16.0)
   - Verify all dependencies are in package.json
   - Check for environment variable issues

3. **Application Not Restarting**
   - Manually restart in cPanel → Node.js Selector
   - Check application logs in cPanel
   - Verify the application startup file is correct

### Debugging:
- Check the Actions tab in GitHub for detailed logs
- Add `debug: true` to the FTP deployment step for more verbose output

## Security Considerations

1. **Never commit secrets to your repository**
2. **Use environment-specific configurations**
3. **Regularly rotate FTP credentials**
4. **Keep Node.js version updated**

## Performance Tips

1. **Exclude unnecessary files** from deployment (already configured in workflows)
2. **Use caching** for faster builds (already configured)
3. **Consider CDN** for static assets
4. **Optimize build process** by excluding dev dependencies

## Monitoring

Set up notifications for:
- Successful deployments
- Failed deployments
- Application health checks

You can add these to your workflows using GitHub's notification features or external services like Slack, Discord, or email.

## cPanel Specific Notes

- **Node.js Selector**: Use this to manage your Node.js applications
- **File Manager**: Use this to manually check deployed files if needed
- **Error Logs**: Check cPanel error logs for debugging
- **Cron Jobs**: Can be used for automated tasks if needed
