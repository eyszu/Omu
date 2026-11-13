require "./spec_helper"

describe "auth" do
  it "registers, logs in with username or email, and rejects bad credentials" do
    token, _ = signup("alice")
    code, me = api("GET", "/me", token: token)
    code.should eq 200
    me["username"].as_s.should eq "alice"
    me["email"].as_s.should eq "alice@example.com"

    api("POST", "/auth/login", {login: "alice", password: "password123"})[0].should eq 200
    api("POST", "/auth/login", {login: "ALICE@example.com", password: "password123"})[0].should eq 200
    api("POST", "/auth/login", {login: "alice", password: "wrong"})[0].should eq 401
    api("POST", "/auth/login", {login: "nobody", password: "password123"})[0].should eq 401
  end

  it "validates input and rejects duplicates case-insensitively" do
    code, json = api("POST", "/auth/register", {username: "a!", email: "nope", password: "short"})
    code.should eq 422
    json["fields"].as_h.keys.should eq ["username", "email", "password"]

    signup("alice")
    code, json = api("POST", "/auth/register", {username: "ALICE", email: "x@example.com", password: "password123"})
    code.should eq 409
    json["error"].as_s.should contain "username"
  end

  it "requires auth, rejects garbage tokens, and logout revokes the token" do
    api("GET", "/me")[0].should eq 401
    api("GET", "/me", token: "garbage")[0].should eq 401
    token, _ = signup("alice")
    api("POST", "/auth/logout", token: token)[0].should eq 204
    api("GET", "/me", token: token)[0].should eq 401
  end

  it "does not expose email on other profiles" do
    signup("alice")
    _, json = api("GET", "/users/alice")
    json.as_h.has_key?("email").should be_false
  end

  it "changes the password and signs out other sessions" do
    t1, _ = signup("alice")
    _, login = api("POST", "/auth/login", {login: "alice", password: "password123"})
    t2 = login["token"].as_s
    api("PUT", "/me/password", {current_password: "bad", new_password: "newpassword1"}, t1)[0].should eq 403
    api("PUT", "/me/password", {current_password: "password123", new_password: "newpassword1"}, t1)[0].should eq 204
    api("GET", "/me", token: t1)[0].should eq 200
    api("GET", "/me", token: t2)[0].should eq 401
    api("POST", "/auth/login", {login: "alice", password: "newpassword1"})[0].should eq 200
  end
end

describe "profiles and follows" do
  it "updates a profile" do
    token, _ = signup("alice")
    code, json = api("PATCH", "/me", {display_name: "Alice A.", bio: "hi"}, token)
    code.should eq 200
    json["display_name"].as_s.should eq "Alice A."
    api("PATCH", "/me", {avatar_url: "javascript:alert(1)"}, token)[0].should eq 422
  end

  it "follows, unfollows, lists and counts" do
    a, _ = signup("alice")
    signup("bob")
    code, json = api("POST", "/users/bob/follow", token: a)
    code.should eq 200
    json["following"].as_bool.should be_true
    json["followers_count"].as_i.should eq 1
    api("POST", "/users/bob/follow", token: a)[1]["followers_count"].as_i.should eq 1 # idempotent
    api("POST", "/users/alice/follow", token: a)[0].should eq 422
    api("GET", "/users/bob/followers")[1]["data"][0]["username"].as_s.should eq "alice"
    api("GET", "/users/alice/following")[1]["data"].as_a.size.should eq 1
    api("DELETE", "/users/bob/follow", token: a)[1]["following"].as_bool.should be_false
    api("POST", "/users/ghost/follow", token: a)[0].should eq 404
  end

  it "searches users and suggests who to follow" do
    a, _ = signup("alice")
    signup("alicia")
    signup("bob")
    api("GET", "/users?q=ali")[1]["data"].as_a.map(&.["username"].as_s).should eq ["alice", "alicia"]
    api("GET", "/users?q=%25")[1]["data"].as_a.should be_empty # % is literal
    api("GET", "/users/suggestions", token: a)[1]["data"].as_a.map(&.["username"].as_s).should_not contain "alice"
  end
end

