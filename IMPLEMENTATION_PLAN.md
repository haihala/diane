# Diane Implementation Plan

This document outlines the development roadmap for Diane, from MVP to full feature set.

## Phase 1: Foundation (MVP)

### 1.1 Authentication & User Setup

- [ ] Firebase Authentication integration
- [ ] Sign up / Sign in flow
- [ ] User profile creation
- [ ] Session management

### 1.2 Core Data Model

- [ ] Firestore schema design
  - [ ] Users collection
  - [ ] Entries collection (main content type)
  - [ ] Spaces collection (organizational structure)
- [ ] Security rules implementation
- [ ] Basic CRUD operations

### 1.3 Basic UI Components

- [x] Layout component with navigation
- [x] Main search/input interface (AI-like text box)
- [x] Global CSS design system with dark theme
- [x] SearchBar component with animations
- [x] Landing page with hero section
- [x] Quick action cards UI
- [ ] Entry list view
- [ ] Basic entry create/edit modal

### 1.4 Entry System (Simplified)

- [ ] Create new entry with title
- [ ] Edit entry title and body
- [ ] Delete entry
- [ ] Markdown rendering (basic)
- [ ] Save to Firestore

**Goal**: Users can sign in, create, read, update, and delete text entries.

---

## Phase 2: Organization & Search

### 2.1 Spaces (Organizational Structure)

- [ ] Create/edit/delete spaces
- [ ] Assign entry to a space (0-1 relationship)
- [ ] Space hierarchy (parent-child relationships)
- [ ] Space navigation UI
- [ ] Filter entries by space

### 2.2 Tags System

- [ ] Tag input component
- [ ] Add/remove tags from entries
- [ ] Tag autocomplete (suggest existing tags)
- [ ] Filter entries by tags
- [ ] Tag cloud/list view

### 2.3 Basic Search

- [ ] Text-based search (title + body)
- [ ] Search as you type
- [ ] Display search results in main interface
- [ ] Highlight matching text

**Goal**: Users can organize entries into spaces and find them using tags and search.

---

## Phase 3: Rich Content & Interconnectivity

### 3.1 Enhanced Markdown

- [ ] Advanced markdown rendering (like Obsidian)
  - [ ] Tables, code blocks, checklists
  - [ ] Image embedding
  - [ ] LaTeX math support (if needed)
- [ ] Markdown editor improvements
  - [ ] Syntax highlighting
  - [ ] Live preview toggle
  - [ ] Editor toolbar

### 3.2 Inter-Entry Links

- [ ] WikiLink syntax support (`[[Entry Title]]`)
- [ ] Link to entries in same space
- [ ] Link to entries in parent space
- [ ] Explicit cross-space links (`[[space/Entry Title]]`)
- [ ] Link autocomplete during editing
- [ ] Clickable links that navigate to entries

### 3.3 Backlinks

- [ ] Track backlinks (entries that link to current entry)
- [ ] Display backlinks section in entry view
- [ ] Navigate to backlinking entries
- [ ] Backlink count indicator

**Goal**: Users can create rich, interconnected documents with wiki-like linking.

---

## Phase 4: Progress Tracking & Metadata

### 4.1 Progress Tracks

- [ ] Progress track component (todo/doing/done)
- [ ] Assign entry to single progress track
- [ ] Update progress status
- [ ] Filter entries by progress status
- [ ] Progress dashboard/overview

### 4.2 Metadata Block UI

- [ ] Unified metadata block component
  - [ ] Space selector
  - [ ] Tag input
  - [ ] Progress track selector
  - [ ] Number trackers (see 4.3)
- [ ] Collapsible metadata section
- [ ] Metadata display in list views

### 4.3 Number Trackers

- [ ] Add numerical tracking fields to entries
- [ ] Append-only number list inputs
- [ ] Multiple trackers per entry
- [ ] Timestamp for each number entry
- [ ] Display number history

**Goal**: Users can track progress and numerical data within entries.

---

## Phase 5: Semantic Search & AI Features

### 5.1 Semantic Search Infrastructure

- [ ] Research embedding solutions
  - Option A: Firebase Extensions (if available)
  - Option B: Cloud Functions + Vector DB
  - Option C: Third-party service (Pinecone, Algolia)
- [ ] Generate embeddings for entries
- [ ] Store embeddings efficiently
- [ ] Vector similarity search implementation

### 5.2 Smart Search Interface

- [ ] Semantic search integration
- [ ] Show semantically similar entries
- [ ] Combine keyword + semantic results
- [ ] Result ranking algorithm

### 5.3 AI Assistance (Optional/Future)

- [ ] Summarization of long entries
- [ ] Suggest tags automatically
- [ ] Suggest related entries
- [ ] Natural language queries

