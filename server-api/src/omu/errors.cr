module Omu
  # 422 with per-field messages: {"error": "Validation failed", "fields": {"username": "..."}}
  class Invalid < Spectre::HTTPError
    getter fields : Hash(String, String)

    def initialize(@fields : Hash(String, String), message : String = "Validation failed")
      super(422, message)
    end
  end

  # Collects field errors, then raises once.
  class Validator
    getter errors = {} of String => String

    def check(field : String, ok : Bool, message : String) : Nil
      @errors[field] ||= message unless ok
    end

    def raise_if_invalid! : Nil
      raise Invalid.new(@errors) unless @errors.empty?
    end
  end

  USERNAME_RE = /\A[A-Za-z0-9_]{3,15}\z/
  EMAIL_RE    = /\A[^@\s]+@[^@\s]+\.[^@\s]+\z/
  HASHTAG_RE  = /(?<![\p{L}\p{N}_&])#([\p{L}\p{N}_]{1,50})/
  MENTION_RE  = /(?<![\p{L}\p{N}_])@([A-Za-z0-9_]{3,15})/
end
