# open-library-metadata Specification

## Purpose

Lets a user enrich a book's metadata and cover art from Open Library, while always keeping a human decision in the loop before any suggested data is applied.

## Requirements

### Requirement: User can search Open Library for a book
The system SHALL let a user trigger a search against the Open Library API using a book's current title/author (or a custom query) and SHALL display the candidate matches returned.

#### Scenario: Search returns candidates
- **WHEN** a user triggers an Open Library search for a book
- **THEN** the system displays a list of candidate matches with enough detail (title, author, cover thumbnail, publication info) to distinguish between them

#### Scenario: Search returns no candidates
- **WHEN** a user triggers an Open Library search and no matches are found
- **THEN** the system informs the user that no candidates were found and leaves the book's existing metadata unchanged

### Requirement: Suggested metadata is never applied automatically
The system SHALL require the user to explicitly review and confirm a candidate match before any of its metadata or cover art is written to the book record. The system SHALL NOT auto-apply a match, including during the initial upload/import flow.

#### Scenario: User confirms a candidate
- **WHEN** a user selects a specific Open Library candidate and confirms applying it
- **THEN** the system updates the book's metadata fields (and/or cover) with the confirmed candidate's data

#### Scenario: User dismisses the search without confirming
- **WHEN** a user closes or skips the Open Library search step without confirming a candidate
- **THEN** the book's existing metadata remains unchanged

### Requirement: Metadata lookup and review is optional at every point
The system SHALL let a user skip the Open Library lookup entirely during upload, and SHALL let a user trigger it later on demand for any book they own.

#### Scenario: User skips lookup during upload
- **WHEN** a user finishes uploading a book without invoking Open Library search
- **THEN** the book is saved using only the metadata extracted from the EPUB itself

#### Scenario: User invokes lookup later
- **WHEN** a user opens an existing book they own and triggers an Open Library search
- **THEN** the system performs the search and presents candidates for review as usual

### Requirement: Confirmed metadata records its Open Library source
When a user confirms an Open Library candidate, the system SHALL store a reference to the source Open Library record on the book.

#### Scenario: Book metadata is applied from Open Library
- **WHEN** a user confirms a candidate match for a book
- **THEN** the system stores the corresponding Open Library identifier on that book's record

### Requirement: Google Books is queried as a second metadata source
The system SHALL query Google Books alongside Open Library for both free-text and ISBN lookups, and SHALL present candidates from both sources together, distinguishing which source each candidate came from. Google Books candidates are subject to the same human-review-before-apply rule as Open Library candidates.

#### Scenario: Both sources return candidates
- **WHEN** a user searches and both Open Library and Google Books return candidates
- **THEN** the system displays candidates from both, with Google Books results labeled as such

#### Scenario: Open Library returns irrelevant matches but Google Books has the right one
- **WHEN** Open Library's free-text search returns unrelated matches for a title it doesn't have indexed (e.g. an untranslated edition) while Google Books has the correct edition
- **THEN** the system still surfaces the Google Books match rather than treating Open Library's non-empty (but irrelevant) result as sufficient

#### Scenario: Google Books source query is scoped to the title field
- **WHEN** the system builds a plain-title query for Google Books
- **THEN** it scopes the query to the title field specifically (rather than an unscoped free-text query) to reduce irrelevant matches

### Requirement: ISBN lookup works across both metadata sources
The system SHALL support looking up a book by ISBN against both Open Library and Google Books, trying one first and falling back to the other if the first finds nothing, since ISBN identifies an exact edition regardless of the title's language.

#### Scenario: ISBN found on the first-tried source
- **WHEN** a user searches by a book's ISBN and the first-tried source has that edition
- **THEN** the system returns that exact edition as a candidate without needing to query the second source

#### Scenario: ISBN not found on the first-tried source
- **WHEN** the first-tried source has no record of the ISBN
- **THEN** the system tries the second source before reporting no candidates found

### Requirement: A metadata source's failure is reported, not silently hidden as "no match"
If a metadata source (Open Library or Google Books) fails to respond (e.g. a rate limit or outage) during a search, the system SHALL report that failure to the user distinctly from a genuine zero-candidate result from that source, while still returning any candidates the other source found.

#### Scenario: One source fails, the other succeeds
- **WHEN** Google Books fails to respond but Open Library returns candidates (or vice versa)
- **THEN** the system shows the successful source's candidates and a notice that the other source failed to respond

#### Scenario: Both sources fail
- **WHEN** both Open Library and Google Books fail to respond
- **THEN** the system shows a notice that both sources failed, distinct from "no candidates found"

### Requirement: Confirmed metadata includes language, ISBN, and publication year when available
When a user confirms a candidate from either source, the system SHALL extract and store the candidate's language, ISBN, and publication year on the book record, in addition to title, author, and cover, whenever the source provides that data.

#### Scenario: Candidate has ISBN and publication year data
- **WHEN** a user confirms a candidate that has ISBN and publication year information available from its source
- **THEN** the system stores those values on the book record

#### Scenario: Candidate lacks some fields
- **WHEN** a confirmed candidate's source does not provide a particular field (e.g. no publication year)
- **THEN** the system leaves that field on the book record unchanged rather than clearing it

### Requirement: Users can narrow a search to a specific edition language
The system SHALL let a user optionally narrow free-text search results to editions in a specific language.

#### Scenario: User narrows to a language
- **WHEN** a user specifies a language while searching
- **THEN** the system returns only candidates available in that language, among those already matching the search text

### Requirement: A user can review and apply metadata across multiple books in one flow
The system SHALL let a user select multiple books from their library and step through a review queue — one book at a time, each with its own search results to confirm or skip — rather than requiring the user to open each book individually.

#### Scenario: User selects several books for review
- **WHEN** a user selects multiple books and starts a bulk metadata review
- **THEN** the system searches for the first selected book and presents its candidates for confirm/skip, then advances to the next selected book after each decision

#### Scenario: No candidates for a book in the queue
- **WHEN** a book in the bulk review queue has no candidates found
- **THEN** the system lets the user skip to the next book in the queue without applying anything

### Requirement: Applied cover art is stored at a usable resolution
When a confirmed candidate's cover art is available only as a small preview-sized image, the system SHALL request and store a substantially larger rendition of the same cover rather than saving the small preview as the book's permanent cover.

#### Scenario: Source only exposes a small preview thumbnail
- **WHEN** a user confirms a candidate whose source only directly exposes a small thumbnail-sized cover image
- **THEN** the system requests and stores a larger version of that same cover image, not the small thumbnail
