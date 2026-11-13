# Omu

A small social network API. Written in POSSO stack: PostgreSQL, Crystal on the
[Spectre](https://github.com/eyszu/spectre) microframework, with SolidJS:

Features: accounts and bearer-token auth, 280-character posts, replies, reposts, likes, bookmarks,
follows, home / explore / profile timelines, hashtags (with trending), post and user search,
notifications (follow, like, repost, reply, mention), cursor pagination.

## Run it

Requires Crystal >= 1.10 and a clean database PostgreSQL 14+.

```sh
docker compose up -d                       # or point DATABASE_URL at any Postgres
shards install
export DATABASE_URL=postgres://omu:omu@localhost:5432/omu
crystal run src/omu.cr                     # migrates, then listens on :3000
```

Or build a binary: `shards build --release` then `./bin/omu` (`./bin/omu migrate` applies migrations and exits).

Then import `postman/omu.postman_collection.json` and `postman/omu.local.postman_environment.json`
into Postman and run the collection top to bottom (Collection Runner). It creates two users,
exercises every endpoint and asserts on the results (59 requests, 86 assertions).

Tests: `createdb omu_test && DATABASE_URL=postgres://omu:omu@localhost:5432/omu_test crystal spec`
(the specs truncate the tables of whatever database they point at, so never aim them at real data).

## Configuration (environment)

| Variable | Default | |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres@localhost:5432/omu` | |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | |
| `CORS_ORIGIN` | `*` | `Access-Control-Allow-Origin` value |
| `SESSION_TTL_DAYS` | `30` | token lifetime |
| `BCRYPT_COST` | `11` | password hashing cost |
| `AUTO_MIGRATE` | `true` | apply pending migrations on boot |

## API

Base path `/api/v1`. Auth: `Authorization: Bearer <token>`. 🔒 = token required; others are public
but personalised (`liked`, `following`, ...) when a token is sent. A bad token is always a 401.

| | |
|---|---|
| `POST /auth/register` | `{username, email, password, display_name?}` -> `201 {user, token}` |
| `POST /auth/login` | `{login, password}` (username or email) -> `{user, token}` |
| `POST /auth/logout` 🔒 | revoke the current token |
| `GET /me` 🔒, `PATCH /me` 🔒 | own profile (incl. email); update `display_name`, `bio`, `avatar_url` |
| `PUT /me/password` 🔒 | `{current_password, new_password}`; signs out other sessions |
| `GET /users?q=` | search by username / display name prefix |
| `GET /users/suggestions` | who to follow |
| `GET /users/:username` | profile with counts and `following` / `follows_you` |
| `GET /users/:username/followers`, `/following` | paginated users |
| `POST` / `DELETE /users/:username/follow` 🔒 | follow / unfollow (idempotent) |
| `GET /users/:username/posts` | posts and reposts; `?replies=true` adds replies |
| `GET /users/:username/likes` | posts the user liked |
| `POST /posts` 🔒 | `{body, parent_id?}` (<= 280 chars; `parent_id` makes a reply) |
| `GET /posts/:id`, `DELETE /posts/:id` 🔒 | read / delete (author only; cascades to replies) |
| `GET /posts/:id/replies`, `/likes` | replies (oldest first), users who liked |
| `POST` / `DELETE /posts/:id/like` 🔒 | like / unlike |
| `POST` / `DELETE /posts/:id/repost` 🔒 | repost / undo |
| `POST` / `DELETE /posts/:id/bookmark` 🔒, `GET /bookmarks` 🔒 | private bookmarks |
| `GET /timeline/home` 🔒 | you + people you follow, no replies |
| `GET /timeline/explore` | all public posts |
| `GET /hashtags/trending`, `/hashtags/:tag/posts` | 7-day trending tags; posts for a tag |
| `GET /search/posts?q=` | substring search |
| `GET /notifications` 🔒, `/notifications/unread_count` 🔒 | |
| `POST /notifications/read` 🔒, `/notifications/:id/read` 🔒 | mark all / one read |

Plus `GET /` and `GET /health` (checks the database).

**Pagination.** List endpoints take `?limit=` (1-100, default 20) and `?cursor=` and return
`{"data": [...], "next_cursor": 123 | null}`. Pass `next_cursor` back as `cursor`.

**Errors.** `{"error": "message"}` with 400 (malformed), 401, 403, 404, 409 (duplicate), 422.
Validation failures (422) add `"fields": {"username": "..."}`.
Spectre's built-in `405 Method Not Allowed` is plain text (with an `Allow` header).

## How it's built

```
db/migrations/001_init.sql   schema (embedded into the binary at compile time)
src/omu.cr                   CLI entry: serve | migrate
src/omu/app.cr               builds the Spectre app: middleware, route groups, error handler
src/omu/auth.cr              bcrypt, bearer-token layers (OPTIONAL on every route, REQUIRED per route)
src/omu/models.cr            view structs (DB::Serializable) + the shared SELECTs
src/omu/routes/*.cr          one module per area
spec/                        integration specs (in-memory requests against a real Postgres)
```

Design notes:

- **No ORM.** SQL lives next to the handler that uses it. `DB::Serializable` maps result columns
  onto plain structs; JSON shapes are written by hand in `to_json`.
- **Timeline rows.** A repost is a row in `posts` (`repost_of_id` set, no body). Timelines join to the
  original so the content is the original's, with `reposted_by` set. `entry_id` (the row's own id) is the
  pagination cursor. Likes, replies and bookmarks always point at the original post.
- **Tokens.** Random 256-bit opaque tokens; only the SHA-256 hash is stored, so a database leak does
  not leak usable credentials. Passwords use bcrypt (72-byte limit enforced).
- **Idempotency.** Likes, follows, reposts and bookmarks use `INSERT ... ON CONFLICT DO NOTHING`;
  notifications are only created when a row was really inserted, and a partial unique index stops
  like/unlike/like from spamming.
- **Counts** are computed with subqueries over indexed columns rather than denormalised counters,
  which keeps the schema simple. Fine for a small deployment; cache or denormalise if you outgrow it.

## Not included

Rate limiting, email verification / password reset, media uploads, direct messages, and
blocking / muting. Put it behind a reverse proxy that terminates TLS and rate-limits `/auth/*`.
