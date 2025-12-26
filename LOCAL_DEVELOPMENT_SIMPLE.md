# Simplified Local Development (No Web App Required)

If you want to develop locally without registering a Firebase web app, you can use the emulator with placeholder values.

## Quick Start (No Setup Needed)

The app is already configured to work with the Firebase emulator using demo values:

```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Start dev server
cd svelte-app
npm run dev
```

That's it! The app will connect to the local emulator and work perfectly.

## How It Works

When running on `localhost`, the app:
1. Uses fallback demo values for Firebase config (doesn't matter what they are)
2. Automatically connects to Firestore emulator on port 8080
3. Stores all data in the emulator (not in production Firebase)

## When You DO Need Real Firebase Config

You only need real Firebase configuration when:

1. **Deploying to production** (obviously needs real Firebase)
2. **Testing production build locally** (optional - to verify prod config works)
3. **Using CI/CD** (GitHub Actions needs secrets to build)

## Production Deployment (Web App Required)

When you're ready to deploy to production, you'll need to:

1. Register a Firebase web app
2. Add GitHub secrets (if using CI/CD)
3. Or set environment variables (if deploying manually)

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions.

## Summary

**For local development**: Nothing needed, just run emulators!

**For production deployment**: Register web app and configure secrets.

This keeps local development simple while supporting production deployments when needed.
