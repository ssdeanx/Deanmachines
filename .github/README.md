# GitHub Actions Workflows Documentation

This document describes the modern CI/CD pipeline setup for the DeanMachines project, implementing 2025 best practices for solo development teams with AI assistance.

## 🎯 Overview

Our workflow suite consists of 5 main workflows designed for security, efficiency, and maintainability:

1. **Main Pipeline** (`main-pipeline.yml`) - Core CI/CD with parallel jobs
2. **Security & Compliance** (`security.yml`) - Comprehensive security scanning
3. **Production Deployment** (`deploy.yml`) - Secure deployment with rollback
4. **Automated Maintenance** (`maintenance.yml`) - Code maintenance and health checks
5. **Directive Injection** (`inject-directives.yml`) - AI copilot directive automation

## 🔧 Workflows

### 1. Main Pipeline (`main-pipeline.yml`)

**Triggers:** Push to main/develop, PRs, weekly dependency checks

**Key Features:**
- ✅ Parallel execution for faster feedback
- 🔒 Minimal security permissions
- 📊 Multi-Node version testing (18.x, 20.x)
- 🏗️ Artifact management with retention
- 📦 Automated dependency updates with testing

**Jobs:**
- `lint` - ESLint and TypeScript checking
- `test` - Test suite with coverage
- `security` - Security auditing
- `build` - Production build with size tracking
- `dependencies` - Automated dependency PRs
- `ci-complete` - Status summary

### 2. Security & Compliance (`security.yml`)

**Triggers:** Push/PR to main, weekly scheduled scans

**Key Features:**
- 🔍 Secret detection with TruffleHog
- 📦 Dependency vulnerability scanning
- 🔬 CodeQL static analysis
- 🛡️ OWASP security testing

**Jobs:**
- `secret-scan` - Detects exposed secrets
- `dependency-security` - NPM audit + Snyk scanning
- `codeql` - GitHub's security analysis
- `owasp-scan` - OWASP dependency checking
- `security-summary` - Consolidated reporting

### 3. Production Deployment (`deploy.yml`)

**Triggers:** Push to main, version tags, releases

**Key Features:**
- 🔐 OIDC-ready for secure cloud deployment
- ✅ Pre-deployment validation
- 🐳 Docker build with multi-arch support
- 🔄 Automatic rollback preparation
- 📊 Deployment tracking

**Jobs:**
- `pre-deploy-validation` - Full test suite
- `production-build` - Optimized build
- `docker-build` - Container creation
- `post-deploy-validation` - Health checks
- `prepare-rollback` - Failure handling

### 4. Automated Maintenance (`maintenance.yml`)

**Triggers:** Weekly scheduled, manual dispatch with options

**Key Features:**
- 🧹 Automated code formatting
- 📚 Documentation generation
- 🏥 Project health monitoring
- 📊 Bundle size analysis
- 🔍 Dead code detection

**Jobs:**
- `code-maintenance` - Linting, formatting, patch updates
- `docs-maintenance` - API docs, README updates
- `project-health` - Performance and security metrics
- `maintenance-summary` - Consolidated reporting

### 5. Directive Injection (`inject-directives.yml`)

**Triggers:** PRs affecting TypeScript files

**Purpose:** Automatically injects Copilot directives for AI-assisted development

## 🔐 Security Best Practices

### Implemented Security Measures

1. **Minimal Permissions** - Each job has only required permissions
2. **Secret Scanning** - Multiple tools detect exposed credentials
3. **Dependency Security** - Automated vulnerability detection
4. **Action Pinning** - All actions pinned to specific versions
5. **OIDC Ready** - Supports OpenID Connect for cloud deployments

### Required Secrets (Optional)

```bash
# For enhanced functionality (all optional):
SNYK_TOKEN=your_snyk_token_here
CODECOV_TOKEN=your_codecov_token_here

# For deployment (configure as needed):
DEPLOYMENT_URL=https://your-app.com
```

### Repository Variables

```bash
# Optional configuration variables:
MASTRA_URL=http://localhost:4111  # Default development URL
```

## 📊 Workflow Outputs

### Artifacts Generated

- **Coverage Reports** - Test coverage data (7 days retention)
- **Security Reports** - Vulnerability findings (30 days retention)
- **Health Reports** - Project health metrics (30 days retention)
- **Build Packages** - Deployment artifacts (30 days retention)
- **Documentation** - Generated API docs (committed to repo)

### Automated PRs Created

- **Dependency Updates** - Weekly dependency update PRs
- **Maintenance** - Code formatting and cleanup commits

### Issues Created

- **Deployment Failures** - Automatic rollback notifications
- **Health Alerts** - Weekly health report summaries (if issues found)

## 🚀 Getting Started

### 1. Repository Setup

1. Enable GitHub Actions in your repository
2. Configure branch protection rules for `main`
3. Set up required secrets (optional)
4. Configure repository variables (optional)

### 2. Local Development Scripts

Ensure your `package.json` includes these scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test:ci": "vitest run",
    "build:mastra": "mastra build --dir src/mastra"
  }
}
```

### 3. First Run

1. Push code to trigger the main pipeline
2. Review any security findings
3. Check generated artifacts and reports
4. Configure additional secrets as needed

## 🔧 Customization

### Adding New Environments

To add staging/preview environments:

1. Modify `deploy.yml` environment detection
2. Add environment-specific secrets
3. Configure deployment targets

### Custom Security Tools

To add additional security scanning:

1. Add new jobs to `security.yml`
2. Configure tool-specific secrets
3. Update summary reporting

### Build Optimizations

To customize build process:

1. Modify `production-build` job in `deploy.yml`
2. Add build-specific environment variables
3. Update artifact packaging

## 📈 Monitoring & Metrics

### Key Metrics Tracked

- Build success rates and duration
- Test coverage trends
- Security vulnerability counts
- Bundle size changes
- Dependency freshness

### Alerts & Notifications

- Deployment failures create issues
- Security findings generate reports
- Health issues trigger weekly summaries

## 🤝 Integration with AI Development

### Copilot Directive System

The workflows integrate with our inline directive system:

- Automatic directive injection on PRs
- AI-powered code review suggestions
- Automated maintenance tasks

### AI-Friendly Reporting

All reports are structured for AI consumption:

- Markdown format for easy parsing
- Structured data in artifacts
- Clear action items and recommendations

## 🔄 Maintenance

### Regular Tasks

- Review weekly health reports
- Update action versions quarterly
- Audit security settings monthly
- Optimize workflow performance as needed

### Troubleshooting

Common issues and solutions:

1. **Build Failures** - Check Node.js version compatibility
2. **Security Alerts** - Review and update dependencies
3. **Permission Errors** - Verify GITHUB_TOKEN permissions
4. **Artifact Issues** - Check retention policies

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Security Hardening Guide](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [OIDC with Cloud Providers](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

---

*This documentation is automatically maintained by the GitHub Actions workflows.*
