module Omu
  module Routes
    module Notifications
      def self.draw(r : Spectre::Router) : Nil
        r.get "/notifications", Omu::Auth::REQUIRED do |req, res|
          page = Page.from(req)
          items = Omu.db.query_all(<<-SQL, req.user_id!, page.cursor, page.fetch_size, as: NotificationView)
            SELECT n.id, n.kind, n.created_at, (n.read_at IS NOT NULL) AS read,
              a.username AS actor_username, a.display_name AS actor_display_name, a.avatar_url AS actor_avatar_url,
              n.post_id, p.body AS post_body
            FROM notifications n
            JOIN users a ON a.id = n.actor_id
            LEFT JOIN posts p ON p.id = n.post_id
            WHERE n.user_id = $1 AND n.id < COALESCE($2::bigint, 9223372036854775807)
            ORDER BY n.id DESC LIMIT $3
            SQL
          Omu.send_page(res, items, page) { |n| n.id }
        end

        r.get "/notifications/unread_count", Omu::Auth::REQUIRED do |req, res|
          n = Omu.db.query_one("SELECT count(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL", req.user_id!, as: Int64)
          res.json({unread: n})
        end

        # Mark everything read.
        r.post "/notifications/read", Omu::Auth::REQUIRED do |req, res|
          n = Omu.db.exec("UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL", req.user_id!).rows_affected
          res.json({marked_read: n})
        end

        r.post "/notifications/:id/read", Omu::Auth::REQUIRED do |req, res|
          n = Omu.db.exec(
            "UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND user_id = $2",
            req.params.int("id"), req.user_id!).rows_affected
          Spectre.halt(404, "Notification not found") if n == 0
          res.send_status(204)
        end
      end
    end
  end
end
