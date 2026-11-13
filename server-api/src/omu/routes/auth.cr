module Omu
  module Routes
    struct RegisterBody
      include JSON::Serializable
      getter username : String
      getter email : String
      getter password : String
      getter display_name : String?
    end

    struct LoginBody
      include JSON::Serializable
      getter login : String # username or email
      getter password : String
    end

    module Auth
      def self.draw(r : Spectre::Router) : Nil
        # Create an account. Returns the profile and a bearer token.
        r.post "/auth/register" do |req, res|
          body = req.json(RegisterBody)
          username = body.username.strip
          email = body.email.strip
          display = (body.display_name || username).strip

          v = Validator.new
          v.check "username", USERNAME_RE.matches?(username), "must be 3-15 letters, digits or underscores"
          v.check "email", email.size <= 254 && EMAIL_RE.matches?(email), "must be a valid email address"
          v.check "password", body.password.size >= 8, "must be at least 8 characters"
          v.check "password", body.password.bytesize <= 72, "must be at most 72 bytes"
          v.check "display_name", (1..50).includes?(display.size), "must be 1-50 characters"
          v.raise_if_invalid!

          id = Omu.db.query_one?(
            "INSERT INTO users (username, email, password_hash, display_name) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id",
            username, email, Omu::Auth.hash_password(body.password), display, as: Int64)

          unless id
            # A unique index rejected the row; say which field.
            taken = {} of String => String
            if Omu.db.query_one("SELECT EXISTS (SELECT 1 FROM users WHERE lower(username) = lower($1))", username, as: Bool)
              taken["username"] = "is already taken"
            end
            if Omu.db.query_one("SELECT EXISTS (SELECT 1 FROM users WHERE lower(email) = lower($1))", email, as: Bool)
              taken["email"] = "is already registered"
            end
            raise Spectre::HTTPError.new(409, taken.map { |k, m| "#{k} #{m}" }.join(", "))
          end

          token = Omu::Auth.issue_token(id)
          res.status(201).json({user: UserView.find(id, id), token: token})
        end

        # Exchange credentials for a bearer token.
        r.post "/auth/login" do |req, res|
          body = req.json(LoginBody)
          row = Omu.db.query_one?(
            "SELECT id, password_hash FROM users WHERE lower(username) = lower($1) OR lower(email) = lower($1)",
            body.login.strip, as: {Int64, String})

          ok = Omu::Auth.verify_password(body.password, row ? row[1] : Omu::Auth::DUMMY_HASH)
          Spectre.halt(401, "Invalid credentials") unless row && ok

          token = Omu::Auth.issue_token(row[0])
          res.json({user: UserView.find(row[0], row[0]), token: token})
        end

        # Revoke the token used for this request.
        r.post "/auth/logout", Omu::Auth::REQUIRED do |req, res|
          Omu.db.exec("DELETE FROM sessions WHERE token_hash = $1", req.locals["token_hash"])
          res.send_status(204)
        end
      end
    end
  end
end
