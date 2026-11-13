module Omu
  module Config
    # Loads KEY=value lines from a .env file into ENV. Real environment variables win, so
    # `DATABASE_URL=... omu` still overrides the file. Supports comments, `export KEY=...`
    # and single or double quoted values.
    def self.load_dotenv(path : String = ".env") : Nil
      return unless File.file?(path)
      File.each_line(path) do |raw|
        line = raw.strip
        next if line.empty? || line.starts_with?('#')
        line = line.lchop("export ").lstrip
        key, eq, value = line.partition('=')
        key = key.strip
        next if eq.empty? || key.empty?
        value = value.strip
        quoted = value.size >= 2 && (value[0] == '"' || value[0] == '\'') && value[-1] == value[0]
        value = quoted ? value[1..-2] : value.split(" #", 2).first.strip
        ENV[key] ||= value
      end
    end

    def self.database_url : String
      ENV.fetch("DATABASE_URL", "postgres://postgres@localhost:5432/omu")
    end

    def self.port : Int32
      ENV.fetch("PORT", "3000").to_i
    end

    def self.host : String
      ENV.fetch("HOST", "0.0.0.0")
    end

    def self.cors_origin : String
      ENV.fetch("CORS_ORIGIN", "*")
    end

    def self.session_ttl_days : Int32
      ENV.fetch("SESSION_TTL_DAYS", "30").to_i
    end

    # Lower for tests: bcrypt is deliberately slow.
    def self.bcrypt_cost : Int32
      ENV.fetch("BCRYPT_COST", "11").to_i
    end

    def self.auto_migrate? : Bool
      ENV.fetch("AUTO_MIGRATE", "true") != "false"
    end
  end
end
