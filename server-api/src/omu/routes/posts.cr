module Omu
  module Routes
    struct NewPostBody
      include JSON::Serializable
      getter body : String
      getter parent_id : Int64? # set to reply to a post
    end

    module Posts
      # The target of like/repost/bookmark/reply: an original post or reply, not a repost row.
      private def self.target!(req : Spectre::Request) : Int64
        id = req.params.int("id")
        exists = Omu.db.query_one("SELECT EXISTS (SELECT 1 FROM posts WHERE id = $1 AND repost_of_id IS NULL)", id, as: Bool)
        Spectre.halt(404, "Post not found") unless exists
        id
      end

      private def self.show(req : Spectre::Request, res : Spectre::Response, id : Int64, status : Int32 = 200) : Nil
        res.status(status).json(PostView.find(id, req.viewer))
      end

      def self.draw(r : Spectre::Router) : Nil
        r.post "/posts", Omu::Auth::REQUIRED do |req, res|
          input = req.json(NewPostBody)
          me = req.user_id!
          text = input.body.strip
          v = Validator.new
          v.check "body", !text.empty?, "can't be blank"
          v.check "body", text.size <= 280, "must be at most 280 characters"
          v.raise_if_invalid!

          parent_author = nil
          if pid = input.parent_id
            parent_author = Omu.db.query_one?("SELECT user_id FROM posts WHERE id = $1 AND repost_of_id IS NULL", pid, as: Int64) ||
                            Spectre.halt(404, "Parent post not found")
          end

          tags = text.scan(HASHTAG_RE).map { |m| m[1].downcase }.uniq!
          mention_names = text.scan(MENTION_RE).map { |m| m[1].downcase }.uniq!

          post_id = 0_i64
          Omu.db.transaction do |tx|
            c = tx.connection
            post_id = c.query_one("INSERT INTO posts (user_id, body, parent_id) VALUES ($1, $2, $3) RETURNING id",
              me, text, input.parent_id, as: Int64)
            tags.each do |tag|
              c.exec("INSERT INTO post_hashtags (post_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING", post_id, tag)
            end
            Omu.notify(parent_author, me, "reply", post_id, c) if parent_author
            unless mention_names.empty?
              ids = c.query_all("SELECT id FROM users WHERE lower(username) = ANY($1)", mention_names, as: Int64)
              ids.each do |uid|
                next if uid == parent_author # already told about the reply
                Omu.notify(uid, me, "mention", post_id, c)
              end
            end
          end

          show(req, res, post_id, 201)
        end

        r.get "/posts/:id" do |req, res|
          post = PostView.find(req.params.int("id"), req.viewer) || Spectre.halt(404, "Post not found")
          res.json(post)
        end

        # Deletes the post and, by cascade, its replies, reposts, likes and bookmarks.
        r.delete "/posts/:id", Omu::Auth::REQUIRED do |req, res|
          id = req.params.int("id")
          owner = Omu.db.query_one?("SELECT user_id FROM posts WHERE id = $1 AND repost_of_id IS NULL", id, as: Int64) ||
                  Spectre.halt(404, "Post not found")
          Spectre.halt(403, "You can only delete your own posts") unless owner == req.user_id!
          Omu.db.exec("DELETE FROM posts WHERE id = $1", id)
          res.send_status(204)
        end

        # Replies to a post, oldest first. cursor = last reply id.
        r.get "/posts/:id/replies" do |req, res|
          id = target!(req)
          page = Page.from(req)
          posts = PostView.page("p.parent_id = $2", [id] of DB::Any, req.viewer, page, asc: true)
          Omu.send_page(res, posts, page) { |p| p.entry_id }
        end

        # Who liked a post.
        r.get "/posts/:id/likes" do |req, res|
          id = target!(req)
          page = Page.from(req)
          users = Omu.db.query_all(
            "#{UserView::SELECT} WHERE u.id IN (SELECT user_id FROM likes WHERE post_id = $2) AND u.id < COALESCE($3::bigint, 9223372036854775807) ORDER BY u.id DESC LIMIT $4",
            req.viewer, id, page.cursor, page.fetch_size, as: UserView)
          Omu.send_page(res, users, page) { |u| u.id }
        end

        # --- Likes (idempotent) ---
        r.post "/posts/:id/like", Omu::Auth::REQUIRED do |req, res|
          id = target!(req)
          me = req.user_id!
          added = Omu.db.exec("INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", me, id).rows_affected
          if added > 0
            author = Omu.db.query_one("SELECT user_id FROM posts WHERE id = $1", id, as: Int64)
            Omu.notify(author, me, "like", id)
          end
          show(req, res, id)
        end

        r.delete "/posts/:id/like", Omu::Auth::REQUIRED do |req, res|
          id = target!(req)
          Omu.db.exec("DELETE FROM likes WHERE user_id = $1 AND post_id = $2", req.user_id!, id)
          show(req, res, id)
        end

        # --- Reposts (idempotent) ---
        r.post "/posts/:id/repost", Omu::Auth::REQUIRED do |req, res|
          id = target!(req)
          me = req.user_id!
          added = Omu.db.exec("INSERT INTO posts (user_id, repost_of_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", me, id).rows_affected
          if added > 0
            author = Omu.db.query_one("SELECT user_id FROM posts WHERE id = $1", id, as: Int64)
            Omu.notify(author, me, "repost", id)
          end
          show(req, res, id)
        end

        r.delete "/posts/:id/repost", Omu::Auth::REQUIRED do |req, res|
          id = target!(req)
          Omu.db.exec("DELETE FROM posts WHERE user_id = $1 AND repost_of_id = $2", req.user_id!, id)
          show(req, res, id)
        end

        # --- Bookmarks (private to the user) ---
        r.post "/posts/:id/bookmark", Omu::Auth::REQUIRED do |req, res|
          id = target!(req)
          Omu.db.exec("INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", req.user_id!, id)
          show(req, res, id)
        end

        r.delete "/posts/:id/bookmark", Omu::Auth::REQUIRED do |req, res|
          id = target!(req)
          Omu.db.exec("DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2", req.user_id!, id)
          show(req, res, id)
        end

        r.get "/bookmarks", Omu::Auth::REQUIRED do |req, res|
          page = Page.from(req)
          posts = PostView.page(
            "p.repost_of_id IS NULL AND p.id IN (SELECT post_id FROM bookmarks WHERE user_id = $1)",
            [] of DB::Any, req.user_id!, page)
          Omu.send_page(res, posts, page) { |p| p.entry_id }
        end
      end
    end
  end
end
