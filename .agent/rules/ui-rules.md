---
trigger: glob
globs:
  - services/game-client/**
  - services/web-portal/**
---

## UI Services Rules

These rules apply specifically to UI services: **game-client** and **web-portal**.

1. **Design Approach**: Follow a strict **Mobile-First** approach for all UI design and development. Always design for mobile screens first, then progressively enhance for larger screens.

2. **Icons**: All SVG icons must be stored in `src/components/icons/` as React components. Each icon should:
   - Be a named export from its own file (e.g., `UserIcon.tsx`)
   - Include `aria-hidden="true"` for decorative icons
   - Accept optional `width`, `height`, and `className` props
   - Be re-exported from `src/components/icons/index.ts` for easy imports