describe "posts" do
  it "creates, reads and deletes posts with ownership checks" do
    a, _ = signup("alice")
    b, _ = signup("bob")
    code, post = api("POST", "/posts", {body: "hello omu"}, a)
    code.should eq 201
    id = post["id"].as_i
    post["author"]["username"].as_s.should eq "alice"
    api("GET", "/posts/#{id}")[1]["body"].as_s.should eq "hello omu"
    api("DELETE", "/posts/#{id}", token: b)[0].should eq 403
    api("DELETE", "/posts/#{id}", token: a)[0].should eq 204
    api("GET", "/posts/#{id}")[0].should eq 404
  end

  it "validates length and blank bodies" do
    a, _ = signup("alice")
    api("POST", "/posts", {body: "   "}, a)[0].should eq 422
    api("POST", "/posts", {body: "x" * 281}, a)[0].should eq 422
    api("POST", "/posts", {body: "x" * 280}, a)[0].should eq 201
    api("POST", "/posts", {body: "hi"})[0].should eq 401
    api("POST", "/posts", {body: "hi", parent_id: 999}, a)[0].should eq 404
  end

  it "supports replies, likes, reposts and bookmarks with per-viewer flags" do
    a, _ = signup("alice")
    b, _ = signup("bob")
    id = api("POST", "/posts", {body: "root"}, a)[1]["id"].as_i

    api("POST", "/posts", {body: "a reply", parent_id: id}, b)[0].should eq 201
    _, replies = api("GET", "/posts/#{id}/replies")
    replies["data"].as_a.size.should eq 1

    _, liked = api("POST", "/posts/#{id}/like", token: b)
    liked["like_count"].as_i.should eq 1
    liked["liked"].as_bool.should be_true
    api("POST", "/posts/#{id}/like", token: b)[1]["like_count"].as_i.should eq 1 # idempotent
    api("GET", "/posts/#{id}")[1]["liked"].as_bool.should be_false               # anonymous viewer
    api("GET", "/posts/#{id}/likes")[1]["data"][0]["username"].as_s.should eq "bob"

    _, rp = api("POST", "/posts/#{id}/repost", token: b)
    rp["repost_count"].as_i.should eq 1
    rp["reposted"].as_bool.should be_true
    api("POST", "/posts/#{id}/bookmark", token: b)[1]["bookmarked"].as_bool.should be_true
    api("GET", "/bookmarks", token: b)[1]["data"].as_a.size.should eq 1

    api("DELETE", "/posts/#{id}/like", token: b)[1]["like_count"].as_i.should eq 0
    api("DELETE", "/posts/#{id}/repost", token: b)[1]["repost_count"].as_i.should eq 0
  end

  it "cascades deletion to replies" do
    a, _ = signup("alice")
    id = api("POST", "/posts", {body: "root"}, a)[1]["id"].as_i
    reply = api("POST", "/posts", {body: "r", parent_id: id}, a)[1]["id"].as_i
    api("DELETE", "/posts/#{id}", token: a)
    api("GET", "/posts/#{reply}")[0].should eq 404
  end
end

