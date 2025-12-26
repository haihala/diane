# Development Guide

## Quick Start

### Prerequisites

- Node.js 22+ and npm
- Firebase CLI: `npm install -g firebase-tools`

### 1. Install Dependencies

```bash
cd svelte-app
npm install
```

### 2. Start Firebase Emulators

**Required for local development** - The app needs Firebase emulators to save and retrieve data.

```bash
# From the project root directory
firebase emulators:start
```

This will start:
- 🔥 Firestore Emulator (port 8080)
- 🔐 Auth Emulator (port 9099)
- ⚡ Functions Emulator (port 5001)
- 🌐 Hosting Emulator (port 5000)
- 📊 Emulator UI (http://localhost:4000)

**Keep this terminal running** - you'll need a separate terminal for the dev server.

### 3. Start Development Server

In a **new terminal**:

```bash
cd svelte-app
npm run dev
```

The app will automatically connect to the Firebase emulators when running on localhost.

**Note**: Environment variables are NOT needed for local development with emulators.

### Access

- **Dev Server**: http://localhost:5173 (Vite dev server)
- **Emulator UI**: http://localhost:4000 (view Firestore data, logs, etc.)

## How It Works

### Firebase Connection

The app automatically detects when running on localhost and connects to the emulators:

```typescript
// src/lib/services/firebase.ts
if (window.location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

### Data Persistence

- **Emulator data is NOT persisted** between emulator restarts
- Each time you run `firebase emulators:start`, you start with a clean database
- This is perfect for development and testing

## Troubleshooting

### "Hanging" when saving notes

**Symptom**: The app hangs/freezes when trying to save an entry.

**Cause**: Firebase emulators are not running.

**Solution**: Make sure `firebase emulators:start` is running in a separate terminal.

### Port conflicts

If you see errors about ports already in use:

```bash
# Kill processes on specific ports (if needed)
kill $(lsof -t -i:8080)  # Firestore
kill $(lsof -t -i:9099)  # Auth
```

Or configure different ports in `firebase.json`.

### Emulator won't start

Make sure Firebase CLI is installed:

```bash
npm install -g firebase-tools
firebase --version
```

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete production deployment instructions.

**Quick summary**:

1. **Set up Firebase Web App** (one-time):
   ```bash
   firebase apps:create web --project diane-prod
   ```

2. **Configure environment variables** in `.env.local`:
   ```bash
   cp svelte-app/.env.example svelte-app/.env.local
   # Edit .env.local with your Firebase config
   ```

3. **Build and deploy**:
   ```bash
   cd svelte-app
   npm run validate
   npm run build
   cd ..
   firebase deploy
   ```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions, GitHub Actions setup, and troubleshooting.

## Environment Variables

### Development (Emulator)

**No environment variables needed!** The app uses demo values and connects to the local emulator.

### Production

Firebase configuration is loaded from environment variables:

- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_AUTH_DOMAIN`
- `PUBLIC_FIREBASE_PROJECT_ID`

**These are PUBLIC variables** - they're safe to expose in client-side code. Firebase security is enforced through Firestore rules.

**Where to set them**:
- Local: `.env.local` (gitignored)
- CI/CD: GitHub Secrets
- Manual: Shell exports or `.env` file

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete setup instructions.

## Code Quality

Before committing:

```bash
cd svelte-app
npm run validate
```

This runs:
- ✅ Prettier formatting check
- ✅ ESLint with strict rules
- ✅ Svelte component validation
- ✅ TypeScript compilation check

All checks must pass before code can be merged.
