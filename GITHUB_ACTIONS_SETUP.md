# GitHub Actions Setup Guide

This document explains how to set up GitHub Actions for CI/CD with API-Whispr.

## Required Secrets

Set these secrets in your GitHub repository settings:
**Settings → Secrets and variables → Actions**

### Build & Test Secrets

These are needed for building and testing the application:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_OPENAI_API_KEY
```

### Staging Deployment Secrets (Optional)

For deploying to staging environment:

```
STAGING_NEXT_PUBLIC_SUPABASE_URL
STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY
STAGING_NEXT_PUBLIC_OPENAI_API_KEY
```

### Vercel Deployment Secrets

Required for production and staging deployments:

```
VERCEL_TOKEN           # Get from: https://vercel.com/account/tokens
VERCEL_ORG_ID          # Organization ID from Vercel
VERCEL_PROJECT_ID      # Production project ID
VERCEL_PROJECT_ID_STAGING  # Staging project ID (if applicable)
VERCEL_ORG_SLUG        # Organization slug  
```

### Notifications (Optional)

For Slack notifications on deployment:

```
SLACK_WEBHOOK_URL      # Slack incoming webhook URL
```

Get this from: Slack → App Directory → Incoming Webhooks → Create New

## Step-by-Step Setup

### 1. Create GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/API-Whispr.git
git branch -M main
git push -u origin main
```

### 2. Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings**
3. Click **Secrets and variables → Actions**
4. Click **New repository secret**
5. Add each secret from the list above

### 3. Configure Vercel (for deployments)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Get your tokens and IDs from:
# https://vercel.com/account/tokens
# https://vercel.com/YOUR_ORG_NAME/API-Whispr/settings
```

### 4. (Optional) Set up Slack notifications

1. Go to Slack Workspace Settings → Apps and Integrations
2. Search for "Incoming Webhooks"
3. Create New → Choose channel → Create Incoming Webhook
4. Copy webhook URL to GitHub secret

## Workflow Files

The CI/CD pipeline is defined in `.github/workflows/ci-cd.yml`

### Jobs Included

1. **Quality** - ESLint and TypeScript checks
2. **Test** - Unit and integration tests
3. **Build** - Next.js build verification
4. **Security** - Trivy vulnerability scanning
5. **Deploy-Staging** - Deploy to Vercel staging (on `develop` branch)
6. **Deploy-Production** - Deploy to Vercel prod (on `main` branch)
7. **Notify-Failure** - Slack notification on failure

## Git Workflow

### For Development

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes, commit, push
git commit -m "feat: description"
git push origin feature/your-feature

# Create Pull Request on GitHub
```

### For Staging

```bash
# Merge to develop triggers staging deployment
git checkout develop
git pull origin develop
git merge feature/your-feature
git push origin develop
# Deployment to staging starts automatically
```

### For Production

```bash
# Merge to main triggers production deployment
git checkout main
git pull origin main
git merge develop
git push origin main
# Deployment to production starts automatically
```

## Troubleshooting

### Build Fails

Check the detailed logs:
1. Go to **Actions** tab
2. Click the failed workflow run
3. Expand the step that failed
4. Review error messages

### Deployment Fails

Common issues:

- **"NEXT_PUBLIC_SUPABASE_URL is not set"**
  - Add missing secrets to GitHub

- **"Vercel token invalid"**
  - Regenerate token: https://vercel.com/account/tokens
  - Update GitHub secret

- **"Project ID not found"**
  - Verify correct project IDs in GitHub secrets
  - Ensure Vercel account has access

### Slack Notifications Not Working

- Verify webhook URL is correct
- Check Slack channel exists
- Ensure webhook is active in Slack

## Environment Variables Reference

### Development (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_OPENAI_API_KEY=
OPENAI_ORG_ID=
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

### Production

Use GitHub secrets instead of `.env` files.

## Monitoring Deployments

### View Deployment Status

1. Go to **Actions** tab
2. Select a workflow run
3. View logs for each job

### Monitor Production

After deployment:
1. Visit https://api-whispr.vercel.app
2. Check Supabase metrics
3. Monitor error logs
4. Review performance metrics

## Rollback Strategy

If deployment fails:

```bash
# Go back to previous commit
git revert <commit-hash>
git push origin main
# New deployment will start automatically
```

## Summary of Workflow

```
commit → push to main
    ↓
Tests run (quality, test, build, security)
    ↓
All tests pass?
    ├─ YES → Deploy to Vercel Production
    │         │
    │         ├─ Success → Slack notification ✅
    │         └─ Failure → Slack notification ❌
    │
    └─ NO  → Workflow fails
            (No deployment)
            Slack notification ❌
```

## Advanced Configuration

### Custom Build Commands

Edit `.github/workflows/ci-cd.yml`:

```yaml
- name: Build application
  run: npm run build
  # Add env variables as needed
  env:
    CUSTOM_VAR: value
```

### Skip Certain Jobs

Add to commit message:

```bash
git commit -m "feat: something [skip tests]"
```

### Run Workflow Manually

1. Go to **Actions** tab
2. Select workflow
3. Click **Run workflow**

## Support

For issues:
1. Check workflow logs in Actions tab
2. Verify all secrets are set correctly
3. Review error messages carefully
4. Check related documentation

---

**Last Updated**: April 2026
**Version**: 1.0
