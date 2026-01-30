# CLAUDE.md - AI Assistant Guide for Pesocnica

> This file provides essential context for AI assistants working with this codebase.

## Project Overview

**Pesocnica** (Песочница - Russian for "sandbox") is a modern HR Portal web application. This project demonstrates a clean, responsive UI for managing company requests with features like filtering, sorting, and status tracking.

## Repository Status

- **Current State**: Active development - HR Portal UI
- **Purpose**: Modern web application for HR request management
- **Language(s)**: HTML, CSS, JavaScript (Vanilla)

## Directory Structure

```
Pesocnica/
├── CLAUDE.md          # AI assistant guidelines
├── index.html         # Main HTML structure
├── styles.css         # Modern CSS with custom properties
└── script.js          # JavaScript for interactivity
```

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

---

*This document should be updated as the project evolves.*
