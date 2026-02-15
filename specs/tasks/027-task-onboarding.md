# Task 027: Onboarding Flow

**Feature:** UI & Board Experience  
**Dependencies:** 016-task-board-rendering, 011-task-frontend-auth  
**FRD Reference:** [ui-board-experience.md](../features/ui-board-experience.md)

---

## Description

Implement the first-time user onboarding flow: a brief, skippable walkthrough that explains the basics of international draughts (how pieces move, mandatory captures, flying kings) and the app's controls. The onboarding is shown once to new users and does not reappear after dismissal.

---

## Technical Requirements

### Onboarding Content
- Step 1: Introduction — "Welcome to International Draughts" with a brief overview
- Step 2: How regular pieces move — illustrated explanation of diagonal forward movement
- Step 3: Captures are mandatory — explanation with visual example of mandatory capture
- Step 4: Flying kings — explanation of king promotion and flying movement
- Step 5: Controls — drag-and-drop vs. tap-to-move, and key UI elements (undo, resign, settings)

### Presentation
- Modal overlay or step-by-step carousel on top of the game board
- Each step has an illustration or animated mini-board showing the concept
- Navigation: "Next", "Previous", "Skip" buttons
- Progress indicator (e.g., dots showing current step out of total)

### Dismissal
- "Skip" button available at any step to dismiss immediately
- After completing or skipping: onboarding flag stored (registered users → backend profile; guests → localStorage)
- Onboarding does not reappear for users who have already seen and dismissed it

### Trigger
- First-time visitors (no onboarding flag set) see the onboarding after landing/auth, before their first game
- Can optionally be re-triggered from a "How to Play" menu item

---

## Acceptance Criteria

1. First-time users see the onboarding flow before their first game
2. Each step displays relevant content about draughts rules and controls
3. Users can navigate forward and backward through steps
4. "Skip" dismisses the onboarding immediately
5. After completion or skip, the onboarding does not reappear on next visit
6. The onboarding is accessible (keyboard-navigable, screen-reader-compatible)
7. A "How to Play" option in the menu re-triggers the onboarding
8. Onboarding renders cleanly at all breakpoints (mobile, tablet, desktop)

---

## Testing Requirements

- **Component tests:**
  - Onboarding renders all steps in sequence
  - Navigation (next, previous, skip) updates the current step
  - Dismissal stores the onboarding flag
- **Integration tests:**
  - First visit → onboarding shown. Dismiss → refresh → onboarding NOT shown.
  - "How to Play" menu item re-triggers onboarding
  - Guest: onboarding flag in localStorage
  - Registered: onboarding flag synced with backend
- **Accessibility tests:**
  - Keyboard navigation through all steps
  - Screen reader reads step content
- **Minimum coverage:** ≥ 85%
