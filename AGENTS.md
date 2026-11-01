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

## Deploying to production

Production runs on `cubo.local` (public URL https://libri.mywire.org, behind
Traefik), from the published Docker Hub image `scipioit/mybooks:latest`. There
is no CI: deploying is done by hand.

1. Release and publish from this repo:
   ```sh
   task release:minor          # or release:patch / release:major
   git push --follow-tags
   task docker:publish         # pushes scipioit/mybooks:<tag> and :latest
   ```
2. Back up the server before updating. `~/mybooks/backups` is owned by root
   and not writable by the container, so write to the container's `/tmp`
   and copy the archive out to the home directory:
   ```sh
   ssh scipio@cubo.local 'cd ~/mybooks \
     && docker-compose exec -T mybooks bash scripts/backup-export.sh /tmp \
     && f=$(docker exec mybooks_mybooks_1 sh -c "ls -t /tmp/mybooks-backup-*.tar.gz | head -1") \
     && docker cp mybooks_mybooks_1:$f ~/ && docker exec mybooks_mybooks_1 rm -f $f'
   ```
3. Update the container:
   ```sh
   ssh scipio@cubo.local 'cd ~/mybooks && docker-compose pull && docker-compose up -d'
   ```

Server notes:
- Deploy directory is `~/mybooks`, with its own `docker-compose.yaml` (Traefik
  labels, `NEXTAUTH_URL`, external network `passbolt_default`) and `.env`. It
  is **not** this repo's `docker-compose.prod.yml`, so the `docker:prod:*` tasks
  don't apply there.
- The server has the old standalone `docker-compose` (v1), not the
  `docker compose` plugin. The container is named `mybooks_mybooks_1`.
- DB migrations run automatically when the app first opens the database.
- Check the deploy: `docker exec mybooks_mybooks_1 grep '"version"' package.json`
  and `docker logs --tail=20 mybooks_mybooks_1`.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
