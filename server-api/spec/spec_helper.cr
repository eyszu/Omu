ENV["DATABASE_URL"] ||= "postgres://postgres@localhost:5432/omu_test"
ENV["BCRYPT_COST"] = "4"

require "spec"
require "../src/omu/app"

Omu::Migrations.run

APP = Omu.build_app

Spec.before_each do
  Omu.db.exec "TRUNCATE users, sessions, posts, follows, likes, bookmarks, post_hashtags, notifications RESTART IDENTITY CASCADE"
end

def api(method : String, path : String, body = nil, token : String? = nil) : {Int32, JSON::Any}
  headers = HTTP::Headers{"Content-Type" => "application/json"}
  headers["Authorization"] = "Bearer #{token}" if token
  r = APP.request(method, "/api/v1#{path}", body.try(&.to_json), headers)
  {r.status_code, r.body.empty? ? JSON::Any.new(nil) : JSON.parse(r.body)}
end

# Registers a user and returns {token, id}.
def signup(name : String) : {String, Int64}
  status, json = api("POST", "/auth/register", {username: name, email: "#{name}@example.com", password: "password123"})
  status.should eq 201
  {json["token"].as_s, json["user"]["id"].as_i64}
end
