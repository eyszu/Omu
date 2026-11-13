module Omu
  # LIKE-escapes user input, so `%` and `_` match literally.
  def self.like_escape(s : String) : String
    s.gsub(/[\\%_]/) { |m| "\\#{m}" }
  end

  def self.like_prefix(s : String) : String
    "#{like_escape(s)}%"
  end

  def self.like_contains(s : String) : String
    "%#{like_escape(s)}%"
  end

  module Routes
    module Timelines
      private def self.feed(req, res, where : String, extra : Array(DB::Any) = [] of DB::Any, viewer : Int64 = req.viewer) : Nil
        page = Page.from(req)
        posts = PostView.page(where, extra, viewer, page)
        Omu.send_page(res, posts, page) { |p| p.entry_id }
      end

      def self.draw(r : Spectre::Router) : Nil
        # Posts and reposts from you and the people you follow (no replies).
        r.get "/timeline/home", Omu::Auth::REQUIRED do |req, res|
          feed(req, res,
            "p.parent_id IS NULL AND (p.user_id = $1 OR p.user_id IN (SELECT followee_id FROM follows WHERE follower_id = $1))")
        end

        # Everything public, newest first.
        r.get "/timeline/explore" do |req, res|
          feed(req, res, "p.parent_id IS NULL")
        end

        # A profile's posts and reposts. ?replies=true includes their replies.
        r.get "/users/:username/posts" do |req, res|
          uid = Omu.user_id_for_username(req.params["username"]) || Spectre.halt(404, "User not found")
          with_replies = req.query["replies"]? == "true"
          feed(req, res, with_replies ? "p.user_id = $2" : "p.parent_id IS NULL AND p.user_id = $2", [uid] of DB::Any)
        end

        # Original posts and replies the user has liked.
        r.get "/users/:username/likes" do |req, res|
          uid = Omu.user_id_for_username(req.params["username"]) || Spectre.halt(404, "User not found")
          feed(req, res, "p.repost_of_id IS NULL AND p.id IN (SELECT post_id FROM likes WHERE user_id = $2)", [uid] of DB::Any)
        end

        r.get "/hashtags/trending" do |req, res|
          limit = Page.from(req, default: 10).limit
          rows = Omu.db.query_all(<<-SQL, limit, as: {String, Int64})
            SELECT h.tag, count(*) AS posts
            FROM post_hashtags h JOIN posts p ON p.id = h.post_id
            WHERE p.created_at > now() - interval '7 days'
            GROUP BY h.tag ORDER BY posts DESC, h.tag LIMIT $1
            SQL
          res.json({data: rows.map { |tag, n| {tag: tag, posts: n} }})
        end

        r.get "/hashtags/:tag/posts" do |req, res|
          tag = req.params["tag"].lstrip('#').downcase
          feed(req, res, "p.repost_of_id IS NULL AND p.id IN (SELECT post_id FROM post_hashtags WHERE tag = $2)", [tag] of DB::Any)
        end

        # Full-text-ish search over post bodies: ?q=word
        r.get "/search/posts" do |req, res|
          q = req.query["q"]?.try(&.strip) || ""
          Spectre.halt(400, "q is required") if q.empty?
          feed(req, res, "p.repost_of_id IS NULL AND t.body ILIKE $2", [Omu.like_contains(q)] of DB::Any)
        end
      end
    end
  end
end
