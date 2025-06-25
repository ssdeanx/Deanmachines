# 🔧 GitHub Actions Setup Guide

This guide will help you set up the workflows properly with all required secrets and configurations.

## Required GitHub Repository Secrets

Go to your repository **Settings > Secrets and variables > Actions** and add these secrets:

### 1. Codecov Integration
- **Secret Name:** `CODECOV_TOKEN`
- **Value:** Your Codecov token from https://codecov.io/
- **Usage:** Uploads test coverage reports to Codecov for tracking

### 2. Deployment (if using Vercel/Netlify)
- **VERCEL_TOKEN** - Your Vercel deployment token
- **NETLIFY_AUTH_TOKEN** - Your Netlify personal access token

## Repository Variables (Optional)

Go to **Settings > Secrets and variables > Actions > Variables tab**:

- **MASTRA_URL:** `http://localhost:4111` (or your preferred URL)
- **NODE_VERSION:** `20.x`

## Package.json Scripts Required

Make sure your `package.json` includes these scripts:

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "test": "vitest",
    "test:ci": "vitest run",
    "test:coverage": "vitest run --coverage",
    "build": "next build",
    "type-check": "tsc --noEmit"
  }
}
```

## Codecov Setup Steps

1. Go to https://codecov.io/
2. Sign in with your GitHub account
3. Add your repository
4. Copy the repository token
5. Add it as `CODECOV_TOKEN` secret in GitHub

## Workflow Features

### 🚀 Main Pipeline (`main-pipeline.yml`)
- **Triggers:** Push to main/develop, PRs, weekly dependency checks
- **Jobs:** Lint, Test (with coverage), Security audit, Build, Deploy
- **Features:** 
  - Parallel execution for speed
  - Codecov integration
  - Multi-node testing (Node 18 & 20)
  - Security vulnerability scanning
  - Build artifact caching

### 🔒 Security (`security.yml`)
- **Triggers:** Push to main, PRs, daily scans
- **Features:**
  - CodeQL analysis
  - Dependency vulnerability scanning
  - Secret scanning
  - License compliance

### 🔄 Maintenance (`maintenance.yml`)
- **Triggers:** Weekly schedule
- **Features:**
  - Dependency updates
  - Cache cleanup
  - Security audits
  - Automated PR creation for updates

## Tips for Solo Development

1. **Enable branch protection** on main branch requiring status checks
2. **Use draft PRs** for work-in-progress features
3. **Set up notifications** for workflow failures
4. **Review security alerts** weekly via the maintenance workflow
5. **Monitor coverage trends** in Codecov dashboard

## Troubleshooting

### Common Issues:
- **"Context access might be invalid"** - Add the secret in repository settings
- **"npm script not found"** - Add missing scripts to package.json
- **"Codecov upload failed"** - Check token and coverage file paths

### Workflow Status:
- ✅ Green: All checks passed
- ❌ Red: Check failed - click for details
- 🟡 Yellow: In progress or skipped

All workflows are designed to be lightweight and fail-fast for quick feedback during development.
