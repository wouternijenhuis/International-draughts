# Task 011: Frontend Authentication Pages

**Feature:** Authentication & Player Management  
**Dependencies:** 002-task-frontend-scaffolding, 010-task-backend-auth  
**FRD Reference:** [authentication.md](../features/authentication.md)

---

## Description

Implement the frontend authentication user interface: landing page with login/register/guest options, OAuth login buttons for all four providers, email/password registration form, email/password login form, email verification confirmation page, account management page (link provider, delete account), and guest registration prompt (shown after first game completion).

---

## Technical Requirements

### Pages & Components

#### Landing Page (REQ-20)
- First-time visitor entry point
- Three clear call-to-action paths: "Sign Up", "Log In", "Continue as Guest"
- Sign-up section shows all four OAuth provider buttons (Google, Microsoft, Apple) + email registration link
- Clean, premium visual design matching the app's design language (REQ-44)

#### Login Page
- OAuth buttons for Google, Microsoft, Apple
- Email/password form with validation (email format, password required)
- "Forgot password" link (stretch — link only, flow can be deferred)
- Error display for invalid credentials
- Loading state during authentication

#### Registration Page (Email)
- Email, password, confirm password fields
- Client-side validation: email format, password strength (≥ 8 chars), password match
- Server-side validation error display
- "Check your email" confirmation after successful registration

#### Email Verification Page
- Accepts verification token from email link
- Calls verification endpoint
- Displays success or error state
- Redirects to login on success

#### Account Management Page
- Accessible from profile/settings menu (authenticated users only)
- "Link Account" section: shows OAuth providers not yet linked with "Link" buttons
- "Delete Account" section: prominent danger zone with confirmation dialog
- Confirmation dialog requires user to type their display name or email to confirm

#### Guest Registration Prompt
- Non-intrusive modal or banner shown after a guest completes their first game
- Options: "Create Account" (goes to registration), "Not Now" (dismisses)
- Does not block gameplay; can be dismissed permanently for the session

### Auth State Management
- Authentication state (logged in / guest / logged out) available globally
- Protected routes redirect unauthenticated users to the landing page
- Auth token stored securely (HttpOnly cookie preferred; fallback to secure in-memory storage)
- Automatic token refresh before expiry

---

## Acceptance Criteria

1. First-time visitors see the landing page with clear sign-up, login, and guest options
2. Clicking a Google/Microsoft/Apple OAuth button initiates the OAuth flow and redirects back on success
3. Email registration validates inputs client-side and shows server errors on invalid data
4. After email registration, a "check your email" page is displayed
5. Email verification link confirms the account and redirects to login
6. Login with valid credentials redirects to the main app
7. Login with invalid credentials shows a clear error message (not technical)
8. Guest mode: clicking "Continue as Guest" immediately accesses the game without any form
9. Guest prompt: after a guest completes their first game, a non-intrusive registration prompt appears
10. Account management: a logged-in user can link an additional OAuth provider
11. Account deletion: a user must confirm before deletion; after confirmation, they are logged out and redirected to the landing page
12. Auth state persists across page refreshes (registered users stay logged in)
13. Token refresh happens transparently — users are not unexpectedly logged out

---

## Testing Requirements

- **Component tests:**
  - Landing page renders all options (sign up, log in, guest)
  - Login form validates inputs and shows errors
  - Registration form validates email format, password strength, password match
  - Account deletion confirmation dialog requires correct input
  - Guest prompt renders and can be dismissed
- **Integration tests:**
  - Full login flow: click OAuth → redirect → callback → authenticated state
  - Email registration → verification → login flow
  - Protected route redirects unauthenticated users
  - Token refresh keeps the user logged in
- **Accessibility tests:**
  - All forms are keyboard-navigable
  - Form errors are announced to screen readers
  - OAuth buttons have accessible labels
- **Minimum coverage:** ≥ 85%
