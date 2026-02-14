# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KeyTabs is a keyboard-driven guitar tablature editor built as a React web app. Users compose and edit guitar tabs using keyboard navigation and shortcuts, with data persisted to localStorage.

## Commands

- `npm run dev` — Start dev server (Vite, port 5173)
- `npm run build` — TypeScript check + Vite production build
- `npm run preview` — Preview production build locally
- `npm run deploy` — Build for GitHub Pages (adds `.nojekyll`)

No test runner or linter is configured.

## Architecture

**State management:** Zustand stores with localStorage persistence.
- `useTabStore` (`src/services/tab-store.ts`) — Current tab content, metadata, tab list. Keys prefixed with `tab_<uuid>`, `tab-metadata`, `current-tab-id`.
- `useUserStore` (`src/services/user-store.ts`) — User preferences (panel collapse state).

**Domain model:** `TabModel` (`src/models/tab.ts`) — Core data structure and manipulation logic for tablature. Two line types:
- **Staff lines**: 6 strings per chord (standard guitar), operations for insert/delete/copy/paste.
- **Text lines**: Free-form annotations, lyrics, section labels.

Uses `Position` (line, chord, string) and `Range` classes for cell addressing and selection.

**Editor** (`src/components/editor.tsx`) — Main editing surface, composed from:
- Sub-components in `src/components/editor/`: `staff-line.tsx`, `text-line.tsx`, `editor-header.tsx`, `editor-footer.tsx`
- Hooks in `src/hooks/`: `use-editor-state.ts` (state), `use-cursor-navigation.ts` (movement/selection), `use-keyboard-handlers.ts` (input/clipboard)

**Other components:**
- `TabsList` (`src/components/tabs-list.tsx`) — Sidebar listing saved tabs.
- `Keybindings` (`src/components/keybindings.tsx`) — Sidebar showing shortcut reference.

**Constants:** Default tuning is `[e, B, G, D, A, E]`, initial tab width is 32 columns, bar delimiter is `|`, empty note is `-`.

## Conventions

- File names use **kebab-case**: `staff-line.tsx`, `use-editor-state.ts`, `tab-store.ts`.
- React component exports use PascalCase, hooks use camelCase.

## Styling

Dark IDE-inspired theme using Tailwind CSS with custom colors defined in `tailwind.config.js`. Monospace font for tab display.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) deploys to GitHub Pages on push to `main`. Builds with Node 20.
