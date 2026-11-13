module Omu
  # Cursor pagination: `?limit=20&cursor=<id>`. Responses are
  # {"data": [...], "next_cursor": <id or null>}; pass next_cursor back as `cursor`.
  struct Page
    getter limit : Int32
    getter cursor : Int64?

    def initialize(@limit, @cursor)
    end

    def self.from(req : Spectre::Request, default : Int32 = 20) : Page
      limit = default
      if raw = req.query["limit"]?
        limit = raw.to_i? || Spectre.halt(400, "limit must be an integer")
        Spectre.halt(400, "limit must be between 1 and 100") unless 1 <= limit <= 100
      end
      cursor = nil
      if raw = req.query["cursor"]?
        cursor = raw.to_i64? || Spectre.halt(400, "cursor must be an integer")
      end
      new(limit, cursor)
    end

    # Query for one extra row so we know whether another page exists.
    def fetch_size : Int32
      limit + 1
    end
  end

  def self.send_page(res : Spectre::Response, items : Array(T), page : Page, &cursor : T -> Int64) : Nil forall T
    more = items.size > page.limit
    items.pop if more
    res.json({data: items, next_cursor: more ? cursor.call(items.last) : nil})
  end
end
