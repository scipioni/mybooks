# external-book-link Specification

## Purpose

Resolves, caches, and surfaces a link to each book's canonical listing on Open Library or Google Books, so a user can look up a book on a public catalog without leaving their library.

## Requirements

### Requirement: A book card shows an external listing icon when a link is available
The system SHALL display an icon on a book's cover in the library grid when a link to that book's Open Library or Google Books listing can be resolved. The system SHALL NOT display the icon when no such link is available.

#### Scenario: Book has an Open Library identifier
- **WHEN** a book's record already has an `openLibraryId`
- **THEN** the system shows the external listing icon on that book's card

#### Scenario: Book has an ISBN but no Open Library identifier
- **WHEN** a book's record has an ISBN but no `openLibraryId`
- **THEN** the system shows the external listing icon on that book's card

#### Scenario: Book has neither an Open Library identifier nor an ISBN
- **WHEN** a book's record has no `openLibraryId` and no ISBN
- **THEN** the system does not show the external listing icon on that book's card

### Requirement: Clicking the icon opens the resolved link in a new tab
The system SHALL open the book's resolved external listing link in a new browser tab when a user clicks the icon, without navigating away from the library in the current tab.

#### Scenario: User clicks the icon
- **WHEN** a user clicks the external listing icon on a book card
- **THEN** the system opens the resolved link in a new tab and the library remains open in the current tab

### Requirement: Open Library identifier takes priority over Google Books
When resolving a book's external listing link, the system SHALL prefer an existing Open Library identifier over a Google Books lookup, since the Open Library link requires no additional network call.

#### Scenario: Book has both an Open Library identifier and an ISBN
- **WHEN** a book's record has both an `openLibraryId` and an ISBN
- **THEN** the system resolves the link from the `openLibraryId` and does not perform a Google Books lookup

### Requirement: Open Library link is derived directly from the stored identifier
The system SHALL construct the Open Library listing link directly from the book's stored `openLibraryId`, without an additional API call.

#### Scenario: Resolving an Open Library link
- **WHEN** the system resolves a link for a book that has an `openLibraryId`
- **THEN** the resulting link points to that identifier's page on openlibrary.org

### Requirement: Google Books link is resolved by ISBN lookup
When a book has no Open Library identifier but does have an ISBN, the system SHALL resolve a Google Books listing link by querying the Google Books API for that ISBN and using the matched volume's canonical link.

#### Scenario: ISBN lookup finds a match with a canonical link
- **WHEN** the system looks up a book's ISBN against the Google Books API and the match includes a canonical volume link
- **THEN** the system uses that canonical link as the book's external listing link

#### Scenario: ISBN lookup finds a match without a canonical link
- **WHEN** the matched volume has no canonical volume link but does have an info link
- **THEN** the system uses the info link as the book's external listing link

#### Scenario: ISBN lookup finds no match
- **WHEN** the system looks up a book's ISBN against the Google Books API and no volume matches
- **THEN** the system does not show the external listing icon for that book

### Requirement: A resolved Google Books link is cached and only resolved once per book
The system SHALL persist a resolved Google Books link on the book's record and SHALL NOT re-query the Google Books API for a link that has already been resolved and stored.

#### Scenario: Link already cached
- **WHEN** a book already has a stored Google Books link
- **THEN** the system uses the stored link without querying the Google Books API again

#### Scenario: Link resolved for the first time via upload or metadata review
- **WHEN** a book's metadata is enriched through the upload or metadata-review flow and an ISBN is available with no existing Open Library identifier
- **THEN** the system resolves and stores the Google Books link at that time

#### Scenario: Link resolved for the first time via icon click on a pre-existing book
- **WHEN** a user clicks the external listing icon for a book that has an ISBN but no cached Google Books link and no Open Library identifier
- **THEN** the system resolves the link, stores it on the book's record, and opens it in a new tab
