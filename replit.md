# Myanmar Buddhist Prayer Beads - Koenawin

## Overview
A web-based 3D rosary (prayer beads) application for Myanmar Buddhist prayer traditions, featuring 108 interactive beads arranged in a traditional mala configuration with integrated 9x9 grid system for daily meditation tracking.

## Current State
- Fully functional static website with Three.js 3D visualization
- 9x9 grid system tracking 83-day meditation cycle
- Sequential bead counting with cycle tracking
- Mobile-friendly touch controls
- localStorage persistence for progress
- **PWA with offline support** - Works without internet

## Project Architecture
```
/
├── index.html       # Main HTML with UI overlay, meta tags, and modals
├── styles.css       # Styling with Myanmar-inspired color palette
├── app.js           # Three.js 3D application with grid logic
├── vite.config.js   # Vite + PWA configuration
├── package.json     # Project dependencies
└── public/          # PWA icons (192x192, 512x512)
```

## PWA Features
- **Offline Support**: Service worker caches all assets for offline use
- **Installable**: Can be installed on home screen like native app
- **Auto-Update**: New versions install automatically when online
- **Font Caching**: Google Fonts (Myanmar text) cached for offline use
- **Manifest**: Full web app manifest with icons and theme colors

## Features
### 3D Rosary
- 108 prayer beads in circular mala arrangement
- Guru bead with tassels at center bottom
- Sequential counting (click advances to next bead)
- Bead animation on selection
- Cycle counter (auto-increments after 108 beads)
- Reset functionality
- Graceful WebGL fallback

### 9x9 Grid System
- 83-day cycle (81 meditation days + 2 rest days)
- Daily round tracking (1-81 based on start date)
- Cycles needed per day (row number = cycles needed)
- Vegetarian day alerts (column 4 days)
- Rest day detection (days 82-83)
- Monday-only start dates
- Settings modal for date selection

### Persistence
- Start date saved to localStorage
- Daily cycle count persisted
- Progress resets at midnight for new day

## Color Palette
- Primary: #8B4513 (sandalwood brown)
- Secondary: #DAA520 (golden yellow)
- Background: #2F1B14 (dark wood)
- Text: #F5F5DC (cream)
- Accent: #CD853F (light brown)
- Sacred: #FF6B35 (saffron orange)

## Fonts
- Noto Sans Myanmar - For Myanmar script
- Lora - For English text

## 9x9 Grid Logic
```
Row 1: Days 1-9   (1 cycle needed)
Row 2: Days 10-18 (2 cycles needed)
...
Row 9: Days 73-81 (9 cycles needed)
Days 82-83: Rest days (Saturday/Sunday)
```
- Vegetarian days: Column 4 (days 4, 13, 22, 31, 40, 49, 58, 67, 76)

## Run Command
```
npm run dev
```

## Recent Changes
- December 2024: Initial implementation with Three.js
- December 2024: Added 9x9 grid system with daily goal tracking
- December 2024: Added settings modal for start date
- December 2024: Added vegetarian/rest day detection
- December 2024: Added localStorage persistence
- December 2024: Implemented magic square grid formula matching original KoeNaWin app
- December 2024: Added Buddha attribute names (1-9) for daily rounds
- December 2024: Made app fully mobile responsive with breakpoints at 600px, 400px, 600px height, and landscape mode
- December 2024: Added child mode with 9 beads (larger, easier to count) vs traditional 108 beads
- December 2024: Added vibration feedback on bead selection (30ms) and cycle completion (pattern)
- December 2024: Added celebration overlay with Myanmar text when daily goal is completed
- December 2024: Added automatic day rollover detection (60s interval) to reset progress at Myanmar midnight
- December 2024: Added README.md with project documentation and credits
- December 2024: Added PWA with offline support (vite-plugin-pwa)
- December 2024: Added comprehensive meta tags (SEO, Open Graph, Twitter Cards)
- December 2024: Generated new Buddhist mala logo/icon
