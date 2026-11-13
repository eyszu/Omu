require "json"

module Omu
  # Row types read straight from SQL result sets with DB::Serializable (column name => field).
  # Each knows how to render its public JSON shape.

  struct UserView
    include DB::Serializable

    getter id : Int64
    getter username : String
    getter display_name : String
    getter bio : String
    getter avatar_url : String?
    getter created_at : Time
    getter email : String? # only populated for the viewer's own account
    getter followers_count : Int64
    getter following_count : Int64
    getter posts_count : Int64
    getter following : Bool
    getter follows_you : Bool

    SELECT = <<-SQL
      SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.created_at,
        CASE WHEN u.id = $1 THEN u.email END AS email,
        (SELECT count(*) FROM follows f WHERE f.followee_id = u.id) AS followers_count,
        (SELECT count(*) FROM follows f WHERE f.follower_id = u.id) AS following_count,
        (SELECT count(*) FROM posts p WHERE p.user_id = u.id AND p.parent_id IS NULL AND p.repost_of_id IS NULL) AS posts_count,
        EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followee_id = u.id) AS following,
        EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = u.id AND f.followee_id = $1) AS follows_you
      FROM users u
      SQL

    def self.find(id : Int64, viewer : Int64) : UserView?
      Omu.db.query_one?("#{SELECT} WHERE u.id = $2", viewer, id, as: UserView)
    end

    def self.find_by_username(username : String, viewer : Int64) : UserView?
      Omu.db.query_one?("#{SELECT} WHERE lower(u.username) = lower($2)", viewer, username, as: UserView)
    end

    def to_json(json : JSON::Builder) : Nil
      json.object do
        json.field "id", id
        json.field "username", username
        json.field "display_name", display_name
        json.field "bio", bio
        json.field "avatar_url", avatar_url
        json.field "created_at", created_at.to_utc
        json.field "email", email if email
        json.field "followers_count", followers_count
        json.field "following_count", following_count
        json.field "posts_count", posts_count
        json.field "following", following
        json.field "follows_you", follows_you
      end
    end
  end

  # One row of a timeline. For a repost, the content is the original post's and
  # `reposted_by` names the reposter; `entry_id` is the timeline row's own id (the cursor).
  struct PostView
    include DB::Serializable

    getter id : Int64
    getter body : String
    getter created_at : Time
    getter parent_id : Int64?
    getter author_id : Int64
    getter author_username : String
    getter author_display_name : String
    getter author_avatar_url : String?
    getter entry_id : Int64
    getter activity_at : Time
    getter reposted_by : String?
    getter reply_count : Int64
    getter like_count : Int64
    getter repost_count : Int64
    getter liked : Bool
    getter reposted : Bool
    getter bookmarked : Bool

    # `p` is the timeline entry (a post or a repost row); `t` is the post whose
    # content is shown (the original for reposts, otherwise `p` itself).
    SELECT = <<-SQL
      SELECT t.id, t.body, t.created_at, t.parent_id,
        u.id AS author_id, u.username AS author_username,
        u.display_name AS author_display_name, u.avatar_url AS author_avatar_url,
        p.id AS entry_id, p.created_at AS activity_at,
        CASE WHEN p.repost_of_id IS NOT NULL THEN pu.username END AS reposted_by,
        (SELECT count(*) FROM posts r WHERE r.parent_id = t.id) AS reply_count,
        (SELECT count(*) FROM likes l WHERE l.post_id = t.id) AS like_count,
        (SELECT count(*) FROM posts r WHERE r.repost_of_id = t.id) AS repost_count,
        EXISTS (SELECT 1 FROM likes l WHERE l.post_id = t.id AND l.user_id = $1) AS liked,
        EXISTS (SELECT 1 FROM posts r WHERE r.repost_of_id = t.id AND r.user_id = $1) AS reposted,
        EXISTS (SELECT 1 FROM bookmarks b WHERE b.post_id = t.id AND b.user_id = $1) AS bookmarked
      FROM posts p
      JOIN users pu ON pu.id = p.user_id
      JOIN posts t  ON t.id = COALESCE(p.repost_of_id, p.id)
      JOIN users u  ON u.id = t.user_id
      SQL

    # A single original post or reply (not a repost row).
    def self.find(id : Int64, viewer : Int64) : PostView?
      Omu.db.query_one?("#{SELECT} WHERE p.id = $2 AND p.repost_of_id IS NULL", viewer, id, as: PostView)
    end

    # One page of timeline rows. `where` filters rows `p` and may use $2, $3, ... for `extra`
    # ($1 is always the viewer). Newest first by default; `asc` pages oldest first.
    def self.page(where : String, extra : Array(DB::Any), viewer : Int64, page : Page, asc : Bool = false) : Array(PostView)
      args = [viewer] of DB::Any
      args.concat(extra)
      cursor_at = args.size + 1
      args << page.cursor
      args << page.fetch_size
      cmp = asc ? "p.id > COALESCE($#{cursor_at}::bigint, 0)" : "p.id < COALESCE($#{cursor_at}::bigint, 9223372036854775807)"
      sql = "#{SELECT} WHERE (#{where}) AND #{cmp} ORDER BY p.id #{asc ? "ASC" : "DESC"} LIMIT $#{cursor_at + 1}"
      Omu.db.query_all(sql, args: args, as: PostView)
    end

    def to_json(json : JSON::Builder) : Nil
      json.object do
        json.field "id", id
        json.field "body", body
        json.field "created_at", created_at.to_utc
        json.field "parent_id", parent_id
        json.field "author" do
          json.object do
            json.field "id", author_id
            json.field "username", author_username
            json.field "display_name", author_display_name
            json.field "avatar_url", author_avatar_url
          end
        end
        json.field "reply_count", reply_count
        json.field "like_count", like_count
        json.field "repost_count", repost_count
        json.field "liked", liked
        json.field "reposted", reposted
        json.field "bookmarked", bookmarked
        json.field "reposted_by", reposted_by
        json.field "entry_id", entry_id
        json.field "activity_at", activity_at.to_utc
      end
    end
  end

  struct NotificationView
    include DB::Serializable

    getter id : Int64
    getter kind : String
    getter created_at : Time
    getter read : Bool
    getter actor_username : String
    getter actor_display_name : String
    getter actor_avatar_url : String?
    getter post_id : Int64?
    getter post_body : String?

    def to_json(json : JSON::Builder) : Nil
      json.object do
        json.field "id", id
        json.field "kind", kind
        json.field "created_at", created_at.to_utc
        json.field "read", read
        json.field "actor" do
          json.object do
            json.field "username", actor_username
            json.field "display_name", actor_display_name
            json.field "avatar_url", actor_avatar_url
          end
        end
        json.field "post_id", post_id
        json.field "post_body", post_body
      end
    end
  end

  # Records a notification unless the actor is notifying themselves.
  # De-duplicated by a partial unique index for follow/like/repost.
  def self.notify(recipient : Int64, actor : Int64, kind : String, post_id : Int64? = nil, conn : ::DB::Connection | ::DB::Database = Omu.db) : Nil
    return if recipient == actor
    conn.exec(
      "INSERT INTO notifications (user_id, actor_id, kind, post_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
      recipient, actor, kind, post_id)
  end

  def self.user_id_for_username(username : String) : Int64?
    Omu.db.query_one?("SELECT id FROM users WHERE lower(username) = lower($1)", username, as: Int64)
  end
end
