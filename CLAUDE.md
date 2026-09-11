# CLAUDE.md - AI Assistant Guide for Pesocnica

> This file provides essential context for AI assistants working with this codebase.

## Project Overview

**Pesocnica** (Песочница - Russian for "sandbox") is a modern HR Portal web application. This project demonstrates a clean, responsive UI for managing company requests with features like filtering, sorting, and status tracking.

## Repository Status

- **Current State**: Active development - HR Portal UI + Construction Marketplace PA
- **Purpose**: Modern web applications (HR request management; customer acquisition & project intake for a construction marketplace)
- **Language(s)**: HTML, CSS, JavaScript (Vanilla)

## Directory Structure

```
Pesocnica/
├── CLAUDE.md          # AI assistant guidelines
├── docs/
│   └── tz-3-matching-engine.md  # ТЗ №3: Matching Engine & lead distribution spec
├── index.html         # HR Portal: main HTML structure
├── styles.css         # HR Portal: modern CSS with custom properties
├── script.js          # HR Portal: JavaScript for interactivity
└── marketplace/       # Construction Marketplace PA (Customer Acquisition & Project Intake)
    ├── README.md      # Module docs: architecture, demo scenario, TЗ mapping
    ├── index.html     # Landing page ("НУЖЕН МАСТЕР?")
    ├── intake.html    # Project Intake wizard (mobile-first, 14 steps)
    ├── dashboard.html # Customer dashboard (matches, quotes, reviews)
    ├── contractor.html# Contractor portal (invitations, quotes) — demo
    ├── admin.html     # CRM admin panel (leads, matching, builder, settings)
    ├── tests/smoke.js # Node smoke test of the logic layer (51 checks)
    └── assets/        # config.js, store.js, engine.js, per-page JS, CSS, seed data
```

The marketplace module is self-contained: no build step, no backend; state
lives in localStorage. Run `node marketplace/tests/smoke.js` after changing
`config.js`, `store.js`, or `engine.js`. See `marketplace/README.md` for the
full spec mapping.

## Tech Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern features (CSS Variables, Flexbox, Grid, Animations)
- **JavaScript**: Vanilla ES6+ (no frameworks)
- **External**:
  - Google Fonts (Inter)
  - Font Awesome 6.4.0 (icons)
  - UI Avatars API (avatar generation)

## Development Guidelines

### Getting Started

1. Clone the repository
2. Open `index.html` in a browser (or use a local server)
3. No build step required - pure HTML/CSS/JS

### Running Locally

```bash
# Option 1: Direct file open
open index.html

# Option 2: Python server
python -m http.server 8000

# Option 3: Node server (if available)
npx serve .
```

### Code Style & Conventions

**CSS:**
- Use CSS custom properties (variables) for colors, spacing, etc.
- BEM-like naming: `.component`, `.component-element`, `.component.modifier`
- Mobile-first responsive design
- Organize sections with comment headers

**JavaScript:**
- ES6+ syntax (const/let, arrow functions, template literals)
- Descriptive function and variable names
- Event delegation for dynamic content
- Data-driven rendering

**HTML:**
- Semantic elements (nav, main, aside, header, etc.)
- Accessibility attributes where needed
- Clean indentation (2 spaces)

## AI Assistant Instructions

### General Principles

1. **Read before modifying**: Always read existing files before making changes
2. **Minimal changes**: Make only the changes requested
3. **Preserve style**: Match existing code conventions
4. **Security first**: Sanitize user input, prevent XSS

### Design System

The project uses a consistent design system defined in CSS variables:

**Colors:**
- Primary: `#6366f1` (Indigo)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Amber)
- Danger: `#ef4444` (Red)
- Info: `#3b82f6` (Blue)

**Spacing & Sizing:**
- Border radius: `12px` (default), `8px` (small), `16px` (large)
- Sidebar width: `280px`
- Header height: `70px`

**Typography:**
- Font family: Inter
- Base size: 14px

### Key Components

| Component | Location | Description |
|-----------|----------|-------------|
| Sidebar | `.sidebar` | Navigation menu with user profile |
| Stats Cards | `.stats-grid` | Overview statistics display |
| Data Table | `.data-table` | Main requests table with actions |
| Filters | `.table-filters` | Search and filter controls |
| Pagination | `.table-pagination` | Page navigation |

### Data Structure

Request objects follow this structure:

```javascript
{
    id: 130,
    company: "Company Name",
    applicant: "Person Name",
    email: "email@example.com",
    phone: "+1 (555) 123-4567",
    regDate: "01/30/2026",
    docsComplete: 0,
    docsTotal: 2,
    status: "new|in-progress|approved|rejected",
    assigned: "BA|KD"
}
```

### Adding New Features

1. **New status type**: Add to CSS (`.status-badge.newstatus`) and JS (`getStatusLabel()`)
2. **New table column**: Update HTML thead, CSS, and `renderTableRow()` in JS
3. **New filter**: Add select option in HTML, handle in `filterData()` function
4. **New action button**: Add to actions-cell template, handle click in event delegation

## Common Tasks

### Modifying Colors

Edit CSS variables in `:root` selector in `styles.css`:

```css
:root {
    --primary: #6366f1;
    /* ... */
}
```

### Adding Table Data

Add objects to `requestsData` array in `script.js`

### Changing Layout

- Sidebar width: `--sidebar-width` in CSS
- Stats grid columns: `.stats-grid` grid-template-columns
- Table columns: Update `<th>` elements and corresponding `<td>` in render function

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox required
- ES6+ JavaScript support required

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Fonts not loading | Check internet connection for Google Fonts |
| Icons missing | Verify Font Awesome CDN link |
| Avatars not showing | UI Avatars API requires internet |
| Mobile menu not working | Check JavaScript console for errors |

---

## Changelog

| Date | Description |
|------|-------------|
| 2026-01-30 | Initial CLAUDE.md created |
| 2026-01-30 | Added HR Portal UI (HTML, CSS, JS) |
| 2026-08-25 | Added Construction Marketplace PA: Customer Acquisition & Project Intake module (`marketplace/`) |

---

*This document should be updated as the project evolves.*
