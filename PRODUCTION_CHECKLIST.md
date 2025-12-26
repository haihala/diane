# Production Deployment Checklist

Use this checklist to prepare for your first production deployment.

## ☐ 1. Register Firebase Web App

**Status**: Not yet done (project has no web apps)

```bash
# Create the web app
firebase apps:create web --project diane-prod

# Get the configuration
firebase apps:sdkconfig web --project diane-prod
```

**Expected output**: Firebase configuration object with 3 values:
- `apiKey`
- `authDomain`
- `projectId`

**Alternative**: Get from Firebase Console > Project Settings > Your apps

---

## ☐ 2. Add GitHub Secrets (Required for CI/CD)

**Status**: Not yet done

GitHub Actions won't work until these secrets are added.

**Follow**: [.github/SECRETS_SETUP.md](.github/SECRETS_SETUP.md)

**Required secrets** (3 total):
- [ ] `PUBLIC_FIREBASE_API_KEY`
- [ ] `PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `PUBLIC_FIREBASE_PROJECT_ID`

**Where**: GitHub repo > Settings > Secrets and variables > Actions

---

## ☐ 3. Update Firestore Security Rules

**Status**: Current rules expire **2026-01-25**

**File**: `firestore.rules`

**Current state**: Open to all (development rules)

```javascript
// Current (expires soon)
allow read, write: if request.time < timestamp.date(2026, 1, 25);
```

**For production**, update to proper rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /entries/{entry} {
      // Option 1: Authenticated users only (recommended)
      allow read, write: if request.auth != null;
      
      // Option 2: Public read, authenticated write
      // allow read: if true;
      // allow write: if request.auth != null;
      
      // Option 3: Per-user data isolation
      // allow read, write: if request.auth != null 
      //   && request.auth.uid == resource.data.userId;
    }
  }
}
```

Deploy rules separately:
```bash
firebase deploy --only firestore:rules
```

---

## ☐ 4. Test Locally with Production Config (Optional)

**Status**: Can test now

**Purpose**: Verify Firebase config works before deploying

1. Copy `.env.example`:
   ```bash
   cp svelte-app/.env.example svelte-app/.env.local
   ```

2. Edit `.env.local` with Firebase config from Step 1

3. Build and preview:
   ```bash
   cd svelte-app
   npm run build
   npm run preview
   ```

4. Visit http://localhost:4173 and test creating an entry

5. Check Firebase Console > Firestore to see if data appears

---

## ☐ 5. Deploy to Production

### Deploy via GitHub (Recommended)

**Prerequisites**: 
- [x] GitHub secrets added (Step 2)
- [x] Code pushed to main branch

**Process**:
```bash
git add .
git commit -m "Configure Firebase for production"
git push origin main
```

GitHub Actions will automatically:
1. Run `npm run validate` ✓
2. Build with environment variables ✓
3. Deploy to Firebase ✓

**Monitor**: GitHub repo > Actions tab

**Result**: Deployed to `https://diane-prod.web.app`

### Manual Deploy (Alternative)

**Prerequisites**:
- [x] Environment variables set (see DEPLOYMENT.md)

**Process**:
```bash
cd svelte-app
npm run validate
npm run build
cd ..
firebase deploy
```

---

## ☐ 6. Verify Production Deployment

After deployment:

- [ ] Visit production URL: `https://diane-prod.web.app`
- [ ] Create a test entry
- [ ] Check Firebase Console > Firestore > entries collection
- [ ] Verify data appears correctly
- [ ] Test search functionality
- [ ] Check browser console for errors

---

## ☐ 7. Set Up Authentication (Future)

**Status**: Not yet implemented

**When ready**:
1. Enable Firebase Authentication in Firebase Console
2. Choose auth providers (Email/Password, Google, etc.)
3. Update Firestore rules to require authentication
4. Implement login/signup UI
5. Update app to handle auth state

---

## ☐ 8. Optional Enhancements

Post-deployment improvements:

- [ ] Set up custom domain
- [ ] Enable Firebase Analytics
- [ ] Configure Firebase App Check (DDoS protection)
- [ ] Set up monitoring and alerts
- [ ] Configure CORS for Storage
- [ ] Set up budget alerts in Google Cloud Console

---

## Current Status Summary

✅ **Ready for deployment**:
- Code is complete and validated
- Build system works
- CI/CD workflows configured
- Documentation complete

⚠️ **Action required before production**:
1. Register Firebase web app
2. Add GitHub secrets (for CI/CD)
3. Update Firestore security rules

📝 **Optional but recommended**:
- Test locally with production config
- Set up authentication

---

## Quick Start (For First Deployment)

If you just want to deploy ASAP:

```bash
# 1. Create Firebase web app
firebase apps:create web --project diane-prod

# 2. Get config
firebase apps:sdkconfig web --project diane-prod

# 3. Add secrets to GitHub (manual step - see .github/SECRETS_SETUP.md)

# 4. Deploy via GitHub
git add .
git commit -m "Configure Firebase for production"
git push origin main

# Or deploy manually
export PUBLIC_FIREBASE_API_KEY="..."
export PUBLIC_FIREBASE_AUTH_DOMAIN="..."
# ... (set all 3 variables)
cd svelte-app && npm run build && cd .. && firebase deploy
```

---

## Help & Documentation

- **Complete deployment guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **GitHub secrets setup**: [.github/SECRETS_SETUP.md](.github/SECRETS_SETUP.md)
- **Development setup**: [DEVELOPMENT.md](DEVELOPMENT.md)
- **Architecture overview**: [ARCHITECTURE.md](ARCHITECTURE.md)

## Need Help?

Check the troubleshooting sections in:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment issues
- [DEVELOPMENT.md](DEVELOPMENT.md) - Local development issues
- [.github/SECRETS_SETUP.md](.github/SECRETS_SETUP.md) - GitHub Actions issues
