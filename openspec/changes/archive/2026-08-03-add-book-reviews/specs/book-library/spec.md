## MODIFIED Requirements

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
