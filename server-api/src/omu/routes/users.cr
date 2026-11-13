module Omu
  module Routes
    struct UpdateProfileBody
      include JSON::Serializable
      getter display_name : String?
      getter bio : String?
      getter avatar_url : String? # empty string clears it
    end

    struct ChangePasswordBody
      include JSON::Serializable
      getter current_password : String
      getter new_password : String
    end

    module Users
      private def self.profile!(req : Spectre::Request) : UserView
        UserView.find_by_username(req.params["username"], req.viewer) || Spectre.halt(404, "User not found")
      end

      private def self.user_list(req : Spectre::Request, res : Spectre::Response, sql_where : String, order_col : String) : Nil
        target = Omu.user_id_for_username(req.params["username"]) || Spectre.halt(404, "User not found")
        page = Page.from(req)
        # Cursor is the user id of the last row returned.
        users = Omu.db.query_all(
          "#{UserView::SELECT} #{sql_where} AND u.id < COALESCE($3::bigint, 9223372036854775807) ORDER BY u.id DESC LIMIT $4",
          req.viewer, target, page.cursor, page.fetch_size, as: UserView)
        Omu.send_page(res, users, page) { |u| u.id }
      end

      def self.draw(r : Spectre::Router) : Nil
        # --- The signed-in user ---
        r.get "/me", Omu::Auth::REQUIRED do |req, res|
          res.json(UserView.find(req.user_id!, req.user_id!))
        end

        r.patch "/me", Omu::Auth::REQUIRED do |req, res|
          body = req.json(UpdateProfileBody)
          v = Validator.new
          if name = body.display_name
            v.check "display_name", (1..50).includes?(name.strip.size), "must be 1-50 characters"
          end
          if bio = body.bio
            v.check "bio", bio.size <= 160, "must be at most 160 characters"
          end
          if url = body.avatar_url
            v.check "avatar_url", url.empty? || (url.size <= 500 && url.matches?(/\Ahttps?:\/\/\S+\z/)), "must be an http(s) URL"
          end
          v.raise_if_invalid!

          Omu.db.exec(<<-SQL, req.user_id!, body.display_name.try(&.strip), body.bio, body.avatar_url)
            UPDATE users SET
              display_name = COALESCE($2, display_name),
              bio          = COALESCE($3, bio),
              avatar_url   = CASE WHEN $4::text IS NULL THEN avatar_url ELSE NULLIF($4, '') END
            WHERE id = $1
            SQL
          res.json(UserView.find(req.user_id!, req.user_id!))
        end

        # Changing the password signs out every other session.
        r.put "/me/password", Omu::Auth::REQUIRED do |req, res|
          body = req.json(ChangePasswordBody)
          me = req.user_id!
          v = Validator.new
          v.check "new_password", body.new_password.size >= 8, "must be at least 8 characters"
          v.check "new_password", body.new_password.bytesize <= 72, "must be at most 72 bytes"
          v.raise_if_invalid!

          current = Omu.db.query_one("SELECT password_hash FROM users WHERE id = $1", me, as: String)
          Spectre.halt(403, "Current password is incorrect") unless Omu::Auth.verify_password(body.current_password, current)

          Omu.db.transaction do |tx|
            c = tx.connection
            c.exec("UPDATE users SET password_hash = $2 WHERE id = $1", me, Omu::Auth.hash_password(body.new_password))
            c.exec("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", me, req.locals["token_hash"])
          end
          res.send_status(204)
        end

        # --- Discovery (static paths win over /users/:username) ---
        r.get "/users" do |req, res|
          q = req.query["q"]?.try(&.strip) || ""
          Spectre.halt(400, "q is required") if q.empty?
          pattern = Omu.like_prefix(q)
          limit = Page.from(req, default: 10).limit
          users = Omu.db.query_all(
            "#{UserView::SELECT} WHERE lower(u.username) LIKE lower($2) OR lower(u.display_name) LIKE lower($2) ORDER BY u.username LIMIT $3",
            req.viewer, pattern, limit, as: UserView)
          res.json({data: users})
        end

        # "Who to follow": popular accounts the viewer doesn't follow yet.
        r.get "/users/suggestions" do |req, res|
          limit = Page.from(req, default: 5).limit
          users = Omu.db.query_all(<<-SQL, req.viewer, limit, as: UserView)
            #{UserView::SELECT}
            WHERE u.id <> $1
              AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followee_id = u.id)
            ORDER BY (SELECT count(*) FROM follows f WHERE f.followee_id = u.id) DESC, u.id DESC
            LIMIT $2
            SQL
          res.json({data: users})
        end

        # --- Profiles ---
        r.get "/users/:username" do |req, res|
          res.json(profile!(req))
        end

        r.get "/users/:username/followers" do |req, res|
          user_list(req, res,
            "WHERE u.id IN (SELECT follower_id FROM follows WHERE followee_id = $2)", "u.id")
        end

        r.get "/users/:username/following" do |req, res|
          user_list(req, res,
            "WHERE u.id IN (SELECT followee_id FROM follows WHERE follower_id = $2)", "u.id")
        end

        r.post "/users/:username/follow", Omu::Auth::REQUIRED do |req, res|
          me = req.user_id!
          target = Omu.user_id_for_username(req.params["username"]) || Spectre.halt(404, "User not found")
          Spectre.halt(422, "You cannot follow yourself") if target == me
          created = Omu.db.exec(
            "INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", me, target).rows_affected
          Omu.notify(target, me, "follow") if created > 0
          res.json(UserView.find(target, me))
        end

        r.delete "/users/:username/follow", Omu::Auth::REQUIRED do |req, res|
          me = req.user_id!
          target = Omu.user_id_for_username(req.params["username"]) || Spectre.halt(404, "User not found")
          Omu.db.exec("DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2", me, target)
          res.json(UserView.find(target, me))
        end
      end
    end
  end
end
