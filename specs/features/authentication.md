# Feature: Authentication & Player Management

**Feature ID:** `authentication`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-07  
**Status:** Draft

---

## 1. Purpose

Allow users to register, log in, and manage their accounts so that game history, statistics, ratings, and preferences are persisted across sessions. Provide a frictionless guest mode for users who want to try the app without committing to registration. Support four authentication providers (Microsoft, Apple, Google, Email/Password) as required by the stakeholder.

---

## 2. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-19 | Registration/login via Microsoft, Apple, Google, Email/Password | Auth providers |
| REQ-20 | First-time users prompted to register or continue as guest | Onboarding flow |
| REQ-21 | Guest mode: full gameplay, no persistence, no data conversion to registered | Guest mode |
| REQ-22 | Registered users have persistent profile (name, avatar, history, stats, rating) | User profile |
| REQ-23 | Link additional login methods to an existing account | Account linking |
| REQ-24 | Delete account and all associated data | Account deletion |
| REQ-57 | Secure authentication: HTTPS/TLS, secure token-based sessions | Security |

---

## 3. Inputs

- User credentials or OAuth tokens from identity providers (Microsoft, Apple, Google)
- Email/password for email-based registration
- User intent: register, login, continue as guest, link account, delete account

---

## 4. Outputs

- Authenticated session (token) for registered users
- Guest session (ephemeral, browser-session-scoped)
- User profile data (for downstream features)
- Account linkage confirmation
- Account deletion confirmation with data purge

---

## 5. Dependencies

| Direction | Feature | Relationship |
|-----------|---------|-------------|
| **None (upstream)** | — | Authentication is an independent foundation feature |
| Downstream | Player Profile & Statistics | Provides user identity; profile data depends on auth |
| Downstream | Settings & Customization | Settings persistence requires knowing if user is registered or guest |
| Downstream | Game Modes & Lifecycle | Determines whether game data is saved or ephemeral |
| Downstream | Backend API & Deployment | Auth endpoints are part of the backend API surface |

---

## 6. Acceptance Criteria

### Registration & Login
1. **Google login:** A user can register and log in using their Google account via OAuth. On first login, a new player profile is created.
2. **Microsoft login:** A user can register and log in using their Microsoft account via OAuth.
3. **Apple login:** A user can register and log in using their Apple ID via OAuth (including Apple's "Hide My Email" relay).
4. **Email/Password:** A user can register with an email address and password. Passwords must meet minimum security requirements (minimum 8 characters, etc.). Email verification is required before the account is active.
5. **Returning login:** A returning user logs in and sees their existing profile, game history, and statistics.
6. **Auth success rate:** Login succeeds > 99% of the time when valid credentials are provided.

### Guest Mode
7. **Guest access:** A user can play the app immediately without registering — all game modes and difficulty levels are accessible.
8. **No persistence:** Guest game data (history, stats, rating) is not saved across browser sessions. When the session ends, the data is gone.
9. **No data conversion:** If a guest later creates a registered account, they start with a fresh profile. There is no migration of guest data.
10. **Registration prompt:** After a guest completes their first game, they are prompted (non-intrusively) to create an account.

### Account Management
11. **Account linking:** A registered user can link additional login methods (e.g., add Apple ID to an account originally created with Google). The linked methods can then be used interchangeably to log in.
12. **Account deletion:** A user can delete their account. All associated data (profile, game history, statistics, ratings, preferences) is permanently removed. This must comply with GDPR (C2).
13. **Deletion confirmation:** Account deletion requires explicit confirmation to prevent accidental data loss.

### Security
14. **HTTPS only:** All authentication traffic is encrypted via HTTPS/TLS.
15. **Token-based sessions:** Sessions use secure, server-issued tokens (e.g., JWTs). Tokens have appropriate expiration and refresh mechanisms.
16. **No plaintext passwords:** Passwords are never stored in plaintext. Proper hashing with salt must be used for email/password accounts.

### Onboarding
17. **Landing screen choice:** First-time visitors see a landing screen with clear options: sign up (with all four providers), log in, or continue as guest.
18. **Frictionless flow:** Registration via OAuth requires at most 2 clicks (choose provider → authorize). Email registration requires email, password, and email verification.

---

## 7. Technical Constraints

- All four OAuth providers (Microsoft, Apple, Google) have their own integration requirements, developer portal registrations, and approval timelines (TF-6). These must be planned in advance.
- Apple Sign-In requires special handling (relay email, name provided only on first auth).
- GDPR compliance (C2) requires a complete data deletion pipeline — not just soft-deleting the user record, but purging all associated data.
- Auth tokens must be securely stored client-side (e.g., HttpOnly cookies or secure storage) — not in localStorage for sensitive tokens.

---

## 8. Open Questions

- Should session tokens have a fixed expiry (e.g., 7 days) or use a sliding window with refresh tokens?
- Should failed login attempts be rate-limited or trigger account lockout after N failures?
