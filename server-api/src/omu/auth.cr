require "crypto/bcrypt/password"
require "digest/sha256"
require "random/secure"

class Spectre::Request
  # Set by `Omu::Auth::OPTIONAL` when a valid bearer token was sent.
  property user_id : Int64?

  def user_id! : Int64
    user_id || Spectre.halt(401, "Authentication required")
  end

  # Id used for "did the viewer like/follow this" columns. 0 matches nothing.
  def viewer : Int64
    user_id || 0_i64
  end
end

module Omu
  module Auth
    def self.hash_password(password : String) : String
      Crypto::Bcrypt::Password.create(password, cost: Config.bcrypt_cost).to_s
    end

    def self.verify_password(password : String, hash : String) : Bool
      Crypto::Bcrypt::Password.new(hash).verify(password)
    rescue Crypto::Bcrypt::Error
      false
    end

    # A fixed hash to burn comparable time when the account does not exist.
    DUMMY_HASH = Crypto::Bcrypt::Password.create("omu-dummy-password", cost: Config.bcrypt_cost).to_s

    def self.token_hash(token : String) : String
      Digest::SHA256.hexdigest(token)
    end

    # Creates a session and returns the raw token. It is shown once; only its hash is stored.
    def self.issue_token(user_id : Int64) : String
      token = Random::Secure.urlsafe_base64(32)
      Omu.db.exec(
        "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))",
        user_id, token_hash(token), Config.session_ttl_days)
      token
    end

    def self.user_id_for(hash : String) : Int64?
      Omu.db.query_one?("SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()", hash, as: Int64)
    end

    # Runs on every API request. No header: anonymous. Bad header or token: 401.
    OPTIONAL = Spectre.layer do |req, res, nxt|
      if header = req.header("Authorization")
        unless header.size > 7 && header[0, 7].downcase == "bearer "
          Spectre.halt(401, "Authorization header must be 'Bearer <token>'")
        end
        hash = token_hash(header[7..].strip)
        req.user_id = user_id_for(hash) || Spectre.halt(401, "Invalid or expired token")
        req.locals["token_hash"] = hash
      end
      nxt.call
    end

    # Per-route guard, placed after OPTIONAL.
    REQUIRED = Spectre.layer do |req, res, nxt|
      req.user_id! # halts with 401
      nxt.call
    end
  end
end
