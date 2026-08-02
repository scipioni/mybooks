# mybooks

## Git

When creating commits, do **not** add a `Co-Authored-By` trailer.

## Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (MAJOR.MINOR.PATCH).

| Bump type | When to use | Command |
|-----------|-------------|---------|
| **PATCH** (0.3.0 → 0.3.1) | Bug fixes, refactors, docs, performance — anything that doesn't add or remove public API | `task release:patch` |
| **MINOR** (0.3.0 → 0.4.0) | New features that are backward-compatible | `task release:minor` |
| **MAJOR** (1.0.0 → 2.0.0) | Breaking changes to API, configuration, or behaviour | `task release:major` |

Only commits prefixed with `feat:` or `fix:` appear in the auto-generated changelog entry.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
