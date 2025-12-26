# GitHub Secrets Setup for CI/CD

The GitHub Actions workflows need Firebase configuration to build the app. Follow these steps to add the required secrets.

## Prerequisites

You need:

1. Admin access to the GitHub repository
2. Firebase web app configuration (see [DEPLOYMENT.md](DEPLOYMENT.md) Step 1)

## Required Secrets

Add these **3 secrets** to your GitHub repository:

| Secret Name                   | Example Value                | Description          |
| ----------------------------- | ---------------------------- | -------------------- |
| `PUBLIC_FIREBASE_API_KEY`     | `AIzaSyAbc123...`            | Firebase API key     |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | `diane-prod.firebaseapp.com` | Firebase auth domain |
| `PUBLIC_FIREBASE_PROJECT_ID`  | `diane-prod`                 | Firebase project ID  |

## How to Add Secrets

### Step 1: Get Firebase Configuration

First, get your Firebase web app configuration:

```bash
# Create a web app if you haven't already
firebase apps:create web --project diane-prod

# Get the configuration
firebase apps:sdkconfig web --project diane-prod
```

Or from Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select `diane-prod` project
3. Click gear icon ⚙️ > **Project settings**
4. Scroll to **Your apps** section
5. Copy the config object values

### Step 2: Add Secrets to GitHub

1. **Go to your GitHub repository**
2. **Click Settings** (top navigation)
3. **In left sidebar**, expand **Secrets and variables** > click **Actions**
4. **Click "New repository secret"**

For each secret:

- **Name**: Enter the exact secret name (e.g., `PUBLIC_FIREBASE_API_KEY`)
- **Secret**: Enter the value from Firebase config
- Click **Add secret**

Repeat for all 3 secrets.

### Step 3: Verify Secrets Are Added

After adding all secrets, you should see:

```
✓ PUBLIC_FIREBASE_API_KEY
✓ PUBLIC_FIREBASE_AUTH_DOMAIN
✓ PUBLIC_FIREBASE_PROJECT_ID
```

You'll also see:

- `FIREBASE_SERVICE_ACCOUNT_DIANE_PROD` (auto-added by Firebase)
- `GITHUB_TOKEN` (automatically provided by GitHub)

## Test the Setup

### Option 1: Push to Main

The easiest way to test:

```bash
git add .
git commit -m "Configure Firebase for production"
git push origin main
```

Check the **Actions** tab in GitHub to see the workflow run.

### Option 2: Create a Pull Request

```bash
git checkout -b test-ci-setup
git add .
git commit -m "Test CI setup"
git push origin test-ci-setup
```

Then create a PR on GitHub. The preview deployment will run automatically.

## Workflow Files

The secrets are used in:

- `.github/workflows/firebase-hosting-merge.yml` (production deploys)
- `.github/workflows/firebase-hosting-pull-request.yml` (PR previews)

Both workflows now include:

```yaml
- run: |
    cd svelte-app
    npm ci
    npm run validate
    npm run build
  env:
    PUBLIC_FIREBASE_API_KEY: ${{ secrets.PUBLIC_FIREBASE_API_KEY }}
    PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.PUBLIC_FIREBASE_AUTH_DOMAIN }}
    PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.PUBLIC_FIREBASE_PROJECT_ID }}
```

## Troubleshooting

### Workflow fails with "SECRET_NAME not found"

**Problem**: Secret name doesn't match exactly.

**Solution**:

- Secret names are case-sensitive
- Must match exactly: `PUBLIC_FIREBASE_API_KEY` not `public_firebase_api_key`
- Check for typos

### Build succeeds but app doesn't work in production

**Problem**: Secrets might be empty or incorrect.

**Solution**:

1. Verify secret values in GitHub Settings
2. Re-add the secrets with correct values
3. Re-run the workflow

### Workflow fails with "Permission denied"

**Problem**: GitHub Actions doesn't have access to secrets from forks.

**Solution**:

- Secrets only work for the main repository
- Forks cannot access secrets (this is intentional for security)
- The PR workflow includes: `if: ${{ github.event.pull_request.head.repo.full_name == github.repository }}`

## Security Notes

✅ **GitHub Secrets are encrypted** and not visible after adding  
✅ **Secrets are not logged** in workflow output  
✅ **Forks cannot access secrets** (security feature)  
✅ **Only repository admins** can add/view secrets

⚠️ **These are PUBLIC variables** - they're embedded in the client-side code  
⚠️ **Firebase API keys are meant to be public** - security is enforced through Firestore rules

## Next Steps

After adding secrets:

1. ✅ Push to main or create a PR
2. ✅ Watch the Actions tab for workflow success
3. ✅ Visit deployed URL to verify it works
4. ✅ Check Firestore Console to see production data

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment documentation.
