# book-reviews Specification

## Purpose

Lets users on a shared instance leave a rating and written review on a book, visible to every other user of the instance looking at the same edition (matched by ISBN), so a household can see what others thought of a book.

## Requirements

### Requirement: User can write a review on a book, if it has an ISBN
The system SHALL let a user create a review (a 1-5 star rating and a text body) on any book in the shared library, provided that book currently has an ISBN recorded. If the book has no ISBN, the system SHALL reject review creation and SHALL direct the user to normalize the book's metadata first instead of allowing the review.

#### Scenario: Book has an ISBN
- **WHEN** a user submits a rating and review text for a book that has an ISBN
- **THEN** the system saves the review and associates it with that ISBN

#### Scenario: Book has no ISBN
- **WHEN** a user attempts to submit a review for a book that has no ISBN recorded
- **THEN** the system rejects the submission and prompts the user to normalize the book's metadata before reviewing

### Requirement: A user may edit or delete only their own review
The system SHALL let a review's author edit its rating or text, or delete it entirely. The system SHALL NOT let any other user edit or delete a review they did not author.

#### Scenario: Author edits their review
- **WHEN** the user who authored a review changes its rating or text and saves
- **THEN** the system updates that review in place

#### Scenario: Non-author attempts to edit
- **WHEN** a user who did not author a review attempts to edit or delete it
- **THEN** the system rejects the request

### Requirement: Reviews are grouped by exact ISBN and visible to all users
The system SHALL show, on a book's detail view, every review recorded for that book's exact ISBN, authored by any user of the instance, including each reviewer's name. Books with different ISBNs SHALL NOT share a review list, even if their title and author match.

#### Scenario: Two book records share the same ISBN
- **WHEN** two book records in the library carry the same ISBN and users have reviewed each
- **THEN** the detail view of either record shows both users' reviews for that ISBN

#### Scenario: Same title recorded under different ISBNs
- **WHEN** two book records share a title and author but carry different ISBNs (e.g. different editions or translations)
- **THEN** each record's detail view shows only the reviews recorded for that record's ISBN, not the other's

### Requirement: At most one review per user per ISBN
The system SHALL allow a user at most one review per ISBN. Submitting a review for an ISBN the user has already reviewed SHALL update their existing review rather than create an additional one.

#### Scenario: User reviews the same ISBN twice
- **WHEN** a user who has already reviewed an ISBN submits another review for a book with that same ISBN
- **THEN** the system updates their existing review instead of creating a second one
