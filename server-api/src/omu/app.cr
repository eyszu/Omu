require "spectre"
require "json"
require "./config"
require "./database"
require "./errors"
require "./auth"
require "./pagination"
require "./models"
require "./routes/auth"
require "./routes/users"
require "./routes/posts"
require "./routes/timelines"
require "./routes/notifications"

module Omu
  VERSION = "0.1.0"

  def self.build_app : Spectre::App
    app = Spectre.new
    app.use Spectre::Middleware.logger
    app.use Spectre::Middleware.cors(origin: Config.cors_origin)

    app.get "/" do |req, res|
      res.json({name: "Omu", version: VERSION, docs: "See README.md and postman/omu.postman_collection.json", api: "/api/v1"})
    end

    app.get "/health" do |req, res|
      ok = Omu.db.query_one("SELECT 1", as: Int32) == 1
      res.status(ok ? 200 : 503).json({status: ok ? "ok" : "down"})
    end

    app.group "/api/v1" do |api|
      api.use Omu::Auth::OPTIONAL
      Routes::Auth.draw(api)
      Routes::Users.draw(api)
      Routes::Posts.draw(api)
      Routes::Timelines.draw(api)
      Routes::Notifications.draw(api)
    end

    app.not_found do |req, res|
      res.json({error: "Cannot #{req.method} #{req.path}"})
    end

    app.error do |ex, req, res|
      case ex
      when Omu::Invalid
        res.status(422).json({error: ex.message, fields: ex.fields})
      when Spectre::HTTPError
        res.status(ex.status).json({error: ex.message})
      else
        Spectre::LOG.error(exception: ex) { "#{req.method} #{req.path}" }
        res.status(500).json({error: "Internal Server Error"})
      end
    end

    app
  end
end