**Goal**: Users can find entries based on meaning, not just keywords.

---

## Phase 6: Mobile Optimization

### 6.1 Mobile UI/UX

- [ ] Responsive design refinement
- [ ] Touch-optimized controls
- [ ] Mobile navigation patterns
- [ ] Swipe gestures (if applicable)

### 6.2 Mobile-Specific Features

- [ ] Quick capture interface
- [ ] Voice-to-text input
- [ ] Offline support (service worker)
- [ ] PWA manifest for "install to home screen"

### 6.3 Performance

- [ ] Lazy loading for large lists
- [ ] Image optimization
- [ ] Code splitting
- [ ] Bundle size optimization

**Goal**: Fast, native-like experience on mobile devices.

---

## Phase 7: Sharing & Collaboration

### 7.1 Entry Sharing

- [ ] Generate shareable links for entries
- [ ] Public/private toggle
- [ ] Share with specific users (email invite)
- [ ] View-only vs. edit permissions

### 7.2 Shared Spaces

- [ ] Invite collaborators to spaces
- [ ] Real-time collaboration (optional)
- [ ] Activity feed for shared spaces

### 7.3 Export

- [ ] Export single entry (markdown, PDF)
- [ ] Export entire space
- [ ] Backup entire account data

**Goal**: Users can selectively share content and export their data.

---

## Phase 8: Analytics & Insights

### 8.1 Personal Analytics

- [ ] Entry creation trends (calendar heatmap)
- [ ] Most-used tags
- [ ] Space activity overview
- [ ] Number tracker charts/graphs
- [ ] Progress completion stats

### 8.2 Content Analysis

- [ ] Most linked entries
- [ ] Orphaned entries (no links)
- [ ] Stale entries (not updated recently)
- [ ] Suggested cleanup tasks

**Goal**: Users gain insights into their knowledge base and habits.

---

## Phase 9: Polish & Quality of Life

### 9.1 UX Enhancements

- [ ] Keyboard shortcuts
- [ ] Drag-and-drop for organization
- [ ] Bulk operations (delete, move, tag)
- [ ] Undo/redo functionality
- [ ] Dark mode

### 9.2 Notifications

- [ ] Browser notifications for reminders
- [ ] Email digest (weekly summary)
- [ ] Task due date reminders

### 9.3 Settings & Customization

- [ ] User preferences (theme, defaults)
- [ ] Markdown editor preferences
- [ ] Privacy settings
- [ ] Data export/import

**Goal**: Refined, delightful user experience.

---

## Technical Debt & Ongoing Work

### Throughout All Phases

- [ ] Unit tests for core functionality
- [ ] Integration tests for critical flows
- [ ] Performance monitoring
- [ ] Error tracking and logging
- [ ] Security audits
- [ ] Accessibility compliance (WCAG 2.1)
- [ ] Code documentation
- [ ] User documentation/help system

---

## Priority Order

**Must Have (MVP)**: Phase 1, Phase 2.1-2.2
**Should Have (V1)**: Phase 2.3, Phase 3, Phase 4
**Nice to Have (V2+)**: Phase 5, Phase 6, Phase 7, Phase 8, Phase 9

---

## Implementation Notes

### Key Design Decisions

1. **Entry-Centric Model**: Everything is an entry. Tasks, notes, trackers - all use the same base structure with different metadata.

2. **Space Hierarchy**: Spaces can have parent spaces, allowing flexible organization without strict categorization.

3. **Append-Only Numbers**: Number trackers never delete data, only append. This ensures historical data integrity.

4. **Link Resolution Order**: Links search current space first, then parent, then require explicit path. This encourages logical organization.

5. **Mobile First**: While building for web, prioritize mobile UX from the start to avoid retrofitting later.

### Technology Choices

- **SvelteKit**: Fast, modern, great DX. Static generation for hosting simplicity.
- **Firebase**: Managed infrastructure reduces ops burden. Real-time DB for live updates.
- **Markdown**: Universal, future-proof, exportable format.
- **Vector Search**: Required for semantic search. Implementation TBD based on scale and cost.

### Success Metrics

- **Speed to Capture**: Time from opening app to saving a new entry < 5 seconds
- **Mobile Usage**: >50% of entries created on mobile devices
- **Retention**: Weekly active usage after 3 months
- **Interconnectedness**: Average links per entry > 2
- **Search Quality**: Semantic search finds relevant content >80% of the time

---

## Next Steps

1. Set up Firebase project and enable required services
2. Implement authentication flow (Phase 1.1)
3. Design and implement Firestore schema (Phase 1.2)
4. Build main UI layout and navigation (Phase 1.3)
5. Implement basic entry CRUD operations (Phase 1.4)

Once Phase 1 is complete, we'll have a functional MVP ready for dogfooding and iteration.
