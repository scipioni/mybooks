# auth Specification

## Purpose

Restricts application access to a known, closed set of Google-authenticated users, and establishes exactly one initial administrator so the invite system has a starting point.

## Requirements

### Requirement: Google sign-in is the only authentication method
The system SHALL authenticate users exclusively via Google OAuth. No password-based or other credential login SHALL be offered.

#### Scenario: User signs in with Google
- **WHEN** a visitor chooses to sign in and completes the Google OAuth flow
- **THEN** the system identifies them by their verified Google account email

### Requirement: Only registered users may access the application
The system SHALL reject sign-in for any Google account that does not correspond to an existing registered user (an admin or a user who redeemed a valid invite), and SHALL NOT create an account automatically for unrecognized emails.

#### Scenario: Unregistered Google account attempts sign-in
- **WHEN** a Google account with no matching user record and no matching admin email completes the Google OAuth flow
- **THEN** the system denies access and does not create a session or account

#### Scenario: Registered user signs in
- **WHEN** a Google account matching an existing user record completes the Google OAuth flow
- **THEN** the system grants a session for that user

### Requirement: Admin is bootstrapped from a configured email
The system SHALL treat the Google account matching the deployment's configured administrator email as an admin on its first successful sign-in, provisioning it automatically without requiring an invite.

#### Scenario: Configured admin email signs in for the first time
- **WHEN** the Google account matching the deployment's configured administrator email signs in and no user record yet exists for it
- **THEN** the system creates a user record for it with the admin role

#### Scenario: Configured admin email signs in again later
- **WHEN** the Google account matching the deployment's configured administrator email signs in and a user record already exists for it
- **THEN** the system signs it in as the existing admin user without creating a duplicate record

### Requirement: Roles distinguish admin and regular users
The system SHALL support at least two roles, admin and regular user, and SHALL restrict invite-management actions to admins.

#### Scenario: Regular user attempts an admin-only action
- **WHEN** a signed-in user without the admin role attempts to issue or manage invites
- **THEN** the system denies the action
