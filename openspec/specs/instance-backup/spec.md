# instance-backup Specification

## Purpose

Lets whoever operates a mybooks deployment export the full instance (database and all users' book files) to a single archive, and restore it — for backups and for migrating to another server.

## Requirements

### Requirement: Full-instance export produces a single archive
The system SHALL provide a way to export the entire instance — the database and every user's book/cover files — into one timestamped archive file.

#### Scenario: Export is run
- **WHEN** an operator runs the export
- **THEN** the system produces one archive file containing the database and all book/cover files, named with a timestamp

### Requirement: Database export is consistent regardless of WAL state
The system SHALL capture a consistent snapshot of the database for export, including any writes not yet checkpointed from write-ahead-log mode into the main database file. A naive copy of only the main database file SHALL NOT be used, since it can silently omit recent writes.

#### Scenario: Recent write is only in the WAL file
- **WHEN** an export is run while the database has recent writes not yet checkpointed into the main file
- **THEN** the exported archive's database includes those writes

### Requirement: Restore replaces the database and book files from an archive
The system SHALL provide a way to restore a previously exported archive, replacing the current database file and entirely replacing the book/cover storage tree with the archive's contents.

#### Scenario: Restore is run against a valid archive
- **WHEN** an operator restores a valid export archive
- **THEN** the system's database and book files afterward match the archive's contents

#### Scenario: Restore is run against an invalid archive
- **WHEN** an operator attempts to restore an archive missing its expected manifest or database file
- **THEN** the system refuses the restore and leaves existing data untouched

### Requirement: Restore refuses to overwrite existing data without explicit confirmation
The system SHALL refuse to restore into a destination with an existing non-empty database unless the operator explicitly forces it, since restore is destructive.

#### Scenario: Destination already has data, no force flag
- **WHEN** an operator attempts to restore into a destination with an existing non-empty database without passing a force option
- **THEN** the system refuses the restore and makes no changes

#### Scenario: Destination already has data, force flag given
- **WHEN** an operator restores with the force option against a destination with existing data
- **THEN** the system proceeds with the restore, replacing the existing data

### Requirement: Export and restore work for both local and Docker deployments
The system SHALL support exporting from and restoring to both a local/bare-metal deployment (using configured local file paths) and a Docker deployment (operating against the deployment's named volumes), without requiring the app's own database/storage code to run inside a request.

#### Scenario: Docker deployment export
- **WHEN** an operator exports from a Docker deployment
- **THEN** the resulting archive is written to a location accessible on the host, without needing to modify the running container's application code path

#### Scenario: Migrating to another server
- **WHEN** an operator exports from one deployment and restores the resulting archive on a different server running the same application
- **THEN** the destination ends up with the same database contents and book files as the source at export time
