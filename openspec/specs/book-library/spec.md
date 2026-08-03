# book-library Specification

## Purpose

Gives each registered user a private EPUB catalog they can build by uploading files, then organize and find again using Calibre-like metadata: series, tags, reading status, ratings, and search.

## Requirements

### Requirement: Book libraries are private per user
The system SHALL scope every book to the user who imported it. A user SHALL only be able to view, edit, or delete books they own.

#### Scenario: User views their library
- **WHEN** a signed-in user opens their library
- **THEN** the system shows only books owned by that user

#### Scenario: User attempts to access another user's book
- **WHEN** a signed-in user requests a book owned by a different user
- **THEN** the system denies access

### Requirement: Users import books by uploading EPUB files
The system SHALL let a signed-in user add a book to their library by uploading an EPUB file through the UI. The system SHALL NOT scan any server-side filesystem directory to discover books.

#### Scenario: User uploads a valid EPUB
- **WHEN** a signed-in user uploads a file in EPUB format
- **THEN** the system stores the file and creates a new book record owned by that user

#### Scenario: User uploads a non-EPUB file
- **WHEN** a signed-in user uploads a file that is not a valid EPUB
- **THEN** the system rejects the upload and does not create a book record

### Requirement: Metadata is prefilled from the EPUB on upload
The system SHALL extract available metadata (at minimum title and author) from the EPUB's own package metadata at upload time and use it to prefill the new book record.

#### Scenario: EPUB contains standard metadata
- **WHEN** an uploaded EPUB's package metadata includes a title and author
- **THEN** the system prefills the book record's title and author from that metadata

#### Scenario: EPUB is missing metadata fields
- **WHEN** an uploaded EPUB's package metadata omits a field such as author
- **THEN** the system creates the book record with that field left blank rather than failing the upload

### Requirement: Users can edit book metadata and organization fields
The system SHALL let a user edit their own book's title, author, series (name and position), tags, reading status, and rating.

#### Scenario: User edits a book's series and tags
- **WHEN** a user sets a series name/position and adds tags to a book they own
- **THEN** the system saves those values against that book

#### Scenario: User sets reading status
The system SHALL support at least the reading statuses: want-to-read, reading, and read.

- **WHEN** a user changes a book's reading status
- **THEN** the system saves the new status and it is reflected when the book is viewed again

### Requirement: Users can search, filter, and sort their library
The system SHALL let a user search their own books by title, author, or series, filter by tag and/or reading status, and sort the results (at minimum by title, author, and date added).

#### Scenario: User searches by title
- **WHEN** a user enters a search term matching part of a book's title
- **THEN** the system returns only that user's books whose title contains the term

#### Scenario: User filters by tag and reading status together
- **WHEN** a user applies both a tag filter and a reading-status filter
- **THEN** the system returns only that user's books matching both filters

### Requirement: A book has a cover image
The system SHALL display a cover image for each book, using a cover extracted from the EPUB when available, falling back to a placeholder when no cover art is present.

#### Scenario: EPUB includes embedded cover art
- **WHEN** an uploaded EPUB contains an embedded cover image
- **THEN** the system extracts and stores it as the book's cover

#### Scenario: EPUB has no embedded cover art
- **WHEN** an uploaded EPUB contains no embedded cover image
- **THEN** the system shows a placeholder cover until one is supplied (e.g. via the Open Library metadata capability)

### Requirement: Users can delete their own books
The system SHALL let a user permanently delete a book they own, removing both its record and its stored file.

#### Scenario: User deletes a book
- **WHEN** a user deletes a book they own
- **THEN** the system removes the book record and its associated file so it no longer appears in their library

### Requirement: Users can upload multiple EPUB files at once via drag-and-drop
The system SHALL let a user select or drag-and-drop multiple EPUB files in a single action, queue them, and upload each independently, reporting per-file success or failure without one failing file blocking the others.

#### Scenario: User drags multiple files onto the upload area
- **WHEN** a user drops several EPUB files onto the upload area at once
- **THEN** the system queues all of them and uploads each independently

#### Scenario: One file in a batch is invalid
- **WHEN** a user uploads a batch containing one non-EPUB file alongside valid EPUB files
- **THEN** the system creates book records for the valid files and reports the invalid one as failed, without blocking the rest of the batch

### Requirement: Book records include language, ISBN, and publication year
The system SHALL store and let a user edit a book's language, ISBN, and publication year, in addition to title/author/series/tags/reading-status/rating.

#### Scenario: EPUB metadata includes a language and ISBN
- **WHEN** an uploaded EPUB's package metadata includes a `dc:language` value and an identifier that matches ISBN-10/13 shape
- **THEN** the system prefills the book record's language and ISBN from that metadata

#### Scenario: EPUB identifier does not look like a real ISBN
- **WHEN** an uploaded EPUB tags a `dc:identifier` as an ISBN scheme but its value does not match ISBN-10/13 shape (e.g. an internal hash or proprietary ID)
- **THEN** the system leaves the book's ISBN blank rather than storing the non-ISBN value

#### Scenario: User edits language, ISBN, or publication year
- **WHEN** a user edits their own book's language, ISBN, or publication year field
- **THEN** the system saves the updated value

### Requirement: Dashboard flags books with incomplete metadata
The system SHALL visually indicate, on the library dashboard, any book missing author, cover art, language, ISBN, or publication year, and SHALL let a user filter the dashboard to show only books with incomplete metadata.

#### Scenario: Book is missing one or more fields
- **WHEN** a user views their library dashboard and a book is missing author, cover, language, ISBN, or publication year
- **THEN** the system displays an incomplete-metadata indicator on that book's card

#### Scenario: User filters to incomplete books only
- **WHEN** a user applies the "incomplete metadata only" filter
- **THEN** the system shows only books missing at least one of those fields

### Requirement: Books display a star rating and can be filtered by minimum rating
The system SHALL render a book's star indicator on both the dashboard and detail view as the mean rating of all reviews for that book's ISBN, when at least one review exists for that ISBN. When no review exists yet for that ISBN, the system SHALL fall back to rendering the viewing user's own per-book rating, as before. The minimum-rating filter on the dashboard SHALL continue to filter using the viewing user's own per-book rating, independent of any review-based display change.

#### Scenario: Book has reviews for its ISBN
- **WHEN** a user views a book whose ISBN has one or more reviews
- **THEN** the system displays the mean of those reviews' ratings as filled/unfilled stars, regardless of the viewing user's own rating for that book

#### Scenario: Book has no reviews for its ISBN
- **WHEN** a user views a book whose ISBN has no reviews (or has no ISBN)
- **THEN** the system displays the viewing user's own rating for that book as filled/unfilled stars, as before

#### Scenario: User filters by minimum rating
- **WHEN** a user selects a minimum rating filter
- **THEN** the system shows only books whose viewing user's own rating is at or above that value, excluding unrated books, unaffected by any review-based display change

### Requirement: Clicking a book's author filters the dashboard to that author
The system SHALL let a user click a book's author on the dashboard to filter the library to books matching that author, without navigating to the book's detail view.

#### Scenario: User clicks an author name
- **WHEN** a user clicks a book's author name on the dashboard
- **THEN** the system shows the library filtered to that author instead of opening the book's detail view

#### Scenario: User clears the author filter
- **WHEN** a user clears an active author filter
- **THEN** the system shows the full (unfiltered, or otherwise-filtered) library again
