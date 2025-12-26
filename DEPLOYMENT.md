# Production Deployment Guide

This guide covers deploying Diane to Firebase (static site hosting + Firestore) with proper environment variable configuration.

## Prerequisites

- Firebase CLI installed (`npm install -g firebase-tools`)
- Access to the `diane-prod` Firebase project
- Code passes all validation (`npm run validate`)

## Step 1: Set Up Firebase Web App (One-time setup)

If this is your first deployment, you need to register a web app in Firebase:

### Option A: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the `diane-prod` project
3. Click the gear icon ⚙️ > **Project settings**
4. Scroll down to **Your apps** section
5. Click **Add app** > **Web** (</> icon)
6. Register app name: `Diane Web`
7. Check **"Also set up Firebase Hosting"**
8. Copy the Firebase configuration object

### Option B: Using Firebase CLI

```bash
firebase apps:create web --project diane-prod
```

After creating the app, get the config:

```bash
firebase apps:sdkconfig web --project diane-prod
```

## Step 2: Configure Environment Variables

### For Local Development (Testing Production Build)

1. Copy the example file:
   ```bash
   cp svelte-app/.env.example svelte-app/.env.local
   ```

2. Edit `.env.local` with your Firebase config values:
   ```bash
   PUBLIC_FIREBASE_API_KEY=AIzaSy...
   PUBLIC_FIREBASE_AUTH_DOMAIN=diane-prod.firebaseapp.com
   PUBLIC_FIREBASE_PROJECT_ID=diane-prod
   ```

   **Note**: `.env.local` is in `.gitignore` and will NOT be committed.

### For GitHub Actions / CI/CD

GitHub Actions needs environment variables for production builds. Set these up in your repository settings:

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** for each variable:
   - Name: `PUBLIC_FIREBASE_API_KEY`, Value: your API key
   - Name: `PUBLIC_FIREBASE_AUTH_DOMAIN`, Value: your auth domain
   - Name: `PUBLIC_FIREBASE_PROJECT_ID`, Value: your project ID

The workflows (`.github/workflows/*.yml`) are already configured to use these secrets.

### For Manual Deployment

When deploying manually, create a `.env` file:

```bash
# svelte-app/.env (gitignored - don't commit!)
PUBLIC_FIREBASE_API_KEY=AIzaSy...
PUBLIC_FIREBASE_AUTH_DOMAIN=diane-prod.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=diane-prod
```

## Step 3: Build and Deploy

### Validate First

```bash
cd svelte-app
npm run validate
```

All checks must pass (0 errors).

### Build

```bash
npm run build
```

This creates a production build in `svelte-app/build/`.

### Deploy to Firebase

Deploy the static site and Firestore rules:

```bash
firebase deploy
```

Or deploy only the static site:

```bash
firebase deploy --only hosting
```

### Deploy with Environment Variables

If using environment variables from shell:

```bash
cd svelte-app
npm run build
cd ..
firebase deploy
```

## Step 4: Update GitHub Actions (Optional)

If using GitHub Actions for CI/CD, update the workflow files to include environment variables:

### `.github/workflows/firebase-hosting-merge.yml`

```yaml
- name: Build
  run: npm run build
  working-directory: svelte-app
  env:
    PUBLIC_FIREBASE_API_KEY: ${{ secrets.PUBLIC_FIREBASE_API_KEY }}
    PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.PUBLIC_FIREBASE_AUTH_DOMAIN }}
    PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.PUBLIC_FIREBASE_PROJECT_ID }}
```

## How It Works

### Environment Variables in SvelteKit

SvelteKit uses Vite for environment variables:

- Variables prefixed with `PUBLIC_` are exposed to client-side code
- They're replaced at build time using `import.meta.env.VARIABLE_NAME`
- Values are baked into the static build output

### Development vs Production

| Environment | Firebase Connection |
|-------------|-------------------|
| **Development** (`localhost`) | Connects to Firebase emulator on port 8080 |
| **Production** (deployed) | Connects to real Firebase using env vars |

The code automatically detects the environment:

```typescript
if (browser && (dev || window.location.hostname === 'localhost')) {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

### Security Notes

**Firebase API keys are PUBLIC and safe to expose in client code:**
- They identify your Firebase project
- Security is enforced through Firestore security rules
- Only authorized operations (defined in `firestore.rules`) can be performed

**Best practices:**
- ✅ Use environment variables for configuration
- ✅ Never commit `.env.local` or `.env` files
- ✅ Set proper Firestore security rules
- ✅ Test rules before deploying to production

## Verify Deployment

After deployment:

1. **Visit your site**: `https://diane-prod.web.app` or `https://diane-prod.firebaseapp.com`
2. **Test creating an entry**: Should save to production Firestore
3. **Check Firestore Console**: Verify data appears in Firebase Console
4. **Check browser console**: Look for any errors

## Troubleshooting

### Build succeeds but app doesn't connect to Firebase

**Check**: Are environment variables set during build?

```bash
# Test locally with env vars
cd svelte-app
npm run build
npm run preview
```

Visit `http://localhost:4173` and check browser console.

### "Permission denied" errors in production

**Check**: Firestore security rules in `firestore.rules`

Current rules expire on **2026-01-25**. Update them for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /entries/{entry} {
      // Example: Allow authenticated users
      allow read, write: if request.auth != null;
      
      // Or public read, authenticated write
      // allow read: if true;
      // allow write: if request.auth != null;
    }
  }
}
```

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

### Environment variables not working

**Check**:
1. Variables are prefixed with `PUBLIC_`
2. Values are set before `npm run build`
3. Restart dev server after adding env vars
4. Check `import.meta.env` in browser console

## Rollback

If deployment has issues, Firebase keeps previous versions. You can revert in the Firebase Console under Hosting > Release history.

## Cost Monitoring

Monitor usage in Firebase Console:
- **Firestore**: Document reads/writes/deletes
- **Storage**: Bandwidth and storage used
- **Hosting**: Bandwidth

Set up budget alerts in Google Cloud Console if needed.

## Next Steps

After successful deployment:

1. ✅ Set up custom domain (optional)
2. ✅ Enable Firebase Authentication (when needed)
3. ✅ Configure proper Firestore security rules
4. ✅ Set up monitoring and alerts
