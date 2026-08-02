## Purpose

Lets a user register their own e-reader delivery addresses and send any book in their library straight to a chosen device as an email attachment.

## ADDED Requirements

### Requirement: Users manage their own e-reader devices
The system SHALL let a signed-in user add, edit, and remove their own e-reader devices, each with a label (e.g. "Kindle", "Kobo") and a delivery email address. Devices SHALL be private to the user who created them.

#### Scenario: User adds a device
- **WHEN** a signed-in user submits a label and delivery email address for a new device
- **THEN** the system saves it as a device belonging to that user

#### Scenario: User removes a device
- **WHEN** a signed-in user removes one of their own devices
- **THEN** the system deletes it and it no longer appears as a send target

#### Scenario: User has multiple devices
- **WHEN** a signed-in user has registered more than one device
- **THEN** the system lets them choose which device to send a book to

### Requirement: Users can send an owned book to one of their devices
The system SHALL let a user send a book they own to one of their own registered devices by emailing the EPUB file as an attachment to that device's delivery address.

#### Scenario: User sends a book to a device
- **WHEN** a user selects a book they own and a device they own and requests delivery
- **THEN** the system emails the book's EPUB file as an attachment to that device's delivery address

#### Scenario: User attempts to send a book they do not own
- **WHEN** a user attempts to send a book they do not own to any device
- **THEN** the system denies the request

#### Scenario: User attempts to send to a device they do not own
- **WHEN** a user attempts to send a book to a device registered by another user
- **THEN** the system denies the request

### Requirement: Delivery failures are reported to the user
The system SHALL inform the user whether a send request succeeded or failed, without silently discarding a failure.

#### Scenario: Outbound email fails
- **WHEN** the system attempts to send a book to a device and the outbound email fails to send
- **THEN** the system reports the failure to the user rather than reporting success
