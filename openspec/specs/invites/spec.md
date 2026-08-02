# invites Specification

## Purpose

Lets an admin extend access to specific people by pre-authorizing their exact Google account, so registration stays closed to the public while still allowing new users to join.

## Requirements

### Requirement: Admin creates an email-scoped invite
The system SHALL let an admin create an invite bound to a single specified email address. The invite SHALL NOT be redeemable by any other account.

#### Scenario: Admin issues an invite
- **WHEN** an admin submits an email address to invite
- **THEN** the system creates a pending invite record scoped to that exact email address

### Requirement: Invite redemption requires a matching Google account
The system SHALL only allow a pending invite to be redeemed when the signing-in Google account's email exactly matches the invite's target email.

#### Scenario: Invitee redeems their invite
- **WHEN** a Google account whose email matches a pending invite's target email completes sign-in
- **THEN** the system creates a new regular-user account for that email and marks the invite as redeemed

#### Scenario: Different account attempts to redeem someone else's invite
- **WHEN** a Google account whose email does not match any pending invite's target email completes sign-in
- **THEN** the system does not redeem any invite and denies access per the auth capability's registration rules

### Requirement: A redeemed invite cannot be reused
The system SHALL prevent an already-redeemed invite from being used again.

#### Scenario: Second sign-in attempt with an already-redeemed invite
- **WHEN** the Google account that already redeemed an invite signs in again
- **THEN** the system signs them in as the existing user rather than creating another account or re-redeeming the invite

### Requirement: Admin can view outstanding invites
The system SHALL let an admin view the list of pending (not yet redeemed) invites.

#### Scenario: Admin reviews pending invites
- **WHEN** an admin opens the invite management view
- **THEN** the system displays all invites that have not yet been redeemed

### Requirement: Admin can revoke a pending invite
The system SHALL let an admin cancel a pending (not yet redeemed) invite, removing it so it can no longer be redeemed. The system SHALL reject an attempt to revoke an invite that has already been redeemed.

#### Scenario: Admin revokes a pending invite
- **WHEN** an admin revokes an invite that has not yet been redeemed
- **THEN** the system removes it from the pending list and it can no longer be redeemed

#### Scenario: Admin attempts to revoke an already-redeemed invite
- **WHEN** an admin attempts to revoke an invite that has already been redeemed
- **THEN** the system rejects the action and leaves the invite record unchanged

### Requirement: Invite creation rejects duplicates and already-registered emails
The system SHALL reject creating an invite for an email address that already has a pending invite, and SHALL reject creating an invite for an email address that already belongs to a registered user.

#### Scenario: Admin invites an email with a pending invite
- **WHEN** an admin attempts to invite an email address that already has an unredeemed invite
- **THEN** the system rejects the request rather than creating a duplicate invite

#### Scenario: Admin invites an already-registered email
- **WHEN** an admin attempts to invite an email address that already belongs to an existing user
- **THEN** the system rejects the request rather than creating an invite that can never be meaningfully redeemed