describe "timelines" do
  it "builds the home feed from follows, includes reposts, excludes replies" do
    a, _ = signup("alice")
    b, _ = signup("bob")
    c, _ = signup("carol")
    api("POST", "/users/bob/follow", token: a)
    api("POST", "/posts", {body: "from bob"}, b)
    carol_post = api("POST", "/posts", {body: "from carol"}, c)[1]["id"].as_i
    root = api("POST", "/posts", {body: "bob root"}, b)[1]["id"].as_i
    api("POST", "/posts", {body: "bob reply", parent_id: root}, b)
    api("POST", "/posts/#{carol_post}/repost", token: b) # alice sees carol's post via bob

    _, feed = api("GET", "/timeline/home", token: a)
    bodies = feed["data"].as_a.map(&.["body"].as_s)
    bodies.should eq ["from carol", "bob root", "from bob"]
    feed["data"][0]["reposted_by"].as_s.should eq "bob"
    feed["data"][0]["author"]["username"].as_s.should eq "carol"

    api("GET", "/timeline/home")[0].should eq 401
  end

  it "paginates with cursors" do
    a, _ = signup("alice")
    5.times { |i| api("POST", "/posts", {body: "post #{i}"}, a) }
    _, p1 = api("GET", "/timeline/explore?limit=2")
    p1["data"].as_a.map(&.["body"].as_s).should eq ["post 4", "post 3"]
    cursor = p1["next_cursor"].as_i
    _, p2 = api("GET", "/timeline/explore?limit=2&cursor=#{cursor}")
    p2["data"].as_a.map(&.["body"].as_s).should eq ["post 2", "post 1"]
    _, p3 = api("GET", "/timeline/explore?limit=2&cursor=#{p2["next_cursor"].as_i}")
    p3["data"].as_a.size.should eq 1
    p3["next_cursor"].raw.should be_nil
    api("GET", "/timeline/explore?limit=0")[0].should eq 400
    api("GET", "/timeline/explore?cursor=abc")[0].should eq 400
  end

  it "serves profile posts, likes, hashtags and search" do
    a, _ = signup("alice")
    id = api("POST", "/posts", {body: "learning #Crystal and #postgres"}, a)[1]["id"].as_i
    api("POST", "/posts", {body: "reply here", parent_id: id}, a)
    api("POST", "/posts/#{id}/like", token: a)

    api("GET", "/users/alice/posts")[1]["data"].as_a.size.should eq 1
    api("GET", "/users/alice/posts?replies=true")[1]["data"].as_a.size.should eq 2
    api("GET", "/users/alice/likes")[1]["data"].as_a.size.should eq 1
    api("GET", "/hashtags/crystal/posts")[1]["data"].as_a.size.should eq 1
    api("GET", "/hashtags/%23POSTGRES/posts")[1]["data"].as_a.size.should eq 1
    api("GET", "/hashtags/trending")[1]["data"].as_a.map(&.["tag"].as_s).sort.should eq ["crystal", "postgres"]
    api("GET", "/search/posts?q=learning")[1]["data"].as_a.size.should eq 1
    api("GET", "/search/posts?q=%25")[1]["data"].as_a.should be_empty
    api("GET", "/search/posts")[0].should eq 400
  end
end

describe "notifications" do
  it "notifies on follow, like, reply, repost and mention, but never self, and dedupes" do
    a, _ = signup("alice")
    b, _ = signup("bob")
    id = api("POST", "/posts", {body: "hello"}, a)[1]["id"].as_i

    api("POST", "/users/alice/follow", token: b)
    api("POST", "/posts/#{id}/like", token: b)
    api("DELETE", "/posts/#{id}/like", token: b)
    api("POST", "/posts/#{id}/like", token: b) # re-like: no second notification
    api("POST", "/posts/#{id}/repost", token: b)
    api("POST", "/posts", {body: "@alice nice", parent_id: id}, b) # reply + mention => one notification
    api("POST", "/posts", {body: "@alice again"}, b)               # mention
    api("POST", "/posts/#{id}/like", token: a)                      # self: ignored

    api("GET", "/notifications/unread_count", token: a)[1]["unread"].as_i.should eq 5
    _, list = api("GET", "/notifications", token: a)
    list["data"].as_a.map(&.["kind"].as_s).should eq ["mention", "reply", "repost", "like", "follow"]
    list["data"][0]["actor"]["username"].as_s.should eq "bob"
    api("GET", "/notifications/unread_count", token: b)[1]["unread"].as_i.should eq 0

    api("POST", "/notifications/#{list["data"][0]["id"].as_i}/read", token: a)[0].should eq 204
    api("POST", "/notifications/read", token: a)[1]["marked_read"].as_i.should eq 4
    api("GET", "/notifications/unread_count", token: a)[1]["unread"].as_i.should eq 0
  end
end

describe "framework behaviour" do
  it "answers JSON 404s, 400 bad ids, and 400 bad JSON" do
    api("GET", "/nope")[0].should eq 404
    api("GET", "/posts/abc")[0].should eq 400
    r = APP.request("POST", "/api/v1/auth/login", "{oops", HTTP::Headers{"Content-Type" => "application/json"})
    r.status_code.should eq 400
    r = APP.request("OPTIONS", "/api/v1/posts", nil, HTTP::Headers{"Origin" => "http://x", "Access-Control-Request-Method" => "POST"})
    r.status_code.should eq 204
    r.headers["Access-Control-Allow-Origin"].should eq "*"
  end
end
