require "db"
require "pg"

module Omu
  @@db : ::DB::Database?

  # The shared connection pool. Every query in Omu is hand-written SQL against this.
  def self.db : ::DB::Database
    @@db ||= ::DB.open(Config.database_url)
  end

  module Migrations
    FILES = {
      "001_init.sql" => {{ read_file("#{__DIR__}/../../db/migrations/001_init.sql") }},
    }

    # Applies any migration not yet recorded in `schema_migrations`, each in a transaction.
    def self.run : Array(String)
      applied = [] of String
      Omu.db.exec "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
      done = Omu.db.query_all("SELECT name FROM schema_migrations", as: String)
      FILES.each do |name, sql|
        next if done.includes?(name)
        Omu.db.transaction do |tx|
          conn = tx.connection.as(PG::Connection)
          conn.exec_all(sql)
          conn.exec("INSERT INTO schema_migrations (name) VALUES ($1)", name)
        end
        applied << name
      end
      applied
    end
  end
end
