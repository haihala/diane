# Diane

A personal knowledge management and journaling system inspired by Special Agent
Dale Cooper's voice memos to Diane in Twin Peaks.

## Vision

Diane is designed to be your digital assistant for capturing and organizing
thoughts, ideas, tasks, and experiences. Like Cooper's recordings, it serves as
a medium for externalizing your thoughts - but unlike the show, Diane actually
responds and helps you make sense of it all.

## What Diane Does

### Content Types

- **Vague Ideas** - Capture fleeting thoughts without overthinking structure
  - Tasks and todos
  - Experiences and reflections
  - Media to consume (books, movies, games)
- **Numerical Tracking** - Log quantifiable data over time
  - Weight, fitness metrics
  - Habit tracking
  - Progress measurements
- **Media Trackers** - Manage your consumption and collections
- **Interconnected Documents** - Build rich, wiki-like knowledge bases
  - Game design specs
  - World building
  - RPG campaign notes
  - Any complex topic that benefits from linked thinking

### Core Principles

1. **Frictionless Capture** - Logging should be quick and easy
2. **Mobile-First** - Accessible anywhere, anytime
3. **Minimal Maintenance** - The system works for you, not vice versa
4. **Interconnected** - Ideas link together naturally, like a personal wiki
5. **Intelligent Search** - Semantic search understands what you mean, not just what you say
6. **Selective Sharing** - Share specific parts with others when needed

## Tech Stack

- **Frontend**: SvelteKit (Svelte 5) with TypeScript
- **Backend**: Firebase (Firestore + static hosting)
- **Build**: Vite with static adapter
- **Code Quality**: ESLint (strict), Prettier, TypeScript (strict mode)

## Project Structure

```
diane/
├── svelte-app/          # SvelteKit frontend application
│   ├── src/
│   │   ├── lib/         # Shared components, utilities, services
│   │   └── routes/      # File-based routing
│   └── package.json
├── functions/           # Firebase Cloud Functions (Python)
│   └── main.py
├── firestore.rules      # Database security rules
├── storage.rules        # Storage security rules
└── firebase.json        # Firebase configuration
```

## Getting Started

### Prerequisites

- Node.js 22+ and npm
- Firebase CLI: `npm install -g firebase-tools`

### Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for complete development setup instructions.

**Quick start**:

1. Install dependencies:
   ```sh
   cd svelte-app
   npm install
   ```

2. Start Firebase emulators (required):
   ```sh
   firebase emulators:start
   ```

3. Start dev server (in a new terminal):
   ```sh
   cd svelte-app
   npm run dev
   ```

4. Before committing, validate:
   ```sh
   npm run validate
   ```

### Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete production deployment instructions including:
- Firebase web app registration
- Environment variable configuration
- GitHub Actions setup
- Security best practices

**Quick deployment**:
```sh
firebase deploy
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design decisions
- [CONVENTIONS.md](CONVENTIONS.md) - Coding standards, linting rules, and best practices
- [COMPONENT_STANDARDS.md](COMPONENT_STANDARDS.md) - UI component guidelines
- [DEVELOPMENT.md](DEVELOPMENT.md) - Local development setup with emulators
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [agents.md](agents.md) - AI agent collaboration guidelines

## Current Status

This project is in early development. Current features:
- Basic UI with search bar and entry creation
- Firebase Firestore integration for data persistence
- Markdown support for entries
- Dark theme with gradient backgrounds

## License

Private project - All rights reserved
