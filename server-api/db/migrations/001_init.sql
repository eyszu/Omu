-- Omu initial schema. Plain PostgreSQL, no extensions required.

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  username      VARCHAR(15)  NOT NULL CHECK (username ~ '^[A-Za-z0-9_]{3,15}$'),
  email         VARCHAR(254) NOT NULL,
  password_hash TEXT         NOT NULL,
  display_name  VARCHAR(50)  NOT NULL,
  bio           VARCHAR(160) NOT NULL DEFAULT '',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username));
CREATE UNIQUE INDEX users_email_lower_idx    ON users (lower(email));
CREATE INDEX users_username_prefix_idx       ON users (lower(username) text_pattern_ops);

-- Opaque bearer tokens. Only the SHA-256 hash of a token is stored.
CREATE TABLE sessions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash CHAR(64)    NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

-- A row is one of: a normal post, a reply (parent_id set), or a repost
-- (repost_of_id set, no body).
CREATE TABLE posts (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body         VARCHAR(280),
  parent_id    BIGINT REFERENCES posts (id) ON DELETE CASCADE,
  repost_of_id BIGINT REFERENCES posts (id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT posts_shape CHECK (
    (repost_of_id IS NULL     AND body IS NOT NULL AND length(btrim(body)) > 0)
    OR
    (repost_of_id IS NOT NULL AND body IS NULL     AND parent_id IS NULL)
  )
);
CREATE INDEX posts_user_idx      ON posts (user_id, id DESC);
CREATE INDEX posts_parent_idx    ON posts (parent_id, id) WHERE parent_id IS NOT NULL;
CREATE INDEX posts_repost_idx    ON posts (repost_of_id) WHERE repost_of_id IS NOT NULL;
CREATE UNIQUE INDEX posts_one_repost_per_user ON posts (user_id, repost_of_id) WHERE repost_of_id IS NOT NULL;

CREATE TABLE follows (
  follower_id BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  followee_id BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX follows_followee_idx ON follows (followee_id, follower_id);

CREATE TABLE likes (
  user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  post_id    BIGINT      NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX likes_post_idx ON likes (post_id);

CREATE TABLE bookmarks (
  user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  post_id    BIGINT      NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE post_hashtags (
  post_id BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  tag     TEXT   NOT NULL,
  PRIMARY KEY (post_id, tag)
);
CREATE INDEX post_hashtags_tag_idx ON post_hashtags (tag, post_id DESC);

CREATE TABLE notifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  actor_id   BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind       TEXT        NOT NULL CHECK (kind IN ('follow', 'like', 'repost', 'reply', 'mention')),
  post_id    BIGINT REFERENCES posts (id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, id DESC);
-- Like / repost / follow notifications are de-duplicated so like-unlike-like does not spam.
CREATE UNIQUE INDEX notifications_dedupe_idx
  ON notifications (user_id, actor_id, kind, COALESCE(post_id, 0))
  WHERE kind IN ('follow', 'like', 'repost');
